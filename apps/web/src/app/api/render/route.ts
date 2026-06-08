import { NextResponse } from "next/server";

// Bridge: OpenCut Mission Center → Azure. POST accepts either an explicit
// { compositionId } (headless/back-compat) or a free-text { brief } that
// gpt-4.1-mini (Azure OpenAI) maps to a composition. Then it starts the Azure
// Container Apps Job (ultron-render); the MP4 is written to R2 and served via
// /api/render/result. GET polls the execution.

export const dynamic = "force-dynamic";

const API_VERSION = "2024-03-01";
const AOAI_API_VERSION = "2024-10-21";

// The renderable ultron-render compositions, with descriptions the LLM uses to
// choose. (Self-contained comps — no external source MP4s / WebGL.)
const CATALOG: { id: string; desc: string }[] = [
	{ id: "LinearHero-ultron", desc: "Gradient hero title card, Ultron brand. Good default for a punchy title/hook." },
	{ id: "PillTitle-default", desc: "Short animated pill title. Quick, minimal, one short phrase." },
	{ id: "AppleLaunch", desc: "24s narrated, Apple-style product launch reel. Premium, cinematic." },
	{ id: "VercelLaunch", desc: "Kinetic Vercel-style brand launch reel. Developer/AI product vibe." },
	{ id: "ResendLaunch", desc: "Kinetic Resend-style brand launch reel. Email/dev product vibe." },
	{ id: "ModalLaunch", desc: "Kinetic Modal-style brand launch reel. Infra/compute product vibe." },
	{ id: "DemoReel", desc: "Generic template-driven demo reel. Neutral all-purpose." },
	{ id: "UltronShip", desc: "Ultron 'Ship' template reel. Shipping/announcement energy." },
	{ id: "UltronNumbers", desc: "Ultron stats/numbers template reel. Metrics, growth, data." },
];
const ALLOWED = new Set(CATALOG.map((c) => c.id));

function arm() {
	return `https://management.azure.com/subscriptions/${process.env.AZURE_SUBSCRIPTION}/resourceGroups/${process.env.AZURE_RG}/providers/Microsoft.App/jobs/${process.env.AZURE_JOB}`;
}

async function getToken(): Promise<string> {
	const res = await fetch(
		`https://login.microsoftonline.com/${process.env.AZURE_TENANT}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: process.env.AZURE_CLIENT_ID ?? "",
				client_secret: process.env.AZURE_CLIENT_SECRET ?? "",
				grant_type: "client_credentials",
				scope: "https://management.azure.com/.default",
			}),
		},
	);
	if (!res.ok) throw new Error(`AAD token failed (${res.status})`);
	return (await res.json()).access_token as string;
}

// Free-text brief → a composition id, via Azure OpenAI (gpt-4.1-mini).
async function briefToComposition(brief: string): Promise<{ compositionId: string; title: string }> {
	const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
	const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
	const key = process.env.AZURE_OPENAI_KEY;
	if (!endpoint || !deployment || !key) {
		// No LLM configured — fall back to a sensible default.
		return { compositionId: "LinearHero-ultron", title: brief.slice(0, 60) };
	}
	const system =
		"You map a short video brief to exactly one render template. " +
		"Reply with JSON: {\"compositionId\": <one id from the list>, \"title\": <a short on-screen title derived from the brief>}. " +
		"Templates:\n" +
		CATALOG.map((c) => `- ${c.id}: ${c.desc}`).join("\n");
	const res = await fetch(
		`${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`,
		{
			method: "POST",
			headers: { "api-key": key, "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: brief },
				],
				response_format: { type: "json_object" },
				temperature: 0.2,
				max_tokens: 200,
			}),
		},
	);
	if (!res.ok) {
		return { compositionId: "LinearHero-ultron", title: brief.slice(0, 60) };
	}
	const data = await res.json();
	try {
		const spec = JSON.parse(data.choices[0].message.content);
		const compositionId = ALLOWED.has(spec.compositionId)
			? spec.compositionId
			: "LinearHero-ultron";
		return { compositionId, title: String(spec.title ?? brief).slice(0, 80) };
	} catch {
		return { compositionId: "LinearHero-ultron", title: brief.slice(0, 60) };
	}
}

function isConfigured() {
	return (
		!!process.env.AZURE_CLIENT_SECRET &&
		!!process.env.AZURE_CLIENT_ID &&
		!!process.env.AZURE_TENANT &&
		!!process.env.AZURE_SUBSCRIPTION
	);
}

export async function POST(request: Request) {
	if (!isConfigured()) {
		return NextResponse.json({ error: "Render is not configured." }, { status: 503 });
	}

	let body: { compositionId?: string; brief?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
	}

	// Resolve the composition: explicit id (headless) OR brief → LLM.
	let compositionId = "";
	let title = "";
	if (body.compositionId) {
		if (!ALLOWED.has(body.compositionId)) {
			return NextResponse.json({ error: "Unknown composition." }, { status: 400 });
		}
		compositionId = body.compositionId;
	} else if (body.brief && body.brief.trim().length >= 3) {
		try {
			const mapped = await briefToComposition(body.brief.trim());
			compositionId = mapped.compositionId;
			title = mapped.title;
		} catch (error) {
			return NextResponse.json(
				{ error: error instanceof Error ? error.message : "Could not plan the mission" },
				{ status: 502 },
			);
		}
	} else {
		return NextResponse.json({ error: "Provide a brief or a compositionId." }, { status: 400 });
	}

	const outKey = `final/opencut-${compositionId.replace(/[^A-Za-z0-9_-]/g, "-")}-${Date.now()}.mp4`;

	try {
		const token = await getToken();
		const base = arm();
		const auth = { Authorization: `Bearer ${token}` };

		const jobRes = await fetch(`${base}?api-version=${API_VERSION}`, { headers: auth });
		if (!jobRes.ok) {
			return NextResponse.json(
				{ error: `Could not read job (${jobRes.status})`, detail: (await jobRes.text()).slice(0, 300) },
				{ status: 502 },
			);
		}
		const job = await jobRes.json();
		const container = JSON.parse(JSON.stringify(job.properties.template.containers[0]));
		const setEnv = (name: string, value: string) => {
			container.env = container.env ?? [];
			const existing = container.env.find((e: { name: string }) => e.name === name);
			if (existing) {
				delete existing.secretRef;
				existing.value = value;
			} else {
				container.env.push({ name, value });
			}
		};
		setEnv("COMPOSITION_ID", compositionId);
		setEnv("OUT_KEY", outKey);
		setEnv("JOB_ID", `opencut-${Date.now()}`);

		// StartJobExecutionTemplate: container fields at top level (no "template" wrapper).
		const startRes = await fetch(`${base}/start?api-version=${API_VERSION}`, {
			method: "POST",
			headers: { ...auth, "Content-Type": "application/json" },
			body: JSON.stringify({ containers: [container] }),
		});
		if (!startRes.ok) {
			return NextResponse.json(
				{ error: `Render start failed (${startRes.status})`, detail: (await startRes.text()).slice(0, 300) },
				{ status: 502 },
			);
		}
		let executionName: string | null = null;
		try {
			const started = await startRes.json();
			executionName = started?.name ?? started?.id?.split("/").pop() ?? null;
		} catch {
			/* empty body — list to find newest */
		}
		if (!executionName) {
			const listRes = await fetch(`${base}/executions?api-version=${API_VERSION}`, { headers: auth });
			const list = await listRes.json();
			executionName =
				(list.value ?? []).sort(
					(a: { properties?: { startTime?: string } }, b: { properties?: { startTime?: string } }) =>
						(b.properties?.startTime ?? "").localeCompare(a.properties?.startTime ?? ""),
				)[0]?.name ?? null;
		}

		return NextResponse.json({ executionName, outKey, compositionId, title });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Render failed" },
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	if (!isConfigured()) {
		return NextResponse.json({ error: "Render is not configured." }, { status: 503 });
	}
	const exec = new URL(request.url).searchParams.get("exec");
	if (!exec) return NextResponse.json({ error: "exec required" }, { status: 400 });
	try {
		const token = await getToken();
		const res = await fetch(`${arm()}/executions?api-version=${API_VERSION}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return NextResponse.json({ error: `poll failed (${res.status})` }, { status: 502 });
		const list = await res.json();
		const found = (list.value ?? []).find((e: { name: string }) => e.name === exec);
		return NextResponse.json({ status: found?.properties?.status ?? "Unknown" });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Poll failed" },
			{ status: 500 },
		);
	}
}

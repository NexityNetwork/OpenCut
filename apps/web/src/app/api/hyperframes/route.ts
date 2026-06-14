import { getCloudflareContext } from "@opennextjs/cloudflare";

// Drive HyperFrames renders on the recycled Azure Container Apps job
// (ultron-hyperframes-render-job): same env + ACR + R2 wiring as the Remotion
// box, different image. POST starts a render — the composition is already a
// tar.gz in R2 at `inKey`; the job renders it and writes the MP4 to `outKey`
// (under imports/ so it's servable). GET polls the execution and, on success,
// imports the MP4 into the vault Library as a video item.

export const dynamic = "force-dynamic";
const API_VERSION = "2024-03-01";
const JOB = "ultron-hyperframes-render-job";

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => { run: () => Promise<unknown> };
	};
};
function cfEnv(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		/* not on CF */
	}
	return process.env[name] ?? "";
}
function vaultDb(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: D1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}

function armBase(): string {
	return `https://management.azure.com/subscriptions/${cfEnv("AZURE_SUBSCRIPTION")}/resourceGroups/${cfEnv("AZURE_RG")}/providers/Microsoft.App/jobs/${JOB}`;
}
async function azureToken(): Promise<string> {
	const res = await fetch(
		`https://login.microsoftonline.com/${cfEnv("AZURE_TENANT")}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: cfEnv("AZURE_CLIENT_ID"),
				client_secret: cfEnv("AZURE_CLIENT_SECRET"),
				grant_type: "client_credentials",
				scope: "https://management.azure.com/.default",
			}),
		},
	);
	if (!res.ok) throw new Error(`AAD token failed (${res.status})`);
	return (await res.json()).access_token as string;
}

async function sessionOwner(request: Request): Promise<string | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const s = await createAuth().api.getSession({ headers: request.headers });
		return s?.user?.id ?? null;
	} catch {
		return null;
	}
}
function keyed(request: Request): boolean {
	const key = cfEnv("PUBLISH_KEY");
	if (!key) return false;
	const h =
		request.headers.get("x-ultron-api-key") ||
		(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
	return h === key;
}
function isConfigured(): boolean {
	return (
		!!cfEnv("AZURE_CLIENT_SECRET") &&
		!!cfEnv("AZURE_CLIENT_ID") &&
		!!cfEnv("AZURE_TENANT") &&
		!!cfEnv("AZURE_SUBSCRIPTION")
	);
}

// POST { inKey, outKey, name? } — start a HyperFrames render.
export async function POST(request: Request) {
	if (!isConfigured()) {
		return Response.json({ error: "render not configured" }, { status: 503 });
	}
	const owner = (await sessionOwner(request)) ?? "";
	if (!owner && !keyed(request)) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	const b = (await request.json().catch(() => ({}))) as {
		inKey?: string;
		outKey?: string;
		name?: string;
	};
	if (!b.inKey || !b.outKey) {
		return Response.json({ error: "inKey and outKey required" }, { status: 400 });
	}

	const token = await azureToken();
	const base = armBase();
	const auth = { Authorization: `Bearer ${token}` };

	const jobRes = await fetch(`${base}?api-version=${API_VERSION}`, { headers: auth });
	if (!jobRes.ok) {
		return Response.json(
			{ error: `read job failed (${jobRes.status})` },
			{ status: 502 },
		);
	}
	const job = await jobRes.json();
	const container = JSON.parse(
		JSON.stringify(job.properties.template.containers[0]),
	);
	const setEnv = (name: string, value: string) => {
		container.env = container.env ?? [];
		const e = container.env.find((x: { name: string }) => x.name === name);
		if (e) {
			delete e.secretRef;
			e.value = value;
		} else {
			container.env.push({ name, value });
		}
	};
	setEnv("IN_KEY", b.inKey);
	setEnv("OUT_KEY", b.outKey);
	setEnv("JOB_ID", `hf-${Date.now()}`);

	const startRes = await fetch(`${base}/start?api-version=${API_VERSION}`, {
		method: "POST",
		headers: { ...auth, "Content-Type": "application/json" },
		body: JSON.stringify({ containers: [container] }),
	});
	if (!startRes.ok) {
		return Response.json(
			{ error: `start failed (${startRes.status})`, detail: (await startRes.text()).slice(0, 300) },
			{ status: 502 },
		);
	}
	let executionName: string | null = null;
	try {
		const started = await startRes.json();
		executionName = started?.name ?? started?.id?.split("/").pop() ?? null;
	} catch {
		const list = await (
			await fetch(`${base}/executions?api-version=${API_VERSION}`, { headers: auth })
		).json();
		executionName =
			(list.value ?? []).sort(
				(a: { properties?: { startTime?: string } }, b: { properties?: { startTime?: string } }) =>
					(b.properties?.startTime ?? "").localeCompare(a.properties?.startTime ?? ""),
			)[0]?.name ?? null;
	}
	return Response.json({ executionName, outKey: b.outKey, name: b.name ?? null });
}

// GET ?exec=&outKey=&name=&owner= — poll; import to Library on success.
export async function GET(request: Request) {
	if (!isConfigured()) {
		return Response.json({ error: "render not configured" }, { status: 503 });
	}
	const u = new URL(request.url);
	const exec = u.searchParams.get("exec") || "";
	const outKey = u.searchParams.get("outKey") || "";
	const name = u.searchParams.get("name") || "HyperFrames render";
	const owner =
		(await sessionOwner(request)) ?? u.searchParams.get("owner") ?? "";
	if (!exec) return Response.json({ error: "exec required" }, { status: 400 });

	const token = await azureToken();
	const base = armBase();
	const list = await (
		await fetch(`${base}/executions?api-version=${API_VERSION}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
	).json();
	const me = (list.value ?? []).find((e: { name: string }) => e.name === exec);
	const status = me?.properties?.status ?? "Unknown";

	let imported = false;
	if (status === "Succeeded" && outKey && owner) {
		const d = vaultDb();
		if (d) {
			const media = JSON.stringify([
				{ key: outKey, type: "video", ext: "mp4", contentType: "video/mp4" },
			]);
			await d
				.prepare(
					`INSERT INTO vault_items (id, owner, kind, name, source, media, tags, created_at)
           VALUES (?, ?, 'video', ?, 'hyperframes', ?, '["HyperFrames"]', ?)`,
				)
				.bind(crypto.randomUUID(), owner, name, media, Date.now())
				.run();
			imported = true;
		}
	}
	return Response.json({
		status,
		imported,
		fileUrl: outKey ? `/api/import-from-url/file?key=${encodeURIComponent(outKey)}` : null,
	});
}

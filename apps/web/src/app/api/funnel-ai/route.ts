import { getCloudflareContext } from "@opennextjs/cloudflare";

// AI for comment-to-DM funnels: generates rotated message variations (so
// public auto-replies never repeat verbatim — Instagram flags that as spam)
// and qualifies lead replies. Reused by the browser (funnel builder preview)
// and by the satellite cron (which sends with the PUBLISH_KEY).

const AOAI_API_VERSION = "2024-08-01-preview";

function env(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		/* not on CF */
	}
	return process.env[name] ?? "";
}

async function azureChat(
	system: string,
	user: string,
	opts: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
	const endpoint = env("AZURE_OPENAI_ENDPOINT");
	// Prefer a cheaper mini deployment for funnel copy if one is configured.
	const deployment =
		env("AZURE_OPENAI_DEPLOYMENT_MINI") || env("AZURE_OPENAI_DEPLOYMENT");
	const key = env("AZURE_OPENAI_KEY");
	if (!endpoint || !deployment || !key) throw new Error("AI is not configured");
	const r = await fetch(
		`${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`,
		{
			method: "POST",
			headers: { "api-key": key, "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				...(opts.json ? { response_format: { type: "json_object" } } : {}),
				temperature: opts.temperature ?? 0.9,
				max_tokens: opts.maxTokens ?? 700,
			}),
		},
	);
	if (!r.ok) {
		const detail = await r.text().catch(() => "");
		throw new Error(`AI failed (${r.status}) ${detail.slice(0, 160)}`);
	}
	const data = (await r.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	return data.choices?.[0]?.message?.content ?? "";
}

async function brandTone(owner: string): Promise<string> {
	if (!owner) return "";
	try {
		const { env } = getCloudflareContext();
		const d = (env as Record<string, unknown>).VAULT_DB as
			| {
					prepare: (q: string) => {
						bind: (...a: unknown[]) => {
							first: <T>() => Promise<T | null>;
						};
					};
			  }
			| undefined;
		if (!d) return "";
		const row = await d
			.prepare("SELECT data FROM brand_kits WHERE owner = ?")
			.bind(owner)
			.first<{ data: string }>();
		if (!row) return "";
		const kit = JSON.parse(row.data) as { tone?: string };
		return typeof kit.tone === "string" ? kit.tone : "";
	} catch {
		return "";
	}
}

async function sessionOwner(request: Request): Promise<string | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const auth = createAuth();
		const session = await auth.api.getSession({ headers: request.headers });
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

function authorized(request: Request): boolean {
	const key = env("PUBLISH_KEY");
	if (!key) return false;
	const h =
		request.headers.get("x-ultron-api-key") ||
		request.headers.get("x-api-key") ||
		(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
	return h === key;
}

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const action = String(b.action || "");

	// Auth: a signed-in owner (browser builder) OR the satellite cron's key.
	// The body's `owner` is NEVER trusted as auth — only used for brand-tone
	// lookup once the request is authorized via the key.
	const sessionUser = await sessionOwner(request);
	const keyed = authorized(request);
	if (!sessionUser && !keyed) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	const owner = sessionUser ?? (keyed ? String(b.owner || "") : "");

	try {
		if (action === "variations") {
			const base = String(b.base || "").trim();
			const kind = b.kind === "dm" ? "dm" : "reply";
			const count = Math.min(Math.max(Number(b.count) || 10, 3), 16);
			const link = String(b.link || "").trim();
			if (!base) return Response.json({ error: "base required" }, { status: 400 });
			const tone = (await brandTone(owner)) || String(b.tone || "");

			const system = `You write short, natural Instagram ${kind === "dm" ? "direct messages" : "public comment replies"} for a creator's comment-to-DM funnel.
Return STRICT JSON: {"variations": string[]}.
Rules:
- Produce ${count} DISTINCT variations of the same intent. Each must read like a real person, not a template.
- Vary wording and length. Keep each ${kind === "dm" ? "under 280 characters" : "under 90 characters"}.
- Use emoji very sparingly — at most one, and most variations should have none. Never lead with an emoji.
- ${kind === "reply" ? "These are PUBLIC replies under the comment. Keep them light, never salesy, hint that a DM is coming." : "These are DMs. Be warm and direct. Deliver the thing."}
- Never use hashtags. Never sound automated. No quotes around the text.${
				link && kind === "dm"
					? `\n- Naturally include this link exactly once: ${link}`
					: ""
			}${tone ? `\n- Match this brand voice: ${tone}` : ""}`;

			const raw = await azureChat(system, `Intent / seed message: ${base}`, {
				json: true,
				temperature: 1,
				maxTokens: 900,
			});
			let variations: string[] = [];
			try {
				const parsed = JSON.parse(raw || "{}") as { variations?: unknown };
				if (Array.isArray(parsed.variations)) {
					variations = parsed.variations
						.map((v) => String(v).trim())
						.filter(Boolean)
						.slice(0, count);
				}
			} catch {
				/* fall through */
			}
			if (variations.length === 0) variations = [base];
			return Response.json({ variations });
		}

		if (action === "qualify") {
			const question = String(b.question || "");
			const answer = String(b.answer || "").trim();
			const context = String(b.context || "");
			if (!answer) return Response.json({ error: "answer required" }, { status: 400 });
			const system = `You qualify inbound leads for a creator. Given the lead's DM reply, classify them.
Return STRICT JSON: {"status": "qualified" | "engaged" | "unqualified", "score": number, "summary": string}.
- status: "qualified" = a strong fit / clear buying or signup intent; "engaged" = interested but unclear; "unqualified" = spam, off-topic or not a fit.
- score: 0-100 lead quality.
- summary: one short sentence a busy creator can skim.`;
			const raw = await azureChat(
				system,
				`Funnel context: ${context}\nWe asked: ${question}\nThey replied: ${answer}`,
				{ json: true, temperature: 0.2, maxTokens: 200 },
			);
			let out = { status: "engaged", score: 50, summary: "" };
			try {
				const parsed = JSON.parse(raw || "{}") as Partial<typeof out>;
				out = {
					status: ["qualified", "engaged", "unqualified"].includes(
						String(parsed.status),
					)
						? String(parsed.status)
						: "engaged",
					score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
					summary: String(parsed.summary || "").slice(0, 200),
				};
			} catch {
				/* default */
			}
			return Response.json(out);
		}

		return Response.json({ error: "unknown action" }, { status: 400 });
	} catch (e) {
		return Response.json(
			{ error: e instanceof Error ? e.message : "AI error" },
			{ status: 502 },
		);
	}
}

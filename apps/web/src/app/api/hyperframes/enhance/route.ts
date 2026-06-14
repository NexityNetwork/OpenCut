import { cfEnv } from "@/hyperframes/render-job";

// "Enhance prompt": expands a beta-tester's short idea into a clearer, more
// vivid brief for the composer. Pure text in / text out (no render), so it is
// cheap and safe to call on demand.

export const dynamic = "force-dynamic";

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

const SYSTEM = `You rewrite a short video idea into a clear, vivid brief for a short-form vertical video.
Keep the user's intent, audience and any product names. Make it concrete: who it is for, the core message, the arc (hook -> points -> call to action).
2 to 4 sentences. Plain text only: no hashtags, no emojis, no markdown, no em dashes, no quotes, no dollar signs.
Return only the rewritten brief.`;

export async function POST(request: Request) {
	const owner = await sessionOwner(request);
	if (!owner && !keyed(request)) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	const b = (await request.json().catch(() => ({}))) as {
		prompt?: string;
		instructions?: string;
		designNotes?: string;
	};
	if (!b.prompt?.trim()) {
		return Response.json({ error: "prompt required" }, { status: 400 });
	}
	const endpoint = cfEnv("AZURE_OPENAI_ENDPOINT");
	const deployment = cfEnv("AZURE_OPENAI_DEPLOYMENT");
	const key = cfEnv("AZURE_OPENAI_KEY");
	if (!endpoint || !deployment || !key) {
		return Response.json({ error: "composer not configured" }, { status: 503 });
	}

	const context = [
		b.instructions?.trim() ? `Standing instructions: ${b.instructions.trim()}` : "",
		b.designNotes?.trim() ? `Brand notes: ${b.designNotes.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n");
	const user = `${context ? `${context}\n\n` : ""}Idea: ${b.prompt.trim()}`;

	const base = endpoint.replace(/\/$/, "");
	const res = await fetch(
		`${base}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`,
		{
			method: "POST",
			headers: { "api-key": key, "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [
					{ role: "system", content: SYSTEM },
					{ role: "user", content: user },
				],
				temperature: 0.6,
				max_tokens: 400,
			}),
		},
	);
	if (!res.ok) {
		return Response.json(
			{ error: `enhance ${res.status}` },
			{ status: 502 },
		);
	}
	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const enhanced = (data.choices?.[0]?.message?.content ?? "").trim();
	if (!enhanced) return Response.json({ error: "no output" }, { status: 502 });
	return Response.json({ enhanced });
}

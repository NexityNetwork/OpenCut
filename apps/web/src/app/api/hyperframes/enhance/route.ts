import { cfEnv } from "@/hyperframes/render-job";
import { callAoai } from "@/hyperframes/aoai";
import { resolveModel } from "@/hyperframes/builder";

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
		model?: string;
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

	let enhanced = "";
	try {
		enhanced = (
			await callAoai({
				endpoint,
				deployment: resolveModel(b.model) || deployment,
				key,
				messages: [
					{ role: "system", content: SYSTEM },
					{ role: "user", content: user },
				],
				temperature: 0.6,
				maxTokens: 800,
			})
		).trim();
	} catch (e) {
		return Response.json({ error: (e as Error).message }, { status: 502 });
	}
	if (!enhanced) return Response.json({ error: "no output" }, { status: 502 });
	return Response.json({ enhanced });
}

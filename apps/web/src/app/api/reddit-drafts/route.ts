import { getCloudflareContext } from "@opennextjs/cloudflare";

// Owner-only review surface for drafted Reddit text posts. Gated server-side to
// the account owner so the drafts stay private (visible just to Catalin).
const OWNER_EMAIL = "catalin@nexitynetwork.org";

type D1 = {
	prepare: (q: string) => {
		bind: (...args: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};

function db(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: D1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}

async function gate(request: Request): Promise<{ id: string } | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const session = await createAuth().api.getSession({
			headers: request.headers,
		});
		const user = session?.user;
		if (user?.email === OWNER_EMAIL && user?.id) return { id: user.id };
	} catch {
		/* no session */
	}
	return null;
}

function rowToDraft(r: Record<string, unknown>) {
	return {
		id: r.id,
		subreddit: r.subreddit,
		title: r.title,
		body: r.body,
		keyword: r.keyword ?? null,
		status: r.status,
		sortOrder: r.sort_order,
		createdAt: r.created_at,
	};
}

export async function GET(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ drafts: [] }, { status: 403 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT * FROM reddit_drafts WHERE owner = ? ORDER BY sort_order ASC, created_at ASC",
		)
		.bind(me.id)
		.all();
	return Response.json({ drafts: (results || []).map(rowToDraft) });
}

export async function PATCH(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const id = String(b.id || "");
	const status = String(b.status || "");
	if (!id || !["draft", "approved", "rejected"].includes(status))
		return Response.json({ error: "bad request" }, { status: 400 });
	await d
		.prepare(
			"UPDATE reddit_drafts SET status = ?, updated_at = ? WHERE owner = ? AND id = ?",
		)
		.bind(status, Date.now(), me.id, id)
		.run();
	return Response.json({ ok: true });
}

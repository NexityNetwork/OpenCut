import { getCloudflareContext } from "@opennextjs/cloudflare";

// Owner-only reader for the imported "Cindy Guides" library (guide_docs). Gated
// server-side to the account owner so it stays private (visible just to Catalin).
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

function rowToGuide(r: Record<string, unknown>) {
	return {
		id: r.id,
		slug: r.slug,
		title: r.title,
		topic: r.topic,
		tool: r.tool,
		source: r.source,
		body: r.body,
		status: r.status,
	};
}

export async function GET(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ guides: [] }, { status: 403 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT * FROM guide_docs WHERE owner = ? ORDER BY sort_order ASC, created_at ASC",
		)
		.bind(me.id)
		.all();
	return Response.json({ guides: (results || []).map(rowToGuide) });
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
			"UPDATE guide_docs SET status = ?, updated_at = ? WHERE owner = ? AND id = ?",
		)
		.bind(status, Date.now(), me.id, id)
		.run();
	return Response.json({ ok: true });
}

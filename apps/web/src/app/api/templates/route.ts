import { getCloudflareContext } from "@opennextjs/cloudflare";

// Owner-only reader for the reel Templates library (template_docs). Each row is a
// pure timeline map (tracks + timed elements) transcribed from a reference reel,
// used to align on structure before any editing/assets. Gated server-side to the
// account owner so it stays private (visible just to Catalin).
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

function rowToTemplate(r: Record<string, unknown>) {
	let doc: unknown = {};
	try {
		doc = JSON.parse(String(r.doc));
	} catch {
		doc = {};
	}
	return {
		id: r.id,
		slug: r.slug,
		name: r.name,
		durationSec: r.duration_sec,
		source: r.source,
		status: r.status,
		doc,
	};
}

export async function GET(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ templates: [] }, { status: 403 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT * FROM template_docs WHERE owner = ? ORDER BY sort_order ASC, created_at ASC",
		)
		.bind(me.id)
		.all();
	return Response.json({ templates: (results || []).map(rowToTemplate) });
}

export async function PATCH(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const id = String(b.id || "");
	if (!id) return Response.json({ error: "bad request" }, { status: 400 });
	// status update
	if (typeof b.status === "string") {
		if (!["draft", "approved", "rejected"].includes(b.status))
			return Response.json({ error: "bad status" }, { status: 400 });
		await d
			.prepare(
				"UPDATE template_docs SET status = ?, updated_at = ? WHERE owner = ? AND id = ?",
			)
			.bind(b.status, Date.now(), me.id, id)
			.run();
	}
	// doc update (aligning timings from the UI, optional)
	if (b.doc && typeof b.doc === "object") {
		await d
			.prepare(
				"UPDATE template_docs SET doc = ?, updated_at = ? WHERE owner = ? AND id = ?",
			)
			.bind(JSON.stringify(b.doc), Date.now(), me.id, id)
			.run();
	}
	return Response.json({ ok: true });
}

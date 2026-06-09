import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};
type R2 = {
	put: (
		k: string,
		v: ArrayBuffer,
		o?: { httpMetadata?: { contentType?: string } },
	) => Promise<unknown>;
};
function ctx() {
	const { env } = getCloudflareContext();
	return env as unknown as { VAULT_DB?: D1; REELS_R2?: R2 };
}

// List the media metadata for a project.
export async function GET(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const projectId = u.searchParams.get("projectId") || "";
	if (!owner || !projectId) return Response.json({ media: [] });
	const d = ctx().VAULT_DB;
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT id, meta FROM account_media WHERE owner = ? AND project_id = ?",
		)
		.bind(owner, projectId)
		.all();
	return Response.json({
		media: (results || []).map((r) => ({ id: r.id, meta: r.meta })),
	});
}

// Upload one media file: bytes in the body, JSON meta in x-media-meta header.
export async function PUT(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const projectId = u.searchParams.get("projectId") || "";
	const id = u.searchParams.get("id") || "";
	if (!owner || !projectId || !id) {
		return Response.json({ error: "bad request" }, { status: 400 });
	}
	const { VAULT_DB: d, REELS_R2: r2 } = ctx();
	if (!d || !r2) return Response.json({ error: "not configured" }, { status: 503 });
	const meta = request.headers.get("x-media-meta") || "{}";
	const contentType =
		request.headers.get("content-type") || "application/octet-stream";
	const body = await request.arrayBuffer();
	await r2.put(`acct/${owner}/${projectId}/${id}`, body, {
		httpMetadata: { contentType },
	});
	await d
		.prepare(
			"INSERT OR REPLACE INTO account_media (owner, project_id, id, meta, updated_at) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(owner, projectId, id, meta, Date.now())
		.run();
	return Response.json({ ok: true });
}

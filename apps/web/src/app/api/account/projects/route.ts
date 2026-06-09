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
	delete: (k: string | string[]) => Promise<void>;
	list: (o: { prefix: string }) => Promise<{ objects: { key: string }[] }>;
};
function ctx() {
	const { env } = getCloudflareContext();
	return env as unknown as { VAULT_DB?: D1; REELS_R2?: R2 };
}

export async function GET(request: Request) {
	const owner = new URL(request.url).searchParams.get("owner") || "";
	if (!owner) return Response.json({ projects: [] });
	const d = ctx().VAULT_DB;
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT id, data, updated_at FROM account_projects WHERE owner = ? ORDER BY updated_at DESC",
		)
		.bind(owner)
		.all();
	return Response.json({
		projects: (results || []).map((r) => ({
			id: r.id,
			data: r.data,
			updatedAt: r.updated_at,
		})),
	});
}

export async function PUT(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const id = String(b.id || "").trim();
	const data = b.data;
	if (!owner || !id || typeof data !== "string") {
		return Response.json({ error: "bad request" }, { status: 400 });
	}
	const updatedAt = typeof b.updatedAt === "number" ? b.updatedAt : Date.now();
	const d = ctx().VAULT_DB;
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await d
		.prepare(
			"INSERT OR REPLACE INTO account_projects (owner, id, data, updated_at) VALUES (?, ?, ?, ?)",
		)
		.bind(owner, id, data, updatedAt)
		.run();
	return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const id = u.searchParams.get("id") || "";
	if (!owner || !id) return Response.json({ error: "bad request" }, { status: 400 });
	const { VAULT_DB: d, REELS_R2: r2 } = ctx();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await d
		.prepare("DELETE FROM account_projects WHERE owner = ? AND id = ?")
		.bind(owner, id)
		.run();
	await d
		.prepare("DELETE FROM account_media WHERE owner = ? AND project_id = ?")
		.bind(owner, id)
		.run();
	if (r2) {
		try {
			const listed = await r2.list({ prefix: `acct/${owner}/${id}/` });
			if (listed.objects.length) {
				await r2.delete(listed.objects.map((o) => o.key));
			}
		} catch {
			/* best effort */
		}
	}
	return Response.json({ ok: true });
}

import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Brain, assets slice — a durable registry of editor project media. Media
// bytes are added in the browser, where they live in OPFS (a working cache
// that the browser can evict, and that never leaves the device). This records
// the copy mirrored to R2 (the durable store, via the imports/ upload), so
// every asset is stored in Cloudflare, the Brain knows about all of them, and
// the editor can self-heal — pull an asset back on a fresh device or after a
// cache clear.

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
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

let ensured = false;
async function ensure(d: D1) {
	if (ensured) return;
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS brain_media (
         owner TEXT NOT NULL, asset_id TEXT NOT NULL, project_id TEXT,
         key TEXT NOT NULL, name TEXT, type TEXT, ext TEXT, size INTEGER,
         content_type TEXT, meta TEXT NOT NULL DEFAULT '{}',
         created_at INTEGER NOT NULL,
         PRIMARY KEY (owner, asset_id))`,
		)
		.bind()
		.run();
	ensured = true;
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

// Register an asset that's been mirrored to R2. Owner is the signed-in user,
// falling back to the anonymous device id the client sends — the same trust
// model the vault already uses for this small, trusted group.
export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = (await sessionOwner(request)) ?? String(b.owner || "").trim();
	if (!owner) return Response.json({ error: "owner required" }, { status: 401 });
	const assetId = String(b.asset_id || "").trim();
	const key = String(b.key || "").trim();
	if (!assetId || !key) {
		return Response.json(
			{ error: "asset_id and key required" },
			{ status: 400 },
		);
	}
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	await d
		.prepare(
			`INSERT INTO brain_media (owner, asset_id, project_id, key, name, type, ext, size, content_type, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner, asset_id) DO UPDATE SET
         project_id = excluded.project_id, key = excluded.key, name = excluded.name,
         type = excluded.type, ext = excluded.ext, size = excluded.size,
         content_type = excluded.content_type, meta = excluded.meta`,
		)
		.bind(
			owner,
			assetId,
			b.project_id ? String(b.project_id) : null,
			key,
			b.name ? String(b.name) : null,
			b.type ? String(b.type) : null,
			b.ext ? String(b.ext) : null,
			typeof b.size === "number" ? b.size : null,
			b.content_type ? String(b.content_type) : null,
			JSON.stringify(b.meta ?? {}),
			Date.now(),
		)
		.run();
	return Response.json({ ok: true });
}

// List an owner's mirrored media — scoped to one project (the editor's
// self-heal/backup) or all of it (the headless Brain).
export async function GET(request: Request) {
	const u = new URL(request.url);
	const owner =
		(await sessionOwner(request)) ?? u.searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ assets: [] });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const projectId = u.searchParams.get("project_id");
	const rows = projectId
		? await d
				.prepare(
					"SELECT * FROM brain_media WHERE owner = ? AND project_id = ? ORDER BY created_at DESC LIMIT 500",
				)
				.bind(owner, projectId)
				.all()
		: await d
				.prepare(
					"SELECT * FROM brain_media WHERE owner = ? ORDER BY created_at DESC LIMIT 500",
				)
				.bind(owner)
				.all();
	return Response.json({
		assets: (rows.results ?? []).map((r) => ({
			...r,
			meta: (() => {
				try {
					return JSON.parse(String(r.meta));
				} catch {
					return {};
				}
			})(),
		})),
	});
}

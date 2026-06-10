import { getCloudflareContext } from "@opennextjs/cloudflare";

// Link-in-bio storage (VAULT_DB.bio_pages). One page per owner; handle is the
// public slug used by /bio/[handle].

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
		};
	};
	exec?: (q: string) => Promise<unknown>;
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
async function ensureTable(d: D1) {
	if (ensured) return;
	try {
		await d
			.prepare(
				`CREATE TABLE IF NOT EXISTS bio_pages (
           owner TEXT PRIMARY KEY, handle TEXT UNIQUE, data TEXT NOT NULL,
           published INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`,
			)
			.bind()
			.run();
		ensured = true;
	} catch {
		/* table likely exists */
	}
}

function row(r: Record<string, unknown> | null) {
	if (!r) return null;
	let data: unknown = {};
	try {
		data = JSON.parse(String(r.data));
	} catch {
		/* keep empty */
	}
	return {
		handle: r.handle,
		data,
		published: !!r.published,
		updatedAt: r.updated_at,
	};
}

export async function GET(request: Request) {
	const u = new URL(request.url);
	const handle = u.searchParams.get("handle");
	const owner = u.searchParams.get("owner");
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureTable(d);

	if (handle) {
		const r = await d
			.prepare(
				"SELECT handle, data, published, updated_at FROM bio_pages WHERE handle = ? AND published = 1",
			)
			.bind(handle)
			.first();
		const page = row(r);
		if (!page) return Response.json({ error: "not found" }, { status: 404 });
		return Response.json({ page });
	}
	if (owner) {
		const r = await d
			.prepare(
				"SELECT handle, data, published, updated_at FROM bio_pages WHERE owner = ?",
			)
			.bind(owner)
			.first();
		return Response.json({ page: row(r) });
	}
	return Response.json({ error: "handle or owner required" }, { status: 400 });
}

export async function PUT(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const handle = String(b.handle || "").trim().toLowerCase();
	if (!owner || !handle || !b.data) {
		return Response.json({ error: "owner, handle, data required" }, { status: 400 });
	}
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureTable(d);

	// Enforce handle uniqueness across other owners.
	const clash = await d
		.prepare("SELECT owner FROM bio_pages WHERE handle = ? AND owner != ?")
		.bind(handle, owner)
		.first<{ owner: string }>();
	if (clash) {
		return Response.json({ error: "That handle is taken" }, { status: 409 });
	}

	await d
		.prepare(
			`INSERT INTO bio_pages (owner, handle, data, published, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET
         handle = excluded.handle, data = excluded.data,
         published = excluded.published, updated_at = excluded.updated_at`,
		)
		.bind(
			owner,
			handle,
			JSON.stringify(b.data),
			b.published ? 1 : 0,
			Date.now(),
		)
		.run();
	return Response.json({ ok: true, handle });
}

import {
	bioDb,
	ensureBioTables,
	sessionUserId,
	RESERVED_HANDLES,
} from "@/bio/server";

// Link-in-bio storage (VAULT_DB.bio_pages). One page per owner; handle is the
// public slug used by /bio/[handle].
//
// Ownership: when a session exists, the owner is ALWAYS the session user —
// the client-supplied owner is ignored. Anonymous (device) owners may draft,
// but publishing requires an account so public handles belong to accounts.

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
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);

	if (handle) {
		const r = await d
			.prepare(
				"SELECT handle, data, published, updated_at FROM bio_pages WHERE handle = ? AND published = 1",
			)
			.bind(handle.toLowerCase())
			.first();
		const page = row(r);
		if (!page) return Response.json({ error: "not found" }, { status: 404 });
		return Response.json({ page });
	}

	// Owner lookups prefer the session identity over the supplied one.
	const sessionOwner = await sessionUserId(request);
	const effectiveOwner = sessionOwner ?? owner;
	if (!effectiveOwner) {
		return Response.json({ error: "handle or owner required" }, { status: 400 });
	}
	const r = await d
		.prepare(
			"SELECT handle, data, published, updated_at FROM bio_pages WHERE owner = ?",
		)
		.bind(effectiveOwner)
		.first();
	return Response.json({ page: row(r), owner: effectiveOwner });
}

export async function PUT(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const handle = String(b.handle || "")
		.trim()
		.toLowerCase();
	if (!handle || !b.data) {
		return Response.json({ error: "handle and data required" }, { status: 400 });
	}
	if (handle.length < 3) {
		return Response.json(
			{ error: "Handle must be at least 3 characters" },
			{ status: 400 },
		);
	}
	if (RESERVED_HANDLES.has(handle)) {
		return Response.json({ error: "That handle is reserved" }, { status: 409 });
	}

	const sessionOwner = await sessionUserId(request);
	const owner = sessionOwner ?? String(b.owner || "").trim();
	if (!owner) {
		return Response.json({ error: "owner required" }, { status: 400 });
	}
	// Public handles belong to accounts: anonymous users can draft, not publish.
	const wantsPublish = !!b.published;
	if (wantsPublish && !sessionOwner) {
		return Response.json(
			{ error: "Log in to publish your page" },
			{ status: 401 },
		);
	}

	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);

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
		.bind(owner, handle, JSON.stringify(b.data), wantsPublish ? 1 : 0, Date.now())
		.run();
	return Response.json({ ok: true, handle, owner });
}

import { bioDb, ensureBioTables, sessionUserId } from "@/bio/server";

// Brand kit storage — one kit per owner, JSON blob (colors, font, logo, tone).

let ensured = false;
async function ensureTable(d: NonNullable<ReturnType<typeof bioDb>>) {
	if (ensured) return;
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS brand_kits (
         owner TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
		)
		.bind()
		.run();
	ensured = true;
}

export async function GET(request: Request) {
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);
	await ensureTable(d);
	const sessionOwner = await sessionUserId(request);
	const owner =
		sessionOwner ?? new URL(request.url).searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ kit: null });
	const r = await d
		.prepare("SELECT data FROM brand_kits WHERE owner = ?")
		.bind(owner)
		.first<{ data: string }>();
	let kit: unknown = null;
	try {
		kit = r ? JSON.parse(r.data) : null;
	} catch {
		/* ignore */
	}
	return Response.json({ kit, owner });
}

export async function PUT(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);
	await ensureTable(d);
	const sessionOwner = await sessionUserId(request);
	const owner = sessionOwner ?? String(b.owner || "").trim();
	if (!owner || !b.data) {
		return Response.json({ error: "owner and data required" }, { status: 400 });
	}
	await d
		.prepare(
			`INSERT INTO brand_kits (owner, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(owner) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
		)
		.bind(owner, JSON.stringify(b.data), Date.now())
		.run();
	return Response.json({ ok: true });
}

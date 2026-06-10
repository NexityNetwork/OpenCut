import { bioDb, ensureBioTables, bumpStat, waitUntil } from "@/bio/server";

// Email-capture block submissions (public, rate-limited per ip+handle lightly
// by the unique-email insert). Leads belong to the page owner.

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const handle = String(b.handle || "").toLowerCase().trim();
	const email = String(b.email || "").trim().toLowerCase();
	if (!handle || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		return Response.json({ error: "valid email required" }, { status: 400 });
	}
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);

	const page = await d
		.prepare("SELECT owner FROM bio_pages WHERE handle = ? AND published = 1")
		.bind(handle)
		.first<{ owner: string }>();
	if (!page) return Response.json({ error: "not found" }, { status: 404 });

	// One row per (owner,email) — repeat submits are idempotent.
	const exists = await d
		.prepare("SELECT id FROM bio_leads WHERE owner = ? AND email = ?")
		.bind(page.owner, email)
		.first<{ id: string }>();
	if (!exists) {
		await d
			.prepare(
				"INSERT INTO bio_leads (id, owner, handle, email, created_at) VALUES (?, ?, ?, ?, ?)",
			)
			.bind(crypto.randomUUID(), page.owner, handle, email, Date.now())
			.run();
		waitUntil(bumpStat(d, { owner: page.owner, kind: "lead", key: "email" }));
	}
	return Response.json({ ok: true });
}

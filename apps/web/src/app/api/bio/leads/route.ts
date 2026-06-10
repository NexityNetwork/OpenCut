import { bioDb, ensureBioTables, sessionUserId } from "@/bio/server";

// CSV export of email-capture leads for the page owner.

export async function GET(request: Request) {
	const d = bioDb();
	if (!d) return new Response("not configured", { status: 503 });
	await ensureBioTables(d);

	const sessionOwner = await sessionUserId(request);
	const owner =
		sessionOwner ?? new URL(request.url).searchParams.get("owner") ?? "";
	if (!owner) return new Response("owner required", { status: 400 });

	const rows = await d
		.prepare(
			"SELECT email, handle, created_at FROM bio_leads WHERE owner = ? ORDER BY created_at DESC",
		)
		.bind(owner)
		.all();

	const lines = ["email,handle,created_at"];
	for (const r of rows.results ?? []) {
		lines.push(
			`${String(r.email)},${String(r.handle)},${new Date(Number(r.created_at)).toISOString()}`,
		);
	}
	return new Response(lines.join("\n"), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": 'attachment; filename="bio-leads.csv"',
		},
	});
}

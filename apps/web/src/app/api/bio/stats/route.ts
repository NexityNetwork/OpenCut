import { bioDb, ensureBioTables, sessionUserId, utcDay } from "@/bio/server";

// Insights for the builder: 28d views series, per-link clicks, top
// referrers/countries, lead count + recent leads. Session-derived owner with
// anonymous fallback (anonymous pages can't publish, so their stats are ~0).

export async function GET(request: Request) {
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);

	const sessionOwner = await sessionUserId(request);
	const owner =
		sessionOwner ?? new URL(request.url).searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ error: "owner required" }, { status: 400 });

	const since = utcDay(Date.now() - 27 * 86400_000);

	const views = await d
		.prepare(
			"SELECT day, SUM(n) AS n FROM bio_stats WHERE owner = ? AND kind = 'view' AND day >= ? GROUP BY day ORDER BY day ASC",
		)
		.bind(owner, since)
		.all();
	const clicks = await d
		.prepare(
			"SELECT key, SUM(n) AS n FROM bio_stats WHERE owner = ? AND kind = 'click' AND day >= ? GROUP BY key ORDER BY n DESC",
		)
		.bind(owner, since)
		.all();
	const refs = await d
		.prepare(
			"SELECT key, SUM(n) AS n FROM bio_stats WHERE owner = ? AND kind = 'ref' AND day >= ? GROUP BY key ORDER BY n DESC LIMIT 8",
		)
		.bind(owner, since)
		.all();
	const countries = await d
		.prepare(
			"SELECT key, SUM(n) AS n FROM bio_stats WHERE owner = ? AND kind = 'country' AND day >= ? GROUP BY key ORDER BY n DESC LIMIT 8",
		)
		.bind(owner, since)
		.all();
	const leadCount = await d
		.prepare("SELECT COUNT(*) AS n FROM bio_leads WHERE owner = ?")
		.bind(owner)
		.first<{ n: number }>();
	const recentLeads = await d
		.prepare(
			"SELECT email, created_at FROM bio_leads WHERE owner = ? ORDER BY created_at DESC LIMIT 8",
		)
		.bind(owner)
		.all();

	return Response.json({
		since,
		views: views.results ?? [],
		clicks: clicks.results ?? [],
		referrers: refs.results ?? [],
		countries: countries.results ?? [],
		leads: leadCount?.n ?? 0,
		recentLeads: recentLeads.results ?? [],
	});
}

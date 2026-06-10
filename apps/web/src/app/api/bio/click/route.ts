import { bioDb, ensureBioTables, bumpStat, waitUntil } from "@/bio/server";
import type { BioData } from "@/bio/types";

// Click-through redirect with per-link analytics: /api/bio/click?h=<handle>&l=<linkId>

function normalizeUrl(url: string) {
	const u = url.trim();
	if (!u) return null;
	if (/^https?:\/\//i.test(u)) return u;
	if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u)) return `mailto:${u}`;
	return `https://${u}`;
}

export async function GET(request: Request) {
	const u = new URL(request.url);
	const handle = (u.searchParams.get("h") || "").toLowerCase();
	const linkId = u.searchParams.get("l") || "";
	if (!handle || !linkId) return new Response("bad request", { status: 400 });

	const d = bioDb();
	if (!d) return new Response("not configured", { status: 503 });
	await ensureBioTables(d);

	const r = await d
		.prepare(
			"SELECT owner, data FROM bio_pages WHERE handle = ? AND published = 1",
		)
		.bind(handle)
		.first<{ owner: string; data: string }>();
	if (!r) return new Response("not found", { status: 404 });

	let data: BioData | null = null;
	try {
		data = JSON.parse(r.data) as BioData;
	} catch {
		/* fallthrough */
	}
	const link = data?.links?.find((l) => l.id === linkId);
	const target = link ? normalizeUrl(link.url) : null;
	if (!target) return new Response("link not found", { status: 404 });

	waitUntil(bumpStat(d, { owner: r.owner, kind: "click", key: linkId }));
	return Response.redirect(target, 302);
}

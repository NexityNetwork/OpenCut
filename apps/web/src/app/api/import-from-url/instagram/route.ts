import { getCloudflareContext } from "@opennextjs/cloudflare";

function readEnv(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		// not on Cloudflare — fall through
	}
	return process.env[name] ?? "";
}

// Resolves a single Instagram post/reel/carousel URL to its media via your own
// Apify actor (which parses the public embed page through a residential proxy).
export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = (body.url ?? "").trim();
	if (!/instagram\.com\/(reel|reels|p|tv)\//i.test(url)) {
		return Response.json(
			{
				error:
					"Paste a specific Instagram post or reel link (instagram.com/reel/… or /p/…).",
			},
			{ status: 400 },
		);
	}

	const token = readEnv("APIFY_TOKEN");
	const actorId = readEnv("APIFY_IG_REELS_ACTOR") || "PCJOW9u5iF0aCbicy";
	if (!token) {
		return Response.json(
			{ error: "Instagram importer is not configured" },
			{ status: 503 },
		);
	}

	let raw: unknown;
	try {
		const r = await fetch(
			`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=200`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ urls: [url] }),
			},
		);
		if (!r.ok) {
			const t = await r.text().catch(() => "");
			return Response.json(
				{ error: "Instagram fetch failed", detail: t.slice(0, 200) },
				{ status: 502 },
			);
		}
		raw = await r.json();
	} catch {
		return Response.json({ error: "Instagram scraper unreachable" }, { status: 502 });
	}

	const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
	const it = items[0];
	const media = (it?.media as { type: string; url: string }[] | undefined) ?? [];
	if (!it || media.length === 0) {
		return Response.json(
			{ error: "Couldn't find media at that link (it may be private or removed)." },
			{ status: 404 },
		);
	}
	return Response.json({
		kind: it.kind,
		title: (it.caption as string) || (it.shortcode as string) || "Instagram",
		thumbnailUrl: it.thumbnailUrl,
		durationSec: it.durationSec,
		sourceUrl: it.sourceUrl,
		media,
	});
}

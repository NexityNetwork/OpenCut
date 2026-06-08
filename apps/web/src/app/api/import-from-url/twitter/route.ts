const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function tweetId(url: string): string | null {
	const m = url.match(/status(?:es)?\/(\d+)/);
	return m ? m[1] : null;
}

function token(id: string): string {
	return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

// Resolves an X / Twitter post URL to its media (photos + video) via the public
// syndication API — no auth, and it returns images too (yt-dlp only does video).
export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = (body.url ?? "").trim();
	const id = tweetId(url);
	if (!/(?:twitter\.com|x\.com)\//i.test(url) || !id) {
		return Response.json(
			{ error: "Paste a specific X / Twitter post link (…/status/…)." },
			{ status: 400 },
		);
	}

	let d: Record<string, unknown>;
	try {
		const r = await fetch(
			`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}&lang=en`,
			{ headers: { "user-agent": UA } },
		);
		if (!r.ok) {
			return Response.json({ error: "Couldn't load that post" }, { status: 502 });
		}
		d = (await r.json()) as Record<string, unknown>;
	} catch {
		return Response.json({ error: "X is unreachable" }, { status: 502 });
	}

	const md = Array.isArray((d as { mediaDetails?: unknown[] }).mediaDetails)
		? (d as { mediaDetails: Record<string, unknown>[] }).mediaDetails
		: [];
	const media: { type: "image" | "video"; url: string }[] = [];
	let durationSec: number | undefined;
	for (const m of md) {
		const vi = m.video_info as
			| {
					variants?: { content_type?: string; url?: string; bitrate?: number }[];
					duration_millis?: number;
			  }
			| undefined;
		if ((m.type === "video" || m.type === "animated_gif") && vi?.variants) {
			const best = vi.variants
				.filter((v) => v.content_type === "video/mp4" && v.url)
				.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
			if (best?.url) {
				media.push({ type: "video", url: best.url });
				if (vi.duration_millis) durationSec = vi.duration_millis / 1000;
			}
		} else if (typeof m.media_url_https === "string") {
			media.push({ type: "image", url: m.media_url_https });
		}
	}
	if (media.length === 0) {
		return Response.json(
			{ error: "No photo or video found in that post." },
			{ status: 404 },
		);
	}

	const user = (d.user as { name?: string } | undefined) || {};
	const rawText = String(d.text || "")
		.replace(/https?:\/\/\S+/g, "")
		.trim();
	const title = rawText || user.name || "X post";
	const kind =
		media.length > 1 ? "carousel" : media[0].type === "video" ? "video" : "image";
	const poster = md.find((m) => typeof m.media_url_https === "string")
		?.media_url_https as string | undefined;
	return Response.json({
		kind,
		title,
		durationSec,
		thumbnailUrl: media.find((x) => x.type === "image")?.url || poster,
		media,
	});
}

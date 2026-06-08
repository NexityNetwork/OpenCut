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

// Downloads a CDN media URL into R2 and returns the key.
//  - Instagram (fbcdn/cdninstagram): fetched on Azure (the CF Worker IP is blocked by Meta).
//  - Twitter/X (twimg): fetched directly on the Worker (not IP-blocked).
export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as { url?: string };
	const url = (body.url ?? "").trim();
	let host = "";
	try {
		host = new URL(url).hostname.toLowerCase();
	} catch {
		return Response.json({ error: "bad url" }, { status: 400 });
	}
	const isTwimg = host.endsWith("twimg.com");
	if (
		!(host.endsWith("cdninstagram.com") || host.endsWith("fbcdn.net") || isTwimg)
	) {
		return Response.json({ error: "forbidden host" }, { status: 403 });
	}

	if (isTwimg) {
		let up: Response;
		try {
			up = await fetch(url, {
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
					referer: "https://twitter.com/",
				},
			});
		} catch {
			return Response.json({ error: "Twitter media unreachable" }, { status: 502 });
		}
		if (!up.ok || !up.body) {
			return Response.json({ error: `upstream ${up.status}` }, { status: 502 });
		}
		const ct = up.headers.get("content-type") || "application/octet-stream";
		const ext =
			ct.includes("video") || url.includes(".mp4")
				? "mp4"
				: ct.includes("png")
					? "png"
					: "jpg";
		let bucket: R2Bucket | undefined;
		try {
			const { env } = getCloudflareContext();
			bucket = (env as unknown as { REELS_R2?: R2Bucket }).REELS_R2;
		} catch {
			bucket = undefined;
		}
		if (!bucket) return Response.json({ error: "R2 not bound" }, { status: 503 });
		const key = `imports/tw-${crypto.randomUUID()}.${ext}`;
		await bucket.put(key, up.body, { httpMetadata: { contentType: ct } });
		return Response.json({ key, ext, contentType: ct });
	}

	// Instagram media via the container (Azure egress reaches fbcdn).
	const base = (readEnv("IG_FETCH_URL") || readEnv("YTDLP_URL")).replace(/\/+$/, "");
	const secret = readEnv("IMPORT_SECRET");
	if (!base) {
		return Response.json({ error: "Importer is not configured" }, { status: 503 });
	}
	let r: Response;
	try {
		r = await fetch(`${base}/fetch`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-import-secret": secret },
			body: JSON.stringify({ url }),
		});
	} catch {
		return Response.json({ error: "Importer is unreachable" }, { status: 502 });
	}
	const d = (await r.json().catch(() => ({}))) as {
		key?: string;
		error?: string;
		detail?: string;
		[k: string]: unknown;
	};
	if (!r.ok || !d.key) {
		return Response.json(
			{ error: d.error || "Couldn't fetch media", detail: d.detail },
			{ status: 502 },
		);
	}
	return Response.json(d);
}

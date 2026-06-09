import { getCloudflareContext } from "@opennextjs/cloudflare";

type R2Range = { offset: number; length?: number } | { suffix: number };

// Parse a single-range HTTP Range header into R2's range shape. We only
// support the common `bytes=start-end`, `bytes=start-`, and `bytes=-suffix`
// forms — enough for the video ingestion done by YouTube/Instagram/TikTok.
function parseRange(h: string | null): R2Range | undefined {
	if (!h) return undefined;
	const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim());
	if (!m) return undefined;
	const [, startStr, endStr] = m;
	if (startStr === "" && endStr === "") return undefined;
	if (startStr === "") return { suffix: Number.parseInt(endStr, 10) };
	const offset = Number.parseInt(startStr, 10);
	if (endStr === "") return { offset };
	return { offset, length: Number.parseInt(endStr, 10) - offset + 1 };
}

// Streams an imported media file out of R2. Restricted to the imports/ prefix
// (where the yt-dlp container writes), so this can't be used to read other keys.
// Public + range-capable so external publishers (Instagram/TikTok Graph fetch,
// YouTube resumable upload) can pull the bytes directly.
export async function GET(request: Request) {
	const key = new URL(request.url).searchParams.get("key") ?? "";
	if (!key.startsWith("imports/") || key.includes("..")) {
		return new Response("bad key", { status: 400 });
	}

	let bucket: R2Bucket | undefined;
	try {
		const { env } = getCloudflareContext();
		bucket = (env as unknown as { REELS_R2?: R2Bucket }).REELS_R2;
	} catch {
		bucket = undefined;
	}
	if (!bucket) return new Response("R2 not bound", { status: 503 });

	const range = parseRange(request.headers.get("range"));
	const obj = await bucket.get(key, range ? { range } : undefined);
	if (!obj) return new Response("not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	if (!headers.has("content-type")) {
		headers.set("content-type", "application/octet-stream");
	}
	headers.set("accept-ranges", "bytes");
	headers.set("cache-control", "public, max-age=3600");

	const served = (obj as unknown as { range?: { offset?: number; length?: number } })
		.range;
	if (range && served) {
		const total = obj.size;
		const start = served.offset ?? 0;
		const len = served.length ?? total - start;
		headers.set("content-range", `bytes ${start}-${start + len - 1}/${total}`);
		headers.set("content-length", String(len));
		return new Response(obj.body, { status: 206, headers });
	}

	headers.set("content-length", String(obj.size));
	return new Response(obj.body, { headers });
}

import { getCloudflareContext } from "@opennextjs/cloudflare";

// Streams a rendered MP4 back from the shared R2 bucket (bound to this Worker as
// REELS_R2). Only serves keys under final/ so it isn't a bucket-wide public read.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const key = new URL(request.url).searchParams.get("key") ?? "";
	if (!key.startsWith("final/") || key.includes("..")) {
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

	const obj = await bucket.get(key);
	if (!obj) return new Response("not found", { status: 404 });

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("etag", obj.httpEtag);
	if (!headers.has("content-type")) headers.set("content-type", "video/mp4");
	headers.set("content-length", String(obj.size));
	headers.set("cache-control", "private, max-age=600");
	return new Response(obj.body, { headers });
}

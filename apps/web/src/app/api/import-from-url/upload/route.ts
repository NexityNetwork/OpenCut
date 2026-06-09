import { getCloudflareContext } from "@opennextjs/cloudflare";

// Direct browser -> R2 upload for local files added to the Vault. Stores under
// the imports/ prefix so /api/import-from-url/file?key=... can serve it back.
export async function POST(request: Request) {
	const ext =
		(new URL(request.url).searchParams.get("ext") || "bin")
			.replace(/[^a-z0-9]/gi, "")
			.slice(0, 8) || "bin";
	const contentType =
		request.headers.get("content-type") || "application/octet-stream";

	let bucket: R2Bucket | undefined;
	try {
		const { env } = getCloudflareContext();
		bucket = (env as unknown as { REELS_R2?: R2Bucket }).REELS_R2;
	} catch {
		bucket = undefined;
	}
	if (!bucket) return Response.json({ error: "R2 not bound" }, { status: 503 });

	const body = await request.arrayBuffer();
	if (!body.byteLength) {
		return Response.json({ error: "empty file" }, { status: 400 });
	}
	const key = `imports/up-${crypto.randomUUID()}.${ext}`;
	await bucket.put(key, body, { httpMetadata: { contentType } });
	return Response.json({ key, ext, contentType });
}

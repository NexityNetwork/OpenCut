import { getCloudflareContext } from "@opennextjs/cloudflare";

// Server-side copy of a public asset into REELS_R2, so large media never has to
// round-trip through the browser. Scoped to public Cloudflare static hosts
// (R2 public dev domains and Pages) to keep this from being an open proxy.
export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as {
		url?: string;
		ext?: string;
	};
	const url = (body.url ?? "").trim();
	let host = "";
	try {
		host = new URL(url).hostname.toLowerCase();
	} catch {
		return Response.json({ error: "bad url" }, { status: 400 });
	}
	if (!(host.endsWith(".r2.dev") || host.endsWith(".pages.dev"))) {
		return Response.json({ error: "forbidden host" }, { status: 403 });
	}

	let up: Response;
	try {
		up = await fetch(url);
	} catch {
		return Response.json({ error: "source unreachable" }, { status: 502 });
	}
	if (!up.ok) {
		return Response.json({ error: `upstream ${up.status}` }, { status: 502 });
	}
	const ct = up.headers.get("content-type") || "application/octet-stream";
	const ext =
		(
			body.ext ||
			(ct.includes("video")
				? "mp4"
				: ct.includes("png")
					? "png"
					: ct.includes("jpeg") || ct.includes("jpg")
						? "jpg"
						: "bin")
		)
			.replace(/[^a-z0-9]/gi, "")
			.slice(0, 8) || "bin";

	let bucket: R2Bucket | undefined;
	try {
		const { env } = getCloudflareContext();
		bucket = (env as unknown as { REELS_R2?: R2Bucket }).REELS_R2;
	} catch {
		bucket = undefined;
	}
	if (!bucket) return Response.json({ error: "R2 not bound" }, { status: 503 });

	const buf = await up.arrayBuffer();
	if (!buf.byteLength) {
		return Response.json({ error: "empty body" }, { status: 502 });
	}
	const key = `imports/rm-${crypto.randomUUID()}.${ext}`;
	await bucket.put(key, buf, { httpMetadata: { contentType: ct } });
	return Response.json({ key, ext, contentType: ct, bytes: buf.byteLength });
}

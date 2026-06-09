import { getCloudflareContext } from "@opennextjs/cloudflare";

type R2 = {
	get: (
		k: string,
	) => Promise<{
		body: ReadableStream;
		httpMetadata?: { contentType?: string };
	} | null>;
};
function r2() {
	const { env } = getCloudflareContext();
	return (env as unknown as { REELS_R2?: R2 }).REELS_R2;
}

// Stream one account media file out of R2.
export async function GET(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const projectId = u.searchParams.get("projectId") || "";
	const id = u.searchParams.get("id") || "";
	if (!owner || !projectId || !id) {
		return new Response("bad request", { status: 400 });
	}
	const bucket = r2();
	if (!bucket) return new Response("not configured", { status: 503 });
	const obj = await bucket.get(`acct/${owner}/${projectId}/${id}`);
	if (!obj) return new Response("not found", { status: 404 });
	return new Response(obj.body, {
		headers: {
			"content-type": obj.httpMetadata?.contentType || "application/octet-stream",
		},
	});
}

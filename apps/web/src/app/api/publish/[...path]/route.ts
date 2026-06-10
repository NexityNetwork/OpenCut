import { getCloudflareContext } from "@opennextjs/cloudflare";

// Proxies the publishing center UI to the ultron-publish satellite worker,
// injecting the PUBLISH_KEY server-side so it never reaches the browser.
function readEnv(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		// not on Cloudflare
	}
	return process.env[name] ?? "";
}

const DEFAULT_BASE = "https://ultron-publish.catalin-932.workers.dev";

async function proxy(request: Request, path: string[]) {
	const base = (readEnv("PUBLISH_URL") || DEFAULT_BASE).replace(/\/+$/, "");
	const key = readEnv("PUBLISH_KEY");
	const url = new URL(request.url);
	const target = `${base}/${path.join("/")}${url.search}`;

	const headers: Record<string, string> = {
		"content-type": request.headers.get("content-type") || "application/json",
	};
	// The satellite gates on a bearer/api-key; send all known header shapes.
	if (key) {
		headers.authorization = `Bearer ${key}`;
		headers["x-api-key"] = key;
		headers["x-ultron-api-key"] = key;
	}
	// Multi-tenant: tell the satellite WHICH user this is, derived server-side
	// from the session (never client-supplied) so everyone sees only their own
	// channels / queue / inbox.
	try {
		const { createAuth } = await import("@/auth/server");
		const session = await createAuth().api.getSession({
			headers: request.headers,
		});
		if (session?.user?.id) headers["x-ultron-owner"] = session.user.id;
	} catch {
		/* no session — satellite treats as legacy/all */
	}

	const init: RequestInit = { method: request.method, headers };
	if (request.method !== "GET" && request.method !== "HEAD") {
		init.body = await request.text();
	}

	let r: Response;
	try {
		r = await fetch(target, init);
	} catch {
		return Response.json(
			{ error: "publish engine unreachable" },
			{ status: 502 },
		);
	}
	const body = await r.text();
	return new Response(body, {
		status: r.status,
		headers: {
			"content-type": r.headers.get("content-type") || "application/json",
		},
	});
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, { params }: Ctx) {
	const { path = [] } = await params;
	return proxy(request, path);
}
export async function POST(request: Request, { params }: Ctx) {
	const { path = [] } = await params;
	return proxy(request, path);
}
export async function DELETE(request: Request, { params }: Ctx) {
	const { path = [] } = await params;
	return proxy(request, path);
}
export async function PUT(request: Request, { params }: Ctx) {
	const { path = [] } = await params;
	return proxy(request, path);
}

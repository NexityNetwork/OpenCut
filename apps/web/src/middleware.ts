import { NextResponse, type NextRequest } from "next/server";

// Custom bio domains: visitors arrive with Host = their domain (via the
// bio-edge fallback origin). Rewrite those requests to /biodomain/<host>,
// which looks the domain up and renders the owner's bio page. The primary
// app hosts pass straight through; /api and assets are excluded by the
// matcher so click-tracking and uploads work on custom domains too.

const PRIMARY_HOSTS = new Set([
	"edits.51ultron.com",
	"bio-edge.51ultron.com",
	"localhost:3000",
	"localhost:8787",
]);

export const config = {
	matcher: ["/((?!api|_next|favicon|.*\\..*).*)"],
};

export function middleware(req: NextRequest) {
	const host = (req.headers.get("host") || "").toLowerCase();
	if (
		!host ||
		PRIMARY_HOSTS.has(host) ||
		host.endsWith(".workers.dev") ||
		host.endsWith(".51ultron.com")
	) {
		return NextResponse.next();
	}
	const url = req.nextUrl.clone();
	url.pathname = `/biodomain/${host}`;
	return NextResponse.rewrite(url);
}

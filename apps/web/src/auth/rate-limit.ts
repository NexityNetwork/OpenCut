// Best-effort feedback rate-limit. The previous implementation talked to
// Upstash Redis, but this deployment only has placeholder Upstash creds, which
// would make every call throw. Until a real Upstash (or D1-backed) limiter is
// wired, this is a safe no-op so the feedback endpoint never 500s. better-auth
// has its own built-in rate limiting for the auth routes.
export async function checkRateLimit(_: { request: Request }) {
	return { success: true, limited: false };
}

import { createAuth } from "@/auth/server";

// Auth instance is built per request because its D1 binding/secrets only exist
// inside the Cloudflare request context. better-auth's handler covers every
// sub-path and method under /api/auth/*.
const handler = (request: Request) => createAuth().handler(request);

export { handler as GET, handler as POST };

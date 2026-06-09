import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

type AuthEnv = {
	VAULT_DB?: unknown;
	BETTER_AUTH_SECRET?: string;
	NEXT_PUBLIC_SITE_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
};

// Built per request: D1 and secrets come from the Cloudflare request context,
// not module-load env. Google turns itself on automatically the moment
// GOOGLE_CLIENT_ID/SECRET exist as Worker secrets — no code change needed.
export function createAuth() {
	const { env } = getCloudflareContext();
	const e = env as unknown as AuthEnv;
	const db = drizzle(e.VAULT_DB as Parameters<typeof drizzle>[0], { schema });
	const baseURL = e.NEXT_PUBLIC_SITE_URL ?? "https://edits.51ultron.com";
	const hasGoogle = Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);

	return betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", usePlural: true }),
		secret: e.BETTER_AUTH_SECRET,
		baseURL,
		appName: "Ultron Monolith",
		trustedOrigins: [baseURL],
		emailAndPassword: { enabled: true },
		user: { deleteUser: { enabled: true } },
		...(hasGoogle
			? {
					socialProviders: {
						google: {
							clientId: e.GOOGLE_CLIENT_ID as string,
							clientSecret: e.GOOGLE_CLIENT_SECRET as string,
						},
					},
				}
			: {}),
	});
}

export type Auth = ReturnType<typeof createAuth>;

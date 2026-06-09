import { createAuthClient } from "better-auth/react";

// Client-side only: read the public site URL directly from the inlined env so
// this never pulls server-only env (DATABASE_URL, secrets) into the browser
// bundle the way importing the full webEnv schema would.
export const { signIn, signUp, signOut, useSession } = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://edits.51ultron.com",
});

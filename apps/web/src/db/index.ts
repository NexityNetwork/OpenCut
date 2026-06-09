import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

// D1 is a per-request binding (only available inside a request via the
// Cloudflare context), so the Drizzle client is resolved per call rather than
// at module load. The auth tables live alongside the Vault in the opencut-vault
// D1 database (binding: VAULT_DB).
export function getDb() {
	const { env } = getCloudflareContext();
	const d1 = (env as unknown as { VAULT_DB?: unknown }).VAULT_DB;
	if (!d1) {
		throw new Error("D1 binding VAULT_DB is not available");
	}
	return drizzle(d1 as Parameters<typeof drizzle>[0], { schema });
}

export * from "./schema";

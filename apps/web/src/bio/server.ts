// Server-side helpers shared by the bio API routes and the SSR public page.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/auth/server";

export type BioD1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};

export function bioDb(): BioD1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: BioD1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}

let ensured = false;
export async function ensureBioTables(d: BioD1) {
	if (ensured) return;
	const stmts = [
		`CREATE TABLE IF NOT EXISTS bio_pages (
       owner TEXT PRIMARY KEY, handle TEXT UNIQUE, data TEXT NOT NULL,
       published INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS bio_stats (
       owner TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL,
       key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
       PRIMARY KEY (owner, day, kind, key))`,
		`CREATE TABLE IF NOT EXISTS bio_leads (
       id TEXT PRIMARY KEY, owner TEXT NOT NULL, handle TEXT NOT NULL,
       email TEXT NOT NULL, created_at INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS bio_domains (
       domain TEXT PRIMARY KEY, owner TEXT NOT NULL, ch_id TEXT,
       status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)`,
	];
	try {
		for (const q of stmts) await d.prepare(q).bind().run();
		ensured = true;
	} catch {
		/* tables likely exist */
	}
}

export async function sessionUserId(request: Request): Promise<string | null> {
	try {
		const auth = createAuth();
		const s = await auth.api.getSession({ headers: request.headers });
		return s?.user?.id ?? null;
	} catch {
		return null;
	}
}

export function utcDay(ts = Date.now()): string {
	return new Date(ts).toISOString().slice(0, 10);
}

/** Fire-and-forget stat increment (rolled up per owner/day/kind/key). */
export function bumpStat(
	d: BioD1,
	{ owner, kind, key }: { owner: string; kind: string; key: string },
): Promise<unknown> {
	return d
		.prepare(
			`INSERT INTO bio_stats (owner, day, kind, key, n) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(owner, day, kind, key) DO UPDATE SET n = n + 1`,
		)
		.bind(owner, utcDay(), kind, key.slice(0, 80))
		.run();
}

export function waitUntil(p: Promise<unknown>) {
	try {
		const { ctx } = getCloudflareContext();
		ctx.waitUntil(p.catch(() => {}));
	} catch {
		void p.catch(() => {});
	}
}

export const RESERVED_HANDLES = new Set([
	"admin",
	"api",
	"app",
	"bio",
	"blog",
	"dashboard",
	"editor",
	"help",
	"home",
	"login",
	"me",
	"monolith",
	"projects",
	"publish",
	"root",
	"settings",
	"support",
	"ultron",
	"www",
]);

// ----- Cloudflare for SaaS (custom hostnames) -----

type CfSaaSEnv = {
	CF_API_EMAIL?: string;
	CF_API_KEY?: string;
	CF_ZONE_BIO?: string;
	BIO_FALLBACK_HOST?: string;
};

function cfCreds(): { email: string; key: string; zone: string; fallback: string } | null {
	try {
		const { env } = getCloudflareContext();
		const e = env as unknown as CfSaaSEnv;
		if (!e.CF_API_EMAIL || !e.CF_API_KEY || !e.CF_ZONE_BIO) return null;
		return {
			email: e.CF_API_EMAIL,
			key: e.CF_API_KEY,
			zone: e.CF_ZONE_BIO,
			fallback: e.BIO_FALLBACK_HOST ?? "bio-edge.51ultron.com",
		};
	} catch {
		return null;
	}
}

async function cfApi(path: string, init: RequestInit = {}) {
	const c = cfCreds();
	if (!c) throw new Error("custom domains not configured");
	const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${c.zone}${path}`, {
		...init,
		headers: {
			"X-Auth-Email": c.email,
			"X-Auth-Key": c.key,
			"content-type": "application/json",
			...(init.headers as Record<string, string> | undefined),
		},
	});
	const body = (await r.json().catch(() => ({}))) as {
		success?: boolean;
		result?: Record<string, unknown>;
		errors?: { message?: string }[];
	};
	if (!body.success) {
		throw new Error(body.errors?.[0]?.message || `Cloudflare API ${r.status}`);
	}
	return body.result as Record<string, unknown>;
}

export function bioFallbackHost(): string {
	return cfCreds()?.fallback ?? "bio-edge.51ultron.com";
}

let fallbackEnsured = false;
async function ensureFallbackOrigin() {
	if (fallbackEnsured) return;
	const c = cfCreds();
	if (!c) return;
	try {
		await cfApi("/custom_hostnames/fallback_origin", {
			method: "PUT",
			body: JSON.stringify({ origin: c.fallback }),
		});
	} catch {
		/* best-effort — surfaces on hostname create if truly broken */
	}
	fallbackEnsured = true;
}

export async function createCustomHostname(domain: string) {
	await ensureFallbackOrigin();
	const r = await cfApi("/custom_hostnames", {
		method: "POST",
		body: JSON.stringify({
			hostname: domain,
			ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
		}),
	});
	return { id: String(r.id ?? ""), status: String(r.status ?? "pending") };
}

export async function getCustomHostname(chId: string) {
	const r = await cfApi(`/custom_hostnames/${chId}`);
	const ssl = (r.ssl ?? {}) as Record<string, unknown>;
	return {
		status: String(r.status ?? "pending"),
		sslStatus: String(ssl.status ?? "pending"),
	};
}

export async function deleteCustomHostname(chId: string) {
	await cfApi(`/custom_hostnames/${chId}`, { method: "DELETE" });
}

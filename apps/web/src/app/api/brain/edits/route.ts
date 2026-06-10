import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Brain, editor-driver slice. An AI/automation enqueues a declarative
// "edit recipe" headlessly; the browser materializes it into a real project
// using the same proven builders the editor uses (so media binds and the doc
// is always valid — no fragile hand-serialized JSON). One tool, every edit.

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
		};
	};
};

function env(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		/* not on CF */
	}
	return process.env[name] ?? "";
}

function db(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: D1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}

let ensured = false;
async function ensure(d: D1) {
	if (ensured) return;
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS brain_edit_jobs (
         id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT,
         source_vault_id TEXT, spec TEXT NOT NULL DEFAULT '{}',
         status TEXT NOT NULL DEFAULT 'pending', result_project_id TEXT,
         error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
		)
		.bind()
		.run();
	ensured = true;
}

async function sessionOwner(request: Request): Promise<string | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const s = await createAuth().api.getSession({ headers: request.headers });
		return s?.user?.id ?? null;
	} catch {
		return null;
	}
}

function keyed(request: Request): boolean {
	const key = env("PUBLISH_KEY");
	if (!key) return false;
	const h =
		request.headers.get("x-ultron-api-key") ||
		(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
	return h === key;
}

// Enqueue an edit recipe. Dual-auth: a signed-in user (browser) OR the
// publish key (the AI/automation, server-to-server).
export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const session = await sessionOwner(request);
	const isKeyed = keyed(request);
	if (!session && !isKeyed) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	const owner = session ?? String(b.owner || "").trim();
	if (!owner) return Response.json({ error: "owner required" }, { status: 400 });
	if (!b.source_vault_id) {
		return Response.json({ error: "source_vault_id required" }, { status: 400 });
	}
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const id = crypto.randomUUID();
	const now = Date.now();
	await d
		.prepare(
			`INSERT INTO brain_edit_jobs (id, owner, name, source_vault_id, spec, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
		)
		.bind(
			id,
			owner,
			String(b.name || "AI edit"),
			String(b.source_vault_id),
			JSON.stringify(b.spec ?? {}),
			now,
			now,
		)
		.run();
	return Response.json({ ok: true, id });
}

export async function GET(request: Request) {
	const u = new URL(request.url);
	const session = await sessionOwner(request);
	const owner = session ?? u.searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ jobs: [] });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const status = u.searchParams.get("status") || "pending";
	const rows = await d
		.prepare(
			"SELECT * FROM brain_edit_jobs WHERE owner = ? AND status = ? ORDER BY created_at ASC LIMIT 25",
		)
		.bind(owner, status)
		.all();
	return Response.json({
		jobs: (rows.results ?? []).map((r) => ({
			...r,
			spec: (() => {
				try {
					return JSON.parse(String(r.spec));
				} catch {
					return {};
				}
			})(),
		})),
	});
}

export async function PATCH(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const id = String(b.id || "");
	if (!id) return Response.json({ error: "id required" }, { status: 400 });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	await d
		.prepare(
			"UPDATE brain_edit_jobs SET status = ?, result_project_id = ?, error = ?, updated_at = ? WHERE id = ?",
		)
		.bind(
			String(b.status || "done"),
			b.result_project_id ? String(b.result_project_id) : null,
			b.error ? String(b.error) : null,
			Date.now(),
			id,
		)
		.run();
	return Response.json({ ok: true });
}

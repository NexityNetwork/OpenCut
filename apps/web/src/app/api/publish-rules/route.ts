import { getCloudflareContext } from "@opennextjs/cloudflare";

// Recurring queue rules CRUD. Rules live in the publish DB; the satellite's
// per-minute cron fills upcoming slots from the owner's vault section.

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};

function db(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { PUBLISH_DB?: D1 }).PUBLISH_DB;
	} catch {
		return undefined;
	}
}

let ensured = false;
async function ensure(d: D1) {
	if (ensured) return;
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS queue_rules (
         id TEXT PRIMARY KEY, owner TEXT NOT NULL, platform TEXT NOT NULL,
         channel_label TEXT, section TEXT NOT NULL, slots TEXT NOT NULL,
         caption_mode TEXT NOT NULL DEFAULT 'item',
         active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
		)
		.bind()
		.run();
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS rule_fills (
         rule_id TEXT NOT NULL, item_id TEXT NOT NULL, queue_id TEXT,
         created_at INTEGER NOT NULL, PRIMARY KEY (rule_id, item_id))`,
		)
		.bind()
		.run();
	ensured = true;
}

const SLOT_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export async function GET(request: Request) {
	const owner = new URL(request.url).searchParams.get("owner") || "";
	if (!owner) return Response.json({ rules: [] });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const r = await d
		.prepare(
			`SELECT r.*, (SELECT COUNT(*) FROM rule_fills f WHERE f.rule_id = r.id) AS filled
       FROM queue_rules r WHERE r.owner = ? ORDER BY r.created_at DESC`,
		)
		.bind(owner)
		.all();
	return Response.json({
		rules: (r.results ?? []).map((row) => ({
			...row,
			slots: JSON.parse(String(row.slots)),
			active: !!row.active,
		})),
	});
}

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const platform = String(b.platform || "").toLowerCase();
	const section = String(b.section || "").trim();
	const slots = (Array.isArray(b.slots) ? b.slots : [])
		.map((s) => String(s).trim())
		.filter((s) => SLOT_RE.test(s));
	if (!owner || !platform || !section || slots.length === 0) {
		return Response.json(
			{ error: "owner, platform, section and at least one HH:MM slot required" },
			{ status: 400 },
		);
	}
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const id = crypto.randomUUID();
	await d
		.prepare(
			`INSERT INTO queue_rules (id, owner, platform, channel_label, section, slots, caption_mode, active, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, 'item', 1, ?)`,
		)
		.bind(id, owner, platform, section, JSON.stringify([...new Set(slots)]), Date.now())
		.run();
	return Response.json({ ok: true, id });
}

export async function PATCH(request: Request) {
	const b = (await request.json().catch(() => ({}))) as {
		id?: string;
		active?: boolean;
	};
	const id = String(b.id || "");
	if (!id) return Response.json({ error: "id required" }, { status: 400 });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	await d
		.prepare("UPDATE queue_rules SET active = ? WHERE id = ?")
		.bind(b.active ? 1 : 0, id)
		.run();
	return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
	const id = new URL(request.url).searchParams.get("id") || "";
	if (!id) return Response.json({ error: "id required" }, { status: 400 });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	await d.prepare("DELETE FROM queue_rules WHERE id = ?").bind(id).run();
	await d.prepare("DELETE FROM rule_fills WHERE rule_id = ?").bind(id).run();
	return Response.json({ ok: true });
}

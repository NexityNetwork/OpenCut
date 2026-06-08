import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1 = {
	prepare: (q: string) => {
		bind: (...args: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};

function db(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: D1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}

function safeJson<T>(s: unknown, fallback: T): T {
	if (typeof s !== "string") return fallback;
	try {
		return JSON.parse(s) as T;
	} catch {
		return fallback;
	}
}

function rowToItem(r: Record<string, unknown>) {
	return {
		id: r.id,
		kind: r.kind,
		name: r.name,
		source: r.source,
		durationSec: r.duration_sec,
		thumbKey: r.thumb_key,
		thumbUrl: r.thumb_url,
		media: safeJson(r.media, [] as unknown[]),
		tags: safeJson(r.tags, [] as string[]),
		createdAt: r.created_at,
	};
}

export async function GET(request: Request) {
	const owner = new URL(request.url).searchParams.get("owner") || "";
	if (!owner) return Response.json({ items: [] });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const { results } = await d
		.prepare(
			"SELECT * FROM vault_items WHERE owner = ? ORDER BY created_at DESC LIMIT 500",
		)
		.bind(owner)
		.all();
	return Response.json({ items: (results || []).map(rowToItem) });
}

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const media = b.media;
	if (!owner || !b.kind || !Array.isArray(media) || media.length === 0) {
		return Response.json({ error: "bad item" }, { status: 400 });
	}
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	const id = String(b.id || crypto.randomUUID());
	await d
		.prepare(
			`INSERT INTO vault_items
       (id, owner, kind, name, source, duration_sec, thumb_key, thumb_url, media, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			owner,
			String(b.kind),
			String(b.name || ""),
			String(b.source || ""),
			typeof b.durationSec === "number" ? b.durationSec : null,
			b.thumbKey ? String(b.thumbKey) : null,
			b.thumbUrl ? String(b.thumbUrl) : null,
			JSON.stringify(media),
			JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
			Date.now(),
		)
		.run();
	return Response.json({ ok: true, id });
}

export async function DELETE(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const id = u.searchParams.get("id") || "";
	if (!owner || !id) return Response.json({ error: "bad request" }, { status: 400 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	await d
		.prepare("DELETE FROM vault_items WHERE owner = ? AND id = ?")
		.bind(owner, id)
		.run();
	return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const id = String(b.id || "");
	const name = String(b.name || "");
	if (!owner || !id) return Response.json({ error: "bad request" }, { status: 400 });
	const d = db();
	if (!d) return Response.json({ error: "vault not configured" }, { status: 503 });
	await d
		.prepare("UPDATE vault_items SET name = ? WHERE owner = ? AND id = ?")
		.bind(name, owner, id)
		.run();
	return Response.json({ ok: true });
}

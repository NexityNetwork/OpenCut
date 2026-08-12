import { getCloudflareContext } from "@opennextjs/cloudflare";

// Owner-only store for short reusable text: hooks, captions, and whatever list
// comes next. ONE table with a `bucket` column rather than a table per list, so
// adding a third list is a query string and never another deploy - which is the
// whole point of moving these out of a JSON file in the repo.
const OWNER_EMAIL = "catalin@nexitynetwork.org";

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

async function gate(request: Request): Promise<{ id: string } | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const session = await createAuth().api.getSession({
			headers: request.headers,
		});
		const user = session?.user;
		if (user?.email === OWNER_EMAIL && user?.id) return { id: user.id };
	} catch {
		/* no session */
	}
	return null;
}

function row(r: Record<string, unknown>) {
	return {
		id: String(r.id ?? ""),
		bucket: String(r.bucket ?? ""),
		ref: (r.ref as string) ?? "",
		text: String(r.text ?? ""),
		kind: (r.kind as string) ?? "",
		source: (r.source as string) ?? "",
		deck: (r.deck as string) ?? "",
		note: (r.note as string) ?? "",
		status: (r.status as string) ?? "raw",
		sortOrder: Number(r.sort_order ?? 0),
		createdAt: Number(r.created_at ?? 0),
	};
}

const uid = () =>
	`s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function GET(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ snippets: [] }, { status: 403 });
	const d = db();
	if (!d)
		return Response.json({ error: "vault not configured" }, { status: 503 });
	const bucket = new URL(request.url).searchParams.get("bucket") || "hook";
	const { results } = await d
		.prepare(
			"SELECT * FROM snippets WHERE owner = ? AND bucket = ? ORDER BY sort_order ASC, created_at ASC",
		)
		.bind(me.id, bucket)
		.all();
	return Response.json({ snippets: (results || []).map(row) });
}

// Accepts one snippet or an array of them, so a whole dump lands in one call.
export async function POST(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
	const d = db();
	if (!d)
		return Response.json({ error: "vault not configured" }, { status: 503 });
	const body = (await request.json().catch(() => ({}))) as
		| Record<string, unknown>
		| { snippets?: Record<string, unknown>[] };
	const list = Array.isArray((body as { snippets?: unknown[] }).snippets)
		? ((body as { snippets: Record<string, unknown>[] }).snippets)
		: [body as Record<string, unknown>];

	const now = Date.now();
	const made: ReturnType<typeof row>[] = [];
	for (let i = 0; i < list.length; i++) {
		const s = list[i];
		const text = String(s.text ?? "").trim();
		if (!text) continue;
		const id = String(s.id || uid());
		const rec = {
			id,
			owner: me.id,
			bucket: String(s.bucket || "hook"),
			ref: String(s.ref ?? ""),
			text,
			kind: String(s.kind ?? ""),
			source: String(s.source ?? ""),
			deck: String(s.deck ?? ""),
			note: String(s.note ?? ""),
			status: String(s.status || "raw"),
			sort_order: Number(s.sortOrder ?? now + i),
			created_at: now + i,
			updated_at: now + i,
		};
		await d
			.prepare(
				"INSERT OR REPLACE INTO snippets (id,owner,bucket,ref,text,kind,source,deck,note,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
			)
			.bind(
				rec.id,
				rec.owner,
				rec.bucket,
				rec.ref,
				rec.text,
				rec.kind,
				rec.source,
				rec.deck,
				rec.note,
				rec.status,
				rec.sort_order,
				rec.created_at,
				rec.updated_at,
			)
			.run();
		made.push(row(rec as unknown as Record<string, unknown>));
	}
	return Response.json({ ok: true, snippets: made });
}

const FIELDS = ["text", "kind", "source", "deck", "note", "status", "ref"] as const;

export async function PATCH(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
	const d = db();
	if (!d)
		return Response.json({ error: "vault not configured" }, { status: 503 });
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const id = String(b.id || "");
	if (!id) return Response.json({ error: "bad request" }, { status: 400 });
	const sets: string[] = [];
	const vals: unknown[] = [];
	for (const f of FIELDS) {
		if (b[f] !== undefined) {
			sets.push(`${f} = ?`);
			vals.push(String(b[f]));
		}
	}
	if (!sets.length) return Response.json({ error: "nothing to set" }, { status: 400 });
	sets.push("updated_at = ?");
	vals.push(Date.now(), me.id, id);
	await d
		.prepare(`UPDATE snippets SET ${sets.join(", ")} WHERE owner = ? AND id = ?`)
		.bind(...vals)
		.run();
	return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
	const me = await gate(request);
	if (!me) return Response.json({ error: "forbidden" }, { status: 403 });
	const d = db();
	if (!d)
		return Response.json({ error: "vault not configured" }, { status: 503 });
	const id = new URL(request.url).searchParams.get("id") || "";
	if (!id) return Response.json({ error: "bad request" }, { status: 400 });
	await d
		.prepare("DELETE FROM snippets WHERE owner = ? AND id = ?")
		.bind(me.id, id)
		.run();
	return Response.json({ ok: true });
}

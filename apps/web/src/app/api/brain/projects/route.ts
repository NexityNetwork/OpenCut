import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Brain, editor slice — server-side mirror of editor/canvas project
// documents. Projects are authored in the browser (IndexedDB), so the client
// pushes the serialized document here on save; this stores the full doc plus
// a compact queryable summary (scenes, element counts, text contents, fonts).

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
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

let ensured = false;
async function ensure(d: D1) {
	if (ensured) return;
	await d
		.prepare(
			`CREATE TABLE IF NOT EXISTS brain_projects (
         id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT,
         kind TEXT NOT NULL DEFAULT 'editor', updated_at INTEGER,
         doc TEXT, doc_truncated INTEGER NOT NULL DEFAULT 0,
         summary TEXT, synced_at INTEGER NOT NULL)`,
		)
		.bind()
		.run();
	ensured = true;
}

async function sessionOwner(request: Request): Promise<string | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const session = await createAuth().api.getSession({
			headers: request.headers,
		});
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

const MAX_DOC_CHARS = 900_000; // stay well under D1's row ceiling

type AnyRec = Record<string, unknown>;

// A scene's `tracks` is an object keyed by lane — { overlay: Track[], main:
// Track, audio: Track[] } — where some lanes are arrays of tracks and `main`
// is a single track. (It can also be a bare array in older docs.) Flatten any
// of those shapes into the list of track objects.
function flattenTracks(tracks: unknown): AnyRec[] {
	const out: AnyRec[] = [];
	const add = (t: unknown) => {
		if (t && typeof t === "object" && Array.isArray((t as AnyRec).elements)) {
			out.push(t as AnyRec);
		}
	};
	if (Array.isArray(tracks)) {
		for (const t of tracks) add(t);
	} else if (tracks && typeof tracks === "object") {
		for (const lane of Object.values(tracks as AnyRec)) {
			if (Array.isArray(lane)) for (const t of lane) add(t);
			else add(lane);
		}
	}
	return out;
}

// Walk scenes -> tracks -> elements and distill what makes a project
// findable/editable by an AI: element mix, every text string, fonts used.
function summarize(doc: AnyRec): AnyRec {
	const meta = (doc.metadata ?? {}) as AnyRec;
	const settings = (doc.settings ?? {}) as AnyRec;
	const scenes = Array.isArray(doc.scenes) ? (doc.scenes as AnyRec[]) : [];
	const byType: Record<string, number> = {};
	const texts: string[] = [];
	const fonts = new Set<string>();
	let elementCount = 0;
	for (const scene of scenes) {
		for (const track of flattenTracks(scene.tracks)) {
			const elements = track.elements as AnyRec[];
			for (const el of elements) {
				elementCount++;
				const t = String(el.type ?? "unknown");
				byType[t] = (byType[t] ?? 0) + 1;
				const params = (el.params ?? {}) as AnyRec;
				const content = params.content ?? params.text;
				if (typeof content === "string" && content.trim() && texts.length < 60) {
					texts.push(content.slice(0, 120));
				}
				if (typeof params.fontFamily === "string") fonts.add(params.fontFamily);
			}
		}
	}
	return {
		is_canvas: !!meta.isCanvas,
		is_template: !!meta.isTemplate,
		published_item_id: meta.publishedItemId ?? null,
		scenes: scenes.length,
		elements: elementCount,
		elements_by_type: byType,
		texts,
		fonts: [...fonts],
		canvas_size: settings.canvasSize ?? null,
		fps: settings.fps ?? null,
	};
}

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as {
		project?: AnyRec;
		owner?: string;
	};
	const doc = b.project;
	const meta = (doc?.metadata ?? {}) as AnyRec;
	const id = typeof meta.id === "string" ? meta.id : "";
	if (!doc || !id) {
		return Response.json({ error: "project document required" }, { status: 400 });
	}
	const owner = (await sessionOwner(request)) ?? String(b.owner || "").trim();
	if (!owner) return Response.json({ error: "owner required" }, { status: 401 });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);

	const summary = summarize(doc);
	let docJson: string | null = JSON.stringify(doc);
	let truncated = 0;
	if (docJson.length > MAX_DOC_CHARS) {
		docJson = null; // too big for a D1 row — the summary still lands
		truncated = 1;
	}
	const updatedAt = Date.parse(String(meta.updatedAt ?? "")) || Date.now();
	const kind = meta.isTemplate ? "template" : meta.isCanvas ? "canvas" : "editor";

	await d
		.prepare(
			`INSERT INTO brain_projects (id, owner, name, kind, updated_at, doc, doc_truncated, summary, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner = excluded.owner, name = excluded.name, kind = excluded.kind,
         updated_at = excluded.updated_at, doc = excluded.doc,
         doc_truncated = excluded.doc_truncated, summary = excluded.summary,
         synced_at = excluded.synced_at`,
		)
		.bind(
			id,
			owner,
			String(meta.name ?? ""),
			kind,
			updatedAt,
			docJson,
			truncated,
			JSON.stringify(summary),
			Date.now(),
		)
		.run();
	return Response.json({ ok: true, id, truncated: !!truncated });
}

export async function GET(request: Request) {
	const u = new URL(request.url);
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensure(d);
	const owner =
		(await sessionOwner(request)) ?? u.searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ projects: [] });

	const id = u.searchParams.get("id");
	if (id) {
		const row = await d
			.prepare("SELECT * FROM brain_projects WHERE owner = ? AND id = ?")
			.bind(owner, id)
			.first<Record<string, unknown>>();
		if (!row) return Response.json({ project: null });
		return Response.json({
			project: {
				...row,
				doc: row.doc ? JSON.parse(String(row.doc)) : null,
				summary: row.summary ? JSON.parse(String(row.summary)) : null,
			},
		});
	}

	const rows = await d
		.prepare(
			"SELECT id, name, kind, updated_at, doc_truncated, summary, synced_at FROM brain_projects WHERE owner = ? ORDER BY updated_at DESC LIMIT 200",
		)
		.bind(owner)
		.all();
	return Response.json({
		projects: (rows.results ?? []).map((r) => ({
			...r,
			summary: r.summary ? JSON.parse(String(r.summary)) : null,
		})),
	});
}

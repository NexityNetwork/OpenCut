import { getCloudflareContext } from "@opennextjs/cloudflare";

// Real Home dashboard data: an activity feed (publish events + library
// imports) and a 30-day publishing series straight from the queue.

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
		};
	};
};

function dbs(): { vault?: D1; publish?: D1 } {
	try {
		const { env } = getCloudflareContext();
		const e = env as unknown as { VAULT_DB?: D1; PUBLISH_DB?: D1 };
		return { vault: e.VAULT_DB, publish: e.PUBLISH_DB };
	} catch {
		return {};
	}
}

function ago(ts: number): string {
	const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
	if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	return `${Math.floor(s / 86400)}d ago`;
}

export async function GET(request: Request) {
	const u = new URL(request.url);
	const owner = u.searchParams.get("owner") || "";
	const includePublish = u.searchParams.get("publish") === "1";
	const { vault, publish } = dbs();

	const feed: { what: string; who: string; ts: number }[] = [];

	if (vault && owner) {
		const items = await vault
			.prepare(
				"SELECT name, kind, source, created_at FROM vault_items WHERE owner = ? ORDER BY created_at DESC LIMIT 12",
			)
			.bind(owner)
			.all();
		for (const r of items.results ?? []) {
			feed.push({
				what: `Imported "${String(r.name).slice(0, 44)}"`,
				who: String(r.source || r.kind || "library").toLowerCase(),
				ts: Number(r.created_at) || 0,
			});
		}
	}

	let series: { day: string; n: number }[] = [];
	let platforms: { platform: string; n: number }[] = [];
	let counts = { published30: 0, queued: 0, failed30: 0 };
	if (publish && includePublish) {
		const since = Date.now() - 30 * 86400_000;
		const events = await publish
			.prepare(
				`SELECT kind, payload_json, ts FROM publish_events
         WHERE kind IN ('upload_success','upload_fail','enqueued')
         ORDER BY ts DESC LIMIT 25`,
			)
			.bind()
			.all();
		for (const e of events.results ?? []) {
			let p: Record<string, unknown> = {};
			try {
				p = JSON.parse(String(e.payload_json));
			} catch {
				/* ignore */
			}
			const platform = String(p.platform || "publish");
			const what =
				e.kind === "upload_success"
					? `Published to ${platform}`
					: e.kind === "upload_fail"
						? `Upload failed on ${platform}`
						: `Queued ${String(p.slug || "a post").slice(0, 30)}`;
			feed.push({ what, who: platform, ts: Number(e.ts) || 0 });
		}

		const days = await publish
			.prepare(
				`SELECT date(published_at/1000,'unixepoch') AS day, COUNT(*) AS n
         FROM content_queue WHERE status='published' AND published_at > ?
         GROUP BY day ORDER BY day ASC`,
			)
			.bind(since)
			.all();
		series = (days.results ?? []).map((r) => ({
			day: String(r.day),
			n: Number(r.n) || 0,
		}));

		const pub30 = await publish
			.prepare(
				"SELECT COUNT(*) AS n FROM content_queue WHERE status='published' AND published_at > ?",
			)
			.bind(since)
			.first<{ n: number }>();
		const queued = await publish
			.prepare("SELECT COUNT(*) AS n FROM content_queue WHERE status='queued'")
			.bind()
			.first<{ n: number }>();
		const failed30 = await publish
			.prepare(
				"SELECT COUNT(*) AS n FROM content_queue WHERE status='failed' AND updated_at > ?",
			)
			.bind(since)
			.first<{ n: number }>();
		counts = {
			published30: pub30?.n ?? 0,
			queued: queued?.n ?? 0,
			failed30: failed30?.n ?? 0,
		};

		const byPlatform = await publish
			.prepare(
				`SELECT platform, COUNT(*) AS n FROM content_queue
         WHERE status='published' AND published_at > ?
         GROUP BY platform ORDER BY n DESC`,
			)
			.bind(since)
			.all();
		platforms = (byPlatform.results ?? []).map((r) => ({
			platform: String(r.platform),
			n: Number(r.n) || 0,
		}));
	}

	feed.sort((a, b) => b.ts - a.ts);
	return Response.json({
		feed: feed.slice(0, 25).map((f) => ({ ...f, when: ago(f.ts) })),
		series,
		platforms,
		counts,
	});
}

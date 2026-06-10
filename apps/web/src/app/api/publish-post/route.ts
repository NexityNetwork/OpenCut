import { getCloudflareContext } from "@opennextjs/cloudflare";

// Creates posts by inserting rows straight into the publishing engine's
// content_queue (ultron-publish-db). The satellite's per-minute cron then
// dispatches anything with status='queued' AND scheduled_for <= now to the
// matching active channel — so this is all it takes to schedule a real post.

type D1Result = { results?: Record<string, unknown>[]; meta?: { changes?: number } };
type D1 = {
	prepare: (q: string) => {
		bind: (...args: unknown[]) => {
			run: () => Promise<D1Result>;
			all: () => Promise<D1Result>;
			first: <T = Record<string, unknown>>() => Promise<T | null>;
		};
	};
};

function dbs(): { vault?: D1; publish?: D1; siteUrl?: string } {
	try {
		const { env } = getCloudflareContext();
		const e = env as unknown as {
			VAULT_DB?: D1;
			PUBLISH_DB?: D1;
			NEXT_PUBLIC_SITE_URL?: string;
		};
		return { vault: e.VAULT_DB, publish: e.PUBLISH_DB, siteUrl: e.NEXT_PUBLIC_SITE_URL };
	} catch {
		return {};
	}
}

// D1 occasionally throws a transient "storage operation exceeded timeout"
// under contention (the publish cron writes the same table every minute).
// Retry those a couple times before surfacing a failure.
async function d1Retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
	let last: unknown;
	for (let i = 0; i < tries; i++) {
		try {
			return await fn();
		} catch (e) {
			last = e;
			const msg = e instanceof Error ? e.message : String(e);
			if (!/timeout|reset|storage operation|network/i.test(msg)) throw e;
			await new Promise((r) => setTimeout(r, 250 * (i + 1)));
		}
	}
	throw last;
}

function slugify(s: string): string {
	return (
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 48) || "post"
	);
}

type PlatformName = "youtube" | "instagram" | "tiktok";
const PLATFORMS: PlatformName[] = ["youtube", "instagram", "tiktok"];

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const owner = String(b.owner || "").trim();
	const itemId = String(b.itemId || "").trim();
	const platforms = (Array.isArray(b.platforms) ? b.platforms : [])
		.map((p) => String(p).toLowerCase())
		.filter((p): p is PlatformName => PLATFORMS.includes(p as PlatformName));
	const scheduledFor = Number(b.scheduledFor);

	if (!owner || !itemId) {
		return Response.json({ error: "owner and itemId required" }, { status: 400 });
	}
	if (platforms.length === 0) {
		return Response.json({ error: "pick at least one channel" }, { status: 400 });
	}
	if (!Number.isFinite(scheduledFor) || scheduledFor <= 0) {
		return Response.json({ error: "invalid schedule time" }, { status: 400 });
	}

	const { vault, publish, siteUrl } = dbs();
	if (!vault || !publish) {
		return Response.json({ error: "publishing not configured" }, { status: 503 });
	}

	// Look the item up under its owner so we only ever publish media the
	// account actually holds, and resolve a public URL the engine can fetch.
	const item = await d1Retry(() =>
		vault
			.prepare(
				"SELECT kind, media, name, caption FROM vault_items WHERE owner = ? AND id = ?",
			)
			.bind(owner, itemId)
			.first<{
				kind: string;
				media: string;
				name: string;
				caption: string | null;
			}>(),
	);
	if (!item) return Response.json({ error: "item not found" }, { status: 404 });
	if (item.kind === "carousel" || item.kind === "pdf") {
		return Response.json(
			{ error: "carousels and PDFs publish to LinkedIn — coming soon" },
			{ status: 400 },
		);
	}

	let media: { key?: string; type?: string }[] = [];
	try {
		media = JSON.parse(item.media) as typeof media;
	} catch {
		/* leave empty */
	}
	const videoKey = media.find((m) => m.type === "video")?.key;
	const imageKey = videoKey ? null : media.find((m) => m.type === "image")?.key;
	if (!videoKey && !imageKey) {
		return Response.json(
			{ error: "this item has no video or image to publish" },
			{ status: 400 },
		);
	}

	const base = (siteUrl || new URL(request.url).origin).replace(/\/+$/, "");
	const assetKey = (videoKey ?? imageKey) as string;
	const videoUrl = `${base}/api/import-from-url/file?key=${encodeURIComponent(assetKey)}`;

	const title = String(b.title || item.name || "Untitled").slice(0, 100);
	const description = String(b.description ?? b.caption ?? item.caption ?? "");
	const caption = String(b.caption ?? item.caption ?? "");
	const tags = Array.isArray(b.tags) ? b.tags.map(String).slice(0, 15) : [];
	const privacyRaw = String(b.privacy || "public");
	const privacy = ["public", "unlisted", "private"].includes(privacyRaw)
		? privacyRaw
		: "public";

	const slug = `${slugify(title)}-${Date.now().toString(36)}`;
	const created: { platform: string; channel: string; id: string }[] = [];
	const skipped: { platform: string; reason: string }[] = [];

	for (const platform of platforms) {
		// Still images can only go out as Instagram photos.
		if (imageKey && platform !== "instagram") {
			skipped.push({ platform, reason: "photos can only go to Instagram" });
			continue;
		}
		const channel = await d1Retry(() =>
			publish
				.prepare(
					"SELECT id, label FROM channels WHERE platform = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
				)
				.bind(platform)
				.first<{ id: string; label: string }>(),
		);
		if (!channel) {
			skipped.push({ platform, reason: "no connected channel" });
			continue;
		}

		let metadata: Record<string, unknown>;
		if (imageKey) {
			metadata = {
				channel: channel.label,
				media_type: "photo",
				caption,
				image_url: videoUrl,
			};
		} else if (platform === "youtube") {
			metadata = {
				channel: channel.label,
				title,
				description,
				tags,
				category_id: "22",
				privacy_status: privacy,
				video_url: videoUrl,
			};
		} else if (platform === "instagram") {
			metadata = {
				channel: channel.label,
				media_type: "reel",
				caption,
				share_to_feed: true,
				video_url: videoUrl,
			};
		} else {
			metadata = {
				channel: channel.label,
				caption,
				privacy_level: "PUBLIC_TO_EVERYONE",
				video_url: videoUrl,
			};
		}

		const id = crypto.randomUUID();
		const now = Date.now();
		try {
			await d1Retry(() =>
				publish
				.prepare(
					`INSERT INTO content_queue
           (id, channel_id, platform, slug, github_path, github_metadata_sha,
            github_video_path, github_thumbnail_path, metadata_json, status,
            scheduled_for, attempts, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'queued', ?, 0, ?, ?)`,
				)
				.bind(
					id,
					channel.id,
					platform,
					slug,
					`content/app/${slug}`,
					crypto.randomUUID(),
					JSON.stringify(videoUrl),
					JSON.stringify(metadata),
					scheduledFor,
					now,
					now,
				)
				.run(),
			);
			created.push({ platform, channel: channel.label, id });
		} catch (e) {
			skipped.push({
				platform,
				reason: e instanceof Error ? e.message.slice(0, 120) : "insert failed",
			});
		}
	}

	if (created.length === 0) {
		return Response.json(
			{ error: "nothing scheduled", skipped },
			{ status: 400 },
		);
	}
	return Response.json({ ok: true, created, skipped, scheduledFor });
}

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

type PlatformName = "youtube" | "instagram" | "tiktok" | "linkedin" | "reddit";
const PLATFORMS: PlatformName[] = [
	"youtube",
	"instagram",
	"tiktok",
	"linkedin",
	"reddit",
];

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
	if (item.kind === "carousel") {
		return Response.json(
			{ error: "carousel posts are coming soon" },
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
	const pdfKey =
		item.kind === "pdf" ? media.find((m) => m.type === "pdf")?.key : null;
	const imageKey =
		videoKey || pdfKey ? null : media.find((m) => m.type === "image")?.key;
	if (!videoKey && !imageKey && !pdfKey) {
		return Response.json(
			{ error: "this item has nothing publishable" },
			{ status: 400 },
		);
	}

	const base = (siteUrl || new URL(request.url).origin).replace(/\/+$/, "");
	const assetKey = (videoKey ?? imageKey ?? pdfKey) as string;
	const videoUrl = `${base}/api/import-from-url/file?key=${encodeURIComponent(assetKey)}`;

	const title = String(b.title || item.name || "Untitled").slice(0, 100);
	const description = String(b.description ?? b.caption ?? item.caption ?? "");
	const caption = String(b.caption ?? item.caption ?? "");
	const tags = Array.isArray(b.tags) ? b.tags.map(String).slice(0, 15) : [];
	const subreddit = String(b.subreddit || "")
		.replace(/^\/?r\//i, "")
		.trim();
	const privacyRaw = String(b.privacy || "public");
	const privacy = ["public", "unlisted", "private"].includes(privacyRaw)
		? privacyRaw
		: "public";

	const isDraft = b.draft === true;
	const slug = `${slugify(title)}-${Date.now().toString(36)}`;
	const created: { platform: string; channel: string; id: string }[] = [];
	const skipped: { platform: string; reason: string }[] = [];

	for (const platform of platforms) {
		// Still images: IG + LinkedIn natively; Reddit as a link post.
		if (
			imageKey &&
			!["instagram", "linkedin", "reddit"].includes(platform)
		) {
			skipped.push({ platform, reason: "photos can't go to this platform" });
			continue;
		}
		// PDFs are LinkedIn document posts only.
		if (pdfKey && platform !== "linkedin") {
			skipped.push({ platform, reason: "PDFs publish to LinkedIn only" });
			continue;
		}
		if (platform === "reddit" && !subreddit) {
			skipped.push({ platform, reason: "subreddit required" });
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
		if (platform === "linkedin") {
			// Direct LinkedIn app: native documents + images; videos as link posts.
			metadata = pdfKey
				? { channel: channel.label, title, caption, document_url: videoUrl }
				: imageKey
					? { channel: channel.label, title, caption, image_url: videoUrl }
					: {
							channel: channel.label,
							caption,
							link_url: videoUrl,
							visibility: "PUBLIC",
						};
		} else if (platform === "reddit") {
			metadata = {
				channel: channel.label,
				title,
				subreddit,
				caption,
				link_url: videoUrl,
			};
		} else if (imageKey) {
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
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, ?, ?)`,
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
					isDraft ? "draft" : "queued",
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

// Draft management: promote a draft into the live queue, or discard it.
// The satellite's cron only dispatches status='queued', so drafts are inert
// until promoted.
export async function PATCH(request: Request) {
	const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const id = String(b.id || "").trim();
	const action = String(b.action || "");
	if (!id || !["schedule", "delete"].includes(action)) {
		return Response.json({ error: "bad request" }, { status: 400 });
	}
	const { publish } = dbs();
	if (!publish) {
		return Response.json({ error: "publishing not configured" }, { status: 503 });
	}
	const now = Date.now();
	if (action === "delete") {
		await d1Retry(() =>
			publish
				.prepare("DELETE FROM content_queue WHERE id = ? AND status = 'draft'")
				.bind(id)
				.run(),
		);
		return Response.json({ ok: true });
	}
	// Keep a future schedule; past-dated drafts go out on the next cron tick.
	await d1Retry(() =>
		publish
			.prepare(
				`UPDATE content_queue
         SET status = 'queued',
             scheduled_for = CASE WHEN scheduled_for > ? THEN scheduled_for ELSE ? END,
             updated_at = ?
         WHERE id = ? AND status = 'draft'`,
			)
			.bind(now, now + 60_000, now, id)
			.run(),
	);
	return Response.json({ ok: true });
}

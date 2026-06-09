// Client helpers for the global (D1-backed) assets vault.

import { processMediaAssets } from "@/media/processing";

export type VaultMedia = {
	key: string;
	type: "video" | "image" | "audio";
	ext?: string;
	contentType?: string;
};

export type VaultItem = {
	id: string;
	kind: "video" | "audio" | "image" | "carousel";
	name: string;
	source: string;
	durationSec?: number;
	thumbKey?: string;
	thumbUrl?: string;
	media: VaultMedia[];
	tags?: string[];
	createdAt: number;
};

export const fileUrl = (key: string) =>
	`/api/import-from-url/file?key=${encodeURIComponent(key)}`;

export async function fetchVault(owner: string): Promise<VaultItem[]> {
	const r = await fetch(`/api/vault?owner=${encodeURIComponent(owner)}`);
	const d = (await r.json().catch(() => ({}))) as { items?: VaultItem[] };
	return Array.isArray(d.items) ? d.items : [];
}

export async function deleteVaultItem(owner: string, id: string) {
	await fetch(
		`/api/vault?owner=${encodeURIComponent(owner)}&id=${encodeURIComponent(id)}`,
		{ method: "DELETE" },
	);
}

/** Re-owns all of `from`'s vault items to `to` (used to claim a device's
 * anonymous vault into the signed-in account on first login). Idempotent. */
export async function migrateVaultOwner(from: string, to: string) {
	if (!from || !to || from === to) return;
	await fetch("/api/vault", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ action: "migrate", from, to }),
	}).catch(() => {});
}

export async function renameVaultItem(owner: string, id: string, name: string) {
	await fetch("/api/vault", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ owner, id, name }),
	});
}

async function addVaultItem(owner: string, item: Partial<VaultItem>) {
	const r = await fetch("/api/vault", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ owner, ...item }),
	});
	const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
	if (!r.ok || !d.id) throw new Error(d.error || "Couldn't save to vault");
	return d.id;
}

/** Uploads local files straight into the vault (R2 + D1), generating a
 * thumbnail/duration via the same processing the editor uses. */
export async function uploadFilesToVault(
	owner: string,
	files: File[],
): Promise<VaultItem[]> {
	const created: VaultItem[] = [];
	for (const file of files) {
		const [processed] = await processMediaAssets({ files: [file] });
		const type: VaultMedia["type"] = processed?.type ?? "video";
		const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "bin";
		const up = await fetch(
			`/api/import-from-url/upload?ext=${encodeURIComponent(ext)}`,
			{
				method: "POST",
				headers: { "content-type": file.type || "application/octet-stream" },
				body: file,
			},
		);
		const ud = (await up.json().catch(() => ({}))) as {
			key?: string;
			error?: string;
		};
		if (!up.ok || !ud.key) throw new Error(ud.error || "Upload failed");
		const item = {
			kind: type as VaultItem["kind"],
			name: file.name.replace(/\.[^.]+$/, "") || "Upload",
			source: "upload",
			durationSec: processed?.duration ?? undefined,
			thumbUrl: processed?.thumbnailUrl ?? undefined,
			media: [
				{
					key: ud.key,
					type,
					ext,
					contentType: file.type || undefined,
				},
			],
		};
		const id = await addVaultItem(owner, item);
		created.push({ id, createdAt: Date.now(), tags: [], ...item });
	}
	return created;
}

export function detectPlatform(url: string) {
	const u = url.toLowerCase();
	if (/instagram\.com/.test(u)) return "instagram";
	if (/twitter\.com|x\.com/.test(u)) return "twitter";
	if (/soundcloud\.com/.test(u)) return "soundcloud";
	if (/music\.youtube\.com/.test(u)) return "youtube-music";
	if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
	if (/tiktok\.com/.test(u)) return "tiktok";
	if (/vimeo\.com/.test(u)) return "vimeo";
	return "other";
}

function ytId(url: string): string | null {
	const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
	return m ? m[1] : null;
}

async function grab(mediaUrl: string) {
	const g = await fetch("/api/import-from-url/instagram/grab", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ url: mediaUrl }),
	});
	const gd = (await g.json().catch(() => ({}))) as {
		key?: string;
		ext?: string;
		contentType?: string;
		error?: string;
	};
	if (!g.ok || !gd.key) throw new Error(gd.error || "Couldn't fetch media");
	return gd as { key: string; ext?: string; contentType?: string };
}

/** Imports a link into the durable vault and returns the created item. */
export async function importLinkToVault(
	owner: string,
	rawUrl: string,
	mode: "video" | "audio",
): Promise<VaultItem> {
	const url = rawUrl.trim();
	const platform = detectPlatform(url);

	if (platform === "instagram") {
		if (!/instagram\.com\/(reel|reels|p|tv)\//i.test(url)) {
			throw new Error("Paste a specific Instagram reel or post link");
		}
		const res = await fetch("/api/import-from-url/instagram", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url }),
		});
		const data = (await res.json().catch(() => ({}))) as {
			kind?: string;
			title?: string;
			durationSec?: number;
			thumbnailUrl?: string;
			media?: { type: "video" | "image"; url: string }[];
			error?: string;
		};
		if (!res.ok || !data.media?.length) {
			throw new Error(data.error || "Couldn't import that link");
		}
		const media: VaultMedia[] = [];
		for (const m of data.media) {
			const g = await grab(m.url);
			media.push({ key: g.key, type: m.type, ext: g.ext, contentType: g.contentType });
		}
		let thumbKey = media.find((m) => m.type === "image")?.key;
		if (!thumbKey && data.thumbnailUrl) {
			try {
				thumbKey = (await grab(data.thumbnailUrl)).key;
			} catch {
				/* best-effort */
			}
		}
		const item = {
			kind: (data.kind === "carousel" ? "carousel" : "video") as VaultItem["kind"],
			name: data.title || "Instagram",
			source: "instagram",
			durationSec: data.durationSec,
			thumbKey,
			media,
		};
		const id = await addVaultItem(owner, item);
		return { id, createdAt: Date.now(), tags: [], ...item };
	}

	if (platform === "twitter") {
		const res = await fetch("/api/import-from-url/twitter", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url }),
		});
		const data = (await res.json().catch(() => ({}))) as {
			kind?: string;
			title?: string;
			durationSec?: number;
			thumbnailUrl?: string;
			media?: { type: "video" | "image"; url: string }[];
			error?: string;
		};
		if (!res.ok || !data.media?.length) {
			throw new Error(data.error || "Couldn't import that post");
		}
		const media: VaultMedia[] = [];
		for (const m of data.media) {
			const g = await grab(m.url);
			media.push({ key: g.key, type: m.type, ext: g.ext, contentType: g.contentType });
		}
		let thumbKey = media.find((m) => m.type === "image")?.key;
		if (!thumbKey && data.thumbnailUrl) {
			try {
				thumbKey = (await grab(data.thumbnailUrl)).key;
			} catch {
				/* best-effort */
			}
		}
		const item = {
			kind: (data.kind as VaultItem["kind"]) || "image",
			name: data.title || "X post",
			source: "twitter",
			durationSec: data.durationSec,
			thumbKey,
			media,
		};
		const id = await addVaultItem(owner, item);
		return { id, createdAt: Date.now(), tags: [], ...item };
	}

	// yt-dlp platforms (YouTube / SoundCloud / TikTok / Vimeo / …)
	const useMode =
		platform === "soundcloud" || platform === "youtube-music" ? "audio" : mode;
	const res = await fetch("/api/import-from-url", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ url, mode: useMode }),
	});
	const meta = (await res.json().catch(() => ({}))) as {
		key?: string;
		title?: string;
		ext?: string;
		contentType?: string;
		durationSec?: number;
		videoId?: string;
		error?: string;
	};
	if (!res.ok || !meta.key) {
		throw new Error(meta.error || "Couldn't import that link");
	}
	const kind: VaultItem["kind"] = useMode === "audio" ? "audio" : "video";
	const yid =
		platform === "youtube" || platform === "youtube-music"
			? meta.videoId || ytId(url)
			: null;
	const item = {
		kind,
		name: meta.title || "Import",
		source: platform,
		durationSec: typeof meta.durationSec === "number" ? meta.durationSec : undefined,
		thumbUrl: yid ? `https://i.ytimg.com/vi/${yid}/hqdefault.jpg` : undefined,
		media: [
			{
				key: meta.key,
				type: useMode === "audio" ? ("audio" as const) : ("video" as const),
				ext: meta.ext,
				contentType: meta.contentType,
			},
		],
	};
	const id = await addVaultItem(owner, item);
	return { id, createdAt: Date.now(), tags: [], ...item };
}

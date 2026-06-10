// Brain sync, assets slice — makes editor project media durable in Cloudflare.
//
// Media bytes added in the editor live in OPFS (a per-project browser cache).
// That cache can be evicted and never leaves the device, so a fresh browser or
// a cleared cache loses the media even though the project document survives.
//
// This mirrors each asset's bytes to R2 (via the imports/ upload the vault
// already uses) and registers it in the Brain (D1), then restores anything
// that's durable in R2 but missing locally. Backup and restore are symmetric,
// idempotent, and strictly best-effort — they never block or break the editor.

import { storageService } from "@/services/storage/service";
import { getVaultOwner } from "@/projects/vault-owner";
import type { MediaAsset, MediaType } from "@/media/types";

// Don't pull whole large videos through the worker on upload — catalin's reels
// are a few MB; anything past this is left local (still works, just not mirrored).
const MAX_BYTES = 200 * 1024 * 1024;
// Thumbnails are small data URLs; cap so a row never bloats D1.
const MAX_THUMB = 180 * 1024;

type RegMeta = {
	width?: number;
	height?: number;
	duration?: number;
	fps?: number;
	hasAudio?: boolean;
	thumbnailUrl?: string;
};
type Reg = {
	asset_id: string;
	project_id?: string;
	key: string;
	name?: string;
	type?: string;
	ext?: string;
	size?: number;
	content_type?: string;
	meta?: RegMeta;
};

async function registry(projectId: string): Promise<Reg[]> {
	try {
		const r = await fetch(
			`/api/brain/media?project_id=${encodeURIComponent(projectId)}&owner=${encodeURIComponent(getVaultOwner())}`,
		);
		const d = (await r.json().catch(() => ({}))) as { assets?: Reg[] };
		return Array.isArray(d.assets) ? d.assets : [];
	} catch {
		return [];
	}
}

function extOf(name: string, type: MediaType): string {
	const m = name.match(/\.([a-z0-9]+)$/i);
	if (m) return m[1].toLowerCase();
	return type === "audio" ? "mp3" : type === "image" ? "png" : "mp4";
}

/**
 * Mirror to R2 every asset of a project that isn't already there. Cheap when
 * nothing is new (one registry read, zero uploads). Returns how many it pushed.
 */
export async function backupProjectMedia(projectId: string): Promise<number> {
	if (typeof window === "undefined" || !projectId) return 0;
	let localIds: string[] = [];
	try {
		localIds = await storageService.listProjectMediaIds({ projectId });
	} catch {
		return 0;
	}
	if (localIds.length === 0) return 0;
	const mirrored = new Set((await registry(projectId)).map((a) => a.asset_id));
	const owner = getVaultOwner();
	let pushed = 0;

	for (const id of localIds) {
		if (mirrored.has(id)) continue;
		let asset: MediaAsset | null = null;
		try {
			asset = await storageService.loadMediaAsset({ projectId, id });
			if (!asset || asset.ephemeral) continue;
			const bytes = asset.file?.size ?? 0;
			if (bytes === 0 || bytes > MAX_BYTES) continue;

			const ext = extOf(asset.name, asset.type);
			const up = await fetch(
				`/api/import-from-url/upload?ext=${encodeURIComponent(ext)}`,
				{
					method: "POST",
					headers: {
						"content-type": asset.file.type || "application/octet-stream",
					},
					body: asset.file,
				},
			);
			const ud = (await up.json().catch(() => ({}))) as { key?: string };
			if (!up.ok || !ud.key) continue;

			const thumb =
				asset.thumbnailUrl &&
				asset.thumbnailUrl.startsWith("data:") &&
				asset.thumbnailUrl.length < MAX_THUMB
					? asset.thumbnailUrl
					: undefined;
			const meta: RegMeta = {
				width: asset.width,
				height: asset.height,
				duration: asset.duration,
				fps: asset.fps,
				hasAudio: asset.hasAudio,
				thumbnailUrl: thumb,
			};
			await fetch("/api/brain/media", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					project_id: projectId,
					asset_id: id,
					key: ud.key,
					name: asset.name,
					type: asset.type,
					ext,
					size: bytes,
					content_type: asset.file.type || undefined,
					meta,
				}),
			});
			pushed++;
		} catch {
			/* best-effort — retried on the next save/open */
		} finally {
			// loadMediaAsset minted an object URL we don't use here.
			if (asset?.url) {
				try {
					URL.revokeObjectURL(asset.url);
				} catch {
					/* ignore */
				}
			}
		}
	}
	return pushed;
}

/**
 * Pull back any asset that's durable in R2 but absent from this device's cache
 * (fresh browser, cleared OPFS), rebuilding both the bytes and the metadata so
 * the editor finds it exactly as if it had been imported here. Returns how many
 * it restored.
 */
export async function restoreMissingMedia(projectId: string): Promise<number> {
	if (typeof window === "undefined" || !projectId) return 0;
	const assets = await registry(projectId);
	if (assets.length === 0) return 0;
	let localIds: string[] = [];
	try {
		localIds = await storageService.listProjectMediaIds({ projectId });
	} catch {
		localIds = [];
	}
	const have = new Set(localIds);
	let restored = 0;

	for (const a of assets) {
		if (!a.asset_id || !a.key || have.has(a.asset_id)) continue;
		try {
			const res = await fetch(
				`/api/import-from-url/file?key=${encodeURIComponent(a.key)}`,
			);
			if (!res.ok) continue;
			const blob = await res.blob();
			const file = new File(
				[blob],
				a.name || `${a.asset_id}.${a.ext || "bin"}`,
				{
					type: a.content_type || blob.type || "application/octet-stream",
				},
			);
			const mediaAsset: MediaAsset = {
				id: a.asset_id,
				name: a.name || "Restored",
				type: (a.type as MediaType) || "video",
				file,
				width: a.meta?.width,
				height: a.meta?.height,
				duration: a.meta?.duration,
				fps: a.meta?.fps,
				hasAudio: a.meta?.hasAudio,
				thumbnailUrl: a.meta?.thumbnailUrl,
			};
			await storageService.saveMediaAsset({ projectId, mediaAsset });
			restored++;
		} catch {
			/* best-effort — the asset stays remote and is retried next open */
		}
	}
	return restored;
}

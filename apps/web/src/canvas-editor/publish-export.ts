// Shared "Export & publish" pipeline for the video editor and Canvas:
// upload the rendered output to the vault (R2 + D1), then hand off to the
// Publishing composer at /projects?compose=<itemId>.

type VaultMediaEntry = {
	key: string;
	type: "video" | "image" | "audio" | "pdf";
	ext: string;
	contentType: string;
};

export async function uploadBlobToR2({
	data,
	ext,
	contentType,
}: {
	data: Blob | ArrayBuffer;
	ext: string;
	contentType: string;
}): Promise<string> {
	const up = await fetch(
		`/api/import-from-url/upload?ext=${encodeURIComponent(ext)}`,
		{
			method: "POST",
			headers: { "content-type": contentType },
			body: data,
		},
	);
	const ud = (await up.json().catch(() => ({}))) as {
		key?: string;
		error?: string;
	};
	if (!up.ok || !ud.key) throw new Error(ud.error || "Upload failed");
	return ud.key;
}

export async function createVaultItem({
	owner,
	kind,
	name,
	media,
	durationSec,
}: {
	owner: string;
	kind: "video" | "image" | "carousel" | "pdf";
	name: string;
	media: VaultMediaEntry[];
	durationSec?: number;
}): Promise<string> {
	const r = await fetch("/api/vault", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			owner,
			kind,
			name,
			source: "export",
			durationSec,
			media,
		}),
	});
	const d = (await r.json().catch(() => ({}))) as {
		id?: string;
		error?: string;
	};
	if (!r.ok || !d.id) throw new Error(d.error || "Couldn't save to vault");
	return d.id;
}

export async function uploadExportToVault({
	owner,
	name,
	data,
	ext,
	contentType,
	kind,
	durationSec,
}: {
	owner: string;
	name: string;
	data: Blob | ArrayBuffer;
	ext: string;
	contentType: string;
	kind: "video" | "image" | "pdf";
	durationSec?: number;
}): Promise<string> {
	const key = await uploadBlobToR2({ data, ext, contentType });
	return createVaultItem({
		owner,
		kind,
		name,
		durationSec,
		media: [{ key, type: kind === "pdf" ? "pdf" : kind, ext, contentType }],
	});
}

/** Uploads page renders as one multi-image carousel vault item. */
export async function uploadCarouselToVault({
	owner,
	name,
	pages,
	onProgress,
}: {
	owner: string;
	name: string;
	pages: Blob[];
	onProgress?: (done: number, total: number) => void;
}): Promise<string> {
	const media: VaultMediaEntry[] = [];
	for (let i = 0; i < pages.length; i++) {
		const key = await uploadBlobToR2({
			data: pages[i],
			ext: "png",
			contentType: "image/png",
		});
		media.push({ key, type: "image", ext: "png", contentType: "image/png" });
		onProgress?.(i + 1, pages.length);
	}
	return createVaultItem({ owner, kind: "carousel", name, media });
}

export function composeUrlFor(itemId: string): string {
	return `/projects?compose=${encodeURIComponent(itemId)}`;
}

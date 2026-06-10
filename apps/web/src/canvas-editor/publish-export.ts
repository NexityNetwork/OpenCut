// Shared "Export & publish" pipeline for the video editor and Canvas:
// upload the rendered output to the vault (R2 + D1), then hand off to the
// Publishing composer at /projects?compose=<itemId>.

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
	kind: "video" | "image";
	durationSec?: number;
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

	const r = await fetch("/api/vault", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			owner,
			kind,
			name,
			source: "export",
			durationSec,
			media: [{ key: ud.key, type: kind, ext, contentType }],
		}),
	});
	const d = (await r.json().catch(() => ({}))) as {
		id?: string;
		error?: string;
	};
	if (!r.ok || !d.id) throw new Error(d.error || "Couldn't save to vault");
	return d.id;
}

export function composeUrlFor(itemId: string): string {
	return `/projects?compose=${encodeURIComponent(itemId)}`;
}

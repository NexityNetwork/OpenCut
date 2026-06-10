import type { BioData, BioPage } from "./types";

export async function fetchOwnerBio(owner: string): Promise<BioPage | null> {
	const r = await fetch(`/api/bio?owner=${encodeURIComponent(owner)}`);
	const d = (await r.json().catch(() => ({}))) as { page?: BioPage | null };
	return d.page ?? null;
}

export async function saveBio({
	owner,
	handle,
	data,
	published,
}: {
	owner: string;
	handle: string;
	data: BioData;
	published: boolean;
}): Promise<{ ok?: boolean; handle?: string; error?: string }> {
	const r = await fetch("/api/bio", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ owner, handle, data, published }),
	});
	return (await r.json().catch(() => ({}))) as {
		ok?: boolean;
		handle?: string;
		error?: string;
	};
}

import { BioRender } from "@/bio/bio-render";
import { bioDb, ensureBioTables } from "@/bio/server";
import type { BioData } from "@/bio/types";
import { EmbedAutoHeight } from "./auto-height";

// Chrome-less variant for <iframe>/embed.js use on external sites.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export default async function BioEmbedPage({ params }: Params) {
	const { handle } = await params;
	const d = bioDb();
	let page: { data: BioData; handle: string } | null = null;
	if (d) {
		await ensureBioTables(d);
		const r = await d
			.prepare(
				"SELECT handle, data FROM bio_pages WHERE handle = ? AND published = 1",
			)
			.bind(handle.toLowerCase())
			.first<{ handle: string; data: string }>();
		if (r) {
			try {
				page = { handle: r.handle, data: JSON.parse(r.data) as BioData };
			} catch {
				/* ignore */
			}
		}
	}

	if (!page) {
		return (
			<div className="flex h-40 items-center justify-center bg-[#1a1714] text-sm text-[#b3a892]">
				@{handle} isn't live yet
			</div>
		);
	}
	return (
		<>
			<BioRender data={page.data} handle={page.handle} embed />
			<EmbedAutoHeight />
		</>
	);
}

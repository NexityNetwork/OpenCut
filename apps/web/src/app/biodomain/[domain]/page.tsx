import type { Metadata } from "next";
import { headers } from "next/headers";
import { BioRender } from "@/bio/bio-render";
import { bioDb, ensureBioTables, bumpStat, waitUntil } from "@/bio/server";
import type { BioData } from "@/bio/types";

// Bio page served on a connected custom domain (rewritten here by the
// middleware with the visitor's Host).

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ domain: string }> };

async function loadByDomain(domain: string) {
	const d = bioDb();
	if (!d) return null;
	await ensureBioTables(d);
	const dom = await d
		.prepare("SELECT owner FROM bio_domains WHERE domain = ?")
		.bind(domain.toLowerCase())
		.first<{ owner: string }>();
	if (!dom) return null;
	const r = await d
		.prepare(
			"SELECT owner, handle, data FROM bio_pages WHERE owner = ? AND published = 1",
		)
		.bind(dom.owner)
		.first<{ owner: string; handle: string; data: string }>();
	if (!r) return null;
	try {
		return {
			owner: r.owner,
			handle: r.handle,
			data: JSON.parse(r.data) as BioData,
		};
	} catch {
		return null;
	}
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { domain } = await params;
	const page = await loadByDomain(decodeURIComponent(domain));
	if (!page) return { title: "Not connected", robots: { index: false } };
	const title = `${page.data.displayName} — links`;
	const description =
		page.data.tagline || `All of ${page.data.displayName}'s links in one place.`;
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "profile",
			...(page.data.avatarUrl ? { images: [{ url: page.data.avatarUrl }] } : {}),
		},
		twitter: { card: "summary", title, description },
	};
}

export default async function BioDomainPage({ params }: Params) {
	const { domain } = await params;
	const page = await loadByDomain(decodeURIComponent(domain));

	if (!page) {
		return (
			<div className="flex min-h-screen w-full flex-col items-center justify-center gap-2 bg-[#1a1714] text-center text-[#b3a892]">
				<div className="text-lg font-semibold text-[#f1ebdc]">
					Domain not connected
				</div>
				<div className="text-sm">
					This domain points at Monolith Bio but isn't linked to a page yet.
				</div>
			</div>
		);
	}

	const d = bioDb();
	if (d) {
		const h = await headers();
		const country = h.get("cf-ipcountry") || "";
		waitUntil(bumpStat(d, { owner: page.owner, kind: "view", key: "page" }));
		waitUntil(bumpStat(d, { owner: page.owner, kind: "ref", key: "custom-domain" }));
		if (country && country !== "XX") {
			waitUntil(bumpStat(d, { owner: page.owner, kind: "country", key: country }));
		}
	}

	return (
		<div className="min-h-screen w-full">
			<BioRender data={page.data} handle={page.handle} />
		</div>
	);
}

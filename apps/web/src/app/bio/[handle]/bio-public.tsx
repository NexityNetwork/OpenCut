"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BioRender } from "@/bio/bio-render";
import type { BioData, BioPage } from "@/bio/types";

export default function BioPublic() {
	const params = useParams();
	const handle = params.handle as string;
	const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
	const [data, setData] = useState<BioData | null>(null);

	useEffect(() => {
		fetch(`/api/bio?handle=${encodeURIComponent(handle)}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((d: { page?: BioPage } | null) => {
				if (d?.page?.data) {
					setData(d.page.data);
					setState("ok");
				} else {
					setState("missing");
				}
			})
			.catch(() => setState("missing"));
	}, [handle]);

	if (state === "loading") {
		return <div className="min-h-screen w-full bg-[#1a1714]" />;
	}
	if (state === "missing" || !data) {
		return (
			<div className="flex min-h-screen w-full flex-col items-center justify-center gap-2 bg-[#1a1714] text-center text-[#b3a892]">
				<div className="text-lg font-semibold text-[#f1ebdc]">
					This page isn't live
				</div>
				<div className="text-sm">@{handle} hasn't published a bio yet.</div>
			</div>
		);
	}
	return (
		<div className="min-h-screen w-full">
			<BioRender data={data} />
		</div>
	);
}

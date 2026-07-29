"use client";

// Everything we have built for the content system, in one place, grouped by the
// surface it goes on. The point is to be able to see the whole family at once and
// judge whether it hangs together - which is impossible when the work only exists
// as a trail of one-off renders.
//
// Frames are honest about their state. A layout that was tried and failed stays in
// with the reason attached, because "we already know that does not work" is worth
// more than a clean sheet that quietly loses the finding.

import { useEffect, useState } from "react";

export type FamilyItem = {
	src: string;
	name: string;
	/** current | keep | best | rework | superseded | reads as letterhead | ... */
	tag: string;
	w: number;
	h: number;
};

export type FamilyGroup = {
	id: string;
	name: string;
	note: string;
	items: FamilyItem[];
};

/** Tags that mean "this is live", everything else reads as a note. */
const GOOD = new Set(["keep", "best", "current", "reference"]);
const BAD = new Set(["superseded", "dead end, kept as evidence"]);

function tagClass(tag: string) {
	if (GOOD.has(tag)) return "border-[#F5DDAA]/40 text-[#F5DDAA]";
	if (BAD.has(tag) || tag.includes("letterhead") || tag.includes("dead"))
		return "border-red-400/40 text-red-300/80";
	return "border-amber-500/40 text-amber-300/80";
}

export function UltronFamilyView() {
	const [groups, setGroups] = useState<FamilyGroup[] | null>(null);
	const [zoom, setZoom] = useState<FamilyItem | null>(null);

	useEffect(() => {
		fetch("/brand-family/family.json")
			.then((r) => r.json())
			.then(setGroups)
			.catch(() => setGroups([]));
	}, []);

	if (!groups) {
		return <p className="p-6 text-sm text-muted-foreground">Loading the family…</p>;
	}

	const total = groups.reduce((n, g) => n + g.items.length, 0);

	return (
		<div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-6">
			<header className="space-y-1">
				<h1 className="text-lg font-semibold text-foreground">The family</h1>
				<p className="text-sm text-muted-foreground">
					{total} frames across {groups.length} surfaces. Everything built so far,
					including what did not work and why. Click a frame to see it full size.
				</p>
			</header>

			{groups.map((g) => (
				<section key={g.id} className="space-y-3">
					<div>
						<h2 className="text-sm font-semibold text-foreground">{g.name}</h2>
						<p className="text-xs text-muted-foreground">{g.note}</p>
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{g.items.map((it) => (
							<button
								key={it.src}
								type="button"
								onClick={() => setZoom(it)}
								className="group space-y-1.5 text-left"
							>
								<div className="overflow-hidden rounded-lg border border-white/10 transition group-hover:border-white/30">
									<img
										src={`/brand-family/${it.src}`}
										alt={it.name}
										width={it.w}
										height={it.h}
										loading="lazy"
										className="block h-auto w-full"
									/>
								</div>
								<div className="space-y-1">
									<div className="text-[11px] leading-snug text-foreground">{it.name}</div>
									<span
										className={`inline-block rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${tagClass(it.tag)}`}
									>
										{it.tag}
									</span>
								</div>
							</button>
						))}
					</div>
				</section>
			))}

			{zoom && (
				<button
					type="button"
					aria-label="Close"
					onClick={() => setZoom(null)}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
				>
					<img
						src={`/brand-family/${zoom.src}`}
						alt={zoom.name}
						className="max-h-full max-w-full rounded-lg"
					/>
				</button>
			)}
		</div>
	);
}

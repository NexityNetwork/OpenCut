"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
	ChevronLeft,
	ChevronRight,
	Cpu,
	Plus,
	Scissors,
	Users,
	X,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/utils/ui";

// Brand-strict marketing sections: Claude orange (#DA7756) + the footer blue
// (hsl(200 90% 52%)) on the #141413 page tone. Layout references a modern
// product page; all copy is original.

const ORANGE = "rgba(218,119,86,";
const BLUE = "hsla(200,90%,52%,";

// Orange+blue aurora on dark, varied per index — used for cards.
function aurora(i: number): React.CSSProperties {
	const presets = [
		`radial-gradient(115% 115% at 18% 12%, ${ORANGE}0.78), transparent 55%), radial-gradient(120% 120% at 88% 92%, ${BLUE}0.42), transparent 60%)`,
		`radial-gradient(115% 115% at 82% 14%, ${BLUE}0.8), transparent 55%), radial-gradient(120% 120% at 12% 90%, ${ORANGE}0.4), transparent 60%)`,
		`radial-gradient(120% 120% at 50% 0%, ${ORANGE}0.6), transparent 55%), radial-gradient(130% 130% at 50% 115%, ${BLUE}0.55), transparent 60%)`,
		`radial-gradient(120% 120% at 12% 88%, ${BLUE}0.7), transparent 55%), radial-gradient(120% 120% at 92% 8%, ${ORANGE}0.5), transparent 60%)`,
		`radial-gradient(120% 120% at 85% 85%, ${ORANGE}0.74), transparent 55%), radial-gradient(120% 120% at 8% 16%, ${BLUE}0.46), transparent 60%)`,
		`radial-gradient(120% 120% at 25% 20%, ${BLUE}0.62), transparent 55%), radial-gradient(120% 120% at 82% 95%, ${ORANGE}0.6), transparent 60%)`,
	];
	return { backgroundColor: "#191716", backgroundImage: presets[i % presets.length] };
}

// ─── Use-case carousel (the "Deployed in 55K companies" section) ───────────────

const USE_CASES = [
	{ title: "Founders", tag: "Ship launch videos without an editor.", body: "Turn a rough screen recording — or a single sentence — into a polished launch reel. Caption it, add a voiceover, and ship the same day." },
	{ title: "Marketers", tag: "One idea into a week of clips.", body: "Generate on-brand reels from a brief, repurpose long content into shorts, and hold a consistent look across every channel." },
	{ title: "Creators", tag: "Repurpose long videos into reels.", body: "Auto-caption in 100+ languages, cut the dead air, and slice your best moments into vertical clips — all in the browser." },
	{ title: "Agencies", tag: "On-brand video at volume.", body: "Lock brand kits, batch-generate reels, and keep output consistent across dozens of client accounts — with usage you can budget." },
	{ title: "Educators", tag: "Explainers with auto-captions.", body: "Record once, caption automatically, and add clean motion graphics so lessons land — accessible by default." },
	{ title: "Podcasters", tag: "Audiograms from every episode.", body: "Pull the sharpest moments from a long episode, add animated captions, and publish shorts that actually get watched." },
];

function UseCaseCarousel() {
	const trackRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState<number | null>(null);
	const scroll = (dir: number) =>
		trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

	return (
		<section className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
			<div className="flex items-end justify-between gap-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
						Deployed in 55K companies
					</h2>
					<p className="mt-3 text-sm text-white/45">Scarf Analytics, 2026</p>
				</div>
				<div className="flex shrink-0 gap-2">
					{[-1, 1].map((dir) => (
						<button
							key={dir}
							type="button"
							aria-label={dir < 0 ? "Previous" : "Next"}
							onClick={() => scroll(dir)}
							className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:bg-white/10"
						>
							{dir < 0 ? (
								<ChevronLeft className="size-5" />
							) : (
								<ChevronRight className="size-5" />
							)}
						</button>
					))}
				</div>
			</div>

			<div
				ref={trackRef}
				className="scrollbar-hidden mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
			>
				{USE_CASES.map((uc, i) => {
					const expanded = open === i;
					return (
						<div
							key={uc.title}
							className="relative aspect-[4/5] w-[230px] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-[260px]"
							style={aurora(i)}
						>
							<button
								type="button"
								aria-label={expanded ? "Collapse" : "Expand"}
								onClick={() => setOpen(expanded ? null : i)}
								className="absolute right-3 top-3 z-20 flex size-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
							>
								{expanded ? (
									<X className="size-3.5" />
								) : (
									<Plus className="size-3.5" />
								)}
							</button>

							{/* default: title + tagline at bottom over a legibility scrim */}
							<div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
								<h3 className="text-base font-semibold text-white">{uc.title}</h3>
								<p className="mt-1 text-xs leading-snug text-white/75">{uc.tag}</p>
							</div>

							{/* expanded: full description scrim */}
							<div
								className={cn(
									"absolute inset-0 z-10 flex flex-col justify-end bg-black/75 p-4 backdrop-blur-md transition-opacity duration-200",
									expanded ? "opacity-100" : "pointer-events-none opacity-0",
								)}
							>
								<h3 className="text-base font-semibold text-white">{uc.title}</h3>
								<p className="mt-2 text-xs leading-relaxed text-white/80">
									{uc.body}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

// ─── Feature rows ──────────────────────────────────────────────────────────

function FeatureCard({
	seed,
	children,
}: {
	seed: number;
	children: React.ReactNode;
}) {
	return (
		<div
			className="aspect-[4/3] w-full rounded-3xl p-6 shadow-2xl md:p-7"
			style={aurora(seed)}
		>
			<div className="ring-1 ring-white/10 size-full rounded-2xl bg-[#141413]/70 p-5 backdrop-blur-md">
				{children}
			</div>
		</div>
	);
}

function FeatureRow({
	eyebrow,
	eyebrowColor,
	title,
	body,
	cta,
	reverse,
	card,
}: {
	eyebrow: string;
	eyebrowColor: string;
	title: React.ReactNode;
	body: string;
	cta: string;
	reverse?: boolean;
	card: React.ReactNode;
}) {
	return (
		<section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
			<div className="grid items-center gap-10 md:grid-cols-2">
				<div className={reverse ? "md:order-2" : ""}>
					<div className="mb-4 inline-flex items-center gap-2 text-sm font-medium">
						<span
							className="size-1.5 rounded-full"
							style={{ backgroundColor: eyebrowColor }}
						/>
						<span style={{ color: eyebrowColor }}>{eyebrow}</span>
					</div>
					<h2 className="text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl">
						{title}
					</h2>
					<p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
						{body}
					</p>
					<Link href="/projects">
						<Button className="mt-7 h-11 rounded-full bg-white px-6 text-base font-semibold text-black hover:bg-white/90">
							{cta}
						</Button>
					</Link>
				</div>
				<div className={reverse ? "md:order-1" : ""}>{card}</div>
			</div>
		</section>
	);
}

function EditMock() {
	return (
		<div className="relative flex h-full flex-col justify-center gap-2.5">
			{["w-2/3", "w-11/12", "w-5/6", "w-3/4"].map((w, i) => (
				<div key={i} className="flex gap-1.5">
					<div className={cn("h-7 rounded-md bg-white/20", w)} />
					<div className="h-7 flex-1 rounded-md bg-white/[0.06]" />
				</div>
			))}
			<div className="absolute inset-y-0 left-1/2 w-px bg-white/80">
				<div className="-ml-1 size-2 rounded-full bg-white" />
			</div>
		</div>
	);
}

function GenerateMock() {
	return (
		<div className="flex h-full flex-col justify-center gap-3">
			<div className="rounded-lg bg-white/[0.07] px-3 py-2.5 text-xs text-white/55">
				Describe a reel to generate…
			</div>
			<div className="flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2 text-xs text-white">
				<span className="text-white/40">1</span>
				<span className="flex-1 truncate">Founder story: resilience</span>
				<span className="shrink-0" style={{ color: "#DA7756" }}>
					Rendering…
				</span>
			</div>
			<div className="flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2 text-xs text-white">
				<span className="text-white/40">2</span>
				<span className="flex-1 truncate">10× growth, 50k users</span>
				<span
					className="shrink-0"
					style={{ color: "hsl(200,90%,60%)" }}
				>
					Added
				</span>
			</div>
		</div>
	);
}

function ShipMock() {
	return (
		<div className="flex h-full flex-col justify-center gap-4">
			<div className="text-xs font-medium text-white/60">Export</div>
			<div className="flex gap-2">
				{["9:16", "1:1", "16:9"].map((r) => (
					<span
						key={r}
						className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
					>
						{r}
					</span>
				))}
			</div>
			<div className="flex flex-wrap gap-2">
				{["1080p", "Captions", "Voiceover", "Azure render"].map((c) => (
					<span
						key={c}
						className="rounded-md bg-white/[0.08] px-2.5 py-1 text-[0.7rem] text-white/75"
					>
						{c}
					</span>
				))}
			</div>
		</div>
	);
}

// ─── Pricing ────────────────────────────────────────────────────────────────

const PLANS = [
	{
		icon: Scissors,
		accent: "hsl(200,90%,55%)",
		title: "Free",
		body: "Edit unlimited projects on a real timeline and export — no account, no upload wait. Your media stays on your device.",
		cta: "Start creating",
	},
	{
		icon: Cpu,
		accent: "#DA7756",
		title: "Pro",
		body: "Watermark-free HD export, AI reel generation in the Mission Center, and cloud projects you can reach from anywhere.",
		cta: "Go Pro",
	},
	{
		icon: Users,
		accent: "hsl(200,90%,55%)",
		title: "Teams",
		body: "SSO, shared brand kits, and seats for your whole crew — with usage you can actually budget for.",
		cta: "Talk to us",
	},
];

// ─── Page composition ─────────────────────────────────────────────────────────

export function MarketingSections() {
	return (
		<div className="bg-[#141413]">
			<UseCaseCarousel />

			<FeatureRow
				eyebrow="Edit in your browser"
				eyebrowColor="hsl(200,90%,55%)"
				title={
					<>
						Edit video,
						<br />
						right in the browser
					</>
				}
				body="Trim, split, layer, and caption on a real multi-track timeline. Nothing to install, nothing to upload — it runs entirely on your machine."
				cta="Start editing"
				card={
					<FeatureCard seed={1}>
						<EditMock />
					</FeatureCard>
				}
			/>

			<FeatureRow
				reverse
				eyebrow="Generate with AI"
				eyebrowColor="#DA7756"
				title={
					<>
						Describe a reel.
						<br />
						Get a reel.
					</>
				}
				body="Type a mission and the AI renders a polished, on-brand reel in the cloud — then drops it straight onto your timeline to edit further."
				cta="Open the Mission Center"
				card={
					<FeatureCard seed={0}>
						<GenerateMock />
					</FeatureCard>
				}
			/>

			<FeatureRow
				eyebrow="Caption, voice, export"
				eyebrowColor="hsl(200,90%,55%)"
				title={
					<>
						Captions, voiceover,
						<br />
						one-click export
					</>
				}
				body="Auto-caption in 100+ languages, generate natural voiceovers, and export to vertical, square, or wide — ready for any platform."
				cta="Export a video"
				card={
					<FeatureCard seed={4}>
						<ShipMock />
					</FeatureCard>
				}
			/>

			<section className="mx-auto w-full max-w-6xl px-6 py-20 text-center md:py-28">
				<h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
					Start free. Scale when you grow.
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-base text-white/55">
					Free forever for editing. Pay only when you want AI renders, HD
					exports, and your team.
				</p>
				<div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">
					{PLANS.map((plan) => (
						<div
							key={plan.title}
							className="flex flex-col items-start bg-[#1b1a18] p-8 text-left"
						>
							<plan.icon
								className="size-7"
								strokeWidth={1.5}
								style={{ color: plan.accent }}
							/>
							<h3 className="mt-5 text-lg font-semibold text-white">
								{plan.title}
							</h3>
							<p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">
								{plan.body}
							</p>
							<Link href="/projects" className="mt-6">
								<Button className="h-10 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
									{plan.cta}
								</Button>
							</Link>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}

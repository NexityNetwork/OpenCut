"use client";

// Ultron branding. The outline wordmark in every format we use, plus the palette
// sampled from the live site. Everything renders as real SVG so what you copy is
// exactly what you see, and nothing here can drift from what ships.

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { BACKDROPS, CORE, GLOW, LIGHT, type Swatch, TEXT } from "./ultron-brand";
import { LOCKUPS, type Lockup, lockupSvg } from "./ultron-lockups";
import {
	ACCENTS,
	type Overlay,
	type OverlayOpts,
	OVERLAYS,
	overlaySvg,
	REEL_H,
	REEL_W,
} from "./ultron-overlays";

function useCopy() {
	const [hit, setHit] = useState<string | null>(null);
	return {
		hit,
		copy: (value: string, key: string) => {
			void navigator.clipboard?.writeText(value);
			setHit(key);
			setTimeout(() => setHit((k) => (k === key ? null : k)), 1200);
		},
	};
}

function SwatchRow({ items, onCopy, hit }: { items: Swatch[]; onCopy: (v: string, k: string) => void; hit: string | null }) {
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
			{items.map((s) => (
				<button
					key={s.hex}
					type="button"
					onClick={() => onCopy(s.hex, s.hex)}
					className="group rounded-lg border border-white/10 text-left transition hover:border-white/25"
				>
					<div
						className="flex h-16 items-end justify-end rounded-t-lg p-2"
						style={{ background: s.hex }}
					>
						<span
							className={`text-[10px] font-medium opacity-0 transition group-hover:opacity-100 ${
								s.onLight ? "text-black/70" : "text-white/80"
							}`}
						>
							{hit === s.hex ? "copied" : "copy"}
						</span>
					</div>
					<div className="space-y-0.5 p-2">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-foreground">{s.name}</span>
							<span className="font-mono text-[10px] text-muted-foreground">{s.hex}</span>
						</div>
						<p className="text-[11px] leading-snug text-muted-foreground">{s.note}</p>
					</div>
				</button>
			))}
		</div>
	);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
	return (
		<section className="space-y-3">
			<div>
				<h2 className="text-sm font-semibold text-foreground">{title}</h2>
				{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
			</div>
			{children}
		</section>
	);
}

function Field({
	label,
	value,
	onChange,
	w,
}: { label: string; value: string; onChange: (v: string) => void; w: string }) {
	return (
		<label className="space-y-1">
			<span className="block text-[11px] text-muted-foreground">{label}</span>
			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="default"
				className={`${w} rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-white/30`}
			/>
		</label>
	);
}

function LockupCard({
	lockup,
	opts,
	copied,
	onCopy,
}: {
	lockup: Lockup;
	opts: { tagline: string; product: string; partner: string };
	copied: boolean;
	onCopy: () => void;
}) {
	const svg = lockupSvg(lockup, opts);
	return (
		<div className="overflow-hidden rounded-xl border border-white/10">
			<button
				type="button"
				onClick={onCopy}
				className="block w-full"
				title="Copy SVG"
			>
				<svg
					viewBox={`0 0 ${lockup.w} ${lockup.h}`}
					className="block h-auto w-full"
					role="img"
					aria-label={lockup.name}
				>
					<rect width={lockup.w} height={lockup.h} fill={lockup.bg} />
					{lockup.render(opts)}
				</svg>
			</button>
			<div className="flex items-start justify-between gap-3 p-3">
				<div className="min-w-0">
					<div className="text-xs font-medium text-foreground">{lockup.name}</div>
					<p className="text-[11px] leading-snug text-muted-foreground">{lockup.note}</p>
					<div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
						{lockup.w} x {lockup.h}
					</div>
				</div>
				<div className="flex shrink-0 gap-1">
					<button
						type="button"
						onClick={onCopy}
						className="rounded-md border border-white/15 p-1.5 text-muted-foreground transition hover:border-white/30 hover:text-foreground"
						title="Copy SVG"
					>
						{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
					</button>
					<a
						href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
						download={`ultron-${lockup.id}.svg`}
						className="rounded-md border border-white/15 p-1.5 text-muted-foreground transition hover:border-white/30 hover:text-foreground"
						title="Download SVG"
					>
						<Download className="size-3.5" />
					</a>
				</div>
			</div>
		</div>
	);
}

function OverlayCard({
	overlay,
	opts,
	footage,
	guides,
	copied,
	onCopy,
}: {
	overlay: Overlay;
	opts: OverlayOpts;
	footage: boolean;
	guides: boolean;
	copied: boolean;
	onCopy: () => void;
}) {
	// What you see carries the footage and the guides. What you copy or download
	// does not: it is transparent, because it goes on top of a clip.
	const preview = overlaySvg(overlay, opts, { footage, guides });
	const bare = overlaySvg(overlay, opts);
	return (
		<div className="overflow-hidden rounded-xl border border-white/10">
			<button type="button" onClick={onCopy} className="block w-full" title="Copy SVG">
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
				<div
					className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG
					dangerouslySetInnerHTML={{ __html: preview }}
				/>
			</button>
			<div className="flex items-start justify-between gap-3 p-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-xs font-medium text-foreground">{overlay.name}</span>
						<span
							className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
								overlay.kind === "block"
									? "bg-white/10 text-foreground/80"
									: "bg-[#F5DDAA]/15 text-[#F5DDAA]"
							}`}
						>
							{overlay.kind}
						</span>
					</div>
					<p className="text-[11px] leading-snug text-muted-foreground">{overlay.note}</p>
					<div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
						{REEL_W} x {REEL_H} · transparent
					</div>
				</div>
				<div className="flex shrink-0 gap-1">
					<button
						type="button"
						onClick={onCopy}
						className="rounded-md border border-white/15 p-1.5 text-muted-foreground transition hover:border-white/30 hover:text-foreground"
						title="Copy SVG"
					>
						{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
					</button>
					<a
						href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(bare)}`}
						download={`ultron-${overlay.id}.svg`}
						className="rounded-md border border-white/15 p-1.5 text-muted-foreground transition hover:border-white/30 hover:text-foreground"
						title="Download transparent SVG"
					>
						<Download className="size-3.5" />
					</a>
				</div>
			</div>
		</div>
	);
}

function Toggle({
	on,
	onChange,
	label,
}: { on: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<button
			type="button"
			onClick={() => onChange(!on)}
			className={`rounded-md border px-2.5 py-1 text-[11px] transition ${
				on
					? "border-white/35 bg-white/10 text-foreground"
					: "border-white/10 text-muted-foreground hover:border-white/25"
			}`}
		>
			{label}
		</button>
	);
}

export function UltronBrandingView() {
	const { copy, hit } = useCopy();
	const [tagline, setTagline] = useState("");
	const [product, setProduct] = useState("");
	const [partner, setPartner] = useState("");

	const [hook, setHook] = useState("");
	const [big, setBig] = useState("");
	const [sub, setSub] = useState("");
	const [tools, setTools] = useState("");
	const [cta, setCta] = useState("");
	const [lines, setLines] = useState("");
	const [accent, setAccent] = useState<string>(ACCENTS[0].hex);
	const [footage, setFootage] = useState(true);
	const [guides, setGuides] = useState(true);

	const overlayOpts: OverlayOpts = { hook, big, sub, tools, cta, lines, accent };

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6">
			<header className="space-y-1">
				<h1 className="text-lg font-semibold text-foreground">Ultron branding</h1>
				<p className="text-sm text-muted-foreground">
					The outline mark in every format we use, plus the palette sampled from the live site. Click anything to copy it.
				</p>
			</header>

			<Section
				title="Lockups"
				hint="The outline mark in the shapes it gets used in. Click a card to copy its SVG."
			>
				<div className="flex flex-wrap items-end gap-2">
					<Field label="Tagline" value={tagline} onChange={setTagline} w="w-64" />
					<Field label="Product" value={product} onChange={setProduct} w="w-36" />
					<Field label="Partner" value={partner} onChange={setPartner} w="w-36" />
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					{LOCKUPS.map((l) => (
						<LockupCard
							key={l.id}
							lockup={l}
							opts={{ tagline, product, partner }}
							copied={hit === l.id}
							onCopy={() => copy(lockupSvg(l, { tagline, product, partner }), l.id)}
						/>
					))}
				</div>
			</Section>

			<Section
				title="Reel overlays"
				hint="1080 x 1920. Blocks sit over the top of the clip; overlays sit straight on it with a scrim and a shadow so they survive bright footage. Downloads are transparent."
			>
				<div className="flex flex-wrap items-end gap-2">
					<Field label="Hook" value={hook} onChange={setHook} w="w-72" />
					<Field label="Big line" value={big} onChange={setBig} w="w-44" />
					<Field label="Accent line" value={sub} onChange={setSub} w="w-56" />
					<Field label="Tools, comma separated" value={tools} onChange={setTools} w="w-52" />
					<Field label="Call to action" value={cta} onChange={setCta} w="w-40" />
				</div>
				<label className="block space-y-1">
					<span className="block text-[11px] text-muted-foreground">
						List, one per line
					</span>
					<textarea
						value={lines}
						onChange={(e) => setLines(e.target.value)}
						rows={3}
						placeholder="default"
						className="w-full rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-white/30"
					/>
				</label>
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[11px] text-muted-foreground">Accent</span>
					{ACCENTS.map((a) => (
						<button
							key={a.hex}
							type="button"
							onClick={() => setAccent(a.hex)}
							title={`${a.name} ${a.hex}`}
							className={`size-6 rounded-full border-2 transition ${
								accent === a.hex ? "border-white" : "border-white/15 hover:border-white/40"
							}`}
							style={{ background: a.hex }}
						/>
					))}
					<span className="ml-2" />
					<Toggle on={footage} onChange={setFootage} label="footage" />
					<Toggle on={guides} onChange={setGuides} label="safe zones" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{OVERLAYS.map((o) => (
						<OverlayCard
							key={o.id}
							overlay={o}
							opts={overlayOpts}
							footage={footage}
							guides={guides}
							copied={hit === o.id}
							onCopy={() => copy(overlaySvg(o, overlayOpts), o.id)}
						/>
					))}
				</div>
			</Section>

			<Section title="Core" hint="The dark field. Warm-tinted, never pure black.">
				<SwatchRow items={CORE} onCopy={copy} hit={hit} />
			</Section>

			<Section title="Light" hint="The single amber source, from core to falloff. This is the brand.">
				<SwatchRow items={GLOW} onCopy={copy} hit={hit} />
			</Section>

			<Section title="Text">
				<SwatchRow items={TEXT} onCopy={copy} hit={hit} />
			</Section>

			<Section title="Light surface" hint="For documents and long reading.">
				<SwatchRow items={LIGHT} onCopy={copy} hit={hit} />
			</Section>

			<Section title="Backdrops" hint="Click to copy the CSS.">
				<div className="grid gap-3 sm:grid-cols-2">
					{BACKDROPS.map((b) => (
						<button
							key={b.name}
							type="button"
							onClick={() => copy(`background: ${b.css};`, b.name)}
							className="overflow-hidden rounded-lg border border-white/10 text-left transition hover:border-white/25"
						>
							<div className="h-24" style={{ background: b.css }} />
							<div className="space-y-0.5 p-2.5">
								<div className="flex items-center justify-between">
									<span className="text-xs font-medium text-foreground">{b.name}</span>
									<span className="text-[10px] text-muted-foreground">
										{hit === b.name ? "copied" : "copy css"}
									</span>
								</div>
								<p className="text-[11px] leading-snug text-muted-foreground">{b.note}</p>
							</div>
						</button>
					))}
				</div>
			</Section>

			<Section title="Usage" hint="What not to do.">
				<ul className="space-y-1.5 text-xs text-muted-foreground">
					<li>The orange and blue ball mark is retired. Use the wordmark.</li>
					<li>One light source per composition. Two reads as a mistake.</li>
					<li>Never place the mark on mid greys. It needs either the void or Paper.</li>
					<li>Keep clear space around the mark equal to the height of the letter n.</li>
					<li>The outline is the primary mark. Do not fill the letters.</li>
					<li>Stroke stays hairline. It should never read as a bold outline.</li>
				</ul>
			</Section>
		</div>
	);
}

"use client";

// Ultron branding playground. A place to look at the mark, the palette and the
// backdrops together, try combinations, and copy any value out as CSS or SVG.
// Everything renders live, so nothing here can drift from what ships.

import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { BACKDROPS, CORE, GLOW, LIGHT, MARKS, type MarkStyle, type Swatch, TEXT } from "./ultron-brand";

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

/** The wordmark, drawn as SVG so every treatment stays crisp at any size. */
export function UltronMark({
	style = "gradient",
	width = 520,
	weight = 800,
	text = "ultron",
}: {
	style?: MarkStyle;
	width?: number;
	weight?: number;
	text?: string;
}) {
	const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
	const h = Math.round(width * 0.3);
	const fs = Math.round(width * 0.235);
	const common = {
		x: "50%",
		y: "50%",
		textAnchor: "middle" as const,
		dominantBaseline: "central" as const,
		fontFamily: "Inter, system-ui, sans-serif",
		fontWeight: weight,
		fontSize: fs,
		letterSpacing: -fs * 0.03,
	};
	return (
		<svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label={`Ultron wordmark, ${style}`}>
			<defs>
				<linearGradient id={`g-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#20130C" />
					<stop offset="38%" stopColor="#8A6234" />
					<stop offset="68%" stopColor="#E6C58F" />
					<stop offset="90%" stopColor="#FEF8E6" />
					<stop offset="100%" stopColor="#FFFEFB" />
				</linearGradient>
				<filter id={`e-${id}`} x="-20%" y="-40%" width="140%" height="180%">
					<feDropShadow dx="0" dy="1" stdDeviation="0" floodColor="#FEF8E6" floodOpacity="0.28" />
					<feDropShadow dx="0" dy="-1" stdDeviation="0" floodColor="#000000" floodOpacity="0.7" />
				</filter>
			</defs>
			{style === "gradient" && <text {...common} fill={`url(#g-${id})`}>{text}</text>}
			{style === "outline" && (
				<text {...common} fill="none" stroke="#F5DDAA" strokeWidth={Math.max(1, fs * 0.018)} opacity={0.85}>
					{text}
				</text>
			)}
			{style === "solid" && <text {...common} fill="#F7F5F2">{text}</text>}
			{style === "emboss" && <text {...common} fill="#262624" filter={`url(#e-${id})`}>{text}</text>}
		</svg>
	);
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

export function UltronBrandingView() {
	const { copy, hit } = useCopy();
	const [mark, setMark] = useState<MarkStyle>("gradient");
	const [backdrop, setBackdrop] = useState(0);
	const [size, setSize] = useState(520);
	const bd = BACKDROPS[backdrop];

	const svg = useMemo(() => {
		// Standalone SVG export of the current mark, no React runtime needed.
		const fs = Math.round(size * 0.235);
		const h = Math.round(size * 0.3);
		const fill =
			mark === "gradient"
				? 'fill="url(#g)"'
				: mark === "outline"
					? `fill="none" stroke="#F5DDAA" stroke-width="${Math.max(1, fs * 0.018).toFixed(1)}"`
					: mark === "solid"
						? 'fill="#F7F5F2"'
						: 'fill="#262624"';
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 ${size} ${h}">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#20130C"/><stop offset="38%" stop-color="#8A6234"/>
    <stop offset="68%" stop-color="#E6C58F"/><stop offset="90%" stop-color="#FEF8E6"/>
    <stop offset="100%" stop-color="#FFFEFB"/>
  </linearGradient></defs>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${fs}"
    letter-spacing="${(-fs * 0.03).toFixed(1)}" ${fill}>ultron</text>
</svg>`;
	}, [mark, size]);

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6">
			<header className="space-y-1">
				<h1 className="text-lg font-semibold text-foreground">Ultron branding</h1>
				<p className="text-sm text-muted-foreground">
					The mark, the palette and the backdrops, sampled from the live site. Click any swatch to copy it.
				</p>
			</header>

			{/* live stage */}
			<Section title="Stage" hint="Pick a treatment and a backdrop to see how the mark holds up.">
				<div
					className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-white/10 p-6"
					style={{ background: bd.css }}
				>
					<UltronMark style={mark} width={size} />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{MARKS.map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMark(m)}
							className={`rounded-md border px-2.5 py-1 text-xs capitalize transition ${
								mark === m
									? "border-white/40 bg-white/10 text-foreground"
									: "border-white/10 text-muted-foreground hover:border-white/25"
							}`}
						>
							{m}
						</button>
					))}
					<span className="mx-1 h-4 w-px bg-white/10" />
					{BACKDROPS.map((b, i) => (
						<button
							key={b.name}
							type="button"
							onClick={() => setBackdrop(i)}
							className={`rounded-md border px-2.5 py-1 text-xs transition ${
								backdrop === i
									? "border-white/40 bg-white/10 text-foreground"
									: "border-white/10 text-muted-foreground hover:border-white/25"
							}`}
						>
							{b.name}
						</button>
					))}
					<span className="mx-1 h-4 w-px bg-white/10" />
					<input
						type="range"
						min={220}
						max={820}
						step={20}
						value={size}
						onChange={(e) => setSize(Number(e.target.value))}
						className="h-1 w-28 accent-white/70"
						aria-label="Mark size"
					/>
					<span className="font-mono text-[11px] text-muted-foreground">{size}px</span>
				</div>
				<p className="text-xs text-muted-foreground">{bd.note}</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => copy(svg, "svg")}
						className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-foreground transition hover:border-white/30"
					>
						{hit === "svg" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
						Copy mark as SVG
					</button>
					<button
						type="button"
						onClick={() => copy(`background: ${bd.css};`, "bg")}
						className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-foreground transition hover:border-white/30"
					>
						{hit === "bg" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
						Copy backdrop CSS
					</button>
					<a
						href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
						download={`ultron-${mark}.svg`}
						className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-foreground transition hover:border-white/30"
					>
						<Download className="size-3.5" />
						Download SVG
					</a>
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
				</ul>
			</Section>
		</div>
	);
}

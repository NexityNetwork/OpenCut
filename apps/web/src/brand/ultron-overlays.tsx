"use client";

import { WORDMARK_BOT, WORDMARK_H, WORDMARK_PATHS, WORDMARK_TOP, WORDMARK_W } from "./ultron-wordmark";

// Reel overlays: the thing that actually goes on top of the footage.
//
// Two ways of doing it, and they have different rules:
//
//   block    a panel attached over the top of the frame. The footage carries on
//            below it. Legibility is free because the panel is opaque, so the
//            only real constraint is not cramming it.
//   overlay  text sitting straight on the footage. Nothing is guaranteed here:
//            a bright frame eats white text. Every overlay template lays a scrim
//            under its text and shadows the glyphs, so it survives footage we
//            have not seen yet.
//
// Everything is laid out inside SAFE. The top strip and the bottom strip get
// covered by platform chrome, and TikTok's action rail eats the right edge, so
// the usable box is narrower than the frame in three directions.
//
// Exports come out transparent. The footage and the guides are preview only.

export const REEL_W = 1080;
export const REEL_H = 1920;

/** Worst case of Instagram and TikTok together: whichever eats more of an edge wins. */
export const SAFE = {
	top: 240,
	bottom: 1560,
	left: 72,
	right: 940, // right of this is TikTok's like/comment/share rail
};
const SAFE_W = SAFE.right - SAFE.left;
// Centre on the safe box, NOT the frame. The rail only eats the right edge, so
// the two centres are 34px apart and frame-centred text hangs into the rail.
const CX = (SAFE.left + SAFE.right) / 2;

const FAMILY = "Inter, system-ui, -apple-system, sans-serif";
const VOID = "#030201";
const INK = "#0A0705";
const MUTED = "#A8A29A";

/** Accent options, straight off the palette. The green is the one the format wants. */
export const ACCENTS = [
	{ name: "Sand", hex: "#F5DDAA" },
	{ name: "Amber", hex: "#E6C58F" },
	{ name: "Halo", hex: "#FEF8E6" },
	{ name: "Ember", hex: "#8A6234" },
	{ name: "Mint", hex: "#7BE495" },
	{ name: "Paper", hex: "#F5F6FB" },
] as const;

const esc = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------------------------------------------------------------- text fitting */

// SVG text does not wrap, so we wrap it. The factors are averages for a heavy
// grotesque, measured against rendered output and rounded UP: overshooting the
// safe box is the failure that actually costs us, and a little slack never shows.
const CHAR = 0.62;
const CHAR_CAPS = 0.72;

const widthOf = (s: string, size: number) =>
	s.length * size * (s === s.toUpperCase() ? CHAR_CAPS : CHAR);

/** First baseline that keeps a line of `size` fully below the platform chrome. */
const topFor = (size: number) => SAFE.top + size * 0.62;

function wrap(text: string, size: number, maxw: number) {
	const words = text.split(/\s+/).filter(Boolean);
	const out: string[] = [];
	let cur = "";
	for (const w of words) {
		const next = cur ? `${cur} ${w}` : w;
		if (cur && widthOf(next, size) > maxw) {
			out.push(cur);
			cur = w;
		} else {
			cur = next;
		}
	}
	if (cur) out.push(cur);
	return out;
}

/**
 * Wrap `text` at the largest size that fits `maxLines` inside `maxw`. Shrinking
 * beats spilling: a line that leaves the safe box is gone on half the phones.
 */
function fit(text: string, size: number, maxw: number, maxLines: number, min = 28) {
	let s = size;
	while (s > min) {
		const lines = wrap(text, s, maxw);
		if (lines.length <= maxLines) return { size: s, lines };
		s -= 2;
	}
	return { size: s, lines: wrap(text, s, maxw) };
}

/** One size for a whole list, driven by its longest line. Fitting each line on its
 * own leaves the long ones smaller than the short ones, which reads as a mistake. */
function fitAll(lines: string[], size: number, maxw: number, min = 28) {
	let s = size;
	while (s > min && lines.some((l) => widthOf(l, s) > maxw)) s -= 2;
	return s;
}

/* --------------------------------------------------------------------- pieces */

type TOpts = {
	fill?: string;
	weight?: number;
	anchor?: "start" | "middle" | "end";
	ls?: number;
	shadow?: boolean;
};

const text = (x: number | string, y: number, size: number, s: string, o: TOpts = {}) =>
	`<text x="${x}" y="${y}" text-anchor="${o.anchor || "start"}" dominant-baseline="central" font-family="${FAMILY}" font-size="${size}" font-weight="${o.weight ?? 800}" letter-spacing="${o.ls ?? 0}" fill="${o.fill || "#FFFFFF"}"${o.shadow ? ' filter="url(#lift)"' : ""}>${esc(s)}</text>`;

/** A wrapped block of text. Returns the markup and the y it ends at. */
function block(
	x: number | string,
	y: number,
	size: number,
	lines: string[],
	lead: number,
	o: TOpts = {},
) {
	const body = lines.map((l, i) => text(x, y + i * lead, size, l, o)).join("");
	return { body, end: y + (lines.length - 1) * lead + lead / 2 };
}

/** Placeholder for someone else's app icon. We do not ship their logos. */
const icon = (x: number, y: number, s: number, label: string, dark = false) =>
	`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.24}" fill="${dark ? INK : "#FFFFFF"}" stroke="${dark ? "#3A3936" : "#00000018"}" stroke-width="2"/>` +
	text(x + s / 2, y + s / 2, Math.min(28, s * 0.17), label, {
		anchor: "middle",
		weight: 700,
		fill: dark ? MUTED : "#55504A",
	});

const plus = (x: number, y: number, s: number, fill = "#FFFFFF") =>
	`<g stroke="${fill}" stroke-width="${s * 0.22}" stroke-linecap="round" filter="url(#lift)"><line x1="${x - s / 2}" y1="${y}" x2="${x + s / 2}" y2="${y}"/><line x1="${x}" y1="${y - s / 2}" x2="${x}" y2="${y + s / 2}"/></g>`;

/** A row of app icons, centred on `cx`, with optional plus signs between them. */
function iconRow(cx: number, y: number, names: string[], s: number, joined: boolean, dark = false) {
	const gap = joined ? s * 0.5 : s * 0.22;
	const total = names.length * s + (names.length - 1) * gap;
	let x = cx - total / 2;
	let out = "";
	names.forEach((n, i) => {
		if (i > 0) out += joined ? plus(x - gap / 2, y + s / 2, s * 0.34) : "";
		out += icon(x, y, s, n, dark);
		x += s + gap;
	});
	return out;
}

const MID = (WORDMARK_TOP + WORDMARK_BOT) / 2;

/** The wordmark, hollow, ink centred on `y`. Same outlines as everywhere else. */
function mark(size: number, x: number, y: number, anchor: "start" | "middle" | "end", stroke: string, sc = 0.02) {
	const k = size / WORDMARK_H;
	const w = WORDMARK_W * k;
	const dx = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
	const sw = (Math.max(0.7, size * sc) / k).toFixed(2);
	const body = WORDMARK_PATHS.map(
		(d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`,
	).join("");
	return `<g filter="url(#lift)" transform="translate(${(x + dx).toFixed(1)} ${(y - MID * k).toFixed(1)}) scale(${k.toFixed(4)})">${body}</g>`;
}

/* ------------------------------------------------------------------ templates */

export type OverlayOpts = {
	hook?: string;
	lines?: string;
	big?: string;
	sub?: string;
	tools?: string;
	cta?: string;
	accent?: string;
};

export type Overlay = {
	id: string;
	name: string;
	note: string;
	kind: "block" | "overlay";
	body: (o: Required<OverlayOpts>) => string;
};

const D: Required<OverlayOpts> = {
	hook: "if you are 18 to 35",
	lines: "open the two tools\nbuild one agent that runs all night\nsell it to ten people\nthat is your month covered",
	big: "one afternoon",
	sub: "step by step in the caption",
	tools: "tool, tool, tool",
	cta: "read caption",
	accent: "#F5DDAA",
};

const list = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const tools = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

export const OVERLAYS: Overlay[] = [
	{
		id: "block-stack",
		name: "Block, tools and list",
		note: "Panel over the top third. Hook, the tools joined by a plus, then the steps. Footage runs underneath.",
		kind: "block",
		body: (o) => {
			const H = 980;
			const h = fit(o.hook, 62, SAFE_W, 2);
			const ts = tools(o.tools).slice(0, 3);
			let y = SAFE.top + 30;
			let b = `<rect x="0" y="0" width="${REEL_W}" height="${H}" fill="url(#panel)"/>`;
			b += `<rect x="0" y="${H - 90}" width="${REEL_W}" height="90" fill="url(#fadeout)"/>`;
			b += iconRow(CX, y, ts, 190, true, false);
			y += 190 + 74;
			const hk = block(SAFE.left, y, h.size, h.lines, h.size * 1.24, { fill: "#FFFFFF" });
			b += hk.body;
			y = hk.end + 46;
			const items = list(o.lines).slice(0, 5);
			const ls = fitAll(items, 44, SAFE_W - 46, 30);
			for (const l of items) {
				b += `<circle cx="${SAFE.left + 10}" cy="${y}" r="7" fill="${o.accent}"/>`;
				b += text(SAFE.left + 40, y, ls, l, { weight: 600, fill: "#EDEAE5" });
				y += ls * 1.42;
			}
			b += text(CX, H - 62, 38, o.cta, { anchor: "middle", weight: 600, fill: MUTED });
			return b;
		},
	},
	{
		id: "block-bar",
		name: "Block, hook only",
		note: "The short version. Just the hook and the tools, so the footage gets most of the frame.",
		kind: "block",
		body: (o) => {
			const H = 620;
			const h = fit(o.hook, 66, SAFE_W, 2);
			let b = `<rect x="0" y="0" width="${REEL_W}" height="${H}" fill="url(#panel)"/>`;
			b += `<rect x="0" y="${H - 80}" width="${REEL_W}" height="80" fill="url(#fadeout)"/>`;
			const hk = block(SAFE.left, topFor(h.size), h.size, h.lines, h.size * 1.22, { fill: "#FFFFFF" });
			b += hk.body;
			b += iconRow(CX, hk.end + 34, tools(o.tools).slice(0, 3), 132, false, false);
			return b;
		},
	},
	{
		id: "over-hook",
		name: "Overlay, hook and number",
		note: "Straight on the footage. Scrim under the text, shadow on the glyphs, so it holds up on a bright frame.",
		kind: "overlay",
		body: (o) => {
			let b = `<rect x="0" y="0" width="${REEL_W}" height="1180" fill="url(#scrim)"/>`;
			const h = fit(o.hook, 64, SAFE_W, 2);
			let y = topFor(64) + 20;
			const hk = block(CX, y, h.size, h.lines, h.size * 1.2, {
				anchor: "middle",
				fill: "#FFFFFF",
				shadow: true,
			});
			b += hk.body;
			y = hk.end + 56;
			b += iconRow(CX, y, tools(o.tools).slice(0, 3), 176, false, false);
			y += 176 + 78;
			const bg = fit(o.big, 92, SAFE_W, 1, 48);
			b += text(CX, y, bg.size, bg.lines[0], {
				anchor: "middle",
				fill: "#FFFFFF",
				shadow: true,
			});
			y += bg.size * 0.9;
			const sb = fit(o.sub, 50, SAFE_W, 1, 32);
			b += text(CX, y, sb.size, sb.lines[0], {
				anchor: "middle",
				weight: 700,
				fill: o.accent,
				shadow: true,
			});
			return b;
		},
	},
	{
		id: "over-pov",
		name: "Overlay, stacked",
		note: "No icons. One word, one number, the breakdown under it. For talking-head and screen-record footage.",
		kind: "overlay",
		body: (o) => {
			let b = `<rect x="0" y="0" width="${REEL_W}" height="1240" fill="url(#scrim)"/>`;
			let y = topFor(118) + 10;
			const h = fit(o.hook, 118, SAFE_W, 1, 60);
			b += text(CX, y, h.size, h.lines[0], {
				anchor: "middle",
				fill: "#FFFFFF",
				shadow: true,
			});
			y += h.size * 0.95;
			const bg = fit(o.big, 86, SAFE_W, 1, 46);
			b += text(CX, y, bg.size, bg.lines[0], {
				anchor: "middle",
				fill: "#FFFFFF",
				shadow: true,
			});
			y += 96;
			const rows = list(o.lines).slice(0, 4);
			const rs = fitAll(rows, 54, SAFE_W, 34);
			for (const l of rows) {
				b += text(CX, y, rs, l, {
					anchor: "middle",
					weight: 700,
					fill: "#F1EEE9",
					shadow: true,
				});
				y += rs * 1.34;
			}
			y += 26;
			const sb = fit(o.sub, 50, SAFE_W, 1, 32);
			b += text(CX, y, sb.size, sb.lines[0], {
				anchor: "middle",
				weight: 700,
				fill: o.accent,
				shadow: true,
			});
			return b;
		},
	},
	{
		id: "over-mark",
		name: "Overlay, mark and line",
		note: "The mark on the footage with one line under it. For the open and the last frame.",
		kind: "overlay",
		body: (o) => {
			let b = `<rect x="0" y="0" width="${REEL_W}" height="1060" fill="url(#scrim)"/>`;
			b += mark(150, CX, SAFE.top + 190, "middle", "#FFFFFF", 0.016);
			const h = fit(o.hook, 54, SAFE_W, 2, 34);
			b += block(CX, SAFE.top + 330, h.size, h.lines, h.size * 1.24, {
				anchor: "middle",
				weight: 700,
				fill: o.accent,
				shadow: true,
			}).body;
			return b;
		},
	},
	{
		id: "over-corner",
		name: "Overlay, corner mark",
		note: "The persistent watermark. Sits inside the rail, faint enough to ignore and present the whole way through.",
		kind: "overlay",
		body: () =>
			mark(58, SAFE.left, SAFE.top + 46, "start", "rgba(255,255,255,0.62)", 0.02),
	},
	{
		id: "block-end",
		name: "Block, end card",
		note: "Full frame, no footage. The last beat of the reel.",
		kind: "block",
		body: (o) => {
			let b = `<rect x="0" y="0" width="${REEL_W}" height="${REEL_H}" fill="url(#ember)"/>`;
			b += mark(178, CX, 880, "middle", "#FEF8E6", 0.015);
			const h = fit(o.sub, 52, SAFE_W, 2, 34);
			b += block(CX, 1064, h.size, h.lines, h.size * 1.26, {
				anchor: "middle",
				weight: 700,
				fill: MUTED,
			}).body;
			b += `<rect x="${CX - 260}" y="1224" width="520" height="108" rx="54" fill="${o.accent}"/>`;
			b += text(CX, 1278, 42, o.cta, {
				anchor: "middle",
				weight: 700,
				fill: INK,
			});
			return b;
		},
	},
];

/* ------------------------------------------------------------------- assembly */

/** Gradients and the shadow filter. Ids are namespaced so two cards never collide. */
function defs(id: string) {
	return `<defs>
<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${VOID}" stop-opacity="0.74"/><stop offset="0.55" stop-color="${VOID}" stop-opacity="0.42"/><stop offset="1" stop-color="${VOID}" stop-opacity="0"/></linearGradient>
<linearGradient id="fadeout" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${VOID}" stop-opacity="1"/><stop offset="1" stop-color="${VOID}" stop-opacity="0"/></linearGradient>
<radialGradient id="panel" cx="0.5" cy="1.02" r="0.92"><stop offset="0" stop-color="#3A2415"/><stop offset="0.34" stop-color="#170F0A"/><stop offset="1" stop-color="#030201"/></radialGradient>
<radialGradient id="ember" cx="0.5" cy="1.18" r="1.05"><stop offset="0" stop-color="#8A6234"/><stop offset="0.26" stop-color="#3A2415"/><stop offset="0.58" stop-color="${INK}"/><stop offset="1" stop-color="${VOID}"/></radialGradient>
<linearGradient id="shot" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#8E9AA8"/><stop offset="0.45" stop-color="#4C5361"/><stop offset="1" stop-color="#20242B"/></linearGradient>
<filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="9" flood-color="#000000" flood-opacity="0.55"/></filter>
</defs>`.replace(/id="/g, `id="${id}-`);
}

/** Stand-in footage, so legibility can be judged against something bright. */
const footage = () =>
	`<rect width="${REEL_W}" height="${REEL_H}" fill="url(#shot)"/>` +
	`<circle cx="820" cy="1180" r="380" fill="#FFFFFF" opacity="0.16"/>` +
	`<circle cx="210" cy="1560" r="300" fill="#FFFFFF" opacity="0.09"/>` +
	`<rect x="0" y="1660" width="${REEL_W}" height="260" fill="#000000" opacity="0.22"/>` +
	text(REEL_W / 2, 1740, 34, "your footage", {
		anchor: "middle",
		weight: 600,
		fill: "#FFFFFFAA",
	});

/** The strips the platform covers, and the box that is actually yours. */
const guides = () =>
	`<g fill="#FF4D4D" opacity="0.13"><rect width="${REEL_W}" height="${SAFE.top}"/><rect y="${SAFE.bottom}" width="${REEL_W}" height="${REEL_H - SAFE.bottom}"/><rect x="${SAFE.right}" y="${SAFE.top}" width="${REEL_W - SAFE.right}" height="${SAFE.bottom - SAFE.top}"/></g>` +
	`<rect x="${SAFE.left}" y="${SAFE.top}" width="${SAFE.right - SAFE.left}" height="${SAFE.bottom - SAFE.top}" fill="none" stroke="#7BE495" stroke-width="3" stroke-dasharray="14 12" opacity="0.75"/>`;

export type RenderOpts = { footage?: boolean; guides?: boolean };

/**
 * One overlay as a standalone SVG. With no options it comes out transparent,
 * which is the version you drop on a clip.
 */
export function overlaySvg(o: Overlay, opts: OverlayOpts, r: RenderOpts = {}) {
	const merged = { ...D, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v)) } as Required<OverlayOpts>;
	const id = `u-${o.id}`;
	const body = o.body(merged).replace(/url\(#/g, `url(#${id}-`);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${REEL_W}" height="${REEL_H}" viewBox="0 0 ${REEL_W} ${REEL_H}">
${defs(id)}
${r.footage ? footage().replace(/url\(#/g, `url(#${id}-`) : ""}
${body}
${r.guides ? guides() : ""}
</svg>`;
}

"use client";

import {
	WORDMARK_BOT,
	WORDMARK_H,
	WORDMARK_PATHS,
	WORDMARK_TOP,
	WORDMARK_W,
} from "./ultron-wordmark";

// The outline wordmark in the compositions it actually gets placed in: alone, on
// paper, paired with a tool, leading a stack, and inside context cards.
//
// Three rules baked in here:
//   1. The mark is ALWAYS the full wordmark. Never a single letter, never a
//      monogram, never just the u.
//   2. The word is 4:1. Nothing here puts it in a square. Every composition runs
//      along the horizontal and sizes its frame around the mark, instead of
//      fixing a frame first and shrinking the mark to fit inside it.
//   3. Letters stay hollow. fill none plus a hairline stroke.
//
// Each lockup is written ONCE, as a function returning SVG markup. The card on
// screen and the file you download both render that one string, so the preview
// and the export cannot drift apart.
//
// Partner tiles render as labelled slots. We do not ship other companies' logos;
// drop the real asset into the slot in your design tool.

export const OUTLINE = "#F2F2F0";
export const OUTLINE_SOFT = "rgba(226,232,255,0.34)";
export const VOID_BG = "#030201";
export const PAPER_BG = "#F5F6FB";
export const SLATE_BG = "#1B2030";
export const SLOT_BG = "#171614";

const FAMILY = "Inter, system-ui, -apple-system, sans-serif";
const INK = "#0A0705";
const EDGE = "#3A3936";
const MUTED = "#8C8880";
const DIM = "#5A554D";
const SOFT = "#D8D5D0";

const esc = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Drawn width of the mark at ascender height `size`. Layouts measure with this. */
export const markW = (size: number) => (WORDMARK_W * size) / WORDMARK_H;

// Vertical centre of the ink. Not H/2: the o overshoots below the baseline.
const MID = (WORDMARK_TOP + WORDMARK_BOT) / 2;

/**
 * The mark, hollow, with its ink centred on `y`. `size` is ascender height, and
 * `anchor` resolves against the real drawn width so callers never guess it.
 */
function mark(
	size: number,
	x: number,
	y: number,
	anchor: "start" | "middle" | "end" = "start",
	stroke = OUTLINE,
	sc = 0.016,
) {
	const k = size / WORDMARK_H;
	const w = WORDMARK_W * k;
	const dx = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
	const sw = (Math.max(0.7, size * sc) / k).toFixed(2);
	const body = WORDMARK_PATHS.map(
		(d) =>
			`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`,
	).join("");
	return `<g transform="translate(${(x + dx).toFixed(2)} ${(y - MID * k).toFixed(2)}) scale(${k.toFixed(4)})">${body}</g>`;
}

type TextOpts = {
	fill?: string;
	weight?: number;
	anchor?: "start" | "middle" | "end";
	ls?: number;
};

const line = (
	x: number | string,
	y: number | string,
	size: number,
	txt: string,
	o: TextOpts = {},
) =>
	`<text x="${x}" y="${y}" text-anchor="${o.anchor || "start"}" dominant-baseline="central" font-family="${FAMILY}" font-size="${size}" font-weight="${o.weight ?? 500}" letter-spacing="${o.ls ?? 0}" fill="${o.fill || OUTLINE}">${esc(txt)}</text>`;

const rule = (x1: number, y: number, x2: number, stroke = EDGE) =>
	`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${stroke}" stroke-width="1.4"/>`;

/** A labelled placeholder for someone else's logo. Never holds the ultron mark. */
const slot = (x: number, y: number, w: number, h: number, label: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(14, h * 0.28).toFixed(1)}" fill="${SLOT_BG}" stroke="#2C2A27" stroke-width="1.5"/>` +
	line(x + w / 2, y + h / 2, Math.min(13, h * 0.28), label, {
		anchor: "middle",
		weight: 600,
		fill: MUTED,
	});

const pill = (x: number, y: number, w: number, h: number, label?: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="${EDGE}" stroke-width="1.4"/>` +
	(label
		? line(x + w / 2, y + h / 2, 15, label, {
				anchor: "middle",
				weight: 600,
				fill: MUTED,
			})
		: "");

const tick = (x: number, y: number) =>
	`<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${MUTED}" stroke-width="2"/><path d="M${x - 6} ${y} l4 5 8 -10" fill="none" stroke="${MUTED}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

export type Opts = {
	tagline?: string;
	product?: string;
	partner?: string;
	cta?: string;
};

export type Lockup = {
	id: string;
	name: string;
	note: string;
	w: number;
	h: number;
	bg: string;
	body: (o: Opts) => string;
	render: (o: Opts) => React.ReactNode;
};

const TAG = "from zero to autonomous company";
const P1 = "n8n";
const CTA = 'comment "STACK" for the full list';

/* ---------------------------------------------------------------------------
 * Layouts that carry partner slots measure themselves. Fixing the canvas first
 * is what produced the square that cropped the word.
 * ------------------------------------------------------------------------- */

// Inline: one baseline, mark at natural width, a rule, then the slots.
const IN_M = 56;
const IN_SIZE = 62;
const IN_SW = 104;
const IN_SH = 48;
const IN_GAP = 38;
const IN_RULE = IN_M + markW(IN_SIZE) + IN_GAP;
const IN_X0 = IN_RULE + IN_GAP;
const IN_W = Math.round(IN_X0 + IN_SW * 2 + 14 + IN_M);

// Runs on: mark leads at full size, the stack sits underneath it.
const RO_M = 56;
const RO_SIZE = 84;
const RO_SW = 108;
const RO_SH = 48;
const RO_ROW = RO_M + RO_SIZE + 96;
const RO_W = Math.round(Math.max(markW(RO_SIZE), RO_SW * 4 + 36) + RO_M * 2);
const RO_H = RO_ROW + RO_SH + RO_M;

// Lozenge: a pill sized to the word, partners in pills of the same height.
const LZ_M = 48;
const LZ_SIZE = 56;
const LZ_PADX = 34;
const LZ_H = LZ_SIZE + 48;
const LZ_BW = markW(LZ_SIZE) + LZ_PADX * 2;
const LZ_PW = LZ_H * 1.9;
const LZ_W = Math.round(LZ_M * 2 + LZ_BW + 22 + LZ_PW * 2 + 14);

const DEFS: Omit<Lockup, "render">[] = [
	{
		id: "mark",
		name: "Mark",
		note: "Alone. Clear space all round equals the height of the n.",
		w: 760,
		h: 260,
		bg: VOID_BG,
		body: () => mark(108, 380, 130, "middle"),
	},
	{
		id: "paper",
		name: "On paper",
		note: "The light surface version. Same outlines, ink stroke.",
		w: 760,
		h: 260,
		bg: PAPER_BG,
		body: () => mark(108, 380, 130, "middle", INK),
	},
	{
		id: "signature",
		name: "Signature",
		note: "Mark with a rule and a line under it. The default for docs and decks.",
		w: 760,
		h: 300,
		bg: VOID_BG,
		body: ({ tagline }) =>
			mark(94, 64, 128, "start") +
			rule(64, 190, 64 + markW(94)) +
			line(64, 222, 18, (tagline || TAG).toUpperCase(), {
				fill: MUTED,
				ls: 4.2,
			}),
	},
	{
		id: "inline",
		name: "Inline",
		note: "Ultron and a tool on one baseline. The mark keeps its natural width.",
		w: IN_W,
		h: 200,
		bg: VOID_BG,
		body: ({ partner }) =>
			mark(IN_SIZE, IN_M, 100, "start") +
			`<line x1="${IN_RULE}" y1="74" x2="${IN_RULE}" y2="126" stroke="${EDGE}" stroke-width="1.4"/>` +
			slot(IN_X0, 76, IN_SW, IN_SH, partner || P1) +
			slot(IN_X0 + IN_SW + 14, 76, IN_SW, IN_SH, "tool"),
	},
	{
		id: "runson",
		name: "Runs on",
		note: "The primary combo. Mark leads at full size, the stack sits under it. Add or drop slots freely.",
		w: RO_W,
		h: RO_H,
		bg: VOID_BG,
		body: ({ partner }) => {
			const names = [partner || P1, "Slack", "Notion", "Stripe"];
			return (
				mark(RO_SIZE, RO_M, RO_M + RO_SIZE / 2, "start") +
				line(RO_M + 2, RO_M + RO_SIZE + 46, 13, "RUNS ON", {
					fill: MUTED,
					weight: 600,
					ls: 4.4,
				}) +
				names
					.map((n, i) => slot(RO_M + i * (RO_SW + 12), RO_ROW, RO_SW, RO_SH, n))
					.join("")
			);
		},
	},
	{
		id: "lozenge",
		name: "Lozenge",
		note: "A pill sized to the word, with partners in pills of the same height.",
		w: LZ_W,
		h: LZ_H + LZ_M * 2,
		bg: VOID_BG,
		body: ({ partner }) =>
			pill(LZ_M, LZ_M, LZ_BW, LZ_H) +
			mark(LZ_SIZE, LZ_M + LZ_PADX, LZ_M + LZ_H / 2, "start") +
			pill(LZ_M + LZ_BW + 22, LZ_M, LZ_PW, LZ_H, partner || P1) +
			pill(LZ_M + LZ_BW + 36 + LZ_PW, LZ_M, LZ_PW, LZ_H, "tool"),
	},
	{
		id: "toolcard",
		name: "Tool card",
		note: "One tool explained. Mark, what it covers, why it matters, call to action.",
		w: 620,
		h: 640,
		bg: VOID_BG,
		body: ({ tagline, cta }) =>
			mark(58, 64, 88, "start") +
			rule(64, 138, 556) +
			["Systems", "Agents", "Delivery"]
				.map((t, i) => tick(76, 196 + i * 54) + line(106, 196 + i * 54, 22, t, { fill: SOFT }))
				.join("") +
			line(64, 384, 26, tagline || "The layer everything else plugs into.") +
			line(64, 428, 26, "One command, and it runs.", { fill: "#A8A29A" }) +
			`<rect x="64" y="500" width="330" height="46" rx="23" fill="#FFFFFF"/>` +
			line(229, 523, 17, cta || CTA, {
				anchor: "middle",
				weight: 600,
				fill: INK,
			}),
	},
	{
		id: "spec",
		name: "Spec",
		note: "Label and value rows. For breakdowns and set-up posts.",
		w: 720,
		h: 560,
		bg: VOID_BG,
		body: ({ product, cta }) =>
			mark(48, 60, 76, "start") +
			line(60, 154, 34, "THE SETUP", { weight: 800 }) +
			line(60, 194, 26, "LEVEL: SIMPLE", { fill: MUTED }) +
			rule(60, 232, 660) +
			(
				[
					["Runs on", product || "Ultron"],
					["Built with", "Agents"],
					["Ships to", "Your team"],
				] as [string, string][]
			)
				.map(
					([k, v], i) =>
						line(60, 286 + i * 70, 29, `${k}:`, { weight: 700 }) +
						line(660, 286 + i * 70, 29, v, {
							anchor: "end",
							weight: 400,
							fill: SOFT,
						}),
				)
				.join("") +
			line("50%", 508, 18, cta || "read caption", {
				anchor: "middle",
				fill: DIM,
			}),
	},
	{
		id: "stacklist",
		name: "Stack list",
		note: "Categories down the left, tools on the right. Ultron takes the top row at full width.",
		w: 760,
		h: 620,
		bg: VOID_BG,
		body: ({ tagline }) =>
			line("50%", 66, 30, tagline || "THE WHOLE STACK", {
				anchor: "middle",
				weight: 800,
			}) +
			["Brain", "Automation", "Clients", "Payments", "Delivery"]
				.map((r, i) => {
					const y = 148 + i * 92;
					return (
						line(62, y, 26, `${r}:`, { weight: 700 }) +
						(i === 0
							? mark(38, 700, y, "end")
							: slot(560, y - 27, 140, 54, "tool") +
								(i % 2 === 0 ? slot(408, y - 27, 140, 54, "tool") : ""))
					);
				})
				.join(""),
	},
	{
		id: "context",
		name: "In context",
		note: "Mark, a heading and a list. For before and after style posts.",
		w: 720,
		h: 600,
		bg: VOID_BG,
		body: ({ tagline }) =>
			mark(48, 60, 76, "start") +
			line(60, 176, 30, tagline || "What it replaced", { weight: 700 }) +
			rule(60, 206, 340) +
			[
				"Manual reporting",
				"Chasing follow ups",
				"Copy and paste work",
				"Status update calls",
				"Weekly admin",
			]
				.map(
					(t, i) =>
						`<circle cx="70" cy="${262 + i * 58}" r="4" fill="${MUTED}"/>` +
						line(94, 262 + i * 58, 26, t, { fill: SOFT }),
				)
				.join(""),
	},
	{
		id: "watermark",
		name: "Watermark",
		note: "Oversized and faint, bleeding off the bottom edge. The footer treatment.",
		w: 880,
		h: 300,
		bg: SLATE_BG,
		body: () => mark(188, 440, 252, "middle", OUTLINE_SOFT, 0.008),
	},
	{
		id: "banner",
		name: "Banner",
		note: "Wide crop for headers, covers and og images.",
		w: 1040,
		h: 260,
		bg: VOID_BG,
		body: ({ tagline }) =>
			mark(70, 72, 130, "start") +
			line(968, "50%", 19, (tagline || TAG).toUpperCase(), {
				anchor: "end",
				fill: MUTED,
				ls: 4.5,
			}),
	},
	{
		id: "endcard",
		name: "End card",
		note: "Vertical, for the last frame of a reel.",
		w: 360,
		h: 640,
		bg: VOID_BG,
		body: ({ tagline, cta }) =>
			mark(52, 180, 258, "middle") +
			// 10/2.2 keeps the default tagline inside 360. Anything larger runs off
			// both edges of the frame.
			line("50%", 310, 10, (tagline || TAG).toUpperCase(), {
				anchor: "middle",
				fill: MUTED,
				ls: 2.2,
			}) +
			`<rect x="70" y="368" width="220" height="40" rx="20" fill="#FFFFFF"/>` +
			line(180, 388, 14, cta || "follow for more", {
				anchor: "middle",
				weight: 600,
				fill: INK,
			}),
	},
];

export const LOCKUPS: Lockup[] = DEFS.map((d) => ({
	...d,
	// The card and the download share one string, so they cannot disagree. The
	// markup is generated here from fixed templates and every caller-supplied
	// value goes through esc().
	// biome-ignore lint/security/noDangerouslySetInnerHtml: our own SVG, escaped above
	render: (o: Opts) => <g dangerouslySetInnerHTML={{ __html: d.body(o) }} />,
}));

/** The same lockup as a standalone file, byte for byte what the card shows. */
export function lockupSvg(l: Lockup, o: Opts) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">
  <rect width="${l.w}" height="${l.h}" fill="${l.bg}"/>
  ${l.body(o)}
</svg>`;
}

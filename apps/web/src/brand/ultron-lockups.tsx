"use client";

import { WORDMARK_H, WORDMARK_PATHS, WORDMARK_W } from "./ultron-wordmark";

// The outline wordmark in the compositions it actually gets placed in: alone, in
// a tile, paired with another tool, in a stack row, and inside context cards.
//
// Two rules baked in here:
//   1. The mark is ALWAYS the full wordmark. Never a single letter, never a
//      monogram, never just the u.
//   2. Letters stay hollow. fill none plus a hairline stroke, in both the
//      on-screen render and the exported SVG, so what you copy is what you see.
//
// Partner tiles render as labelled slots. We do not ship other companies' logos;
// drop the real asset into the slot in your design tool.

export const OUTLINE = "#F2F2F0";
export const OUTLINE_SOFT = "rgba(226,232,255,0.34)";
export const VOID_BG = "#030201";
export const SLATE_BG = "#1B2030";
export const TILE_BG = "#0F0E0C";
export const SLOT_BG = "#171614";

const FAMILY = "Inter, system-ui, -apple-system, sans-serif";
const MUTED = "#8C8880";
const DIM = "#5A554D";

/** The mark: hollow vector letterforms, never live text, always the full word. */
export function OutlineMark({
	size = 120,
	stroke = OUTLINE,
	strokeScale = 0.016,
	x,
	y,
	anchor = "middle",
	opacity = 1,
}: {
	size?: number;
	stroke?: string;
	strokeScale?: number;
	x: number;
	y: number;
	anchor?: "start" | "middle" | "end";
	opacity?: number;
}) {
	// `size` is cap/ascender height; scale the 148-unit design grid to match.
	const k = size / WORDMARK_H;
	const w = WORDMARK_W * k;
	const dx = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
	return (
		<g transform={`translate(${x} ${y})`} opacity={opacity}>
			<g transform={`translate(${dx} ${(WORDMARK_H / 2) * k}) scale(${k})`}>
				{WORDMARK_PATHS.map((d) => (
					<path
						key={d.slice(0, 24)}
						d={d}
						fill="none"
						stroke={stroke}
						strokeWidth={Math.max(0.7, size * strokeScale) / k}
						strokeLinejoin="round"
					/>
				))}
			</g>
		</g>
	);
}

/** App-icon tile carrying the wordmark. The unit used in pairs and stacks. */
function Tile({ x, y, s, label }: { x: number; y: number; s: number; label?: string }) {
	return (
		<g>
			<rect x={x} y={y} width={s} height={s} rx={s * 0.22} fill={label ? SLOT_BG : TILE_BG} stroke="#2C2A27" strokeWidth={1.5} />
			{label ? (
				<text
					x={x + s / 2}
					y={y + s / 2}
					textAnchor="middle"
					dominantBaseline="central"
					fontFamily={FAMILY}
					fontSize={s * 0.15}
					fontWeight={600}
					fill={MUTED}
				>
					{label}
				</text>
			) : (
				<OutlineMark size={s * 0.235} x={x + s / 2} y={y + s / 2} strokeScale={0.02} />
			)}
		</g>
	);
}

function Plus({ x, y, s = 13 }: { x: number; y: number; s?: number }) {
	return (
		<g stroke={DIM} strokeWidth={2.4} strokeLinecap="round">
			<line x1={x - s} y1={y} x2={x + s} y2={y} />
			<line x1={x} y1={y - s} x2={x} y2={y + s} />
		</g>
	);
}

function Line({
	x,
	y,
	size,
	fill = "#F2F2F0",
	weight = 500,
	anchor = "start",
	ls = 0,
	children,
}: {
	x: number | string;
	y: number | string;
	size: number;
	fill?: string;
	weight?: number;
	anchor?: "start" | "middle" | "end";
	ls?: number;
	children: string;
}) {
	return (
		<text
			x={x}
			y={y}
			textAnchor={anchor}
			dominantBaseline="central"
			fontFamily={FAMILY}
			fontSize={size}
			fontWeight={weight}
			letterSpacing={ls}
			fill={fill}
		>
			{children}
		</text>
	);
}

export type Opts = { tagline?: string; product?: string; partner?: string; cta?: string };

export type Lockup = {
	id: string;
	name: string;
	note: string;
	w: number;
	h: number;
	bg: string;
	render: (o: Opts) => React.ReactNode;
};

const TAG = "from zero to autonomous company";
const P1 = "n8n";
const CTA = 'comment "STACK" for the full list';

export const LOCKUPS: Lockup[] = [
	{
		id: "mark",
		name: "Mark",
		note: "Alone. Clear space equals the height of the n.",
		w: 720, h: 280, bg: VOID_BG,
		render: () => <OutlineMark size={128} x={360} y={140} />,
	},
	{
		id: "tile",
		name: "Tile",
		note: "App-icon tile. The unit used inside pairs and stacks.",
		w: 320, h: 320, bg: VOID_BG,
		render: () => <Tile x={50} y={50} s={220} />,
	},
	{
		id: "pair",
		name: "Pair",
		note: "Ultron plus one tool, with a line of context underneath.",
		w: 720, h: 420, bg: VOID_BG,
		render: ({ partner, tagline }) => (
			<>
				<Tile x={196} y={70} s={140} />
				<Plus x={360} y={140} />
				<Tile x={384} y={70} s={140} label={partner || P1} />
				<Line x="50%" y={268} size={22} anchor="middle" weight={500} fill="#D8D5D0">
					{tagline || "combine them and the work runs itself"}
				</Line>
				<Line x="50%" y={306} size={22} anchor="middle" weight={700}>
					{"no team required"}
				</Line>
			</>
		),
	},
	{
		id: "stack",
		name: "Stack",
		note: "Ultron leading a row of tools. Add or remove slots as needed.",
		w: 900, h: 340, bg: VOID_BG,
		render: ({ partner, tagline }) => {
			const names = [partner || P1, "Slack", "Notion"];
			const s = 104, gap = 52, n = 4;
			const total = n * s + (n - 1) * gap;
			const x0 = (900 - total) / 2;
			return (
				<>
					<Line x="50%" y={72} size={19} anchor="middle" weight={600} fill={MUTED} ls={4}>
						{"IF YOU HAVE"}
					</Line>
					<Tile x={x0} y={118} s={s} />
					{names.map((nm, i) => (
						<g key={nm}>
							<Plus x={x0 + (i + 1) * (s + gap) - gap / 2} y={118 + s / 2} s={11} />
							<Tile x={x0 + (i + 1) * (s + gap)} y={118} s={s} label={nm} />
						</g>
					))}
					<Line x="50%" y={268} size={21} anchor="middle" weight={500} fill="#D8D5D0">
						{tagline || "the whole back office runs without you"}
					</Line>
				</>
			);
		},
	},
	{
		id: "toolcard",
		name: "Tool card",
		note: "One tool explained. Tile, what it covers, why it matters, call to action.",
		w: 620, h: 700, bg: VOID_BG,
		render: ({ tagline, cta }) => (
			<>
				<OutlineMark size={44} x={310} y={86} stroke="#9A958D" />
				<Tile x={64} y={140} s={150} />
				{["Systems", "Agents", "Delivery"].map((t, i) => (
					<g key={t}>
						<circle cx={252} cy={172 + i * 52} r={11} fill="none" stroke={MUTED} strokeWidth={2} />
						<path d={`M${246} ${172 + i * 52} l4 5 8 -10`} fill="none" stroke={MUTED} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
						<Line x={278} y={172 + i * 52} size={22} fill="#D8D5D0">{t}</Line>
					</g>
				))}
				<Line x={64} y={352} size={26} weight={500}>{tagline || "The layer everything else plugs into."}</Line>
				<Line x={64} y={412} size={26} weight={500} fill="#A8A29A">{"One command, and it runs."}</Line>
				<g>
					<rect x={64} y={470} width={330} height={46} rx={23} fill="#FFFFFF" />
					<Line x={229} y={493} size={17} anchor="middle" weight={600} fill="#0A0705">{cta || CTA}</Line>
				</g>
			</>
		),
	},
	{
		id: "spec",
		name: "Spec",
		note: "Label and value rows. For breakdowns and set-up posts.",
		w: 720, h: 560, bg: VOID_BG,
		render: ({ product, cta }) => (
			<>
				<Tile x={60} y={56} s={92} />
				<Line x={176} y={88} size={34} weight={800}>{"THE SETUP"}</Line>
				<Line x={176} y={130} size={30} weight={500} fill={MUTED}>{"LEVEL: SIMPLE"}</Line>
				{[["Runs on", product || "Ultron"], ["Built with", "Agents"], ["Ships to", "Your team"]].map(([k, v], i) => (
					<g key={k}>
						<Line x={60} y={250 + i * 74} size={30} weight={700}>{`${k}:`}</Line>
						<Line x={660} y={250 + i * 74} size={30} anchor="end" weight={400} fill="#D8D5D0">{v}</Line>
					</g>
				))}
				<Line x="50%" y={496} size={18} anchor="middle" weight={500} fill={DIM}>{cta || "read caption"}</Line>
			</>
		),
	},
	{
		id: "stacklist",
		name: "Stack list",
		note: "Categories down the left, tool slots on the right. The full stack in one frame.",
		w: 760, h: 640, bg: VOID_BG,
		render: ({ tagline }) => {
			const rows = ["Brain", "Automation", "Clients", "Payments", "Delivery"];
			return (
				<>
					<Line x="50%" y={68} size={30} anchor="middle" weight={800}>
						{tagline || "THE WHOLE STACK"}
					</Line>
					{rows.map((r, i) => {
						const y = 150 + i * 92;
						return (
							<g key={r}>
								<Line x={62} y={y} size={27} weight={700}>{`${r}:`}</Line>
								{i === 0 ? (
									<Tile x={420} y={y - 30} s={60} />
								) : (
									<>
										<Tile x={420} y={y - 30} s={60} label="tool" />
										{i % 2 === 0 && <Tile x={496} y={y - 30} s={60} label="tool" />}
									</>
								)}
							</g>
						);
					})}
				</>
			);
		},
	},
	{
		id: "context",
		name: "In context",
		note: "Tile with a heading and a list. For before and after style posts.",
		w: 720, h: 620, bg: VOID_BG,
		render: ({ tagline }) => (
			<>
				<Tile x={60} y={56} s={92} />
				<Line x={60} y={200} size={30} weight={700}>{tagline || "What it replaced"}</Line>
				<line x1={60} y1={226} x2={330} y2={226} stroke={DIM} strokeWidth={1.5} />
				{["Manual reporting", "Chasing follow ups", "Copy and paste work", "Status update calls", "Weekly admin"].map((t, i) => (
					<g key={t}>
						<circle cx={70} cy={278 + i * 58} r={4} fill={MUTED} />
						<Line x={94} y={278 + i * 58} size={26} weight={500} fill="#D8D5D0">{t}</Line>
					</g>
				))}
			</>
		),
	},
	{
		id: "watermark",
		name: "Watermark",
		note: "Oversized and faint, bleeding off the bottom edge. The footer treatment.",
		w: 880, h: 300, bg: SLATE_BG,
		render: () => <OutlineMark size={230} x={440} y={258} stroke={OUTLINE_SOFT} strokeScale={0.008} />,
	},
	{
		id: "banner",
		name: "Banner",
		note: "Wide crop for headers and covers.",
		w: 1040, h: 260, bg: VOID_BG,
		render: ({ tagline }) => (
			<>
				<OutlineMark size={76} x={72} y={130} anchor="start" />
				<Line x={968} y="50%" size={19} anchor="end" weight={500} ls={4.5} fill={MUTED}>
					{(tagline || TAG).toUpperCase()}
				</Line>
			</>
		),
	},
	{
		id: "endcard",
		name: "End card",
		note: "Vertical, for the last frame of a reel.",
		w: 360, h: 640, bg: VOID_BG,
		render: ({ tagline, cta }) => (
			<>
				<OutlineMark size={66} x={180} y={256} />
				<Line x="50%" y="49%" size={12} anchor="middle" weight={500} ls={3.2} fill={MUTED}>
					{(tagline || TAG).toUpperCase()}
				</Line>
				<g>
					<rect x={70} y={410} width={220} height={40} rx={20} fill="#FFFFFF" />
					<Line x={180} y={430} size={14} anchor="middle" weight={600} fill="#0A0705">{cta || "follow for more"}</Line>
				</g>
			</>
		),
	},
];

/* ---------- standalone SVG export ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sMark = (size: number, x: number, y: number, anchor: string, stroke = OUTLINE, sc = 0.016) => {
	// Same vector paths as the on-screen render, so the export is identical.
	const k = size / WORDMARK_H;
	const w = WORDMARK_W * k;
	const dx = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
	const sw = (Math.max(0.7, size * sc) / k).toFixed(2);
	const body = WORDMARK_PATHS.map(
		(d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`,
	).join("");
	return `<g transform="translate(${x}, ${y})"><g transform="translate(${dx.toFixed(1)} ${((WORDMARK_H / 2) * k).toFixed(1)}) scale(${k.toFixed(4)})">${body}</g></g>`;
};
const sTile = (x: number, y: number, s: number, label?: string) =>
	`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${(s * 0.22).toFixed(1)}" fill="${label ? SLOT_BG : TILE_BG}" stroke="#2C2A27" stroke-width="1.5"/>` +
	(label
		? `<text x="${x + s / 2}" y="${y + s / 2}" text-anchor="middle" dominant-baseline="central" font-family="${FAMILY}" font-size="${(s * 0.15).toFixed(1)}" font-weight="600" fill="${MUTED}">${esc(label)}</text>`
		: sMark(s * 0.235, x + s / 2, y + s / 2, "middle", OUTLINE, 0.02));
const sPlus = (x: number, y: number, s = 13) =>
	`<g stroke="${DIM}" stroke-width="2.4" stroke-linecap="round"><line x1="${x - s}" y1="${y}" x2="${x + s}" y2="${y}"/><line x1="${x}" y1="${y - s}" x2="${x}" y2="${y + s}"/></g>`;
const sLine = (x: number | string, y: number | string, size: number, txt: string, o: { fill?: string; weight?: number; anchor?: string; ls?: number } = {}) =>
	`<text x="${x}" y="${y}" text-anchor="${o.anchor || "start"}" dominant-baseline="central" font-family="${FAMILY}" font-size="${size}" font-weight="${o.weight ?? 500}" letter-spacing="${o.ls ?? 0}" fill="${o.fill || "#F2F2F0"}">${esc(txt)}</text>`;

export function lockupSvg(l: Lockup, o: Opts) {
	const tag = o.tagline || "";
	let b = "";
	switch (l.id) {
		case "mark": b = sMark(128, 360, 140, "middle"); break;
		case "tile": b = sTile(50, 50, 220); break;
		case "pair":
			b = sTile(196, 70, 140) + sPlus(360, 140) + sTile(384, 70, 140, o.partner || P1)
				+ sLine("50%", 268, 22, tag || "combine them and the work runs itself", { anchor: "middle", fill: "#D8D5D0" })
				+ sLine("50%", 306, 22, "no team required", { anchor: "middle", weight: 700 });
			break;
		case "stack": {
			const names = [o.partner || P1, "Slack", "Notion"];
			const s = 104, gap = 52, total = 4 * s + 3 * gap, x0 = (900 - total) / 2;
			b = sLine("50%", 72, 19, "IF YOU HAVE", { anchor: "middle", weight: 600, fill: MUTED, ls: 4 }) + sTile(x0, 118, s);
			names.forEach((nm, i) => {
				b += sPlus(x0 + (i + 1) * (s + gap) - gap / 2, 118 + s / 2, 11) + sTile(x0 + (i + 1) * (s + gap), 118, s, nm);
			});
			b += sLine("50%", 268, 21, tag || "the whole back office runs without you", { anchor: "middle", fill: "#D8D5D0" });
			break;
		}
		case "toolcard":
			b = sMark(44, 310, 86, "middle", "#9A958D") + sTile(64, 140, 150);
			["Systems", "Agents", "Delivery"].forEach((t, i) => {
				const y = 172 + i * 52;
				b += `<circle cx="252" cy="${y}" r="11" fill="none" stroke="${MUTED}" stroke-width="2"/><path d="M246 ${y} l4 5 8 -10" fill="none" stroke="${MUTED}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` + sLine(278, y, 22, t, { fill: "#D8D5D0" });
			});
			b += sLine(64, 352, 26, tag || "The layer everything else plugs into.")
				+ sLine(64, 412, 26, "One command, and it runs.", { fill: "#A8A29A" })
				+ `<rect x="64" y="470" width="330" height="46" rx="23" fill="#FFFFFF"/>`
				+ sLine(229, 493, 17, o.cta || CTA, { anchor: "middle", weight: 600, fill: "#0A0705" });
			break;
		case "spec":
			b = sTile(60, 56, 92) + sLine(176, 88, 34, "THE SETUP", { weight: 800 }) + sLine(176, 130, 30, "LEVEL: SIMPLE", { fill: MUTED });
			[["Runs on", o.product || "Ultron"], ["Built with", "Agents"], ["Ships to", "Your team"]].forEach(([k, v], i) => {
				b += sLine(60, 250 + i * 74, 30, `${k}:`, { weight: 700 }) + sLine(660, 250 + i * 74, 30, v, { anchor: "end", weight: 400, fill: "#D8D5D0" });
			});
			b += sLine("50%", 496, 18, o.cta || "read caption", { anchor: "middle", fill: DIM });
			break;
		case "stacklist":
			b = sLine("50%", 68, 30, tag || "THE WHOLE STACK", { anchor: "middle", weight: 800 });
			["Brain", "Automation", "Clients", "Payments", "Delivery"].forEach((r, i) => {
				const y = 150 + i * 92;
				b += sLine(62, y, 27, `${r}:`, { weight: 700 });
				b += i === 0 ? sTile(420, y - 30, 60) : sTile(420, y - 30, 60, "tool") + (i % 2 === 0 ? sTile(496, y - 30, 60, "tool") : "");
			});
			break;
		case "context":
			b = sTile(60, 56, 92) + sLine(60, 200, 30, tag || "What it replaced", { weight: 700 })
				+ `<line x1="60" y1="226" x2="330" y2="226" stroke="${DIM}" stroke-width="1.5"/>`;
			["Manual reporting", "Chasing follow ups", "Copy and paste work", "Status update calls", "Weekly admin"].forEach((t, i) => {
				b += `<circle cx="70" cy="${278 + i * 58}" r="4" fill="${MUTED}"/>` + sLine(94, 278 + i * 58, 26, t, { fill: "#D8D5D0" });
			});
			break;
		case "watermark": b = sMark(230, 440, 258, "middle", OUTLINE_SOFT, 0.008); break;
		case "banner":
			b = sMark(76, 72, 130, "start") + sLine(968, "50%", 19, (tag || TAG).toUpperCase(), { anchor: "end", fill: MUTED, ls: 4.5 });
			break;
		case "endcard":
			b = sMark(66, 180, 256, "middle") + sLine("50%", "49%", 12, (tag || TAG).toUpperCase(), { anchor: "middle", fill: MUTED, ls: 3.2 })
				+ `<rect x="70" y="410" width="220" height="40" rx="20" fill="#FFFFFF"/>`
				+ sLine(180, 430, 14, o.cta || "follow for more", { anchor: "middle", weight: 600, fill: "#0A0705" });
			break;
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">
  <rect width="${l.w}" height="${l.h}" fill="${l.bg}"/>
  ${b}
</svg>`;
}

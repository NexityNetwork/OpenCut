"use client";

// The outline wordmark in the shapes it actually gets used in.
// Hollow letters, thin stroke. Every lockup renders as real SVG so it can be
// copied or downloaded and dropped straight into a design, a deck or a video.

import { useId } from "react";

export const OUTLINE = "#F2F2F0";
export const OUTLINE_SOFT = "rgba(226,232,255,0.34)";
export const VOID_BG = "#030201";
export const SLATE_BG = "#1B2030";

const FAMILY = "Inter, system-ui, -apple-system, sans-serif";

/** The mark itself: hollow letters, stroke only. */
export function OutlineMark({
	text = "ultron",
	size = 120,
	stroke = OUTLINE,
	weight = 800,
	strokeScale = 0.016,
	x = "50%",
	y = "50%",
	anchor = "middle",
	opacity = 1,
}: {
	text?: string;
	size?: number;
	stroke?: string;
	weight?: number;
	strokeScale?: number;
	x?: number | string;
	y?: number | string;
	anchor?: "start" | "middle" | "end";
	opacity?: number;
}) {
	return (
		<text
			x={x}
			y={y}
			textAnchor={anchor}
			dominantBaseline="central"
			fontFamily={FAMILY}
			fontWeight={weight}
			fontSize={size}
			letterSpacing={-size * 0.03}
			fill="none"
			stroke={stroke}
			strokeWidth={Math.max(0.75, size * strokeScale)}
			strokeLinejoin="round"
			opacity={opacity}
		>
			{text}
		</text>
	);
}

export type LockupId =
	| "mark"
	| "stacked"
	| "product"
	| "cobrand"
	| "watermark"
	| "avatar"
	| "banner"
	| "endcard";

export type Lockup = {
	id: LockupId;
	name: string;
	note: string;
	w: number;
	h: number;
	bg: string;
	render: (o: { partner?: string; tagline?: string; product?: string }) => React.ReactNode;
};

const TAG = "from zero to autonomous company";

export const LOCKUPS: Lockup[] = [
	{
		id: "mark",
		name: "Mark",
		note: "The wordmark on its own. Clear space equals the height of the n.",
		w: 720,
		h: 300,
		bg: VOID_BG,
		render: () => <OutlineMark size={132} />,
	},
	{
		id: "stacked",
		name: "Stacked",
		note: "Mark over a tagline. For covers, title cards and slide one.",
		w: 720,
		h: 380,
		bg: VOID_BG,
		render: ({ tagline }) => (
			<>
				<OutlineMark size={124} y="43%" />
				<text
					x="50%"
					y="70%"
					textAnchor="middle"
					fontFamily={FAMILY}
					fontSize={20}
					fontWeight={500}
					letterSpacing={5.5}
					fill="#8C8880"
				>
					{(tagline || TAG).toUpperCase()}
				</text>
			</>
		),
	},
	{
		id: "product",
		name: "Product",
		note: "Mark plus a product name, split by a hairline. Monolith, Studio, Genome.",
		w: 880,
		h: 260,
		bg: VOID_BG,
		render: ({ product }) => (
			<>
				<OutlineMark size={92} x={72} y="50%" anchor="start" />
				<line x1={468} y1={70} x2={468} y2={190} stroke="#3A3936" strokeWidth={1.5} />
				<text
					x={508}
					y="50%"
					dominantBaseline="central"
					fontFamily={FAMILY}
					fontSize={62}
					fontWeight={300}
					fill="#F2F2F0"
					letterSpacing={-1}
				>
					{product || "Monolith"}
				</text>
			</>
		),
	},
	{
		id: "cobrand",
		name: "Co-brand",
		note: "Paired with a partner. Keep the cross tight and both marks on one baseline.",
		w: 880,
		h: 260,
		bg: VOID_BG,
		render: ({ partner }) => (
			<>
				<OutlineMark size={84} x={92} y="50%" anchor="start" />
				<g stroke="#5A554D" strokeWidth={2}>
					<line x1={470} y1={116} x2={498} y2={144} />
					<line x1={498} y1={116} x2={470} y2={144} />
				</g>
				<text
					x={540}
					y="50%"
					dominantBaseline="central"
					fontFamily={FAMILY}
					fontSize={54}
					fontWeight={600}
					fill="#A8A29A"
				>
					{partner || "Partner"}
				</text>
			</>
		),
	},
	{
		id: "watermark",
		name: "Watermark",
		note: "Oversized and faint, bleeding off the bottom edge. The footer treatment.",
		w: 880,
		h: 300,
		bg: SLATE_BG,
		render: () => (
			<OutlineMark size={230} y="86%" stroke={OUTLINE_SOFT} strokeScale={0.008} />
		),
	},
	{
		id: "avatar",
		name: "Avatar",
		note: "Square crop for profiles. Just the u, optically centred.",
		w: 320,
		h: 320,
		bg: VOID_BG,
		render: () => <OutlineMark text="u" size={190} y="52%" strokeScale={0.013} />,
	},
	{
		id: "banner",
		name: "Banner",
		note: "Wide crop for headers and covers. Mark left, tagline right.",
		w: 1040,
		h: 260,
		bg: VOID_BG,
		render: ({ tagline }) => (
			<>
				<OutlineMark size={78} x={72} y="50%" anchor="start" />
				<text
					x={968}
					y="50%"
					textAnchor="end"
					dominantBaseline="central"
					fontFamily={FAMILY}
					fontSize={19}
					fontWeight={500}
					letterSpacing={4.5}
					fill="#8C8880"
				>
					{(tagline || TAG).toUpperCase()}
				</text>
			</>
		),
	},
	{
		id: "endcard",
		name: "End card",
		note: "Vertical, for the last frame of a reel. Mark high, room for a call to action.",
		w: 360,
		h: 640,
		bg: VOID_BG,
		render: ({ tagline }) => (
			<>
				<OutlineMark size={68} y="42%" />
				<text
					x="50%"
					y="52%"
					textAnchor="middle"
					fontFamily={FAMILY}
					fontSize={13}
					fontWeight={500}
					letterSpacing={3.4}
					fill="#8C8880"
				>
					{(tagline || TAG).toUpperCase()}
				</text>
			</>
		),
	},
];

/** Standalone SVG string for copy and download. */
export function lockupSvg(l: Lockup, o: { partner?: string; tagline?: string; product?: string }) {
	const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	const mark = (size: number, x: string | number, y: string, anchor: string, stroke: string, sc: number, t = "ultron") =>
		`<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central" font-family="${FAMILY}" font-weight="800" font-size="${size}" letter-spacing="${(-size * 0.03).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${Math.max(0.75, size * sc).toFixed(2)}" stroke-linejoin="round">${t}</text>`;
	const label = (x: string | number, y: string, s: number, ls: number, fill: string, anchor: string, txt: string, w = 500) =>
		`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FAMILY}" font-size="${s}" font-weight="${w}" letter-spacing="${ls}" fill="${fill}">${esc(txt)}</text>`;
	const tag = (o.tagline || TAG).toUpperCase();
	let body = "";
	switch (l.id) {
		case "mark": body = mark(132, "50%", "50%", "middle", OUTLINE, 0.016); break;
		case "stacked":
			body = mark(124, "50%", "43%", "middle", OUTLINE, 0.016) + label("50%", "70%", 20, 5.5, "#8C8880", "middle", tag);
			break;
		case "product":
			body = mark(92, 72, "50%", "start", OUTLINE, 0.016)
				+ `<line x1="468" y1="70" x2="468" y2="190" stroke="#3A3936" stroke-width="1.5"/>`
				+ `<text x="508" y="50%" dominant-baseline="central" font-family="${FAMILY}" font-size="62" font-weight="300" fill="#F2F2F0" letter-spacing="-1">${esc(o.product || "Monolith")}</text>`;
			break;
		case "cobrand":
			body = mark(84, 92, "50%", "start", OUTLINE, 0.016)
				+ `<g stroke="#5A554D" stroke-width="2"><line x1="470" y1="116" x2="498" y2="144"/><line x1="498" y1="116" x2="470" y2="144"/></g>`
				+ `<text x="540" y="50%" dominant-baseline="central" font-family="${FAMILY}" font-size="54" font-weight="600" fill="#A8A29A">${esc(o.partner || "Partner")}</text>`;
			break;
		case "watermark": body = mark(230, "50%", "86%", "middle", OUTLINE_SOFT, 0.008); break;
		case "avatar": body = mark(190, "50%", "52%", "middle", OUTLINE, 0.013, "u"); break;
		case "banner":
			body = mark(78, 72, "50%", "start", OUTLINE, 0.016) + label(968, "50%", 19, 4.5, "#8C8880", "end", tag);
			break;
		case "endcard":
			body = mark(68, "50%", "42%", "middle", OUTLINE, 0.016) + label("50%", "52%", 13, 3.4, "#8C8880", "middle", tag);
			break;
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">
  <rect width="${l.w}" height="${l.h}" fill="${l.bg}"/>
  ${body}
</svg>`;
}

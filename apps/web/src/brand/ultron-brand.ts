// Ultron brand tokens, sampled from the live site (app.51ultron.com) rather than
// guessed. The identity is a near-black warm-tinted field with a single amber
// light source, and a wordmark that reads as lit by it.
//
// The old orange-and-blue ball mark is retired. Do not reintroduce it.

export type Swatch = {
	name: string;
	hex: string;
	note: string;
	/** dark text on light swatch */
	onLight?: boolean;
};

export const CORE: Swatch[] = [
	{ name: "Void", hex: "#030201", note: "Page background. Warm-tinted black, never pure #000." },
	{ name: "Ink", hex: "#0A0705", note: "Raised black for stacked surfaces." },
	{ name: "Surface", hex: "#262624", note: "Panels, inputs, cards on dark." },
	{ name: "Edge", hex: "#3A3936", note: "Hairline borders and dividers." },
];

export const GLOW: Swatch[] = [
	{ name: "Core", hex: "#FFFEFB", note: "Centre of the light source.", onLight: true },
	{ name: "Halo", hex: "#FEF8E6", note: "Immediately around the core.", onLight: true },
	{ name: "Sand", hex: "#F5DDAA", note: "Mid falloff. The signature warm tone.", onLight: true },
	{ name: "Amber", hex: "#E6C58F", note: "Lit edge of the wordmark.", onLight: true },
	{ name: "Ember", hex: "#8A6234", note: "Deep falloff before it hits the void." },
	{ name: "Shadow", hex: "#20130C", note: "Unlit side of the wordmark." },
];

export const TEXT: Swatch[] = [
	{ name: "Primary", hex: "#F7F5F2", note: "Headings and body on dark.", onLight: true },
	{ name: "Secondary", hex: "#A8A29A", note: "Supporting copy." },
	{ name: "Muted", hex: "#6B655D", note: "Labels, captions, metadata." },
];

/** The light-surface pairing used on docs and footer areas. */
export const LIGHT: Swatch[] = [
	{ name: "Paper", hex: "#F5F6FB", note: "Light surface background.", onLight: true },
	{ name: "Slate", hex: "#1E2436", note: "Wordmark and text on Paper." },
];

/** Canonical background treatments. */
export const BACKDROPS = [
	{
		name: "Light source",
		css: "radial-gradient(120% 90% at 88% 50%, #FFFEFB 0%, #FEF8E6 8%, #F5DDAA 16%, #8A6234 32%, #20130C 52%, #030201 74%)",
		note: "The hero. Light enters from the right and falls off into the void.",
	},
	{
		name: "Low ember",
		css: "radial-gradient(100% 70% at 50% 118%, #8A6234 0%, #3A2415 26%, #0A0705 58%, #030201 100%)",
		note: "Light from below. For sections that sit under the hero.",
	},
	{
		name: "Void",
		css: "linear-gradient(180deg, #0A0705 0%, #030201 100%)",
		note: "Neutral dark. Use when content carries the colour.",
	},
	{
		name: "Paper",
		css: "linear-gradient(180deg, #FFFFFF 0%, #F5F6FB 100%)",
		note: "Light counterpart for documents and long reading.",
	},
] as const;

/** Wordmark treatments available in the playground. */
export const MARKS = ["gradient", "outline", "solid", "emboss"] as const;
export type MarkStyle = (typeof MARKS)[number];

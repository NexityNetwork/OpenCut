// Link-in-bio ("Monolith Bio") — shared types for the builder and the public page.

export type BioLink = {
	id: string;
	label: string;
	url: string;
	/** optional emoji/short glyph shown on the button */
	icon?: string;
};

export type BioSocial = {
	id: string;
	platform: string; // youtube | instagram | tiktok | x | linkedin | github | email | website
	url: string;
};

export type BioTheme = "noir" | "warm" | "mono" | "sunset" | "forest";
export type BioBackground = "grid" | "glow" | "plain";

export type BioData = {
	displayName: string;
	tagline: string;
	avatarUrl?: string;
	theme: BioTheme;
	accent: string; // hex
	background: BioBackground;
	links: BioLink[];
	socials: BioSocial[];
};

export type BioPage = {
	handle: string;
	data: BioData;
	published: boolean;
	updatedAt: number;
};

export const BIO_THEMES: Record<
	BioTheme,
	{ label: string; bg: string; fg: string; sub: string; card: string; border: string }
> = {
	noir: {
		label: "Noir",
		bg: "#0c0b0a",
		fg: "#f5f1e8",
		sub: "#9a9384",
		card: "rgba(255,255,255,0.05)",
		border: "rgba(255,255,255,0.1)",
	},
	warm: {
		label: "Warm",
		bg: "#1a1714",
		fg: "#f1ebdc",
		sub: "#b3a892",
		card: "rgba(255,255,255,0.06)",
		border: "rgba(255,255,255,0.1)",
	},
	mono: {
		label: "Paper",
		bg: "#f4f1ea",
		fg: "#1b1813",
		sub: "#6b6456",
		card: "rgba(0,0,0,0.04)",
		border: "rgba(0,0,0,0.1)",
	},
	sunset: {
		label: "Sunset",
		bg: "#1c1018",
		fg: "#ffeede",
		sub: "#c79bb0",
		card: "rgba(255,255,255,0.06)",
		border: "rgba(255,255,255,0.12)",
	},
	forest: {
		label: "Forest",
		bg: "#0d1512",
		fg: "#e7f0e6",
		sub: "#8fae9b",
		card: "rgba(255,255,255,0.05)",
		border: "rgba(255,255,255,0.1)",
	},
};

export function emptyBio(name = "Your name"): BioData {
	return {
		displayName: name,
		tagline: "Creator · building in public",
		avatarUrl: "",
		theme: "warm",
		accent: "#d49a6a",
		background: "glow",
		links: [
			{ id: "l1", label: "Latest video", url: "", icon: "▶" },
			{ id: "l2", label: "Newsletter", url: "", icon: "✉" },
		],
		socials: [],
	};
}

export function slugifyHandle(s: string): string {
	return (
		s
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 32) || "me"
	);
}

// The tool logos, exported from Figma and served from /tools.
//
// Every file is a finished rounded tile at 75x75 with the corners already cut, so
// nothing draws a container around them. 75 is also what a 76px slot on a 1080
// frame wants, which means they render 1:1 and never get upscaled - reels ship at
// 1080x1920, so there is no 2x pass to size up for.
//
// These are third-party trademarks used to say which tools we work with. Do not
// restyle them, recolour them, or put them on a coloured plate.

export const TOOL_LOGOS = [
	"airtable",
	"apify",
	"calendly",
	"claude",
	"claude-olive",
	"facebook",
	"gmail",
	"google-maps",
	"hubspot",
	"instagram",
	"linkedin",
	"lovable",
	"make",
	"n8n",
	"notion",
	"openai",
	"perplexity",
	"slack",
	"stripe",
	"supabase",
	"tiktok",
	"twilio",
	"x",
	"youtube",
] as const;

export type ToolLogo = (typeof TOOL_LOGOS)[number];

/** Native size of every tile. Slots should be this or smaller. */
export const TOOL_LOGO_PX = 75;

export const toolLogoSrc = (name: ToolLogo) => `/tools/${name}.png`;

export const isToolLogo = (s: string): s is ToolLogo =>
	(TOOL_LOGOS as readonly string[]).includes(s);

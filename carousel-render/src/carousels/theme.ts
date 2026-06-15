/**
 * White editorial carousel — design tokens + safe-zone geometry.
 *
 * This is the "black-on-white card" content style (distinct from the dark
 * animated reel templates in src/templates/). Frames are rendered as STILLS
 * (one PNG per slide) and stitched into a vertical video behind a hook clip.
 *
 * Canvas is 1080×1920. Critical text + cards live inside CAROUSEL_SAFE;
 * background graphics (the faded brand glyph, tilted device cards) may bleed
 * past it. The band is tuned against SAFE_INSTAGRAM (top 200 / bottom 450 in
 * src/lib/safe-zones.ts) with extra top air to match the reference look — so
 * nothing important is ever covered by the IG/TikTok caption or action rail.
 */

export const CAROUSEL_CANVAS = { width: 1080, height: 1920, fps: 30 } as const;

/** Inset of the content band from the canvas edges (px).
 * Matches the reel safe-zone template: ~810px text-safe column (sides 135) and
 * top/bottom clear of the 220/320 danger margins. */
export const CAROUSEL_SAFE = { top: 250, bottom: 360, left: 135, right: 135 } as const;

/** Y of the "Swipe →" footer — kept above the IG bottom danger zone (≤1470). */
export const SWIPE_Y = 1440;

export const carouselTheme = {
  bg: '#f0ece1', // cream — unified with the AHFrame editorial decks (was stark white)
  ink: '#100f0e', // near-black headline
  inkBody: '#3a3733', // body copy
  inkMuted: '#8a857c', // gray secondary headline / labels
  accent: '#e8542b', // brand orange (unified with AH_ORANGE)
  cardDark: '#101012',
  cardDarkInk: '#f6f6f7',
  toastBg: '#ededf0',
  hair: 'rgba(0,0,0,0.10)',
  // Inter Tight for tight, heavy display; Inter for body. Both bundled offline
  // via @fontsource-variable. System sans as a last-resort fallback.
  displayFont:
    '"Inter Tight Variable", "Inter Variable", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  bodyFont:
    '"Inter Variable", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  // JetBrains Mono is bundled offline via @fontsource-variable/jetbrains-mono
  // (imported in blocks.tsx) so code/labels render in a real mono in the
  // headless renderer instead of an ugly system fallback.
  monoFont: '"JetBrains Mono Variable", ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
} as const;

export type CarouselTheme = typeof carouselTheme;

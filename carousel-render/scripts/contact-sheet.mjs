/**
 * Tile a deck's rendered slides into a single contact sheet for fast review.
 *
 *   node scripts/contact-sheet.mjs <DeckId>     # one deck
 *   node scripts/contact-sheet.mjs              # every deck in out/
 *
 * Writes out/_sheets/<DeckId>.png — slides in a row, downscaled. Dead space,
 * alignment and balance are all visible at this scale even if text isn't.
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('out');
const SHEETS = path.join(OUT, '_sheets');
mkdirSync(SHEETS, { recursive: true });

const W = 230;            // per-slide thumb width
const H = Math.round(W * 16 / 9);
const GAP = 12;
const BG = { r: 90, g: 90, b: 96, alpha: 1 };

const only = process.argv[2];
const decks = (only ? [only] : readdirSync(OUT).filter((d) => d !== '_sheets'))
  .filter((d) => { try { return statSync(path.join(OUT, d)).isDirectory(); } catch { return false; } });

for (const deck of decks) {
  const dir = path.join(OUT, deck);
  const slides = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  if (!slides.length) continue;
  const thumbs = await Promise.all(slides.map((f) =>
    sharp(path.join(dir, f)).resize(W, H, { fit: 'fill' }).toBuffer()
  ));
  const sheetW = slides.length * W + (slides.length + 1) * GAP;
  const sheetH = H + 2 * GAP;
  const composites = thumbs.map((input, i) => ({ input, top: GAP, left: GAP + i * (W + GAP) }));
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: BG } })
    .composite(composites)
    .png()
    .toFile(path.join(SHEETS, `${deck}.png`));
  console.log(`[sheet] ${deck} — ${slides.length} slides`);
}
console.log('[sheet] done →', SHEETS);

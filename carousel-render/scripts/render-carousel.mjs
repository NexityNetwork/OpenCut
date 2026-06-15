/**
 * Render a carousel deck to PNG stills.
 *
 *   node scripts/render-carousel.mjs <DeckId> <slideCount>
 *   node scripts/render-carousel.mjs CCBusiness 9
 *
 * Bundles the Remotion project once, then renders <DeckId>-01 … -NN to
 * out/<DeckId>/slide-01.png … slide-NN.png at 1080×1920.
 */
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const deck = process.argv[2] || 'CCBusiness';
const count = Number(process.argv[3] || 9);
const outDir = path.resolve(`out/${deck}`);
mkdirSync(outDir, { recursive: true });

console.log(`[carousel] bundling…`);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });

for (let i = 1; i <= count; i++) {
  const n = String(i).padStart(2, '0');
  const id = `${deck}-${n}`;
  const output = path.join(outDir, `slide-${n}.png`);
  const composition = await selectComposition({ serveUrl, id });
  await renderStill({ serveUrl, composition, output, frame: 0, imageFormat: 'png' });
  console.log(`[carousel] ✓ ${id} → ${output}`);
}
console.log(`[carousel] done — ${count} stills in ${outDir}`);

/**
 * Render a reel overlay composition to a TRANSPARENT PNG (alpha preserved).
 *   node scripts/render-overlay.mjs <CompositionId> [outName]
 * Output: out/overlays/<outName>.png
 */
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const id = process.argv[2];
const outName = process.argv[3] || id;
if (!id) {
  console.error('usage: node scripts/render-overlay.mjs <CompositionId> [outName]');
  process.exit(1);
}
const outDir = path.resolve('out/overlays');
mkdirSync(outDir, { recursive: true });

console.log('[overlay] bundling…');
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id });
const output = path.join(outDir, `${outName}.png`);
await renderStill({
  serveUrl,
  composition,
  output,
  frame: 0,
  imageFormat: 'png',
  // transparent canvas: do not paint a background behind the composition
});
console.log('[overlay] done →', output);

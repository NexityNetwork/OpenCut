/**
 * Render a carousel deck for LinkedIn: 1080x1350 (4:5) PNG pages stitched
 * into a single document PDF (LinkedIn's native carousel format).
 *
 *   node scripts/render-linkedin.mjs <DeckId> <slideCount>
 *
 * Outputs out/<DeckId>-li/slide-NN.png and out/<DeckId>-li/<DeckId>.pdf
 */
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { PDFDocument } from 'pdf-lib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const deck = process.argv[2];
const count = Number(process.argv[3] || 0);
if (!deck || !count) {
  console.error('usage: node scripts/render-linkedin.mjs <DeckId> <slideCount>');
  process.exit(1);
}
const outDir = path.resolve(`out/${deck}-li`);
mkdirSync(outDir, { recursive: true });

console.log('[linkedin] bundling…');
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });

const pdf = await PDFDocument.create();
for (let i = 1; i <= count; i++) {
  const nn = String(i).padStart(2, '0');
  const id = `${deck}-li-${nn}`;
  const output = path.join(outDir, `slide-${nn}.png`);
  const composition = await selectComposition({ serveUrl, id });
  await renderStill({ serveUrl, composition, output, frame: 0, imageFormat: 'png' });
  const png = await pdf.embedPng(readFileSync(output));
  const page = pdf.addPage([1080, 1350]);
  page.drawImage(png, { x: 0, y: 0, width: 1080, height: 1350 });
  console.log(`[linkedin] ✓ ${id}`);
}
const pdfPath = path.join(outDir, `${deck}.pdf`);
writeFileSync(pdfPath, await pdf.save());
console.log(`[linkedin] done — ${count} pages → ${pdfPath}`);

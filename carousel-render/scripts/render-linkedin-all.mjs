/**
 * Render every Next WIPF deck for LinkedIn (1080x1350 pages -> one PDF each).
 * Bundles once, then renders all decks. Output: out/<DeckId>-li/<DeckId>.pdf
 *
 *   node scripts/render-linkedin-all.mjs
 */
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { PDFDocument } from 'pdf-lib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DECKS = [
  ['Blueprint10k', 8], ['DashboardBuild', 6], ['SoftwareStack', 12], ['AppStoreClaude', 3],
  ['Skills50', 7], ['Agent10min', 9], ['ContentDashboard', 9], ['Repos10', 12],
  ['Team200', 8], ['Workflows5', 7], ['FourThings', 5], ['CaveStack', 9],
  ['Unfair', 6], ['FirstMil', 7], ['Losing', 7], ['MetaMcp', 8],
  ['RubixBuild', 8], ['DevTeam', 8], ['Audit', 9], ['OpenClaw', 9],
];

console.log('[linkedin-all] bundling…');
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });

for (const [deck, count] of DECKS) {
  const outDir = path.resolve(`out/${deck}-li`);
  mkdirSync(outDir, { recursive: true });
  const pdf = await PDFDocument.create();
  for (let i = 1; i <= count; i++) {
    const nn = String(i).padStart(2, '0');
    const output = path.join(outDir, `slide-${nn}.png`);
    const composition = await selectComposition({ serveUrl, id: `${deck}-li-${nn}` });
    await renderStill({ serveUrl, composition, output, frame: 0, imageFormat: 'png' });
    const png = await pdf.embedPng(readFileSync(output));
    const page = pdf.addPage([1080, 1350]);
    page.drawImage(png, { x: 0, y: 0, width: 1080, height: 1350 });
  }
  writeFileSync(path.join(outDir, `${deck}.pdf`), await pdf.save());
  console.log(`[linkedin-all] ✓ ${deck} (${count}p)`);
}
console.log('[linkedin-all] done.');

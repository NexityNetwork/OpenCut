import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/OpenCut/carousel-render/package.json');
const sharp = require('sharp');

const SUF = process.argv[2] || '45';        // format suffix: 45 or 916
const prefixes = process.argv.slice(3);     // deck prefixes
const COLS = SUF === '916' ? 6 : 5;
const TW = 420;                             // thumb width
const GAP = 18, PAD = 28;
const outDir = 'sheets';
fs.mkdirSync(outDir, { recursive: true });

for (const prefix of prefixes) {
  const files = [];
  for (let i = 1; ; i++) {
    const f = `out/${prefix}-${SUF}-${i}.png`;
    if (fs.existsSync(f)) files.push(f); else break;
  }
  if (!files.length) { console.log('skip', prefix, '(none)'); continue; }
  const thumbs = []; let th = 0;
  for (const f of files) {
    const buf = await sharp(f).resize({ width: TW }).png().toBuffer();
    th = (await sharp(buf).metadata()).height;
    thumbs.push(buf);
  }
  const cols = Math.min(COLS, thumbs.length);
  const rows = Math.ceil(thumbs.length / COLS);
  const W = PAD * 2 + cols * TW + (cols - 1) * GAP;
  const H = PAD * 2 + rows * th + (rows - 1) * GAP;
  const composites = thumbs.map((buf, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    return { input: buf, left: PAD + c * (TW + GAP), top: PAD + r * (th + GAP) };
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 240, g: 236, b: 225 } } })
    .composite(composites).png().toFile(`${outDir}/${prefix}-${SUF}.png`);
  console.log('sheet', `${prefix}-${SUF}`, `${thumbs.length} slides`, `${W}x${H}`);
}

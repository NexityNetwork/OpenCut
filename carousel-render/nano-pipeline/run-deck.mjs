import fs from 'node:fs';
import { execSync } from 'node:child_process';

let TOKEN = fs.readFileSync(process.env.TOKENFILE, 'utf8').trim();
// Self-heal: if a refresh credential (adc.json) is present, mint a new token on 401.
function remint() {
  if (!fs.existsSync('adc.json')) return false;
  try {
    execSync('node mint-token.mjs', { stdio: 'inherit' });
    TOKEN = fs.readFileSync(process.env.TOKENFILE, 'utf8').trim();
    return true;
  } catch { return false; }
}
const PROJECT = process.env.PROJECT;
const MODEL = 'gemini-3-pro-image-preview';
const URL = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STYLE =
  'Premium 3D rendered vertical social slide. Clean warm cream background hex f3ebdf with lots of empty space. Only a few glossy coral-orange and cream 3D spheres, softly out of focus and placed in the corners and along the edges only, never behind the text. The center stays clean and uncluttered so every word is easy to read. Soft studio lighting, shallow depth of field, high-end Cinema 4D editorial style. Near-black bold sans serif typography with selected words in vibrant orange hex e8542b, high contrast and perfectly legible. Calm, minimal, premium, not busy. No clutter behind the text. No watermark. ';
const MATCH =
  'Match the exact visual style, palette, clean cream background, edge-placed spheres and lighting of the reference image, but with new layout and content as described. ';

const FORMATS = [['9:16', '916'], ['4:5', '45']];
const decksDir = 'decks';
const outDir = 'out';
fs.mkdirSync(outDir, { recursive: true });

async function gen(content, out, ref, ar) {
  const prompt = (ref ? MATCH : '') + STYLE + content;
  const parts = [];
  if (ref) parts.push({ inlineData: { mimeType: 'image/png', data: fs.readFileSync(ref).toString('base64') } });
  parts.push({ text: prompt });
  const body = { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar, imageSize: '2K' } } };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await fetch(URL, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 401) { console.log('  401 TOKEN EXPIRED'); if (remint()) { console.log('  re-minted, retrying'); continue; } process.exit(2); }
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const img = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
      if (img) { fs.writeFileSync(out, Buffer.from(img.inlineData.data, 'base64')); return true; }
      console.log('  no image', j.candidates?.[0]?.finishReason);
    } else {
      console.log('  HTTP', r.status, JSON.stringify(j.error?.message || j).slice(0, 90));
      if (r.status === 429 || r.status >= 500) await sleep(18000 * attempt);
    }
  }
  return false;
}

const files = fs.readdirSync(decksDir).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const deck = JSON.parse(fs.readFileSync(`${decksDir}/${file}`, 'utf8'));
  for (const [ar, suf] of FORMATS) {
    const prefix = `${outDir}/${deck.prefix}-${suf}`;
    const cover = `${prefix}-1.png`;
    if (!fs.existsSync(cover)) { console.log(`${deck.prefix} ${suf} cover`); await gen(deck.slides[0], cover, null, ar); await sleep(8000); }
    for (let i = 1; i < deck.slides.length; i++) {
      const out = `${prefix}-${i + 1}.png`;
      if (fs.existsSync(out)) continue;
      console.log(`${deck.prefix} ${suf} slide ${i + 1}`);
      const ok = await gen(deck.slides[i], out, cover, ar);
      console.log('   ', ok ? 'OK' : 'FAIL', out);
      await sleep(8000);
    }
  }
}
console.log('BATCH DONE');

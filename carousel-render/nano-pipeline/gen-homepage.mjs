// Generates homepage "Batteries included" section banners via Nano Banana Pro
// (gemini-3-pro-image-preview) on Vertex AI. Fine-art brush/paint abstracts, NO
// spheres/orbs/logos. 4 art directions x 2 themes = 8 images.
//   export TOKENFILE=gcp_token.txt PROJECT=<gcp-project-id>
//   NODE_USE_ENV_PROXY=1 node gen-homepage.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';

let TOKEN = fs.readFileSync(process.env.TOKENFILE, 'utf8').trim();
function remint() {
  if (!fs.existsSync('adc.json')) return false;
  try { execSync('node mint-token.mjs', { stdio: 'inherit' }); TOKEN = fs.readFileSync(process.env.TOKENFILE, 'utf8').trim(); return true; } catch { return false; }
}
const PROJECT = process.env.PROJECT;
const MODEL = 'gemini-3-pro-image-preview';
const URL = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent`;
const AR = process.env.AR || '21:9';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const THEMES = [
  { key: 'playbooks', bg: 'a deep midnight navy and indigo background, rich and moody', accents: 'cool steel blue and ink blue with restrained warm burnt orange accents' },
  { key: 'primitives', bg: 'a warm coral and terracotta background, rich and moody', accents: 'cream, soft peach and burnt orange' },
];
const VARIANTS = [
  { key: 'drybrush', desc: 'One bold expressive dry brush stroke sweeping across, with visible bristle streaks and raw dry media texture' },
  { key: 'inkwash', desc: 'Elegant sumi-e ink wash strokes with soft feathered bleeding edges, calligraphic and airy, lots of breathing room' },
  { key: 'impasto', desc: 'Thick impasto oil paint applied with a palette knife, a rich tactile ridged close up abstract of paint texture' },
  { key: 'ribbon', desc: 'A few smooth flowing gestural paint strokes with a soft satin sheen and sweeping motion, clean and minimal' },
];

function buildPrompt(theme, variant) {
  return (
    `Premium fine art abstract banner, high end editorial, gallery quality. ${theme.bg}. ` +
    `${variant.desc}, painted in ${theme.accents}. ` +
    `The painted composition sits mostly on the right side. The left two thirds is calm, empty negative space with nothing in it, reserved for a headline. ` +
    `Sophisticated, restrained, tasteful, elegant, cinematic, with subtle film grain. ` +
    `Absolutely no spheres, no balls, no balloons, no bubbles, no 3D orbs, no geometric shapes, no logos, no icons, no symbols, no text, no words, no letters, no watermark.`
  );
}

async function gen(prompt, out) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: AR, imageSize: '2K' } } };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await fetch(URL, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 401) { console.log('  401 token expired'); if (remint()) continue; process.exit(2); }
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const img = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
      if (img) { fs.writeFileSync(out, Buffer.from(img.inlineData.data, 'base64')); return true; }
      console.log('  no image', j.candidates?.[0]?.finishReason);
    } else {
      console.log('  HTTP', r.status, JSON.stringify(j.error?.message || j).slice(0, 120));
      if (r.status === 429 || r.status >= 500) await sleep(18000 * attempt);
    }
  }
  return false;
}

fs.mkdirSync('out', { recursive: true });
for (const theme of THEMES) {
  for (const v of VARIANTS) {
    const out = `out/home-${theme.key}-${v.key}.png`;
    console.log('generating', out);
    console.log('   ', (await gen(buildPrompt(theme, v), out)) ? 'OK' : 'FAIL', out);
    await sleep(4000);
  }
}
console.log('DONE');

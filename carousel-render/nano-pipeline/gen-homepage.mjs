// Homepage "Batteries included" section banners via Nano Banana Pro on Vertex AI.
// Minimal, premium, dark-SaaS aesthetic (Linear/Vercel register): atmospheric glow,
// fine linework, subtle grid, smooth gradient. NO paint, NO shapes, NO logos/text.
// 4 directions x 2 themes = 8.
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

// Per-card look. Playbooks card is dark navy; primitives card is bright warm coral.
const THEMES = [
  { key: 'playbooks', base: 'a deep midnight navy to near black background', glow: 'cool electric blue and soft indigo' },
  { key: 'primitives', base: 'a warm coral and soft terracotta background, bright and warm', glow: 'creamy off white and gentle warm orange' },
];
const NEG =
  'Minimal and restrained, mostly empty, calm, with generous empty negative space on the LEFT two thirds for a headline (nothing there). Smooth and clean. Absolutely no paint, no brush strokes, no visible texture noise, no spheres, no balls, no balloons, no bubbles, no blobs, no 3D orbs, no objects, no logos, no icons, no symbols, no text, no words, no letters, no watermark.';
const VARIANTS = [
  { key: 'aurora', desc: (t) => `A premium modern software website section background. Mostly ${t.base}. On the right side only, a soft, smooth, blurred atmospheric aurora glow of ${t.glow} light, out of focus, fading gently into the base. Elegant, high end, cinematic.` },
  { key: 'lines', desc: (t) => `A premium modern software website section background. ${cap(t.base)}. On the right side only, a sparse set of fine, thin, elegant flowing contour lines like smooth topographic or sound wave curves, glowing subtly in ${t.glow}, precise and airy, receding into the base. Technical, sophisticated, high end.` },
  { key: 'grid', desc: (t) => `A premium modern software website section background. ${cap(t.base)}. On the right side only, a subtle glowing perspective grid and fine dot matrix mesh fading softly into the base, with a faint ${t.glow} glow. Techy, precise, high end.` },
  { key: 'gradient', desc: (t) => `A premium modern software website section background. A smooth, minimal, satin gradient field of ${t.base}, shifting to a slightly brighter ${t.glow} bloom on the right edge, very soft, softly out of focus, almost solid. Serene, high end.` },
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function gen(prompt, out) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: AR, imageSize: '2K' } } };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await fetch(URL, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 401) { console.log('  401'); if (remint()) continue; process.exit(2); }
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const img = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
      if (img) { fs.writeFileSync(out, Buffer.from(img.inlineData.data, 'base64')); return true; }
      console.log('  no image', j.candidates?.[0]?.finishReason);
    } else { console.log('  HTTP', r.status, JSON.stringify(j.error?.message || j).slice(0, 120)); if (r.status === 429 || r.status >= 500) await sleep(18000 * attempt); }
  }
  return false;
}

fs.mkdirSync('out', { recursive: true });
for (const t of THEMES) for (const v of VARIANTS) {
  const out = `out/home-${t.key}-${v.key}.png`;
  console.log('generating', out);
  console.log('   ', (await gen(`${v.desc(t)} ${NEG}`, out)) ? 'OK' : 'FAIL', out);
  await sleep(4000);
}
console.log('DONE');

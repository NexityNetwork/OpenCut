// Generates the two homepage "Batteries included" section visuals via Nano Banana
// Pro (gemini-3-pro-image-preview) on Vertex AI. Standalone (does NOT use run-deck's
// cream STYLE): each image carries its own full prompt so the background matches the
// card (navy for playbooks, coral for primitives).
//
// Auth: same as run-deck. Needs a Vertex access token + project id.
//   export TOKENFILE=gcp_token.txt PROJECT=<gcp-project-id>
//   NODE_USE_ENV_PROXY=1 node gen-homepage.mjs
// (self-remints from adc.json on 401, like run-deck.)
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
const AR = process.env.AR || '21:9'; // ultra-wide card banner; override e.g. 16:9
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  {
    out: 'out/home-playbooks',
    prompt:
      'Premium 3D rendered ultra wide hero banner. Deep midnight navy to indigo gradient background, hex 1b2440 into 2c3a6b, rich and cinematic. On the right third only, a refined 3D composition: a few glossy dark navy spheres with soft specular highlights, one hero focal orb that is a deep navy black sphere with a warm orange rim light glow (the Ultron orb), and a subtle stack of floating rounded 3D cards suggesting step by step playbooks, softly out of focus. The left two thirds is calm, clean, uncluttered empty negative space for a headline, nothing there. Soft studio lighting, shallow depth of field, high end Cinema 4D editorial style, elegant, minimal, not busy. Subtle warm orange accents only. No text, no words, no watermark, no logos.',
  },
  {
    out: 'out/home-primitives',
    prompt:
      'Premium 3D rendered ultra wide hero banner. Warm coral to terracotta gradient background, hex e0764a into c85a30, rich and cinematic. On the right third only, a refined 3D composition of glossy geometric primitive shapes, a sphere, a rounded cube, a cylinder and a torus, in coral, cream and soft orange with glossy specular highlights, arranged like drop in building blocks, softly out of focus, plus one focal Ultron orb, a dark navy black sphere with a warm orange rim glow. The left two thirds is calm, clean, uncluttered empty negative space for a headline, nothing there. Soft studio lighting, shallow depth of field, high end Cinema 4D editorial style, elegant, premium, not busy. No text, no words, no watermark, no logos.',
  },
];

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
for (const s of SHOTS) {
  const out = `${s.out}-${AR.replace(':', '')}.png`;
  console.log('generating', out);
  console.log('   ', (await gen(s.prompt, out)) ? 'OK' : 'FAIL', out);
  await sleep(4000);
}
console.log('DONE');

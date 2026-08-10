/**
 * build-fixture-gallery.mjs — render EVERY family from its checked-in fixture
 * and emit the manifest the gallery page is built from.
 *
 * The fixtures are the frozen design-review content: one per family, eight
 * slides each. Rendering from them rather than through the planner makes the
 * gallery deterministic — the same input produces the same page every time, so
 * a visual diff between deploys is a real design change and never a re-plan.
 *
 *   node tools/build-fixture-gallery.mjs            # all families
 *   ONLY=swiss-grid,terracotta node tools/...       # a subset
 *
 * Output: OUT/<family>/slide-NN.png + OUT/manifest.json  (OUT=/tmp/gallery)
 * Then:   node tools/build-gallery.mjs   ->  OUT/index.html
 */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import pw from "playwright";
import { compose } from "../lib/compose.js";

const { chromium } = pw;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const LAYOUTS = join(ROOT, "layouts");
const FIXTURES = join(HERE, "fixtures");
const FONTDIR = join(ROOT, "fonts");
const ARTDIR = join(ROOT, "art");
const OUT = resolve(process.env.OUT || "/tmp/gallery");
const W = 1080, H = 1350;

// Fixtures that are not families: a body-shape comparison and a scratch spec.
const NOT_FAMILIES = new Set(["cream-shots-bodies", "poster-editorial"]);

const only = process.env.ONLY ? new Set(process.env.ONLY.split(",").map((s) => s.trim())) : null;
const names = (await readdir(FIXTURES))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((n) => !NOT_FAMILIES.has(n))
  .filter((n) => !only || only.has(n))
  .sort();

await mkdir(OUT, { recursive: true });

const fontManifest = JSON.parse(await readFile(join(FONTDIR, "manifest.json"), "utf8"));
const artManifest = await readFile(join(ARTDIR, "manifest.json"), "utf8").then(JSON.parse).catch(() => ({}));

const browser = await chromium.launch({
  ...(process.env.PREVIEW_CHROMIUM ? { executablePath: process.env.PREVIEW_CHROMIUM } : {}),
  args: ["--font-render-hinting=none", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// Same font and art interception the preview tool uses: the Google Fonts CDN is
// unreachable from this container, so a live <link> silently falls back to a
// system face and every type judgement made from the output would be wrong.
await page.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
  const url = route.request().url();
  const css = fontManifest.css[url];
  if (css) return route.fulfill({ status: 200, contentType: "text/css", body: css });
  const file = fontManifest.files[url];
  if (file) return route.fulfill({ status: 200, contentType: "font/woff2", body: await readFile(join(FONTDIR, file)) });
  return route.abort();
});
await page.route(/art\.local\//, async (route) => {
  const name = route.request().url().split("/").pop();
  const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
  try {
    return route.fulfill({ status: 200, contentType: type, body: await readFile(join(ARTDIR, name)) });
  } catch {
    return route.abort();
  }
});

const manifest = [];
const problems = [];

for (const family of names) {
  const spec = JSON.parse(await readFile(join(FIXTURES, `${family}.json`), "utf8"));
  for (const slide of spec.slides) {
    const key = slide.slots?.art;
    if (key && artManifest[key]) slide.slots.artSrc = `https://art.local/${artManifest[key]}`;
    const shot = slide.slots?.shot;
    if (shot) slide.slots.shotSrc = /^https?:/.test(shot) ? shot : `https://art.local/${shot}`;
  }

  let htmls;
  try {
    htmls = await compose(spec, { layoutsDir: LAYOUTS });
  } catch (e) {
    problems.push(`${family}: compose failed — ${e.message}`);
    continue;
  }

  await mkdir(join(OUT, family), { recursive: true });
  const slides = [];
  let tone = "light";

  for (let i = 0; i < htmls.length; i++) {
    await page.setContent(htmls[i], { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const name = `slide-${String(i + 1).padStart(2, "0")}.png`;
    await page.screenshot({ path: join(OUT, family, name), clip: { x: 0, y: 0, width: W, height: H } });
    slides.push(name);

    if (i === 0) {
      // The chip says whether a family reads dark or light. Sampling the
      // background does not work: a ground painted with a gradient reports a
      // transparent background-color, which scores as black and calls every
      // cream family dark. The TEXT colour is unambiguous — a dark ground
      // always sets light type — so read that instead.
      tone = await page.evaluate(() => {
        const lum = (s) => {
          const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s);
          if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null;
          const [r, g, b] = [1, 2, 3].map((i) => Number(m[i]));
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        // The largest opaque painted area decides. A ground written as
        // `background: <gradient>, #RRGGBB` puts that final solid into
        // background-color, so gradient grounds resolve correctly, and a
        // split-field page is judged by whichever field is bigger.
        let best = null, bestArea = 0;
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          const area = r.width * r.height;
          if (area <= bestArea) continue;
          const l = lum(getComputedStyle(el).backgroundColor);
          if (l === null) continue;
          best = l; bestArea = area;
        }
        if (best !== null) return best < 128 ? "dark" : "light";
        const t = lum(getComputedStyle(document.body).color);
        return t !== null && t > 128 ? "dark" : "light";
      });
    }

    const overflow = await page.evaluate(({ w, h }) => {
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (getComputedStyle(el).pointerEvents === "none") continue;
        if (r.right > w + 1 || r.bottom > h + 1 || r.left < -1 || r.top < -1) {
          bad.push(el.getAttribute("class") || el.tagName);
        }
      }
      return bad.slice(0, 3);
    }, { w: W, h: H });
    if (overflow.length) problems.push(`${family} slide ${i + 1}: overflow ${overflow.join(", ")}`);
  }

  manifest.push({ family, eyebrow: tone, sub: spec.brief || "", slides });
  console.log(`${family}  ${slides.length} slides  (${tone})`);
}

await browser.close();
await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} families -> ${OUT}/manifest.json`);
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems) console.log("  " + p);
}

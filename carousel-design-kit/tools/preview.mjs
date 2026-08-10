/**
 * preview.mjs — render ONE family's slides locally for design review.
 *
 * The redesign loop: edit layouts/<layout>/template.html, run this, look at
 * the PNGs. No planner call, no model call, no deploy — the slot values come from
 * a checked-in fixture so every render of a family is directly comparable
 * against the previous one and the only variable is the design.
 *
 *   node tools/preview.mjs <family> [--out DIR] [--fixture FILE]
 *
 * Fixture defaults to tools/fixtures/<family>.json. Output defaults to
 * /tmp/preview/<family>/slide-NN.png.
 */
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import pw from "playwright";
import { compose } from "../lib/compose.js";

const { chromium } = pw;
const HERE = dirname(fileURLToPath(import.meta.url));
const LAYOUTS = resolve(HERE, "..", "layouts");

const argv = process.argv.slice(2);
const family = argv.find((a) => !a.startsWith("--"));
if (!family) {
  console.error("usage: node tools/preview.mjs <family> [--out DIR] [--fixture FILE]");
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const OUT = resolve(flag("out", `/tmp/preview/${family}`));
const FIXTURE = resolve(flag("fixture", join(HERE, "fixtures", `${family}.json`)));

const W = 1080;
const H = 1350;

const spec = JSON.parse(await readFile(FIXTURE, "utf8"));
await mkdir(OUT, { recursive: true });

// Resolve generated artwork: a slide says `art: "hook"`, the art manifest maps
// that to a file, and the template gets an {{artSrc}} the renderer serves from
// disk. Run `node tools/gen-art.mjs <fixture>` to populate it.
const ARTDIR = resolve(HERE, "..", "art");
const artManifest = await readFile(join(ARTDIR, "manifest.json"), "utf8")
  .then(JSON.parse).catch(() => ({}));
for (const slide of spec.slides) {
  const key = slide.slots?.art;
  if (key && artManifest[key]) slide.slots.artSrc = `https://art.local/${artManifest[key]}`;
  // `shot` is the user-supplied screenshot slot: a filename under art/ or a
  // full URL. Templates that hold a device frame read {{shotSrc}}.
  const shot = slide.slots?.shot;
  if (shot) slide.slots.shotSrc = /^https?:/.test(shot) ? shot : `https://art.local/${shot}`;
}

const htmls = await compose(spec, { layoutsDir: LAYOUTS });

// The container reaches the internet through an egress proxy; Chromium needs
// it explicitly or the Google Fonts <link> in every template silently fails
// and the whole page falls back to a system sans.
const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy || "";
// PREVIEW_CHROMIUM lets this run against a pre-installed browser whose build
// number doesn't match what this playwright release would download.
const browser = await chromium.launch({
  ...(process.env.PREVIEW_CHROMIUM ? { executablePath: process.env.PREVIEW_CHROMIUM } : {}),
  ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
  args: ["--font-render-hinting=none", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// Serve the baked webfonts. Without this every template renders in a
// system-sans fallback and the type — the thing we're actually judging —
// is a lie. Run `node tools/bake-fonts.mjs` if the manifest is missing.
const FONTDIR = resolve(HERE, "..", "fonts");
const fontManifest = JSON.parse(await readFile(join(FONTDIR, "manifest.json"), "utf8"));
let fontMisses = 0;
await page.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
  const url = route.request().url();
  const css = fontManifest.css[url];
  if (css) return route.fulfill({ status: 200, contentType: "text/css", body: css });
  const file = fontManifest.files[url];
  if (file) {
    return route.fulfill({ status: 200, contentType: "font/woff2", body: await readFile(join(FONTDIR, file)) });
  }
  fontMisses++;
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

// Overflow report — the one QA signal worth having in a design loop: any
// element whose content spills past the 1080x1350 frame. Checked on EVERY
// slide; it used to run once after the loop, which meant it only ever saw the
// last one and a cover pushing its own footer off the page went unreported.
const overflowOn = async () =>
  page.evaluate(({ w, h }) => {
    const bad = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Decorative layers — grain, ring fields, the drawn objects — are meant
      // to bleed past the frame. They are marked non-interactive, and that
      // inherits down to the SVG shapes inside them, so one check covers both
      // the container and its contents without muting real content overflow.
      if (getComputedStyle(el).pointerEvents === "none") continue;
      if (r.right > w + 1 || r.bottom > h + 1 || r.left < -1 || r.top < -1) {
        // SVG elements expose className as an SVGAnimatedString, which
        // stringifies to [object SVGAnimatedString] and names nothing.
        const name = el.getAttribute("class") || el.tagName;
        bad.push(`${name}: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return bad.slice(0, 4);
  }, { w: W, h: H });

const written = [];
const overflows = [];
for (let i = 0; i < htmls.length; i++) {
  await page.setContent(htmls[i], { waitUntil: "networkidle" });
  // Webfonts land after networkidle in Chromium often enough to matter —
  // a screenshot taken early renders the fallback face and every type
  // judgement made from it is wrong.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const file = join(OUT, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
  written.push(file);
  const bad = await overflowOn();
  if (bad.length) overflows.push(`slide ${i + 1}: ${bad.join(" | ")}`);
}

await browser.close();

console.log(written.join("\n"));
if (fontMisses) console.log(`\nWARNING: ${fontMisses} font request(s) had no baked file — re-run tools/bake-fonts.mjs`);
if (overflows.length) console.log(`\nOVERFLOW:\n  ${overflows.join("\n  ")}`);

/**
 * build-gallery.mjs — assemble /tmp/gallery/index.html from manifest.json.
 * One block per family: display name, slug, a one-line description of the
 * design, and a swipeable row of the rendered slides.
 *
 * Titles, descriptions and requirement chips come from lib/family-meta.json —
 * the same file the /families endpoint serves, so the gallery and the picker
 * never disagree. The slug and the fixture's topic are useless when picking:
 * what decides it is what content shape the family holds and what it requires.
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || "/tmp/gallery";
const m = JSON.parse(readFileSync(`${OUT}/manifest.json`, "utf8"));
const meta = JSON.parse(readFileSync(join(HERE, "..", "lib", "family-meta.json"), "utf8"));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// Every slide lives at a stable path like `terracotta/slide-03.png`, so a
// redesigned family redeploys new bytes to a URL the browser already has —
// and serves whatever it cached from the previous deploy. That mixes old and
// new slides inside the same family and looks exactly like a broken render.
// Version each src off the manifest's mtime so a redeploy is always a new URL.
const V = Math.floor(statSync(`${OUT}/manifest.json`).mtimeMs / 1000);

const NEEDS = {
  screenshots: "needs real screenshots",
  logos: "needs named tools",
  numbers: "needs real figures",
};

const missing = [];
const sections = m.map((f) => {
  const info = meta[f.family];
  if (!info) missing.push(f.family);
  const title = info?.title || f.family;
  const note = info?.note || f.sub;
  // The requirement chips are the fastest way to rule a family out: a family
  // that needs screenshots is not a candidate for a topic that has none.
  const chips = [
    ...(info?.points ? [`${info.points} per page`] : []),
    ...(info?.needs || []).map((n) => NEEDS[n] || n),
  ].map((c) => `<span>${esc(c)}</span>`).join("");
  return `
  <section class="fam">
    <div class="hd">
      <h2>${esc(title)}</h2><code>${esc(f.family)}</code>
    </div>
    <p>${esc(note)}</p>
    ${chips ? `<div class="needs">${chips}</div>` : ""}
    <div class="row">${f.slides.map((s) => `<img loading="lazy" src="${f.family}/${s}?v=${V}" alt="${esc(title)}">`).join("")}</div>
  </section>`;
}).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Carousel Factory</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#07070a;color:#f4f4f5;
  font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased;padding:0 0 120px}
header{padding:80px 56px 56px;max-width:900px}
h1{font-size:52px;font-weight:700;letter-spacing:-2.4px;line-height:1}
.lede{color:#7a7a85;font-size:19px;line-height:1.5;margin-top:16px;letter-spacing:-.2px}
/* No card, no border, no panel — a hairline between families is enough
   separation and it stops the page reading as a stack of containers. */
.fam{padding:44px 0 40px;border-top:1px solid #17171c}
.hd{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding:0 56px}
h2{font-size:27px;font-weight:600;letter-spacing:-.7px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;color:#5c5c66;letter-spacing:-.2px}
.fam p{color:#9a9aa4;font-size:17px;line-height:1.5;margin:10px 0 0;max-width:820px;
  letter-spacing:-.2px;padding:0 56px}
.needs{display:flex;gap:8px;flex-wrap:wrap;padding:16px 56px 0}
.needs span{font-size:13px;color:#8a8a94;letter-spacing:-.1px;
  border:1px solid #26262e;border-radius:999px;padding:4px 11px}
/* The row is swiped, not scrolled with a bar. Momentum on touch, snap on the
   slide edges, and the page padding lives inside the row so the first slide
   lines up with the heading while the last can still run to the edge. */
.row{display:flex;gap:14px;overflow-x:auto;padding:26px 56px 2px;
  /* Without scroll-padding the snap aligns slide one to the scrollport edge and
     scrolls the left inset away, so the first slide sits left of the heading. */
  scroll-padding-left:56px;
  scroll-snap-type:x proximity;overscroll-behavior-x:contain;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;cursor:grab}
.row::-webkit-scrollbar{display:none}
.row img{height:452px;width:auto;border-radius:12px;flex:0 0 auto;background:#101014;
  scroll-snap-align:start;-webkit-user-drag:none;user-select:none}
@media (max-width:760px){
  header{padding:56px 24px 40px}
  h1{font-size:38px;letter-spacing:-1.6px}
  .hd,.fam p{padding:0 24px}
  .needs{padding:14px 24px 0}
  .row{padding:22px 24px 2px;scroll-padding-left:24px}
  .row img{height:360px}
}
</style></head><body>
<header><h1>Carousel Factory</h1>
<div class="lede">${m.length} template families. Each is named for the job it does and tagged with what it needs — pick by the shape of the content, not by the sample copy.</div></header>
${sections}
<script>
// Drag to pan on a trackpad-less desktop; touch already works natively.
for (const row of document.querySelectorAll(".row")) {
  let down = false, startX = 0, startLeft = 0, moved = 0;
  row.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    down = true; moved = 0; startX = e.clientX; startLeft = row.scrollLeft;
    row.style.cursor = "grabbing";
  });
  row.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    // Snapping fights a drag mid-gesture, so it is suspended until release.
    row.style.scrollSnapType = "none";
    row.scrollLeft = startLeft - dx;
  });
  const end = () => {
    if (!down) return;
    down = false; row.style.cursor = "grab"; row.style.scrollSnapType = "";
  };
  row.addEventListener("pointerup", end);
  row.addEventListener("pointerleave", end);
  row.addEventListener("dragstart", (e) => e.preventDefault());
}
</script>
</body></html>`;

writeFileSync(`${OUT}/index.html`, html);

// The versioned src covers a visitor who reloads the page, but the page itself
// must not be served from cache or it hands out last deploy's version stamp.
writeFileSync(`${OUT}/_headers`, `/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/*.png
  Cache-Control: public, max-age=300
`);

console.log("gallery ->", `${OUT}/index.html`, `(${m.length} families, v=${V})`);
if (missing.length) console.log(`no meta for ${missing.length}: ${missing.join(", ")}`);

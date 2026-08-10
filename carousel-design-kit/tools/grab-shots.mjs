/**
 * grab-shots.mjs — capture real product screenshots for the *-shots families.
 *
 * The device-frame variants are only judgeable with something real inside the
 * frame; an empty placeholder proves nothing about crops, contrast or how the
 * type sits next to a busy screen. This grabs actual pages into art/ so a
 * fixture can point a `shot` slot at one.
 *
 *   node tools/grab-shots.mjs <name>=<url> [...]
 */
import { mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import pw from "playwright";

const { chromium } = pw;
const HERE = dirname(fileURLToPath(import.meta.url));
const ARTDIR = resolve(HERE, "..", "art");
await mkdir(ARTDIR, { recursive: true });

const targets = process.argv.slice(2).map((a) => {
  const i = a.indexOf("=");
  return { name: a.slice(0, i), url: a.slice(i + 1) };
});
if (!targets.length) {
  console.error("usage: node tools/grab-shots.mjs <name>=<url> [...]");
  process.exit(1);
}

// Chromium's own CONNECT through the egress proxy gets reset, so every request
// is relayed through curl — which does read the proxy config and the CA bundle,
// so TLS is still verified end to end. Same trick as the baked-font route.
let seq = 0;
const fetchViaCurl = (url) =>
  new Promise((done) => {
    const stem = join(tmpdir(), `grab-${process.pid}-${seq++}`);
    execFile(
      "curl",
      ["-sS", "-L", "--max-time", "30", "-A", UA, "-D", `${stem}.h`, "-o", `${stem}.b`, url],
      { maxBuffer: 1 << 22 },
      async (err) => {
        if (err) return done(null);
        try {
          const head = await readFile(`${stem}.h`, "utf8");
          const body = await readFile(`${stem}.b`);
          const last = head.trim().split(/\r?\n\r?\n/).pop();
          const status = Number(last.match(/^HTTP\/[\d.]+ (\d{3})/m)?.[1] || 200);
          const ctype = last.match(/^content-type:\s*(.+)$/im)?.[1]?.trim() || "application/octet-stream";
          done({ status, contentType: ctype, body });
        } catch {
          done(null);
        } finally {
          rm(`${stem}.h`, { force: true });
          rm(`${stem}.b`, { force: true });
        }
      },
    );
  });

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const browser = await chromium.launch({
  ...(process.env.PREVIEW_CHROMIUM ? { executablePath: process.env.PREVIEW_CHROMIUM } : {}),
  args: ["--font-render-hinting=none", "--disable-lcd-text"],
});
// Narrower than a real desktop on purpose: the shot is scaled down into a
// ~900px frame, so a 1440-wide capture arrives with unreadable 9px type. 1120
// is still wide enough that every site keeps its desktop nav.
const [vw, vh] = (process.env.GRAB_VIEWPORT || "1120x700").split("x").map(Number);
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, userAgent: UA });

await page.route("**/*", async (route) => {
  const url = route.request().url();
  if (!/^https?:/.test(url)) return route.abort();
  const res = await fetchViaCurl(url);
  if (!res) return route.abort();
  return route.fulfill(res);
});

for (const { name, url } of targets) {
  const file = join(ARTDIR, `shot-${name}.png`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    // Consent overlays, chat bubbles and news toasts float over every marketing
    // page and read as junk once the shot is dropped into a frame. A sticky
    // header is fine — that is part of the real screen — so only full-bleed
    // overlays and bottom-anchored floaters go.
    await page.evaluate(() => {
      const H = window.innerHeight;
      const junk = /cookie|consent|gdpr|intercom|drift|zendesk|chat|widget|toast|popup|notification/i;
      for (const el of [...document.querySelectorAll("body *")]) {
        if (!el.isConnected) continue;
        const s = getComputedStyle(el);
        if (s.position !== "fixed" && s.position !== "sticky") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const fullBleed = r.height > 500 && r.width > 900;
        const bottomAnchored = r.top > H * 0.45 && r.bottom > H - 60;
        const named = junk.test(`${el.className} ${el.id}`);
        if (fullBleed || bottomAnchored || named) el.remove();
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: file });
    console.log(`ok   ${name}  ${url}`);
  } catch (e) {
    console.log(`FAIL ${name}  ${url}  ${e.message.split("\n")[0]}`);
  }
}

await browser.close();

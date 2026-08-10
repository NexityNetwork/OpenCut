# Carousel design kit

Everything needed to render, inspect and extend the 62 carousel template
families. Self-contained — this folder does not import from anything else in
this repo and nothing else in this repo imports from it. It is a reference.

**Read [`DESIGN-RULES.md`](./DESIGN-RULES.md) before changing any template.**
Every rule in it exists because a render was rejected for breaking it.

```
layouts/    186 templates — 62 families × {cover, body, cta}
fixtures/   64 frozen 8-slide content files (62 families + 2 non-family)
lib/        compose.js (slot fill + icon resolution), family-meta.json (picker data)
tools/      render, QA, screenshot capture, gallery build
fonts/      baked webfonts + manifest, for offline deterministic rendering
```

## Quick start

```bash
npm i playwright simple-icons
npx playwright install chromium

# render one family from its frozen fixture → 8 PNGs
node tools/preview.mjs swiss-grid --out /tmp/preview/swiss-grid

# render every family + a browsable gallery page
OUT=/tmp/gallery node tools/build-fixture-gallery.mjs
OUT=/tmp/gallery node tools/build-gallery.mjs   # → /tmp/gallery/index.html
```

Paths in the tools assume this folder is the root. If your chromium lives
somewhere non-standard, set `PREVIEW_CHROMIUM=/path/to/chrome`.

## How a page is built

A template is plain HTML + CSS at a fixed **1080×1350**, with `{{mustache}}`
slots. There is no build step and no framework. `lib/compose.js` fills the slots
and resolves `iconSlug<N>` into an inline simple-icons SVG.

Fixtures are frozen content — one per family, eight slides (1 cover + 6 body +
1 cta). **Always render from the fixture**, so that design is the only variable.
If content and layout both change between two renders you cannot tell which one
caused a regression.

## Picking a family

`lib/family-meta.json` is the picker. Per family it carries:

| field | meaning |
|---|---|
| `title` | the **job** the family does — "Four-bar chart", "Screenshot and statement" |
| `note` | what it holds and when it wins |
| `points` | repeating sub-items a body page takes (0, 2, 3, 4 or 6) |
| `needs` | hard requirements — `screenshots`, `logos`, `numbers` |

`needs` is the fastest way to rule a family out. A family tagged `screenshots`
is unusable without real ones; `numbers` without real figures produces a chart
of invented values; `logos` without genuinely named tools produces the exact
"logos for the sake of logos" failure the rules ban.

`points` is the content shape. `tech-stack-grid` takes six paired cells per
page; `paper-fold` takes two and should not be forced to three.

All four fields were derived from the templates' actual slots, not from how the
pages look.

## Product screenshots

Five families require real screenshots and are unusable without them:
`cream-desk`, `cream-notes`, `cream-shots`, `cream-slab`, `cream-tilt`.

```bash
node tools/grab-shots.mjs linear=https://linear.app figma=https://figma.com
```

Writes `art/shot-<name>.png`. Point a fixture's `shot` slot at the filename.

The capture is 1120×700 CSS at 2× DPR — deliberately narrower than a real
desktop, because the shot is scaled down into a ~900px frame and a 1440-wide
capture arrives with unreadable 9px type. 1120 is still wide enough that sites
keep their desktop nav.

It strips consent overlays, chat bubbles and toasts before shooting. A sticky
header is **not** stripped — that is part of the real screen. Only full-bleed
overlays, bottom-anchored floaters and self-identifying widgets go.

No screenshots are committed here. They are third-party marketing pages and are
regenerated in seconds; deciding to redistribute them is not this folder's call.

## Rendering is deterministic

Same fixture, same fonts, same Chromium → **byte-identical PNGs**. Verified
across every slide of the most texture-heavy families (seeded `feTurbulence`
grain, scan-line grounds, chrome ramps).

That makes golden-image regression essentially free: keep the last known good
render per family and diff. Bump Chromium or change the fonts and every hash
moves, so regenerate goldens on a version bump.

**The fonts must stay baked.** `tools/preview.mjs` intercepts requests to
fonts.googleapis.com and serves from `fonts/`. If that interception is removed
and the network fetch fails, the page silently falls back to a system face and
every type judgement made from the output is wrong while still looking fine.

## QA that exists

`tools/preview.mjs` and `tools/build-fixture-gallery.mjs` carry a generic
overflow check: walk every element, compare its rect against 1080×1350, skip
`pointer-events: none` (decorative layers bleed by design — non-interactive is a
precise signature for them). It runs on **every** slide, not just the last.

Nothing here checks contrast, ink coverage or dead bands. Those are the gaps
worth closing next; `DESIGN-RULES.md` §4 describes the dead-band failure
precisely enough to implement a detector.

## Conventions every template holds

- `1080×1350`, `overflow: hidden` on `html, body`
- every template is fully self-contained — no shared stylesheet, the only
  `<link>` is Google Fonts
- no `clamp()` anywhere; all display sizing is fixed px
- the canvas wrapper is `.page` or `.sheet` depending on family
- design intent lives in CSS comments at the top of each template and inline at
  the exact line where a non-obvious decision was made — **read them, they are
  the reasons, and `compose()` preserves them into the rendered HTML**

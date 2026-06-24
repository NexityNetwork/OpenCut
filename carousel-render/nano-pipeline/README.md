# Nano Pipeline — premium 3D carousel generator

Regenerates the "Next WIPF" carousel decks as premium 3D Cinema-4D-style slides
(cream background, edge-placed glossy orange/cream spheres, near-black type with
orange accents, Ultron woven into each deck) via **Google Nano Banana Pro**
(`gemini-3-pro-image-preview`) on **Vertex AI**, in both formats:
**1080x1920 (9:16)** and **1080x1350 (4:5)**.

This directory is the *source/recipe*. The rendered PNGs are large (~1.2 GB for
the full set) and live in R2, not git.

## Layout
- `decks/<deck>.json` — one file per deck: `{ "prefix": "x", "slides": ["per-slide content prompt", ...] }`.
  Slide 0 is the cover. The visual grammar (background, spheres, palette,
  orange-accent words, glossy logo tiles, dark step cards, CTA pill, the Ultron
  orb = "a glossy dark navy-black sphere with a warm orange rim glow") is described
  inline per slide; the shared look is enforced by the `STYLE` constant in `run-deck.mjs`.
- `run-deck.mjs` — batch driver. Reads every `decks/*.json`, generates both formats
  to `out/<prefix>-<916|45>-<n>.png`. Skip-existing (resumable), 8s throttle,
  429/5xx exponential backoff, self-re-mints the token on 401 if `adc.json` is present.
- `build-sheets.mjs` — assembles per-deck contact sheets from `out/` via sharp.
- `mint-token.mjs` — mints a Vertex access token from a refresh credential
  (`adc.json` = contents of `~/.config/gcloud/application_default_credentials.json`).

## Auth (important)
Only **Vertex AI** (OAuth access token) draws on the GCP project credits. The
plain Gemini API key routes to AI Studio (separate, prepaid) — do NOT use it.
- Quick: `gcloud auth print-access-token > gcp_token.txt` (expires ~hourly).
- Headless: drop `adc.json` next to the scripts; `run-deck.mjs` self-refreshes.
- Model location is **`global`** (us-central1 returns 404). ~$0.13/image at 2K.

## Run
```sh
export TOKENFILE=gcp_token.txt PROJECT=<gcp-project-id>
node run-deck.mjs                       # generates everything missing
node build-sheets.mjs 45 <deck> ...     # contact sheets (45 or 916)
```
Secrets (`gcp_token.txt`, `adc.json`) are git-ignored — never commit them.

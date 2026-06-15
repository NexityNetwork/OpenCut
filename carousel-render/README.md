# carousel-render

Remotion engine that rebuilds imported carousels as clean 1080x1920 editorial
frames in the CTW brand (cream / dark, Inter Tight, orange `#e8542b`). The 20
"Next WIPF" decks live here as TSX configs.

## Run

```bash
cd carousel-render
npm install                              # one-time
node scripts/render-carousel.mjs <DeckId> <slideCount>   # -> out/<DeckId>/slide-NN.png
node scripts/contact-sheet.mjs <DeckId>                  # -> out/_sheets/<DeckId>.png
```

Deck IDs (slide counts) are defined in `src/carousels/registry.ts`, e.g.
`Blueprint10k 8`, `DashboardBuild 6`, `SoftwareStack 12`, `Audit 9`.

## Layout

- `src/carousels/configs/*` — one file per deck (`export const xDeck = { id, title, slides }`).
- `src/carousels/` shared blocks: `theme` (tokens + safe zones), `ah-blocks`
  (AHFrame, Disp, Mono, CTAPill), `feature-blocks` (CodeCard), `blocks`
  (FontGate + font imports), `deck-icons` (IconBadge / LogoBadge), `wipf-kit`
  (Head / Kick / Callout / brandBadge / BrowserMock).
- `src/Root.tsx` registers one still composition per slide (`<DeckId>-NN`).

## Safe zones (1080x1920)

Content stays inside `top 250 / bottom 360 / sides 135` (enforced by `AHFrame`);
background graphics may bleed past it. No currency symbols, quotes, or em dashes
in slide copy.

## Publishing

Rendered PNGs are uploaded to R2 (`ultron-reels`, `imports/` prefix) and inserted
as `kind: carousel` rows in D1 (`opencut-vault`, tag `Next WIPF`), served via
`/api/import-from-url/file?key=...`.

# content-tools

Generators for the reel/overlay artwork, kept in the repo because the container
they run in is ephemeral and has already been wiped mid-session once.

| File | What it does |
|---|---|
| `which-tool-card.py` | Renders the OLD vs NEW comparison card in both themes: `light` on a paper surface, `dark` as a transparent overlay for video |
| `push-vault.py` | Uploads finished assets to `ultron-reels/imports/` and inserts the `vault_items` row, with the caption rules enforced before anything is written |
| `wordmark_paths.json` | The traced ultron wordmark outlines (`w`, `asc`, `paths[].d`), also the source for `apps/web/src/brand/ultron-wordmark.ts` |

## Running them

```sh
pip install pillow cairosvg imageio-ffmpeg
export CFE=... CFK=... ACC=... DB=ed8a246f-2722-4a1f-95f5-90c2eaf6b4ab

python3 which-tool-card.py          # -> brand/COMPARE2.png, OVERLAY2.png, OVER2_2393.png
python3 push-vault.py               # dry run: validates captions, writes nothing
python3 push-vault.py --go          # uploads + inserts
```

Both expect a `brand/` working directory beside them holding `wordmark_paths.json`,
`fonts/extras/ttf/Inter-*.ttf` and any source clip. Tool logos are read from
`apps/web/public/tools/`.

## The numbers worth not re-deriving

- Reel chrome, Instagram and TikTok combined, on 1080x1920: **250 top, 480 bottom,
  130 right** for the button rail, 60 left. Safe box is therefore 60..950 x 250..1440.
- A block can be at most **860 wide at x 90..950** and still clear the rail. That
  puts its centre at 520 against a frame centre of 540, which still reads centred.
- **Design at final pixels.** A card drawn at 1620 and shown at 1080 loses a third
  of every type size.
- Body-text floor on a 1080 frame is about **32px**; below that it stops being
  readable at phone size.
- An overlay should take roughly **two thirds of the safe height**, not all of it.
  Filling the frame makes it read as a poster pasted over the video.
- Dark clip means the panels have to **lift off** the footage. Near-black cards
  vanish; white cards punch holes. Charcoal at ~88% opacity with a light hairline.
- Pastel chips scaled down go to mud. Hold the hue, raise saturation as brightness
  drops (`chip_fill`).

## Captions

Rules and the reason for each are in `MONOLITH-RUNBOOK.md`. `push-vault.py`
refuses to upload if a caption has a hashtag, an emoji, an em dash, a quote or a
dollar sign, or if it does not open with `Comment KEYWORD `.

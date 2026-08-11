#!/usr/bin/env python3
"""Lift the icon and the product shot out of an app-list reference carousel.

    python3 extract-appref.py google <refs/C_google> <gtools>
    python3 extract-appref.py apps   <refs/B_7apps>  <btools>
    python3 extract-appref.py stack  <refs/A_stack>   <atools>

Both references are the same idea - a cover, N tool frames, a newsletter outro -
and every tool frame is the same composition: a centred app icon, the name, a
browser capture, a few grey lines, `Swipe`. We want the icon and the capture,
nothing else.

BOTH CROPS ARE FOUND, NOT GUESSED, because the frames do not agree with each
other. The icon sits 18px lower on some frames than others and the capture's top
edge moves with the number of description lines - AI Studio's four lines push its
card 45px higher than Opal's three.

AN ICON IS ONE OF THREE THINGS and the crop differs for each:
  - a dark app tile, where the ink bbox IS the tile and gets cropped exactly;
  - a mark on a white plate, which has no edge to find on a white page, so a
    square goes round the mark instead and comes out as the white tile it is;
  - a bare glyph on the page with no plate at all, same crop with more air, so
    it lands on a plate of its own and the set stays one object.
The last two then get everything lighter than the mark washed to pure white, or
the reference's own drop shadow ends up INSIDE our mask as a grey bruise, under
a second shadow the deck draws itself. The cut is at 208 and not at the 232 that
looks safer, because the shadow is darkest exactly where it meets the plate.

THE CARD'S SIDES COME FROM THE CARD. Cropping every frame at one fixed x sliced
the Flow wordmark and left `ex` hanging at the edge of the AI Studio playground,
because these people paste captures of five different widths. A dark card states
its own edges; a white one cannot, so those fall back to the layout inset. Where
the card carries a big corner radius the widest row is the one to measure, since
the top row is still inside the curve - the `apps` reference rounds at 60px and
reads 25px narrower at the top than across the middle.

THE CARD'S BOTTOM IS USUALLY NOT LOOKED FOR. Every crop is the same height and
the capture is cut off, the reference's own move, and the one thing that gives N
frames one footprint. The `stack` reference is the exception: it pastes eight
captures at eight scales AND eight heights, so a fixed crop ran off the end of
the short ones and printed HIS grey description inside our card - `Every
template, product, and` sitting in the middle of the Stripe capture. Its bottom
is found from the DROP SHADOW rather than from ink, because five of its eight
cards are white pages on a white page and have no bottom edge to find; the
shadow beside the card does not care what colour the card is, and it stops
exactly where the card stops.
"""
import glob
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# tiles  - the ink bbox is the tile itself, crop it exactly
# plated - a mark on a white plate, or a bare glyph on the page; crop a square
#          around the mark with `air` of it left over, and wash to white
DECKS = dict(
    google=dict(
        names=["notebooklm", "aistudio", "flow", "stitch", "opal", "lyria",
               "pomelli"],
        plated={"notebooklm": .78, "opal": .75},
        icon_band=(110, 280), card_band=(560, 900), card_h=474,
        top=dict(notebooklm=653), inset=(114, 966), probe=(26, 70), radius=.226,
        ink={}, clamp=False, sides="probe", skip={"01"}),
    apps=dict(
        names=["draftboard", "nume", "doomshield", "traxy", "trove", "amistly",
               "stanley"],
        plated={"draftboard": .58, "nume": .74, "amistly": .58},
        icon_band=(120, 260), card_band=(380, 700), card_h=470,
        top={}, inset=(118, 962), probe=(140, 340), radius=.226,
        ink=dict(trove=8),       # a cream tile is 10 off white, not 40
        clamp=True, sides="probe", skip={"01"}),
    # He pastes this one at eight different scales, 714px wide up to 822, so
    # there is no layout inset to fall back to and every card has to state its
    # own sides. A row well inside the card does that for a white card too,
    # which the 90%-coverage probe cannot.
    stack=dict(
        names=["notion", "gptimage", "stanley", "cta", "igmanychat", "claude",
               "figma", "wisprflow", "stripe", "higgsfield", "notebooklm",
               "outro"],
        skip={"cta", "outro", "stanley", "igmanychat"},
        # Claude's asterisk, Figma's logo and the Notebook LM mark sit bare on
        # the page - no plate under them at all - and Figma's is 62x89, so the
        # bbox is not a tile and cropping it as one would squash the logo.
        plated={"claude": .56, "figma": .50, "notebooklm": .70},
        icon_band=(40, 230), card_band=(300, 620), card_h=None,
        top={}, inset=None, probe=None, radius=.226, ink={}, clamp=False,
        sides="row", row_at=150, row_thr=16),
)
Z = 256


def rounded(z, ratio):
    m = Image.new("L", (z * 4, z * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, z * 4 - 1, z * 4 - 1],
                                        radius=int(z * 4 * ratio), fill=255)
    return m.resize((z, z), Image.LANCZOS)


def main(deck, src, out):
    cfg = DECKS[deck]
    os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(f"{src}/*.jpg"))
    if "01" in cfg["skip"]:                       # the cover, when it is a still
        files = [f for f in files if not f.endswith("01.jpg")]
    files = files[:len(cfg["names"])]
    if len(files) != len(cfg["names"]):
        sys.exit(f"expected {len(cfg['names'])} frames in {src}, found {len(files)}")
    mask = rounded(Z, cfg["radius"])
    iy0, iy1 = cfg["icon_band"]
    cy0, cy1 = cfg["card_band"]
    p0, p1 = cfg["probe"] or (0, 0)

    for nm, f in zip(cfg["names"], files):
        if nm in cfg["skip"]:
            continue
        im = Image.open(f).convert("RGB")
        a = np.asarray(im).astype(int)
        g = a.min(axis=2)

        # ---- the icon. The band stops short of the name's cap line; a wider
        # one swallowed `AI Studio` into the icon and cropped it 318px wide.
        m = (255 - g[iy0:iy1, 360:720]) > cfg["ink"].get(nm, 40)
        ys, xs = np.where(m)
        gx0, gx1 = 360 + xs.min(), 360 + xs.max() + 1
        gy0, gy1 = iy0 + ys.min(), iy0 + ys.max() + 1
        air = cfg["plated"].get(nm)
        if air:
            cx, cy = (gx0 + gx1) // 2, (gy0 + gy1) // 2
            r = int(max(gx1 - gx0, gy1 - gy0) / (2 * air))
            box = (cx - r, cy - r, cx + r, cy + r)
        else:
            box = (gx0, gy0, gx1, gy1)
        crop = im.crop(box)
        if air:
            v = np.asarray(crop).astype(int)
            crop = Image.fromarray(
                np.where(v.min(axis=2, keepdims=True) > 208, 255, v).astype(np.uint8))
        tile = crop.resize((Z, Z), Image.LANCZOS).convert("RGBA")
        tile.putalpha(mask)
        tile.save(f"{out}/icon-{nm}.png")

        # ---- the card. Its top edge is a step across nearly the full measure;
        # nothing else in that band is.
        dy = np.abs(np.diff(g, axis=0))
        run = (dy[:, 150:930] > 14).sum(axis=1)
        top = cfg["top"].get(nm) or next(y for y in range(cy0, cy1) if run[y] > 600)

        # Sides: a dark card is dark across ~every column of its own body, so
        # the ink says where it ends. Text on a white card is ink too, which is
        # why this asks for 90% coverage and not for any ink at all.
        if cfg["sides"] == "row":
            col = 255 - g[top + cfg["row_at"], 60:1020]
            lit = np.where(col > cfg["row_thr"])[0]
            x0, x1 = 60 + lit.min() + 2, 60 + lit.max() - 1
        else:
            col = 255 - g[top + p0:top + p1, 90:995].min(axis=0)
            lit = np.where(col > 40)[0]
            if len(lit) / len(col) > .9:
                x0, x1 = 90 + lit.min() + 2, 90 + lit.max() - 1
            else:
                x0, x1 = cfg["inset"]
        if cfg["clamp"]:
            # One capture in the `apps` reference is pasted 62px wider than his
            # own layout. Every card scales to the same measure, so a wider one
            # scales down further and comes up short of the box - 440 against a
            # 444 box. Holding it to the layout costs 16px a side of a photo.
            x0, x1 = max(x0, cfg["inset"][0]), min(x1, cfg["inset"][1])
        h = cfg["card_h"]
        if h is None:
            sh = ((255 - g[:, x0 - 16:x0 - 3]).mean(axis=1)
                  + (255 - g[:, x1 + 3:x1 + 16]).mean(axis=1))
            base = sh[top + 40:top + 120].mean()
            h = next(y for y in range(top + 250, 1200)
                     if sh[y:y + 8].max() < base * .35) - top - 3
        im.crop((x0, top + 3, x1, top + 3 + h)).save(f"{out}/shot-{nm}.png")
        print(f"  {nm:11} icon {box[2]-box[0]:3}px   card {x1-x0}x{h} at y{top+3}"
              f"   -> {h * 820 / (x1 - x0):.0f}px at the measure")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__.split("\n\n")[1].strip())
    main(sys.argv[1], sys.argv[2], sys.argv[3])

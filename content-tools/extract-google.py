#!/usr/bin/env python3
"""Lift the icon and the product shot out of the Google-tools reference.

    python3 extract-google.py <refs/C_google> <gtools>

The reference is nine 1080x1380 JPEGs: a cover, seven tool frames, a newsletter
outro. Each tool frame is the same composition - a centred app tile, the name,
three or four grey lines, then a browser capture on a rounded card with a soft
shadow under it. We want the tile and the capture, nothing else.

BOTH CROPS ARE FOUND, NOT GUESSED, because the frames do not agree with each
other. The tile sits 18px lower on some frames than others and the capture's top
edge moves with the number of description lines - AI Studio's four lines push its
card 45px higher than Opal's three.

THE TILE IS NOT ALWAYS THE GLYPH. Five of the seven are dark app tiles, so the
ink bbox IS the tile and gets cropped exactly. Notebook LM and Opal are marks on
a white plate, and a white plate has no edge to find on a white page, so those
two crop a square around the mark instead and come out as white tiles - which is
what they are. Both then get the same rounded mask, so the set is one object.

THE CARD'S SIDES COME FROM THE CARD. Cropping every frame at one fixed x sliced
the Flow wordmark and left `ex` hanging at the edge of the AI Studio playground,
because he pasted captures of five different widths. A dark card states its own
edges; a white one cannot, so those fall back to his layout inset. The card's
BOTTOM is never looked for - every crop is the same height and the capture is
cut off, the reference's own move, and the one that gives seven frames one
footprint.
"""
import glob
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

NAMES = ["notebooklm", "aistudio", "flow", "stitch", "opal", "lyria", "pomelli"]
LIGHT = {"notebooklm", "opal"}          # a mark on a white plate, not a tile
TOP = {"notebooklm": 653}               # white card, no edge to find
CARD_H = 474                            # the shortest card in the set, Opal's
INSET = (114, 966)                      # his layout, for the cards without edges
Z = 256


def rounded(z, ratio=0.226):
    m = Image.new("L", (z * 4, z * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, z * 4 - 1, z * 4 - 1],
                                        radius=int(z * 4 * ratio), fill=255)
    return m.resize((z, z), Image.LANCZOS)


def main(src, out):
    os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(f"{src}/*.jpg"))[1:8]
    if len(files) != 7:
        sys.exit(f"expected 9 frames in {src}, found {len(files) + 2}")
    mask = rounded(Z)

    for nm, f in zip(NAMES, files):
        im = Image.open(f).convert("RGB")
        a = np.asarray(im).astype(int)
        g = a.min(axis=2)

        # ---- the tile. The band stops at 280 because the name's cap line
        # starts at 285 and a wider band swallowed `AI Studio` into the icon.
        m = (255 - g[110:280, 360:720]) > 40
        ys, xs = np.where(m)
        gx0, gx1 = 360 + xs.min(), 360 + xs.max() + 1
        gy0, gy1 = 110 + ys.min(), 110 + ys.max() + 1
        if nm in LIGHT:
            cx, cy = (gx0 + gx1) // 2, (gy0 + gy1) // 2
            r = max(50, (gx1 - gx0) // 2 + 14, (gy1 - gy0) // 2 + 14)
            box = (cx - r, cy - r, cx + r, cy + r)
        else:
            box = (gx0, gy0, gx1, gy1)
        crop = im.crop(box)
        if nm in LIGHT:
            # A white plate has no findable edge, so the square around the mark
            # runs a little past it and picks up the reference's own drop
            # shadow - which then sits INSIDE our mask as a grey bruise on the
            # bottom-right corner, under a second shadow we draw ourselves.
            # Everything that light was the page or the shadow, never the mark.
            v = np.asarray(crop).astype(int)
            crop = Image.fromarray(
                np.where(v.min(axis=2, keepdims=True) > 232, 255, v).astype(np.uint8))
        tile = crop.resize((Z, Z), Image.LANCZOS).convert("RGBA")
        tile.putalpha(mask)
        tile.save(f"{out}/icon-{nm}.png")

        # ---- the card. Its top edge is a step across nearly the full measure;
        # nothing else in that band is.
        dy = np.abs(np.diff(g, axis=0))
        run = (dy[:, 150:930] > 14).sum(axis=1)
        top = TOP.get(nm) or next(y for y in range(560, 900) if run[y] > 600)

        # Sides: a dark card is dark across ~every column of its own body, so
        # the ink says where it ends. Text on a white card is ink too, which is
        # why this asks for 90% coverage and not for any ink at all.
        col = 255 - g[top + 26:top + 70, 90:995].min(axis=0)
        lit = np.where(col > 40)[0]
        if len(lit) / len(col) > .9:
            x0, x1 = 90 + lit.min() + 2, 90 + lit.max() - 1
        else:
            x0, x1 = INSET
        im.crop((x0, top + 3, x1, top + 3 + CARD_H)).save(f"{out}/shot-{nm}.png")
        print(f"  {nm:11} tile {box[2]-box[0]:3}px   card {x1-x0}x{CARD_H} at y{top+3}")


if __name__ == "__main__":
    S = os.environ.get("SCRATCH", ".")
    main(sys.argv[1] if len(sys.argv) > 1 else f"{S}/refs/C_google",
         sys.argv[2] if len(sys.argv) > 2 else f"{S}/gtools")

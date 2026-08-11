#!/usr/bin/env python3
"""Lift the eight marks out of the AI Team table screenshot.

    python3 extract-team.py <team.png> <ttools>

The source is a table, so the marks are found from the GRID rather than hunted
for: the horizontal rules are the rows that are nearly all dark across the
table, the middle rule is the column split, and each mark is the only ink in the
band between one row rule and the next, just right of the split.

MOST OF THEM ARE BARE MARKS ON WHITE and get a plate of their own, because a
bare mark next to a plated one in the same column reads as a mistake. Higgsfield
and Apollo ship as their own coloured tiles, so their ink bbox IS the tile and
putting air round it would set a lime tile inside a white one.

THE PLATE IS BUILT, NOT CROPPED. Widening the crop until the mark filled the
right share of it reached past the row rule above and the row rule below, and
pulled the next mark down in with it - the n8n tile shipped with a slice of the
crab under it. The mark is cut at its own bbox and pasted onto white instead, so
nothing outside the mark can arrive at all.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# name -> how much of its own plate the mark should fill. `None` means the ink
# bbox is already the tile and gets cropped exactly.
MARKS = {"claude": .58, "hermes": .70, "stanley": .76, "replit": .60,
         "higgsfield": None, "apollo": None, "n8n": .66, "openclaw": .66}
ORDER = ["claude", "hermes", "stanley", "replit", "higgsfield", "apollo",
         "n8n", "openclaw"]
Z, RADIUS, WASH = 256, .25, 232


def main(src, out):
    os.makedirs(out, exist_ok=True)
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(int)
    g = a.min(axis=2)
    dark = g < 110
    w = im.width

    # A rule is a dark row with light paper 10px above AND below. Without that
    # test the title's black bar comes back as two more rules, because its top
    # and bottom edges are dark rows across the same measure.
    frac = dark[:, int(w * .08):int(w * .90)].mean(axis=1)
    rules = [y for y in range(10, im.height - 10)
             if frac[y] > .8 and frac[y - 10] < .5 and frac[y + 10] < .5]
    bands = []
    for y in rules:
        if not bands or y - bands[-1] > 8:
            bands.append(y)

    # The bar's underline survives that test - light above it inside the bar's
    # own gap, light below it on paper - and it comes back as one extra rule
    # 34px above the table, which slides every mark down a row and hands
    # Claude's asterisk to Hermes. The table's rules are evenly spaced, so the
    # run of uniform gaps is the table and everything before it is not.
    gaps = [bands[i + 1] - bands[i] for i in range(len(bands) - 1)]
    med = sorted(gaps)[len(gaps) // 2]
    while gaps and abs(gaps[0] - med) > med * .2:
        bands.pop(0)
        gaps.pop(0)
    if len(bands) - 1 < len(ORDER):
        sys.exit(f"found {len(bands)-1} rows, expected {len(ORDER)}")

    cols = np.where(dark[bands[0]:bands[-1], :].mean(axis=0) > .8)[0]
    split = [c for c in cols if int(w * .2) < c < int(w * .7)][0]

    msk = Image.new("L", (Z * 4, Z * 4), 0)
    ImageDraw.Draw(msk).rounded_rectangle([0, 0, Z * 4 - 1, Z * 4 - 1],
                                          radius=int(Z * 4 * RADIUS), fill=255)
    msk = msk.resize((Z, Z), Image.LANCZOS)

    lane = (split + 6, split + int(w * .16))
    for i, nm in enumerate(ORDER):
        y0, y1 = bands[i] + 5, bands[i + 1] - 5
        cell = a[y0:y1, lane[0]:lane[1]]
        ink = (255 - cell.min(axis=2)) > 26
        ys, xs = np.where(ink)
        bx0, by0 = lane[0] + xs.min(), y0 + ys.min()
        bx1, by1 = lane[0] + xs.max() + 1, y0 + ys.max() + 1
        air = MARKS[nm]
        mark = im.crop((bx0, by0, bx1, by1))
        v = np.asarray(mark).astype(int)
        mark = Image.fromarray(
            np.where(v.min(axis=2, keepdims=True) > WASH, 255, v).astype(np.uint8))
        side = int(max(bx1 - bx0, by1 - by0) / (air or 1))
        crop = Image.new("RGB", (side, side), (255, 255, 255))
        crop.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
        tile = crop.resize((Z, Z), Image.LANCZOS).convert("RGBA")
        tile.putalpha(msk)
        tile.save(f"{out}/icon-{nm}.png")
        print(f"  {nm:11} mark {bx1-bx0}x{by1-by0} at ({bx0},{by0})")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

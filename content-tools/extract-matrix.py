#!/usr/bin/env python3
"""Lift the sixteen app tiles out of the AI Coding Matrix screenshot.

    python3 extract-matrix.py <matrix.png> <mtools>

The source is somebody's screenshot of somebody's slide - 684x853, so the tiles
land at about 60px and there is no bigger copy of them anywhere. That is the
whole constraint: the deck can enlarge them 1.5x and no further before they turn
to porridge, which is what sets the tile size on the frame.

NOTHING HERE IS A FIXED COORDINATE. The four quadrants are found by their own
tint - four flat pastels that appear nowhere else in the picture - and the tiles
are found inside each quadrant as the runs that are NOT that tint. The tile rows
come first and the columns are then measured only inside them, because the label
under a tile can be wider than the tile is (`Kilo Code`, `Github Copilot`) and a
column profile taken over the whole panel comes back 20px too wide.

A TILE ROW IS 60px TALL AND A LABEL ROW IS 13. That gap is what separates them,
so the row runs are filtered on height rather than on anything cleverer.

THE CROP IS SQUARED. The tiles measure 58x62 - the shadow under them reads as
part of the tile from above and not from the side - and a 58x62 crop stretched
into a square tile leans every logo in the set by 7%.

THE PANEL TINT IS WASHED OUT OF THE CORNERS. His tiles round a little wider than
our mask does, so a crescent of quadrant pink or quadrant blue survives inside
the rounded edge and every tile ships with a coloured fringe. Anything within 26
of the quadrant's own tint was the quadrant, never the logo.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# The four quadrant tints, sampled off the source. Ordered the way the matrix
# reads: mid/overrated, elite/overrated, mid/underrated, elite/underrated.
PANELS = [
    ((247, 201, 197), ["replit", "v0", "lovable", "bolt"]),
    ((246, 241, 209), ["cursor", "windsurf", "copilot", "claudecode"]),
    ((203, 232, 252), ["cline", "aider", "goose", "kilo"]),
    ((228, 245, 208), ["opencode", "codex", "hermes", "openhands"]),
]
Z = 256
RADIUS = .25
WASH = 26


def runs(profile, thr, minlen):
    out, start = [], None
    for i, v in enumerate(profile):
        if v > thr and start is None:
            start = i
        elif v <= thr and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(profile)))
    return [r for r in out if r[1] - r[0] >= minlen]


def card(a):
    """The screenshot has the browser and the desk around it. The slide is the
    one big block of true white."""
    white = np.abs(a - 255).max(axis=2) < 12
    r = np.where(white.mean(axis=1) > .6)[0]
    c = np.where(white.mean(axis=0) > .6)[0]
    return r.min(), r.max() + 1, c.min(), c.max() + 1


def mask(z, ratio):
    m = Image.new("L", (z * 4, z * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, z * 4 - 1, z * 4 - 1],
                                        radius=int(z * 4 * ratio), fill=255)
    return m.resize((z, z), Image.LANCZOS)


def main(src, out):
    os.makedirs(out, exist_ok=True)
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(int)
    y0, y1, x0, x1 = card(a)
    im = im.crop((x0, y0, x1, y1))
    a = np.asarray(im).astype(int)
    msk = mask(Z, RADIUS)

    for tint, names in PANELS:
        t = np.array(tint)
        flat = np.abs(a - t).max(axis=2) < 10
        r = np.where(flat.sum(axis=1) > 120)[0]
        c = np.where(flat.sum(axis=0) > 120)[0]
        px0, py0, px1, py1 = c.min(), r.min(), c.max() + 1, r.max() + 1
        sub = a[py0:py1, px0:px1]
        ink = np.abs(sub - t).max(axis=2) > 14

        got = []
        for ra, rb in runs(ink.sum(axis=1), 6, 40)[:2]:
            band = ink[ra:rb]
            for ca, cb in runs(band.sum(axis=0), (rb - ra) * .35, 30)[:2]:
                got.append((px0 + ca, py0 + ra, px0 + cb, py0 + rb))
        if len(got) != 4:
            sys.exit(f"{names}: found {len(got)} tiles, expected 4")

        for nm, (bx0, by0, bx1, by1) in zip(names, got):
            s = max(bx1 - bx0, by1 - by0)
            cx, cy = (bx0 + bx1) // 2, (by0 + by1) // 2
            tile = im.crop((cx - s // 2, cy - s // 2, cx - s // 2 + s,
                            cy - s // 2 + s))
            v = np.asarray(tile).astype(int)
            near = (np.abs(v - t).max(axis=2) < WASH)[..., None]
            tile = Image.fromarray(np.where(near, 255, v).astype(np.uint8))
            tile = tile.resize((Z, Z), Image.LANCZOS).convert("RGBA")
            tile.putalpha(msk)
            tile.save(f"{out}/icon-{nm}.png")
            print(f"  {nm:11} {bx1-bx0}x{by1-by0} at ({bx0},{by0})")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

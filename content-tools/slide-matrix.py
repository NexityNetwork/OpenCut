#!/usr/bin/env python3
"""The AI Coding Matrix - ONE 1080x1920 frame on paper.

First of the one-shots. Not a carousel: a single slide, rebuilt from a
screenshot into our box, and the only edit to the content is that ULTRON TAKES
OPENHANDS' TILE in the elite-and-underrated quadrant.

IT IS ONE SLIDE, SO IT GETS THE WHOLE SAFE BOX. 250 to 1440, 130 to 950, and no
CTA on it - a single image post carries its ask in the caption, and a comment
line under the matrix would take room from the only thing anybody stopped for.

THE MATRIX IS SQUARE AND THE FRAME IS NOT. 820 across is all there is, so the
block is 820x820 and everything else is stacked around it: the title above it,
`Overrated` and `Underrated` above and below, `Mid` and `Elite` INSIDE the
horizontal gutter at its two ends. His slide hangs those two outside the
quadrants, which needs width we do not have; the 44px gutter between the top and
bottom rows is paper, so the words sit on paper and the arrow runs between them.

THE TILES ARE 96px BECAUSE THAT IS WHAT THE SOURCE CAN CARRY. They come off a
684px screenshot at about 60px each and there is no better copy of most of these
logos anywhere, so 96 is a 1.5x enlargement and the last size that still looks
like a logo instead of a smudge. It also happens to be the proportion his tiles
take on his own slide, which is not a coincidence - he was working from the same
constraint.

ULTRON'S TILE IS MINTED, NOT LIFTED. Ours is the one logo we hold at full size,
so it is drawn from the 810px original onto ultron's own ground rather than
scaled up out of the screenshot with the rest.
"""
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB = _load("slide-body")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
CX = W // 2

BG = (243, 242, 238)
INK = (18, 18, 20)
META = (108, 110, 118)

# ------------------------------------------------------------------ geometry
TITLE_CAP, TITLE_TRACK, TITLE_LEAD = 96, -0.030, 1.14
TITLE_TOP = SAFE_TOP
AXIS_SZ, AXIS_TRACK = 30, 0.13
BLOCK_TOP, BLOCK, GUTTER = 536, 820, 44
PANEL = (BLOCK - GUTTER) // 2
PAD, TILE, LBL_GAP, LBL_CAP, LBL_LEAD = 20, 96, 14, 27, 1.16

# His four quadrant pastels, pulled a step toward the paper so they sit on a
# warm ground instead of glowing off it.
TINTS = [(240, 206, 202), (242, 237, 208), (207, 229, 246), (224, 240, 206)]

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
MT = os.environ.get("MTOOLS", "mtools")
GROUND = (23, 20, 18)

TITLE = ["THE AI CODING", "MATRIX"]

# Reading order per quadrant, top row then bottom row. OpenHands is out and
# ultron is in - the one edit to his content.
QUADS = [
    [("replit", "Replit"), ("v0", "v0"), ("lovable", "Lovable"), ("bolt", "Bolt")],
    [("cursor", "Cursor"), ("windsurf", "Windsurf"),
     ("copilot", "Github Copilot"), ("claudecode", "Claude Code")],
    [("cline", "Cline"), ("aider", "Aider"), ("goose", "Goose"),
     ("kilo", "Kilo Code")],
    [("opencode", "OpenCode"), ("codex", "Codex"), ("hermes", "Hermes"),
     ("ultron", "ultron")],
]


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def mask(w, h, r):
    m = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1],
                                        radius=r * 4, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def icon(key):
    if key != "ultron":
        return Image.open(f"{MT}/icon-{key}.png").convert("RGBA")
    orb = Image.open(f"{LOGOS}/ultron.png").convert("RGBA")
    z, s = 256, int(256 * .76)
    tile = Image.new("RGBA", (z, z), GROUND + (255,))
    tile.alpha_composite(orb.resize((s, s), Image.LANCZOS), ((z - s) // 2,) * 2)
    tile.putalpha(mask(z, z, int(z * .25)))
    return tile


def solve_title():
    for sz in range(TITLE_CAP, 40, -2):
        f = F(sz, "Bold")
        if all(adv(t, f, TITLE_TRACK * sz) <= MEASURE for t in TITLE):
            return sz
    return 40


def solve_label(cell):
    """One size for all sixteen, largest at which every name sets in at most two
    lines inside its own cell. Two rows of label height are reserved whatever a
    name actually needs, so all sixteen tiles sit on the same two baselines."""
    for sz in range(LBL_CAP, 15, -1):
        f = F(sz, "SemiBold")
        if all(len(SB.wrap(nm, f, cell)) <= 2
               for q in QUADS for _, nm in q):
            return sz
    return 15


def arrow(d, p0, p1, col, w=3, head=13):
    x0, y0 = p0
    x1, y1 = p1
    d.line([p0, p1], fill=col, width=w)
    for (ax, ay), s in (((x0, y0), 1), ((x1, y1), -1)):
        if x0 == x1:
            d.polygon([(ax, ay), (ax - head * .62, ay + s * head),
                       (ax + head * .62, ay + s * head)], fill=col)
        else:
            d.polygon([(ax, ay), (ax + s * head, ay - head * .62),
                       (ax + s * head, ay + head * .62)], fill=col)


def build():
    im = ground()
    d = ImageDraw.Draw(im)

    tsz = solve_title()
    f = F(tsz, "Bold")
    y = TITLE_TOP + int(tsz * .727)
    for t in TITLE:
        draw_tracked(d, (CX - adv(t, f, TITLE_TRACK * tsz) / 2, y), t, f, INK,
                     TITLE_TRACK * tsz)
        y += round(tsz * TITLE_LEAD)

    bt, bb = BLOCK_TOP, BLOCK_TOP + BLOCK
    mid = bt + PANEL + GUTTER // 2
    af = F(AXIS_SZ, "SemiBold")
    atr = AXIS_TRACK * AXIS_SZ

    # the two vertical words, above and below the block
    for word, base in (("OVERRATED", bt - 46), ("UNDERRATED", bb + 68)):
        draw_tracked(d, (CX - adv(word, af, atr) / 2, base), word, af, INK, atr)

    # the panels
    cell = (PANEL - 2 * PAD) // 2
    lsz = solve_label(cell - 6)
    pitch = round(lsz * LBL_LEAD)
    # A row is a tile plus TWO label lines whether the name needs them or not,
    # so all sixteen sit on the same pair of baselines. Two of those rows are
    # shorter than two square cells, and the difference went under the bottom
    # row as dead panel - so the pair is centred in the panel instead.
    row = TILE + LBL_GAP + 2 * pitch
    ytop = (PANEL - 2 * row) // 2
    for qi, tiles in enumerate(QUADS):
        px = LEFT if qi % 2 == 0 else LEFT + PANEL + GUTTER
        py = bt if qi < 2 else bt + PANEL + GUTTER
        d.rounded_rectangle([px, py, px + PANEL, py + PANEL], radius=22,
                            fill=TINTS[qi])
        for ti, (key, nm) in enumerate(tiles):
            cxx = px + PAD + (ti % 2) * cell + cell // 2
            cyy = py + ytop + (ti // 2) * row
            ic = icon(key).resize((TILE, TILE), Image.LANCZOS)
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(sh).rounded_rectangle(
                [cxx - TILE // 2, cyy + 7, cxx + TILE // 2, cyy + TILE + 7],
                radius=24, fill=(0, 0, 0, 30))
            im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)))
            im.alpha_composite(ic, (cxx - TILE // 2, cyy))
            ly = cyy + TILE + LBL_GAP + int(lsz * .727)
            for ln in SB.wrap(nm, F(lsz, "SemiBold"), cell - 6):
                d.text((cxx, ly), ln, font=F(lsz, "SemiBold"), fill=INK,
                       anchor="ms")
                ly += pitch

    # the axes, drawn over the panels through the gutters
    arrow(d, (CX, bt - 22), (CX, bb + 22), INK)
    lw, rw = adv("MID", af, atr), adv("ELITE", af, atr)
    draw_tracked(d, (LEFT, mid + 11), "MID", af, INK, atr)
    draw_tracked(d, (RIGHT - rw, mid + 11), "ELITE", af, INK, atr)
    arrow(d, (LEFT + lw + 22, mid), (RIGHT - rw - 22, mid), INK)
    return im, bb + 68


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/matrix"
    os.makedirs(out, exist_ok=True)
    im, bottom = build()
    p = f"{out}/01.png"
    im.convert("RGB").save(p)
    print(f"  ends {bottom}{'   PAST THE SAFE LINE' if bottom > SAFE_BOT else ''}")
    print(f"\n-> {p}")

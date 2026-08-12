#!/usr/bin/env python3
"""AI Business Automation in 24 Hours - the dark stack card, several ways.

Third of the one-shots, and the first that ships as VARIATIONS rather than one
frame. His Figma board is the same list drawn four ways - labels with words,
labels with logos, names with logos, names with logos pushed to the rail - plus
a step guide. This renders our version of each so the choice is made off real
frames instead of a description.

    python3 slide-stack24.py brand/stack24        # all of them
    python3 slide-stack24.py brand/stack24 c      # just that one

DARK, WHICH ALMOST NOTHING ELSE HERE IS. The reference is #1C1C1C and it should
stay dark - the whole point of the card is that seven white tiles glow off it.
The house paper ground would kill that in one move.

TWO OF HIS SEVEN ARE HIS OWN PRODUCTS. DealMaker and Founder Terminal are what
he is selling, so they carry no information for anybody else and they are the
two rows that get replaced: ultron takes the second slot as the operator, and
Replit takes the product slot because building the thing is what that row is
for. Resources goes entirely - a link to somebody's resource library is not a
tool in a stack.

EVERY MARK GETS THE SAME WHITE TILE, ultron included. Its own tile is nearly
black, which is the right answer on paper and invisible here - a dark tile on a
#1C1C1C card is a hole in the row. On this ground the plate is the thing that
reads and the mark is what varies.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw


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

BG = (26, 26, 26)
INK = (241, 240, 237)
DIM = (150, 150, 152)
RULE = (58, 58, 58)

TITLE_CAP, SUB_RATIO = 62, .62
BAND_TOP, BAND_BOT = 430, 1340
CTA_BASE = 1408
TILE, TILE_GAP = 58, 12

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
EXTRA = {"replit": os.environ.get("MTOOLS", "mtools") + "/icon-replit.png"}
# How much of its plate a bare mark fills. The orb is a full circle rather than
# a glyph, so at the 62 percent every other mark takes it reads as a small dark
# dot in a big white square instead of an icon.
FILL = {"ultron": .86}

TITLE = ["AI BUSINESS AUTOMATION", "in 24 hours"]
CTA = ("comment ", "“BUILD”", " for the full stack")

# label, name, marks. Two of his rows are his own products and both are gone:
# ultron takes the operator slot, Replit takes the product slot.
ROWS = [
    ("Brain", "Claude", ["claude"]),
    ("Operator", "ultron", ["ultron"]),
    ("Automation", "n8n + Make", ["n8n", "make"]),
    ("Product", "Replit", ["replit"]),
    ("Clients", "Instagram + TikTok", ["instagram", "tiktok"]),
    ("Payments", "Stripe", ["stripe"]),
    ("Sales", "Calendly + Hubspot", ["calendly", "hubspot"]),
]

GUIDE_TITLE = ["A STEP BY STEP GUIDE", "to $10K per month"]
GUIDE = [
    "Pick **one job** you do every single day",
    "Hand it to **ultron** and watch it run once",
    "Wrap it as a service with **one page**",
    "Take payment with **Stripe** on day one",
    "Post **3 to 5 reels a day** about it",
    "Keep **only what books calls**",
    "Repeat until it is **$10K a month**",
]

_cover = {}


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.4, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def mask(sz, r):
    m = Image.new("L", (sz * 4, sz * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, sz * 4 - 1, sz * 4 - 1],
                                        radius=r * 4, fill=255)
    return m.resize((sz, sz), Image.LANCZOS)


def tile(im, x, y, sz, key):
    """A mark at tile size without double-plating it. Some files ARE a tile
    already - apollo is a white rounded square with the orbit-A inside it - and
    drawing that inside another tile stacks plate on plate."""
    path = EXTRA.get(key, f"{LOGOS}/{key}.png")
    src = Image.open(path).convert("RGBA")
    if key not in _cover:
        _cover[key] = (np.asarray(src)[..., 3] > 30).mean()
    m = mask(sz, int(sz * .24))
    if _cover[key] >= .85:
        plate = src.resize((sz, sz), Image.LANCZOS)
    else:
        plate = Image.new("RGBA", (sz, sz), (255, 255, 255, 255))
        n = int(sz * FILL.get(key, .62))
        plate.alpha_composite(src.resize((n, n), Image.LANCZOS), ((sz - n) // 2,) * 2)
    plate.putalpha(m)
    im.alpha_composite(plate, (x, y))


def marks_w(marks, sz=TILE):
    return len(marks) * sz + (len(marks) - 1) * TILE_GAP


def solve(values, cap, weight, measure):
    for sz in range(cap, 10, -1):
        f = F(sz, weight)
        if all(f.getlength(v) <= measure for v in values):
            return sz
    return 10


def frame(title):
    im = ground()
    d = ImageDraw.Draw(im)
    tsz = solve([title[0]], TITLE_CAP, "Bold", MEASURE)
    f, tr = F(tsz, "Bold"), -0.012 * tsz
    y = SAFE_TOP + int(tsz * .727)
    draw_tracked(d, (CX - adv(title[0], f, tr) / 2, y), title[0], f, INK, tr)
    ssz = int(tsz * SUB_RATIO)
    d.text((CX, y + int(tsz * .24) + 14 + int(ssz * .727)), title[1],
           font=F(ssz, "Medium"), fill=INK, anchor="ms")

    a, b, c = CTA
    fa, fb = F(30, "Regular"), F(30, "Bold")
    wtot = fa.getlength(a) + fb.getlength(b) + fa.getlength(c)
    x = CX - wtot / 2
    d.text((x, CTA_BASE), a, font=fa, fill=DIM, anchor="ls"); x += fa.getlength(a)
    d.text((x, CTA_BASE), b, font=fb, fill=INK, anchor="ls"); x += fb.getlength(b)
    d.text((x, CTA_BASE), c, font=fa, fill=DIM, anchor="ls")
    return im, d


def rows_at():
    """Seven rows on one pitch, the block centred in the band. Centring the
    block and not the first row is what keeps the stack off the title when a
    variant runs shorter."""
    pitch = (BAND_BOT - BAND_TOP) // len(ROWS)
    top = BAND_TOP + ((BAND_BOT - BAND_TOP) - pitch * (len(ROWS) - 1)) // 2
    return top, pitch


# ------------------------------------------------------------------- variants

def var_a():
    """His first: label bold on the left, the words ranged right."""
    im, d = frame(TITLE)
    top, pitch = rows_at()
    lab = [f"{r[0]}:" for r in ROWS]
    lsz = solve(lab, 46, "Bold", 300)
    vsz = solve([r[1] for r in ROWS], 46, "Regular", MEASURE - 320)
    for i, (label, name, _) in enumerate(ROWS):
        y = top + i * pitch
        d.text((LEFT, y), f"{label}:", font=F(lsz, "Bold"), fill=INK, anchor="lm")
        d.text((RIGHT, y), name, font=F(vsz, "Regular"), fill=INK, anchor="rm")
    return im


def var_b():
    """His second: label bold on the left, the marks ranged left after it, so
    the tiles start on one axis and the row reads as a set rather than a total."""
    im, d = frame(TITLE)
    top, pitch = rows_at()
    lab = [f"{r[0]}:" for r in ROWS]
    lsz = solve(lab, 44, "Bold", 330)
    for i, (label, _, marks) in enumerate(ROWS):
        y = top + i * pitch
        d.text((LEFT, y), f"{label}:", font=F(lsz, "Bold"), fill=INK, anchor="lm")
        for j, k in enumerate(marks):
            tile(im, LEFT + 360 + j * (TILE + TILE_GAP), y - TILE // 2, TILE, k)
    return im


def var_c():
    """His third: no labels at all. The name carries the row and the marks sit
    on the right rail, which is the fastest of the four to read and the one that
    stops looking like a form."""
    im, d = frame(TITLE)
    top, pitch = rows_at()
    nsz = solve([r[1] for r in ROWS], 46, "Regular", MEASURE - 220)
    for i, (_, name, marks) in enumerate(ROWS):
        y = top + i * pitch
        d.text((LEFT, y), name, font=F(nsz, "Regular"), fill=INK, anchor="lm")
        x = RIGHT - marks_w(marks)
        for k in marks:
            tile(im, x, y - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
    return im


def var_d():
    """Ours: a ruled ledger. The job goes back in as a small tracked label above
    the name instead of beside it, so the name gets the whole measure and the
    marks still land on the rail. A hairline under every row makes the seven
    read as one object."""
    im, d = frame(TITLE)
    top, pitch = rows_at()
    nsz = solve([r[1] for r in ROWS], 44, "Medium", MEASURE - 220)
    for i, (label, name, marks) in enumerate(ROWS):
        y = top + i * pitch
        f = F(23, "SemiBold")
        draw_tracked(d, (LEFT, y - 16), label.upper(), f, DIM, 0.12 * 23)
        d.text((LEFT, y + 30), name, font=F(nsz, "Medium"), fill=INK, anchor="ls")
        x = RIGHT - marks_w(marks)
        for k in marks:
            tile(im, x, y + 2 - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
        d.line([(LEFT, y + pitch - 44), (RIGHT, y + pitch - 44)], fill=RULE, width=1)
    return im


def var_e():
    """Ours: the mark leads. Tile, then the name, all ranged left on one axis -
    the row a phone reads without moving its eye across a gap. Rows with two
    tools get both tiles before the name."""
    im, d = frame(TITLE)
    top, pitch = rows_at()
    lead = max(marks_w(r[2]) for r in ROWS) + 28
    nsz = solve([r[1] for r in ROWS], 46, "Medium", MEASURE - lead)
    for i, (_, name, marks) in enumerate(ROWS):
        y = top + i * pitch
        x = LEFT
        for k in marks:
            tile(im, x, y - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
        d.text((LEFT + lead, y), name, font=F(nsz, "Medium"), fill=INK, anchor="lm")
    return im


def var_f():
    """His guide card, our steps. His sells a bundle off his own domain; ours is
    the seven moves somebody could actually make this week, with the payload in
    Bold."""
    im, d = frame(GUIDE_TITLE)
    top, pitch = rows_at()
    ssz = 38
    for i, step in enumerate(GUIDE):
        y = top + i * pitch
        nf = F(26, "Bold")
        draw_tracked(d, (LEFT, y + 10), f"{i+1:02d}", nf, DIM, 0.10 * 26)
        lines = SB.rich_lines(step, ssz, MEASURE - 92)
        # Every step is one line by construction. The loop used to print each
        # line at the same y, so step five arrived as `Post 3 to` stamped on top
        # of `problem` - which only showed up because one step was long enough
        # to wrap at all.
        assert len(lines) == 1, f"step {i+1} wraps: {step}"
        SB.draw_line(d, LEFT + 92, y + int(ssz * .30), lines[0], ssz, INK, DIM)
    return im


VARIANTS = dict(a=var_a, b=var_b, c=var_c, d=var_d, e=var_e, f=var_f)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/stack24"
    pick = sys.argv[2:] or list(VARIANTS)
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for k in pick:
        im = VARIANTS[k]()
        p = f"{out}/{k}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {k}  {p}")
    TWd = 300
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 12) + 12, th + 24), (16, 16, 16))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS),
                    (12 + i * (TWd + 12), 12))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

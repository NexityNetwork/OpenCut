#!/usr/bin/env python3
"""AI Business Automation in 24 Hours - the dark stack card, several ways.

Third of the one-shots, and the first that ships as VARIATIONS rather than one
frame. His Figma board is the same list drawn four ways plus a step guide, so
this renders our version of each and the choice gets made off real frames.

    python3 slide-stack24.py brand/stack24        # all of them
    python3 slide-stack24.py brand/stack24 c      # just that one

THE SAFE BOX IS NOT OPTIONAL AND IT IS NOT DEAD SPACE. 250..1440 vertically and
130..950 across is the only part of a 1080x1920 frame the platform does not draw
over: below 1440 is the caption block and the audio ticker, past 950 is the like
and comment rail, above 250 is the header. A pass of this file used the whole
frame on the theory that a still has no chrome - it does, the same chrome - and
it put the last two rows, the ask and every right-hand logo underneath it.

THE BLOCK FILLS THAT BOX, it does not float in it. The title sits on the safe
top, the ask sits on the safe bottom, and the row pitch is SOLVED from whatever
is left between them rather than picked and then centred. So the card is as big
as the box allows and there is no slack anywhere in it.

THE TITLE IS TWO LINES OF ONE SIZE. Setting the second at 62 percent of the
first made it a caption apologising under a headline; his are the same size, and
`in 24 hours` only reads smaller because lowercase has a lower x-height than
caps do. Same size, one step down in weight, and the leading closed to 1.10 so
the two lines are a block rather than a line and an afterthought.

NO GREY. Contrast comes from WEIGHT, not from turning text down. A grey label,
grey body and a white keyword is three tones doing one job, and on a #1C1C1C
card the grey is the first thing to disappear on a phone at arm's length.

BIG AND TIGHT. The tiles are 88px and the pitch comes out near 136, so the gap
between two tiles is half a tile. The first pass ran 58px marks on a 130 pitch,
which is a list with holes in it.

DARK, WHICH ALMOST NOTHING ELSE HERE IS. The reference is #1C1C1C and it should
stay dark - the whole point of the card is that the tiles glow off it. The house
paper ground would kill that in one move.

TWO OF HIS SEVEN ARE HIS OWN PRODUCTS. DealMaker and Founder Terminal are what
he is selling, so they carry no information for anybody else and they are the
two rows that get replaced: ultron takes the second slot as the operator, and
Replit takes the product slot because building the thing is what that row is
for. Resources goes entirely - a link to somebody's resource library is not a
tool in a stack.

EVERY MARK GETS THE SAME WHITE TILE, ultron included. Its own tile is nearly
black, which is the right answer on paper and invisible here - a dark tile on a
#1C1C1C card is a hole in the row.
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
BAND = SAFE_BOT - SAFE_TOP
CX = W // 2

BG = (26, 26, 26)
INK = (244, 243, 240)
RULE = (76, 76, 76)

TITLE_CAP, TITLE_LEAD = 76, 1.10
HEAD_GAP, CTA_GAP = 72, 72
TILE, TILE_GAP = 88, 14
CTA_SZ = 36

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
    "Pick **one job** you do every day",
    "Hand it to **ultron** and let it run",
    "Wrap it as a service on **one page**",
    "Take payment with **Stripe** on day one",
    "Post **3 to 5 reels a day**",
    "Keep **only what books calls**",
    "Repeat to **$10K a month**",
]

_cover = {}


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, .8, (H, W, 1))
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


def solve(values, cap_, weight, measure):
    for sz in range(cap_, 10, -1):
        f = F(sz, weight)
        if all(f.getlength(v) <= measure for v in values):
            return sz
    return 10


def cap(sz):
    return int(sz * .727)


def solve_rich(values, cap_, measure):
    """Largest size at which every one of them still sets on ONE line. Guessing
    the size and trimming the copy to match put step four over the measure twice
    - the solver is the thing that cannot get it wrong."""
    for sz in range(cap_, 10, -1):
        if all(len(SB.rich_lines(v, sz, measure)) == 1 for v in values):
            return sz
    return 10


def frame(title, row_h):
    """Ground, title, ask - and the centre line of row one plus the pitch.

    Everything is pinned to the SAFE BOX and the pitch is what gives: the title
    sits on the safe top, the ask on the safe bottom, and the rows take whatever
    is left. Nothing here is centred in the full frame, because the bottom 480px
    of a 1080x1920 is the caption block and the right 130 is the action rail."""
    im = ground()
    d = ImageDraw.Draw(im)

    tsz = solve([title[0]], TITLE_CAP, "Bold", MEASURE)
    lead = round(tsz * TITLE_LEAD)

    # Sit the title's INK on the safe top, not a baseline derived from a cap
    # ratio. `int(sz * .727)` is two pixels short of Inter Bold's actual cap at
    # this size, which is how every variant came back one pixel over the line.
    f, tr = F(tsz, "Bold"), -0.014 * tsz
    rise = -d.textbbox((0, 0), title[0], font=f, anchor="ls")[1]
    head = rise + lead
    y = SAFE_TOP + rise
    draw_tracked(d, (CX - adv(title[0], f, tr) / 2, y), title[0], f, INK, tr)
    d.text((CX, y + lead), title[1], font=F(tsz, "Medium"), fill=INK, anchor="ms")

    room = BAND - head - HEAD_GAP - CTA_GAP - cap(CTA_SZ)
    pitch = (room - row_h) // (len(ROWS) - 1)
    cy = SAFE_TOP + head + HEAD_GAP + row_h // 2     # centre line of row one
    by = SAFE_BOT                                    # the ask sits on the floor
    a, b, c = CTA
    fa, fb = F(CTA_SZ, "Regular"), F(CTA_SZ, "Bold")
    x = CX - (fa.getlength(a) + fb.getlength(b) + fa.getlength(c)) / 2
    for s, fn in ((a, fa), (b, fb), (c, fa)):
        d.text((x, by), s, font=fn, fill=INK, anchor="ls")
        x += fn.getlength(s)
    return im, d, cy, pitch


# ------------------------------------------------------------------- variants

def var_a():
    """His first: label bold on the left, the words ranged right. One size for
    both columns, solved so the longest label and the longest value clear each
    other across the measure."""
    im, d, cy, PITCH = frame(TITLE, TILE)
    lab = [f"{r[0]}:" for r in ROWS]
    for sz in range(64, 20, -1):
        lw = max(F(sz, "Bold").getlength(v) for v in lab)
        vw = max(F(sz, "Regular").getlength(r[1]) for r in ROWS)
        if lw + 48 + vw <= MEASURE:
            break
    for i, (label, name, _) in enumerate(ROWS):
        y = cy + i * PITCH
        d.text((LEFT, y), f"{label}:", font=F(sz, "Bold"), fill=INK, anchor="lm")
        d.text((RIGHT, y), name, font=F(sz, "Regular"), fill=INK, anchor="rm")
    return im


def var_b():
    """His second: label bold on the left, the marks ranged left after it, so
    every row's tiles start on one axis and the row reads as a set."""
    im, d, cy, PITCH = frame(TITLE, TILE)
    lab = [f"{r[0]}:" for r in ROWS]
    lsz = solve(lab, 60, "Bold", MEASURE - marks_w(["a", "b"]) - 60)
    col = LEFT + max(F(lsz, "Bold").getlength(v) for v in lab) + 60
    for i, (label, _, marks) in enumerate(ROWS):
        y = cy + i * PITCH
        d.text((LEFT, y), f"{label}:", font=F(lsz, "Bold"), fill=INK, anchor="lm")
        for j, k in enumerate(marks):
            tile(im, int(col) + j * (TILE + TILE_GAP), y - TILE // 2, TILE, k)
    return im


def var_c():
    """His third and fourth: no labels at all. The name carries the row and the
    marks sit on the right rail - the fastest of the set to read, and the one
    that stops looking like a form."""
    im, d, cy, PITCH = frame(TITLE, TILE)
    nsz = solve([r[1] for r in ROWS], 66, "Regular",
                MEASURE - marks_w(["a", "b"]) - 48)
    for i, (_, name, marks) in enumerate(ROWS):
        y = cy + i * PITCH
        d.text((LEFT, y), name, font=F(nsz, "Regular"), fill=INK, anchor="lm")
        x = RIGHT - marks_w(marks)
        for k in marks:
            tile(im, x, y - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
    return im


def var_d():
    """Ours: a ruled ledger. The job goes back in as a tracked label ABOVE the
    name rather than beside it, so the name keeps the whole measure and the
    marks still land on the rail. A hairline under every row makes the seven
    read as one object instead of seven."""
    im, d, cy, PITCH = frame(TITLE, TILE + 34)
    nsz = solve([r[1] for r in ROWS], 60, "Medium",
                MEASURE - marks_w(["a", "b"]) - 48)
    lsz = 26
    for i, (label, name, marks) in enumerate(ROWS):
        y = cy + i * PITCH
        draw_tracked(d, (LEFT, y - 30), label.upper(), F(lsz, "Bold"), INK,
                     0.12 * lsz)
        d.text((LEFT, y + 34), name, font=F(nsz, "Medium"), fill=INK, anchor="ls")
        x = RIGHT - marks_w(marks)
        for k in marks:
            tile(im, x, y + 6 - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
        d.line([(LEFT, y + PITCH - 58), (RIGHT, y + PITCH - 58)], fill=RULE,
               width=2)
    return im


def var_e():
    """Ours: the mark leads. Tile, then the name, and the pair is CENTRED on the
    frame rather than ranged left - so the list sits under the title on the same
    axis instead of hanging off one edge of it."""
    im, d, cy, PITCH = frame(TITLE, TILE)
    lead = max(marks_w(r[2]) for r in ROWS) + 34
    nsz = solve([r[1] for r in ROWS], 66, "Medium", MEASURE - lead)
    wide = lead + max(F(nsz, "Medium").getlength(r[1]) for r in ROWS)
    x0 = CX - wide / 2
    for i, (_, name, marks) in enumerate(ROWS):
        y = cy + i * PITCH
        x = x0
        for k in marks:
            tile(im, int(x), y - TILE // 2, TILE, k)
            x += TILE + TILE_GAP
        d.text((x0 + lead, y), name, font=F(nsz, "Medium"), fill=INK, anchor="lm")
    return im


def var_f():
    """His guide card, our steps. His sells a bundle off his own domain; ours is
    seven moves somebody could make this week, with the payload in Bold and the
    rest at the same weight of white - not a grey line with a bright word in it."""
    im, d, cy, PITCH = frame(GUIDE_TITLE, TILE)
    ssz = solve_rich(GUIDE, 54, MEASURE - 118)
    num = max(24, int(ssz * .62))
    for i, step in enumerate(GUIDE):
        y = cy + i * PITCH
        draw_tracked(d, (LEFT, y + cap(num) // 2), f"{i+1:02d}", F(num, "Bold"),
                     INK, 0.10 * num)
        # One line each, guaranteed by the solver above. The loop used to print
        # every line at the same y, so a step that wrapped arrived as `Post 3
        # to` stamped on top of `problem`.
        lines = SB.rich_lines(step, ssz, MEASURE - 118)
        SB.draw_line(d, LEFT + 118, y + cap(ssz) // 2, lines[0], ssz, INK, INK)
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

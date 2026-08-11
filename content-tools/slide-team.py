#!/usr/bin/env python3
"""Your Ultimate AI Team in 2026 - ONE 1080x1920 frame on paper.

Second of the one-shots. A seven row table, one job per row, rebuilt from a
screenshot into our box. Two edits to his content: ULTRON TAKES THE CODING ROW
off Hermes, and the Open Claw row is gone rather than replaced - a personal
assistant living on your laptop is a different post, and eight rows in this box
puts the last one under the reel chrome anyway.

THE BLACK BAR IS THE WHOLE TITLE DEVICE and it is his. Line one sets on the
paper, line two sets in white inside a black block - the one thing on the frame
that is not paper coloured, which is why the eye lands on `AI TEAM IN 2026` and
not on the word above it. It is drawn as a real block sized off the type rather
than a rectangle guessed at, so the bar fits the words at whatever size they
solve to.

THE TABLE IS A REAL GRID, not rows of text with lines between them. One outer
box, one column split, six inner rules, all 3px black, and every cell's content
is centred in ITS OWN cell rather than sat on a baseline - which is the only way
a 72px tile, a 36px name and two 23px lines end up looking level with a single
word three times their size in the column beside them.

ONE SIZE PER COLUMN, SOLVED ACROSS THE SET. `Automation` decides the job size,
`Higgsfield` decides the name size, and the description size is the largest at
which all seven still set in two lines. Seven rows that each pick their own
size is a table that looks like it was typed.

THE LOGOS ALL COME OFF HIS OWN SCREENSHOT via extract-team.py, and only ultron
is minted. Six of them exist in the repo or in the assets cut from the other
references, and using those instead put a different Apollo mark and a different
Stanley mark in the table than the ones he picked - his Apollo is the yellow
tile, ours is the older purple circle. One source, one look, and no argument
about which logo is current.
"""
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

BG = (243, 242, 238)
INK = (16, 16, 18)
DIM = (92, 94, 102)

# ------------------------------------------------------------------ geometry
TITLE_CAP, TITLE_TRACK = 96, -0.030
BAR_PAD, BAR_LEAD, TITLE_GAP = 26, 1.26, 16
TABLE_TOP_GAP, TABLE_BOT = 52, 1420
RULE, COL1 = 3, 330
CELL_PAD, TILE, TILE_GAP = 22, 72, 20
JOB_CAP, NAME_CAP, DESC_CAP, DESC_LEAD = 52, 38, 25, 1.30

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
TT = os.environ.get("TTOOLS", "ttools")
GROUND = (23, 20, 18)
Z = 256

TITLE = ["YOUR ULTIMATE", "AI TEAM IN 2026"]

# job, key, name, description. His copy, trimmed to two lines at our measure.
ROWS = [
    ("Ideas", "claude", "Claude",
     "Thinks with you and turns rough ideas into real plans."),
    ("Coding", "ultron", "ultron",
     "Runs the whole build end to end and remembers every project."),
    ("Content", "stanley", "Stanley",
     "Drafts, schedules and posts in your exact voice."),
    ("Website", "replit", "Replit",
     "Describe what you want and it builds and hosts the site."),
    ("Videos", "higgsfield", "Higgsfield",
     "Cinematic AI video with camera motion that looks real."),
    ("Sales", "apollo", "Apollo",
     "Finds your buyers, writes the outreach, fills the pipeline."),
    ("Automation", "n8n", "n8n",
     "Connects your tools so whole workflows run without you."),
]

# Every one of his comes off the same screenshot via extract-team.py, already
# plated and masked. Only ours is minted, from the 810px original.
MINT = {"ultron": ("ultron.png", GROUND)}


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
    if key not in MINT:
        return Image.open(f"{TT}/icon-{key}.png").convert("RGBA")
    path, plate = MINT[key]
    mark = Image.open(f"{LOGOS}/{path}").convert("RGBA")
    s = int(Z * .76)
    tile = Image.new("RGBA", (Z, Z), plate + (255,))
    tile.alpha_composite(mark.resize((s, s), Image.LANCZOS), ((Z - s) // 2,) * 2)
    tile.putalpha(mask(Z, Z, int(Z * .25)))
    return tile


def solve_one(values, cap, weight, measure):
    """Fit by MEASURED WIDTH, not by line count. `Automation` is one word and
    wrap() never breaks a word, so a line-count test called every size a fit and
    the column rule printed straight through `Automatior`."""
    for sz in range(cap, 12, -1):
        f = F(sz, weight)
        if all(f.getlength(v) <= measure for v in values):
            return sz
    return 12


def solve_wrapped(values, cap, weight, measure, lines):
    for sz in range(cap, 12, -1):
        f = F(sz, weight)
        if all(len(SB.wrap(v, f, measure)) <= lines for v in values):
            return sz
    return 12


def build():
    im = ground()
    d = ImageDraw.Draw(im)

    # ---- title. One size for both lines; the barred line has to clear its own
    # padding, so it is the one that decides.
    for tsz in range(TITLE_CAP, 40, -2):
        f = F(tsz, "Bold")
        tr = TITLE_TRACK * tsz
        if (adv(TITLE[0], f, tr) <= MEASURE
                and adv(TITLE[1], f, tr) <= MEASURE - 2 * BAR_PAD):
            break
    f, tr = F(tsz, "Bold"), TITLE_TRACK * tsz
    y = SAFE_TOP + int(tsz * .727)
    draw_tracked(d, (CX - adv(TITLE[0], f, tr) / 2, y), TITLE[0], f, INK, tr)

    # The bar hugs its own words but never comes back narrower than the line
    # above it, which reads as a caption under a headline instead of the
    # headline it is.
    bw = max(adv(TITLE[1], f, tr), adv(TITLE[0], f, tr)) + 2 * BAR_PAD
    bh = round(tsz * BAR_LEAD)
    by = y + int(tsz * .24) + TITLE_GAP
    d.rectangle([CX - bw / 2, by, CX + bw / 2, by + bh], fill=INK)
    draw_tracked(d, (CX - adv(TITLE[1], f, tr) / 2,
                     by + (bh + int(tsz * .727)) // 2), TITLE[1], f, BG, tr)

    # ---- the grid
    top = by + bh + TABLE_TOP_GAP
    rh = (TABLE_BOT - top) // len(ROWS)
    bot = top + rh * len(ROWS)
    split = LEFT + COL1
    d.rectangle([LEFT, top, RIGHT, bot], outline=INK, width=RULE)
    d.line([(split, top), (split, bot)], fill=INK, width=RULE)
    for i in range(1, len(ROWS)):
        d.line([(LEFT, top + i * rh), (RIGHT, top + i * rh)], fill=INK,
               width=RULE)

    jm = COL1 - 2 * CELL_PAD
    tm = RIGHT - split - CELL_PAD - TILE - TILE_GAP - CELL_PAD
    jsz = solve_one([r[0] for r in ROWS], JOB_CAP, "Bold", jm)
    nsz = solve_one([r[2] for r in ROWS], NAME_CAP, "Bold", tm)
    dsz = solve_wrapped([r[3] for r in ROWS], DESC_CAP, "Regular", tm, 2)
    pitch = round(dsz * DESC_LEAD)

    for i, (job, key, name, desc) in enumerate(ROWS):
        cy = top + i * rh + rh // 2
        d.text((LEFT + CELL_PAD, cy), job, font=F(jsz, "Bold"), fill=INK,
               anchor="lm")

        ic = icon(key).resize((TILE, TILE), Image.LANCZOS)
        im.alpha_composite(ic, (split + CELL_PAD, cy - TILE // 2))

        tx = split + CELL_PAD + TILE + TILE_GAP
        lines = SB.wrap(desc, F(dsz, "Regular"), tm)
        block = int(nsz * .727) + 12 + pitch * len(lines)
        ty = cy - block // 2 + int(nsz * .727)
        d.text((tx, ty), name, font=F(nsz, "Bold"), fill=INK, anchor="ls")
        ty += 12 + int(dsz * .727)
        for ln in lines:
            d.text((tx, ty), ln, font=F(dsz, "Regular"), fill=DIM, anchor="ls")
            ty += pitch
    return im, bot, dict(title=tsz, job=jsz, name=nsz, desc=dsz, rh=rh)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/team"
    os.makedirs(out, exist_ok=True)
    im, bottom, L = build()
    p = f"{out}/01.png"
    im.convert("RGB").save(p)
    print(f"  solved   title {L['title']}   job {L['job']}   name {L['name']}"
          f"   desc {L['desc']}   row {L['rh']}")
    print(f"  ends {bottom}"
          f"{'   PAST THE SAFE LINE' if bottom > SAFE_BOT else ''}\n\n-> {p}")

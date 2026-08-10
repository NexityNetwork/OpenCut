#!/usr/bin/env python3
"""Abstractions of the screens a workflow talks to.

A workflow canvas is real and gets recycled. Everything it hands off to - the
board, the sheet, the dashboard, the inbox - is not, and drawing those as
replicas was the mistake: a pane with a real field name and an invented actor
slug is claiming to be a screenshot, so it has to be perfect, and it never is.

THE RULE. An abstraction gets ONE LEVEL OF DETAIL BELOW the thing it represents,
and invents no specifics. A dashboard reduces to blocks and one chart. A sheet
reduces to a header and rows. Never a value, never a field name, never a tool
slug - if there is nothing to invent there is nothing to get wrong, and at 0.6s
a frame nobody was going to read a field name anyway.

The ceiling that follows: at 820px on a phone, ink under about 24px is texture.
SEVEN DISTINGUISHABLE ELEMENTS is the most any of these carries. Past that the
granularity is real work nobody can see.

Three families:

    reduced interfaces   grid  panel  board  queue
    relationships        fan   pipeline  layers
    type as graphic      spec

The last one is the odd one and it is the strongest. It carries REAL TEXT on
purpose, because a two-column monospace list of tool and role is not an
illustration of information, it IS the information - which is exactly what the
references do on their infrastructure and pricing slides. The other eight say
"a screen"; spec says the thing itself.

Everything is built from ONE primitive set - one radius, three tones, one bar
rhythm - so eight shapes read as a system rather than as eight drawings. And
everything comes out 818px wide, which is what every real n8n export in the set
is, so an abstraction and a canvas land at the same scale on a slide.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
_f = {}

# Three tones and an accent, per theme. t0 stands in for body text, t1 for a
# label, t2 for a heading; the accent is THE ONE THING THAT MATTERS on the
# screen and there is never more than one of it.
THEMES = {
    "dark":  dict(bg=(24, 24, 26), edge=(48, 48, 52), sub=(32, 32, 35),
                  t0=(46, 46, 50), t1=(74, 74, 80), t2=(132, 132, 138),
                  accent=(64, 124, 246), ink=(228, 228, 232), dim=(126, 126, 132)),
    "light": dict(bg=(255, 255, 255), edge=(226, 228, 232), sub=(247, 248, 250),
                  t0=(232, 234, 238), t1=(206, 209, 215), t2=(150, 154, 162),
                  accent=(52, 116, 240), ink=(30, 32, 36), dim=(128, 132, 140)),
}
R = 8


def F(sz, w="Regular"):
    k = (sz, w)
    if k not in _f:
        _f[k] = (ImageFont.truetype(MONO, int(sz)) if w == "mono"
                 else ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz)))
    return _f[k]


def new(W, H, T):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=18, fill=T["bg"],
                        outline=T["edge"], width=1)
    return im, d


def bar(d, x, y, w, h, col, r=None):
    d.rounded_rectangle([x, y, x + w, y + h], radius=r if r is not None else min(h // 2, R),
                        fill=col)


def lines(d, x, y, w, T, widths=(1.0, .72), h=9, gap=13, tone="t0"):
    """A paragraph, as bars. Ragged widths are the whole trick - equal-width bars
    read as a chart, ragged ones read as text."""
    for i, f in enumerate(widths):
        bar(d, x, y + i * (h + gap), int(w * f), h, T[tone])
    return y + len(widths) * (h + gap) - gap


# ----------------------------------------------------------------- interfaces

def grid(W=818, H=400, theme="dark"):
    """A sheet. Header rule, ragged rows, one cell that matters."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    x, y, w = 34, 34, W - 68
    cols = [.30, .24, .26, .20]
    cx = x
    for f in cols:
        bar(d, cx, y, int(w * f) - 22, 11, T["t2"])
        cx += int(w * f)
    y += 30
    d.line([(x, y), (x + w, y)], fill=T["edge"], width=2)
    y += 6
    rh = (H - 40 - y) // 6
    for r in range(6):
        ry = y + r * rh
        if r % 2 == 1:
            d.rounded_rectangle([x - 10, ry, x + w + 10, ry + rh - 6], radius=6, fill=T["sub"])
        cx = x
        for j, f in enumerate(cols):
            cw = int(w * f) - 22
            frac = [.86, .62, .74, .48, .92, .58][(r * 4 + j) % 6]
            col = T["accent"] if (r, j) == (2, 2) else T["t1" if j == 0 else "t0"]
            bar(d, cx, ry + rh // 2 - 6, int(cw * frac), 11, col)
            cx += int(w * f)
    return im


def panel(W=818, H=400, theme="dark"):
    """A dashboard. Four figures and one chart - the least a dashboard can be
    and still be unmistakable."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    x, w = 34, W - 68
    cw = (w - 3 * 14) // 4
    for i in range(4):
        cx = x + i * (cw + 14)
        d.rounded_rectangle([cx, 34, cx + cw, 152], radius=12, fill=T["sub"],
                            outline=T["edge"], width=1)
        bar(d, cx + 18, 58, int(cw * .52), 9, T["t1"])           # label
        bar(d, cx + 18, 88, int(cw * .62), 26, T["t2"])          # the figure
        bar(d, cx + 18, 126, int(cw * .34), 8, T["t0"])          # delta
    d.rounded_rectangle([x, 168, x + w, H - 34], radius=12, fill=T["sub"],
                        outline=T["edge"], width=1)
    bar(d, x + 18, 190, 108, 9, T["t1"])
    n, bw = 9, 40
    gap = (w - 36 - n * bw) // (n - 1)
    for i, f in enumerate([.32, .5, .42, .68, .55, .8, 1.0, .6, .44]):
        bh = int((H - 34 - 224) * f)
        bar(d, x + 18 + i * (bw + gap), H - 52 - bh, bw, bh,
            T["accent"] if i == 6 else T["t1"], r=6)
    return im


def board(W=818, H=400, theme="dark"):
    """A board. Columns of cards, one card lit."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    x, w = 30, W - 60
    n = 4
    cw = (w - (n - 1) * 14) // n
    counts = [3, 2, 4, 2]
    # Card height falls out of the TALLEST column, so the busiest one fills its
    # lane exactly. A fixed 74 ran the four-card column 42px off the bottom - a
    # board whose cards are clipped reads as a broken render, not as a board.
    top, bottomy = 76, H - 42
    ch = (bottomy - top - (max(counts) - 1) * 10) // max(counts)
    for c in range(n):
        cx = x + c * (cw + 14)
        d.rounded_rectangle([cx, 30, cx + cw, H - 30], radius=12, fill=T["sub"])
        bar(d, cx + 16, 48, int(cw * .46), 10, T["t2"])
        cy = top
        for k in range(counts[c]):
            hot = (c, k) == (2, 1)
            d.rounded_rectangle([cx + 12, cy, cx + cw - 12, cy + ch], radius=10,
                                fill=T["bg"], outline=T["accent"] if hot else T["edge"],
                                width=2 if hot else 1)
            lines(d, cx + 24, cy + 18, cw - 48, T, (.82, .5), h=8, gap=11)
            bar(d, cx + 24, cy + ch - 22, 34, 8, T["accent"] if hot else T["t1"])
            cy += ch + 10
    return im


def queue(W=818, H=400, theme="dark"):
    """An inbox. A rail and a list - the two things every one of them has."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    rw = 116
    d.rounded_rectangle([0, 0, rw, H - 1], radius=18, fill=T["sub"])
    d.line([(rw, 0), (rw, H)], fill=T["edge"], width=1)
    for i in range(5):
        bar(d, 24, 46 + i * 40, 68 if i else 44, 10, T["t2"] if i == 1 else T["t0"])
    x, w = rw + 30, W - rw - 60
    rh = (H - 56) // 6
    for i in range(6):
        y = 28 + i * rh
        hot = i == 1
        if hot:
            d.rounded_rectangle([x - 12, y - 4, x + w + 12, y + rh - 12], radius=10,
                                fill=T["sub"])
            bar(d, x - 12, y + 2, 4, rh - 22, T["accent"], r=2)
        d.ellipse([x, y + 6, x + 34, y + 40], fill=T["t1" if hot else "t0"])
        bar(d, x + 50, y + 10, int(w * [.34, .28, .38, .3, .26, .36][i]), 10,
            T["t2" if hot else "t1"])
        bar(d, x + 50, y + 32, int(w * [.62, .74, .55, .68, .8, .58][i]), 9, T["t0"])
    return im


# -------------------------------------------------------------- relationships

def fan(W=818, H=420, theme="dark", logos=("instagram", "tiktok", "x", "linkedin",
                                           "facebook", "youtube", "gmail", "telegram",
                                           "notion", "airtable")):
    """One thing out to many. The arc is the point - a row of logos says `these
    exist`, an arc says `all of them, from here`."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    cx, cy, rad, sz = W // 2, H - 56, 292, 58
    n = len(logos)
    for i in range(n):
        a = math.pi * (0.04 + 0.92 * i / (n - 1))
        px, py = cx - rad * math.cos(a), cy - rad * math.sin(a) * 0.78
        d.line([(cx, cy - 18), (px, py)], fill=T["edge"], width=2)
    d.rounded_rectangle([cx - 46, cy - 46, cx + 46, cy + 22], radius=16,
                        fill=T["accent"])
    bar(d, cx - 26, cy - 26, 52, 9, (255, 255, 255))
    bar(d, cx - 26, cy - 8, 34, 9, (255, 255, 255, 160))
    for i, name in enumerate(logos):
        a = math.pi * (0.04 + 0.92 * i / (n - 1))
        px, py = cx - rad * math.cos(a), cy - rad * math.sin(a) * 0.78
        p = f"{LOGOS}/{name}.png"
        box = (int(px - sz / 2), int(py - sz / 2))
        d.ellipse([box[0] - 5, box[1] - 5, box[0] + sz + 5, box[1] + sz + 5],
                  fill=T["bg"], outline=T["edge"], width=1)
        if os.path.exists(p):
            im.alpha_composite(Image.open(p).convert("RGBA").resize((sz, sz), Image.LANCZOS),
                               box)
    return im


def pipeline(W=818, H=400, theme="dark"):
    """A sequence. Five chips and the line between them."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    n, cw, ch = 5, 118, 96
    gap = (W - 68 - n * cw) // (n - 1)
    y = (H - ch) // 2
    for i in range(n):
        x = 34 + i * (cw + gap)
        if i:
            d.line([(x - gap, y + ch // 2), (x, y + ch // 2)], fill=T["edge"], width=3)
            d.ellipse([x - 12, y + ch // 2 - 5, x - 2, y + ch // 2 + 5], fill=T["edge"])
        hot = i == 3
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=14, fill=T["sub"],
                            outline=T["accent"] if hot else T["edge"], width=2 if hot else 1)
        d.rounded_rectangle([x + 20, y + 18, x + 52, y + 50], radius=9,
                            fill=T["accent"] if hot else T["t1"])
        bar(d, x + 20, y + 64, cw - 40, 9, T["t1"])
        bar(d, x + 20, y + 79, int((cw - 40) * .6), 8, T["t0"])
    return im


def layers(W=818, H=400, theme="dark"):
    """A stack. Offset slabs, top one lit - depth without perspective, because
    an axonometric slab at this size is just a parallelogram nobody can read."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    # Slabs OVERLAP. The first version spaced them 22px apart and inset them 26,
    # which reads as four list rows that happen to be different widths - the eye
    # needs one slab to occlude the one behind it before it sees a stack at all.
    # So the step is smaller than the slab and the inset is large.
    n, sh, step, inset = 4, 108, 62, 58
    total = sh + (n - 1) * step
    y = (H - total) // 2
    for i in range(n):
        k = n - 1 - i
        x0, x1 = 46 + k * inset, W - 46 - k * inset
        sy = y + i * step
        hot = i == n - 1
        d.rounded_rectangle([x0, sy, x1, sy + sh], radius=16,
                            fill=T["bg"] if hot else T["sub"],
                            outline=T["accent"] if hot else T["edge"],
                            width=2 if hot else 1)
        bar(d, x0 + 24, sy + 22, 36, 28, T["accent"] if hot else T["t1"], r=9)
        bar(d, x0 + 74, sy + 28, int((x1 - x0) * .30), 11, T["t2" if hot else "t1"])
        bar(d, x0 + 74, sy + 48, int((x1 - x0) * .18), 9, T["t0"])
    return im


# ------------------------------------------------------------ type as graphic

def spec(W=818, H=420, theme="dark", rows=(("n8n", "workflow orchestration"),
                                           ("Apify", "scraping, 6 platforms"),
                                           ("GPT-4o", "sentiment and playbooks"),
                                           ("Airtable", "the intelligence table"),
                                           ("Drive", "where the output lands")),
         head=("tool", "role"), title="CORE INFRASTRUCTURE"):
    """The odd one, and the strongest. This carries REAL TEXT, because a
    two-column list of tool and role is not an illustration of information, it IS
    the information. The references do exactly this on their infrastructure and
    pricing slides and it is the best-looking thing in their deck.

    Monospace, ruled, no card fills. Nothing here is invented - every row is a
    tool that is genuinely in the workflows."""
    T = THEMES[theme]
    im, d = new(W, H, T)
    x, w = 44, W - 88
    d.text((x, 60), title, font=F(19, "mono"), fill=T["dim"], anchor="ls")
    d.line([(x, 78), (x + w, 78)], fill=T["edge"], width=2)
    y = 120
    d.text((x, y), head[0], font=F(21, "mono"), fill=T["dim"], anchor="ls")
    d.text((x + 300, y), head[1], font=F(21, "mono"), fill=T["dim"], anchor="ls")
    y += 16
    d.line([(x, y), (x + w, y)], fill=T["edge"], width=1)
    y += 44
    for a, b in rows:
        d.text((x, y), a, font=F(23, "mono"), fill=T["ink"], anchor="ls")
        d.text((x + 300, y), b, font=F(23, "mono"), fill=T["dim"], anchor="ls")
        y += 46
    d.line([(x, y - 22), (x + w, y - 22)], fill=T["edge"], width=1)
    return im


SHAPES = {"grid": grid, "panel": panel, "board": board, "queue": queue,
          "fan": fan, "pipeline": pipeline, "layers": layers, "spec": spec}


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/shapes"
    theme = sys.argv[2] if len(sys.argv) > 2 else "dark"
    os.makedirs(out, exist_ok=True)
    made = []
    for name, fn in SHAPES.items():
        im = fn(theme=theme)
        p = f"{out}/{name}.png"
        im.convert("RGB").save(p)
        made.append((name, p, im.size))
        print(f"  {name:9} {im.width}x{im.height}")
    pad, cols = 26, 2
    ws = [Image.open(p).size for _, p, _ in made]
    cw = max(w for w, _ in ws) + pad
    rows_h, i = [], 0
    while i < len(made):
        rows_h.append(max(h for _, h in ws[i:i + cols]) + pad)
        i += cols
    sheet = Image.new("RGB", (cols * cw + pad, sum(rows_h) + pad),
                      (14, 14, 15) if theme == "dark" else (238, 236, 232))
    y = pad
    for r in range(len(rows_h)):
        for c in range(cols):
            k = r * cols + c
            if k < len(made):
                sheet.paste(Image.open(made[k][1]), (pad + c * cw, y))
        y += rows_h[r]
    sheet.save(f"{out}/_sheet.png")
    print(f"-> {out}/_sheet.png")

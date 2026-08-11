#!/usr/bin/env python3
"""The Frontend deck - 1080x1920 carousel frames on PAPER, not on ink.

Eighth family and the first light one. The reference is light, so this is light;
every other rule the set runs on is unchanged.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

NO CTA PILL ON A BODY FRAME. The closer asks for the comment and the closer is
the only thing that does.

THE COPY IS THE REFERENCE'S. Its five titles, its order, its close. One thing is
deliberately not the reference's: the tool pair on frame 1 is ultron, not
Lovable. That was asked for and it is the only substitution in the deck.

WHAT CARRIES THE SET IS THE NUMBER AND THE RULE. Every frame is a numbered title
in the accent, a hairline across the full measure, a one-line description, then
one object. Six frames, one shape - which is the thing three previous decks got
wrong by giving every frame its own treatment.

The frame's ONE ACCENT is spent on the number, so nothing inside a block has to
fight for it.
"""
import glob
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
BL = _load("blocks")
F, adv, wrap, draw_tracked, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

# Warm paper rather than #FFF. The two surfaces in this deck are white cards; on
# a white ground they would have no edge at all and would read as holes in the
# frame instead of as objects sitting on it.
BG = (243, 242, 238)

# NO GREY BODY TEXT. Same rule as the dark decks and for the same reason - at
# half a second a dimmed line reads as switched off. Emphasis is BOLD.
# `meta` exists for one job: micro-labels INSIDE a white surface, where grey on
# white is what an interface actually looks like.
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), spine=(206, 204, 197),
         card=(255, 255, 255), card_ink=(18, 18, 20),
         accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 62, -0.028
BLURB_SZ, BLURB_LEAD = 36, 1.42
GAP = 64
PLATE_R = 22
PAIR_TILE = 140

WF = os.environ.get("WORKFLOWS", "../another no name workflow")
WF_B = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")
WF_C = os.environ.get("WORKFLOWS_C", "../differnt types of workflows")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def wf_path(name):
    if name.startswith("b:"):
        return f"{WF_B}/{name[2:]}"
    if name.startswith("c:"):
        return f"{WF_C}/{name[2:]}"
    return f"{WF}/{name}"


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=20, blur=26, alpha=44, drop=14):
    """A soft drop under a white card. On paper a hairline alone is not enough to
    lift a white surface off a near-white ground - it reads as a printed outline
    rather than as a screen sitting on top of something."""
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    """The workflow canvas. Same treatment as the dark decks - Figma stamps a 1px
    rule on every export, so two pixels come off before anything is rounded."""
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh]
    shadow(im, box, r=PLATE_R)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(*T["rule"], 255), width=1)
    im.alpha_composite(ov)
    return box[3]


def logo_row(im, names, y, sz=74, gp=26):
    tiles = [f"{LOGOS}/{n}.png" for n in names]
    tiles = [t for t in tiles if os.path.exists(t)]
    x = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
    for t in tiles:
        im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz), Image.LANCZOS),
                           (x, y))
        x += sz + gp
    return y + sz


def rich(d, x, y, w, s, sz, lead):
    for ln in SB.rich_lines(s, sz, w):
        SB.draw_line(d, x, y, ln, sz, T["ink"], T["ink"])
        y += round(sz * lead)
    return y


def head(im, d, n, title):
    """THE TITLE IS PINNED and so is the rule under it. Same y on all six frames.

    The number is set in the accent and the title in ink, on one baseline. A
    number in a circle or a chip was tried and it is a second object competing
    with the headline - a numeral and a full stop already say `frame n of six`."""
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n}."
    fb = F(TITLE_SZ, "Bold")
    tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), title, fb, T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def place(top, block):
    """Centre a picture in the space the type left, with GAP as the floor.

    Adding GAP first and THEN centring the remainder is double counting - it put
    117px of paper above frame 4's dashboard and 53 below it, which is not
    centred, it just looks like the object slid down. The gap is a MINIMUM, not
    a term in the sum."""
    return max(top + GAP, top + (SAFE_BOT - top - block) // 2)


def build(i, s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(im, d, i, s["title"])
    if s.get("blurb"):
        y = rich(d, LEFT, y, MEASURE, s["blurb"], BLURB_SZ, BLURB_LEAD)
    bot = SAFE_BOT

    if s.get("surface"):
        sh = s["surface"]
        surf = (BL.report_surface(MEASURE, sh["h"], theme=T) if sh.get("report")
                else BL.app_surface(MEASURE, sh["h"], theme=T, spec=sh["spec"]))
        pair = PAIR_TILE + 66 if s.get("pair") else 0
        yy = place(y, surf.height + (GAP + pair if pair else 0))
        shadow(im, [LEFT, yy, LEFT + MEASURE, yy + surf.height], r=18)
        im.alpha_composite(surf, (LEFT, yy))
        yy += surf.height
        if pair:
            BL.tool_pair(im, d, LEFT, yy + GAP, MEASURE, T, *s["pair"],
                         tile=PAIR_TILE, logos=LOGOS)
            yy += GAP + pair
        bot = yy
    elif s.get("art"):
        # Two canvases are ONE object, so they sit closer to each other than
        # either sits to anything else.
        srcs = [source(wf_path(a)) for a in s["art"]]
        hs = [round(x.height * MEASURE / (x.width - 4)) for x in srcs]
        inner = 34
        lh = 74 + GAP if s.get("logos") else 0
        yy = place(y, sum(hs) + inner * (len(srcs) - 1) + lh)
        for k, src in enumerate(srcs):
            yy = plate(im, src, yy) + (inner if k + 1 < len(srcs) else 0)
        if s.get("logos"):
            yy = logo_row(im, s["logos"], yy + GAP)
        bot = yy
    else:
        y += GAP
        kind, data, *rest = s["block"]
        h = SAFE_BOT - y
        if s.get("notify"):
            h -= 148 + GAP
        BL.BLOCKS[kind](d, LEFT, y, MEASURE, h, T, data, **(rest[0] if rest else {}))
        if s.get("notify"):
            BL.notify(im, d, LEFT, bot - 148, MEASURE, T, *s["notify"], logos=LOGOS)
    return im, dict(bottom=bot)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy

SLIDES = [
    # The screen, then what built it. ultron replaces Lovable in the pair; the
    # rest of the frame is unchanged from the reference's intent.
    dict(title="Frontend Dashboards",
         blurb="The screen the client logs into. **Leads, bookings and invoices** "
               "in one place, shipped in days.",
         surface=dict(h=600, spec=BL.CLIENT_OS),
         pair=(("ultron", "ultron", True), ("Claude", "claude", False))),

    # A real canvas off the twenty, and a light one - a dark export dropped onto
    # paper is a black slab where the frame wants a screenshot.
    dict(title="n8n Workflows",
         blurb="Behind it, **one workflow per job** - capture, reply, book, "
               "invoice. Nobody opens a tab.",
         art=["c:AutoInvoice Agent.png", "c:Client Scraper.png"]),

    dict(title="What AI Replaces?",
         blurb="The jobs that used to need somebody near a phone. **Six of them, "
               "the same way every time.**",
         block=("checks", ["Lead capture", "Booking", "Sales handoff",
                           "Support replies", "Invoicing", "Admin ops"],
                dict(col=T["ink"]))),

    # A report, not the app. The app is what they work in; this is what they show
    # somebody. A chart is the difference and it is the only one on the deck.
    dict(title="Outcomes",
         blurb="What the owner checks on a Monday. **More calls booked, fewer "
               "hours lost.**",
         surface=dict(h=780, report=True)),

    # The accent is already spent on the number, so no tier is highlighted and
    # the block drops its own top rule - the head rule two inches above is doing
    # that job already and two hairlines is one hairline too many.
    dict(title="What To Charge?",
         blurb="**Setup once, then a monthly** for hosting and changes. "
               "Anything new is priced on its own.",
         block=("tiers", [
             ("$1,500", ["Setup", "Built and handed over."]),
             ("$400", ["Monthly", "Hosting, fixes, changes."]),
             ("$250", ["Per workflow", "Added after launch."]),
         ], dict(foot="Run cost is $30 to $60 a month. Profitable on client one.",
                 hot=None, rule_top=False, cap=(72, 42))),
         notify=("Stripe", "from a new client", "$1,500.00")),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“OS”", "ExtraBold", 1.00),
          ("for my full", "Medium", 0.40),
          ("BLUEPRINT", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/front"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(i, s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {name:22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

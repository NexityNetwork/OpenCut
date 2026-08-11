#!/usr/bin/env python3
"""The Google AI Tools deck - 1080x1920 carousel frames on paper.

First family off the monolith references instead of Figma. Seven tools Google
shipped, then the close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

THE LIST STAYS GOOGLE'S. Every other deck off these references swaps a tool for
ours. This one does not - it is a list of what Google shipped, and putting our
name in it would be the one lie the reader can check.

THE COMPOSITION IS CENTRED, which nothing else here is. That is the reference's
and it is right for this: seven frames that are the same object seven times, so
the eye parks on the axis at 540 and only the words change. Left-ranging it
would make seven different pictures.

NOTHING MOVES BETWEEN FRAMES. The counter, the tile, the name's baseline, both
description baselines, the capture's box and the footer rule are all constants -
not derived from the frame, declared above it. The name is set at ONE size for
the set and the description at ONE size for the set, solved against the longest
of each, so `Flow` and `Notebook LM` sit on the same line at the same weight.

THE CAPTURES ARE HIS, CROPPED BY extract-google.py. Seven real product pages at
seven different widths get cover-fitted into one box and cut off at the bottom -
the reference's own move. A screenshot that ends where the next one ends is the
only way seven captures read as one deck.

THE DESCRIPTIONS ARE COMPRESSED. His run three and four lines; at 0.6 seconds a
frame nobody finishes four lines, so each is cut to two with the payload set in
SemiBold - the phrase that would make you stop scrolling, and nothing else.

BEST FOR IS A PINNED FOOTER. Same y, same rule, same rail on all seven, so it
reads as chrome and not as a seventh line of body copy.

NO CTA ON BODY FRAMES. The close asks for the comment.
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
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
CX = W // 2

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(96, 98, 106), meta=(150, 152, 160),
         rule=(212, 210, 203))

# ------------------------------------------------------------------ geometry
# Constants, not measurements. Every one of these is the same on all seven.
NUM_SZ, NUM_BASE, NUM_TRACK = 27, 272, 0.13
TILE, TILE_TOP = 132, 320
NAME_CAP, NAME_TRACK, NAME_BASE = 108, -0.026, 566
DESC_CAP, DESC_LEAD, DESC_BASE = 44, 1.42, 664
# 444 is the shortest the set scales to - Flow's, the widest capture. Fitting
# the box to that one means no capture is ever cropped SIDEWAYS: at 460 the box
# was narrower than Flow and the centre-crop took 14px off each side, which put
# the Google Flow wordmark under the corner radius and printed it as `Soogle`.
SHOT_TOP, SHOT_H, SHOT_R = 812, 444, 26
FOOT_RULE, FOOT_BASE = SAFE_BOT - 96, SAFE_BOT - 26
FOOT_LBL, FOOT_CAP = 33, 39

GT = os.environ.get("GTOOLS", "gtools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, radius, blur, alpha, drop):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + drop, x1, y1 + drop],
                                         radius=radius, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def line_w(ln, size):
    """Width of a rich line - the bold face is wider, so it cannot be measured
    in Regular and then centred."""
    reg = F(size, "Regular")
    return sum((reg.getlength(" ") if sp else 0)
               + F(size, "SemiBold" if b else "Regular").getlength(wd)
               for wd, b, sp in ln)


def solve_name(names):
    """One size for the set. `Notebook LM` is the longest and it decides."""
    for sz in range(NAME_CAP, 40, -2):
        f = F(sz, "Bold")
        if all(adv(n, f, NAME_TRACK * sz) <= MEASURE for n in names):
            return sz
    return 40


def desc_lines(text, size):
    """`|` is a line break. Greedy wrapping fills line one and dumps whatever is
    left onto line two, which reads as a mistake when the seam lands mid-phrase
    - `It designs the / UI and the frontend code`. Seven frames is few enough to
    break every one of them on purpose."""
    return [SB.rich_lines(p.strip(), size, MEASURE)[0] for p in text.split("|")]


def solve_desc(descs):
    """One size for the set, largest at which BOTH halves of every description
    still set on one line. Three lines on one frame and two on the next is the
    thing that makes a deck look assembled rather than designed."""
    for sz in range(DESC_CAP, 24, -1):
        if all(len(SB.rich_lines(p.strip(), sz, MEASURE)) == 1
               for t in descs for p in t.split("|")):
            return sz
    return 24


def solve_foot(vals):
    lbl = F(FOOT_LBL, "Regular").getlength("Best for")
    for sz in range(FOOT_CAP, 22, -1):
        f = F(sz, "SemiBold")
        if all(f.getlength(v) <= MEASURE - lbl - 48 for v in vals):
            return sz
    return 22


def build(s, L):
    im = ground()
    d = ImageDraw.Draw(im)

    # counter - the deck opens on tool one with no cover in front of it, so
    # something has to say this is a list and how far in you are
    idx, tot = s["n"], L["tot"]
    fa, fb = F(NUM_SZ, "SemiBold"), F(NUM_SZ, "Medium")
    tr = NUM_TRACK * NUM_SZ
    wa = adv(f"{idx:02d}", fa, tr)
    wb = adv(f"  /  {tot:02d}", fb, tr)
    x = CX - (wa + wb) // 2
    x = draw_tracked(d, (x, NUM_BASE), f"{idx:02d}", fa, T["ink"], tr)
    draw_tracked(d, (x, NUM_BASE), f"  /  {tot:02d}", fb, T["meta"], tr)

    # the tile
    ic = Image.open(f"{GT}/icon-{s['key']}.png").convert("RGBA")
    ic = ic.resize((TILE, TILE), Image.LANCZOS)
    tx = CX - TILE // 2
    shadow(im, (tx, TILE_TOP, tx + TILE, TILE_TOP + TILE), 30, 14, 46, 10)
    im.alpha_composite(ic, (tx, TILE_TOP))

    # the name
    f = F(L["name"], "Bold")
    tr = NAME_TRACK * L["name"]
    draw_tracked(d, (CX - adv(s["name"], f, tr) / 2, NAME_BASE), s["name"], f,
                 T["ink"], tr)

    # the description, centred line by line
    y = DESC_BASE
    pitch = round(L["desc"] * DESC_LEAD)
    for ln in desc_lines(s["desc"], L["desc"]):
        SB.draw_line(d, CX - line_w(ln, L["desc"]) / 2, y, ln, L["desc"],
                     T["ink"], T["dim"])
        y += pitch
    desc_bot = y - pitch + round(L["desc"] * .24)

    # the capture - cover-fitted into the box and anchored to its top, so the
    # product's own header always survives and the bottom is what gets cut
    src = Image.open(f"{GT}/shot-{s['key']}.png").convert("RGB")
    k = MEASURE / src.width
    nh = round(src.height * k)
    assert nh >= SHOT_H, f"{s['key']}: capture too short for the box"
    card = src.resize((MEASURE, nh), Image.LANCZOS).crop(
        (0, 0, MEASURE, SHOT_H)).convert("RGBA")
    msk = Image.new("L", (MEASURE * 4, SHOT_H * 4), 0)
    ImageDraw.Draw(msk).rounded_rectangle(
        [0, 0, MEASURE * 4 - 1, SHOT_H * 4 - 1], radius=SHOT_R * 4, fill=255)
    card.putalpha(msk.resize((MEASURE, SHOT_H), Image.LANCZOS))
    shadow(im, (LEFT, SHOT_TOP, RIGHT, SHOT_TOP + SHOT_H), SHOT_R, 30, 58, 18)
    im.alpha_composite(card, (LEFT, SHOT_TOP))

    # the footer
    d.line([(LEFT, FOOT_RULE), (RIGHT, FOOT_RULE)], fill=T["rule"], width=1)
    d.text((LEFT, FOOT_BASE), "Best for", font=F(FOOT_LBL, "Regular"),
           fill=T["meta"], anchor="ls")
    d.text((RIGHT, FOOT_BASE), s["best"], font=F(L["foot"], "SemiBold"),
           fill=T["ink"], anchor="rs")

    assert desc_bot < SHOT_TOP - 24, f"{s['key']}: copy runs into the capture"
    assert SHOT_TOP + SHOT_H < FOOT_RULE - 40, "capture runs into the footer"
    return im, dict(bottom=SAFE_BOT, gap=SHOT_TOP - desc_bot)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y, gap=0)


# ---------------------------------------------------------------------- copy
# His descriptions, cut to two lines each with the payload in SemiBold. The
# `Best for` line is not his - it is the answer to the only question a reel
# viewer actually has, which is whether this one is for them.

SLIDES = [
    dict(key="notebooklm", name="Notebook LM",
         desc="Feed it your docs and transcripts. | "
              "It answers **only from your sources.**",
         best="Research you can trust"),

    dict(key="aistudio", name="AI Studio",
         desc="Every Gemini model in one free place. | "
              "**Test anything before you build.**",
         best="Trying everything free"),

    dict(key="flow", name="Flow",
         desc="Type a scene, get clips **with sound.** | "
              "Then extend the shot until it works.",
         best="Filmmaking with no crew"),

    dict(key="stitch", name="Stitch",
         desc="Describe a screen. It designs the UI | "
              "**and writes the frontend code.**",
         best="Ideas into real mockups"),

    dict(key="opal", name="Opal",
         desc="Chain prompts into a mini app, | "
              "**share the link,** anyone can run it.",
         best="Tools you can hand over"),

    dict(key="lyria", name="Lyria",
         desc="Describe a mood. It composes | "
              "**original tracks** you can actually use.",
         best="Soundtracks you own"),

    dict(key="pomelli", name="Pomelli",
         desc="It scans your site and learns the brand, | "
              "then makes **on-brand assets.**",
         best="Staying on brand at volume"),
]

# THE CTA IS ALWAYS COMMENT. His outro sells a newsletter; ours asks for the
# comment, which is the only thing the account is here to collect.
CLOSER = [("comment", "Medium", 0.40),
          ("“GOOGLE”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("ALL SEVEN LINKS", "ExtraBold", 0.52)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/google"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)

    L = dict(tot=len(SLIDES),
             name=solve_name([s["name"] for s in SLIDES]),
             desc=solve_desc([s["desc"] for s in SLIDES]),
             foot=solve_foot([s["best"] for s in SLIDES]))
    print(f"  solved   name {L['name']}   desc {L['desc']}   foot {L['foot']}\n")

    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        if isinstance(s, dict):
            s["n"] = i
            im, m = build(s, L)
        else:
            im, m = build_closer(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = s["name"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {name:14} ends {m['bottom']:4d}   copy-to-shot {m['gap']:3d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

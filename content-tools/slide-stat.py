#!/usr/bin/env python3
"""The stat-and-claim deck - 1080x1920 reel frames, dark.

Sixth family. A numbered title, ONE full-width light card carrying the claim and
the number it moves, and the workflow underneath as the receipt.

That inversion is the idea. On every other deck the canvas is the subject and the
words caption it. Here the claim is the subject and the canvas is evidence for
it - so the claim gets the only light surface on the frame and the canvas sits
below it in the dark.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the
horizontal safe box is 60..950 and nothing crosses it.

Rebuilt after a first version that was three separate faults:

  A SEPARATE STAT TILE next to the claim card. 224px wide, 306 tall, carrying an
  icon and one number, which left it two thirds empty - and it stole 246px of
  width from the claim, which is the thing anyone actually reads. The number
  belongs INSIDE the card, under a rule, next to the strip. One card, one
  surface, one hierarchy.

  THE CANVAS BLENDED TO 42 PERCENT. The intent was "evidence, not subject" and
  the result was grey mush that reads as a failed render rather than as a
  screenshot. Evidence has to be legible or it is not evidence. It sits at full
  strength on a dark plate now; being below the card is what makes it secondary,
  not being faint.

  A HOLE AT THE BOTTOM. The card and the canvas together used about two thirds
  of the safe box and the rest was black. The card absorbs it now - it is sized
  from the claim rather than fixed, so the type grows into the space instead of
  the space staying empty.

Two departures from the reference, which said structure was loose:

  THE SWIPE ARROW IS GONE. Section 1 bans arrows suggesting a swipe, and in a
  reel it is worse than banned, it is wrong - there is nothing to swipe, the
  frames advance on their own.

  Its Title Case On Every Word goes to sentence case. The kit bans uppercase
  labels and title case on a running sentence is the same fault at half strength.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

_spec = importlib.util.spec_from_file_location(
    "slide_body", os.path.join(os.path.dirname(os.path.abspath(__file__)), "slide-body.py"))
SB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SB)
F, adv, wrap, draw_tracked, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
# EQUAL MARGINS. The rail covers x > 950, so the right margin is forced to 130.
# Using 60 on the left gave a block at 60..950 - 60 one side, 130 the other - and
# it reads as shoved left, because it is. The margin the rail forces sets BOTH:
# 130..950 is 820 wide, centred on the frame at 540, right edge exactly on the
# rail. 70px narrower than before and worth every one of them.
LEFT, RIGHT = 130, 950
MEASURE = 820

BG = (10, 10, 11)
PLATE_BG = (22, 22, 24)
PLATE_EDGE = (46, 46, 50)
LIGHT = (255, 255, 255)
INK = (16, 16, 18)
SUB = (118, 116, 114)
NUM = (122, 122, 126)
DIM = (152, 152, 156)
RULE = (232, 230, 228)
BAR = (226, 230, 238)
BAR_HOT = (52, 116, 240)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 68, 44, -0.028
CLAIM_MAX, CLAIM_MIN, CLAIM_LEAD = 58, 40, 1.14
PAD, TITLE_GAP, CARD_GAP = 44, 48, 46
STRIP_W, STRIP_H = 268, 96
STAT_H = 118
PLATE_R = 24

CLOSER_INK, CLOSER_DIM = LIGHT, DIM

WF = os.environ.get("WORKFLOWS", "../another no name workflow")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(5).normal(0, 1.8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def week_strip(d, x, y, w, hot=5):
    """Seven faint columns with one lit. Not a chart - a texture that says
    `every day`. Labelling it as data it does not have would be the chart
    equivalent of inventing a number."""
    cw, gap = (w - 6 * 9) // 7, 9
    for i in range(7):
        cx = x + i * (cw + gap)
        h = int(STRIP_H * [.42, .58, .5, .78, .66, 1.0, .6][i]) - 26
        d.rounded_rectangle([cx, y + STRIP_H - 26 - h, cx + cw, y + STRIP_H - 26],
                            radius=5, fill=BAR_HOT if i == hot else BAR)
        d.text((cx + cw // 2, y + STRIP_H - 4), "MTWTFSS"[i], font=F(15, "Medium"),
               fill=(172, 170, 168), anchor="ms")


def claim_card(im, d, x, y, w, s, csz):
    """Claim, rule, then the number and the strip on one row. The number lives
    inside the card rather than on a tile beside it - a tile carrying one figure
    is two thirds empty and it costs the claim a quarter of its width."""
    lines = wrap(s["claim"], F(csz, "Bold"), w - PAD * 2)
    h = PAD + len(lines) * round(csz * CLAIM_LEAD) + 30 + STAT_H + PAD - 20
    d.rounded_rectangle([x, y, x + w, y + h], radius=28, fill=LIGHT)

    yy = y + PAD + int(csz * .727)
    for ln in lines:
        d.text((x + PAD, yy), ln, font=F(csz, "Bold"), fill=INK, anchor="ls")
        yy += round(csz * CLAIM_LEAD)

    ry = yy - int(csz * .727) + 22
    d.line([(x + PAD, ry), (x + w - PAD, ry)], fill=RULE, width=2)
    d.text((x + PAD, ry + 76), s["stat"], font=F(52, "Bold"), fill=INK, anchor="ls")
    d.text((x + PAD, ry + 100), s["stat_label"], font=F(20, "Medium"), fill=SUB, anchor="ls")
    week_strip(d, x + w - PAD - STRIP_W, ry + 20, STRIP_W)
    return y + h


def tools_card(im, d, x, y, w, tools):
    """Same surface, same height budget as a claim card - the last two frames
    are about named tools, which is the one case the kit allows a logo at all."""
    h = PAD + len(tools) * 132 + PAD - 24
    d.rounded_rectangle([x, y, x + w, y + h], radius=28, fill=LIGHT)
    for i, (logo, name, line) in enumerate(tools):
        ty = y + PAD + i * 132
        p = f"{LOGOS}/{logo}.png"
        if os.path.exists(p):
            im.alpha_composite(Image.open(p).convert("RGBA").resize((84, 84), Image.LANCZOS),
                               (x + PAD, ty))
        d.text((x + PAD + 116, ty + 36), name, font=F(38, "Bold"), fill=INK, anchor="ls")
        for j, ln in enumerate(wrap(line, F(23, "Regular"), w - PAD * 2 - 116)[:2]):
            d.text((x + PAD + 116, ty + 72 + j * 30), ln, font=F(23, "Regular"),
                   fill=SUB, anchor="ls")
        if i + 1 < len(tools):
            d.line([(x + PAD, ty + 108), (x + w - PAD, ty + 108)], fill=RULE, width=2)
    return y + h


def plate(im, src, k, top):
    """Full strength on a dark plate. Being BELOW the card is what makes the
    canvas secondary here; a first version blended it to 42 percent and it read
    as a failed render rather than as evidence."""
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [LEFT, top, LEFT + w, top + h]
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(*PLATE_EDGE, 255), width=1)
    im.alpha_composite(ov)
    return box[3]


def head(s):
    return f"{s['n']}. {s['title']}" if s.get("n") else s["title"]


def solve(slides):
    """One title size, one claim size, one canvas scale, one card top - across
    the SET. At 0.6s a frame anything that moves reads as a rendering fault.

    The claim size is the largest at which every claim sets to the SAME number
    of lines, so the card is the same height on every frame. Sizing for `fits`
    rather than `same shape` gives cards of three different heights and a canvas
    that jumps with them."""
    tsz = next((t for t in range(TITLE_MAX, TITLE_MIN - 1, -1)
                if all(len(wrap(head(s), F(t, "Bold"), MEASURE, TITLE_TRACK * t)) == 1
                       for s in slides)), TITLE_MIN)
    claims = [s for s in slides if "claim" in s]
    csz, clines = CLAIM_MIN, 0
    for c in range(CLAIM_MAX, CLAIM_MIN - 1, -1):
        n = {len(wrap(s["claim"], F(c, "Bold"), MEASURE - PAD * 2)) for s in claims}
        if len(n) == 1:
            csz, clines = c, n.pop()
            break

    card_h = PAD + clines * round(csz * CLAIM_LEAD) + 30 + STAT_H + PAD - 20
    title_h = int(tsz * .727) + int(tsz * .24)
    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides if s.get("workflow"))
    k = MEASURE / 818
    block = title_h + TITLE_GAP + card_h + CARD_GAP + round(tall * k)
    if block > SAFE_BOT - SAFE_TOP:
        k = (SAFE_BOT - SAFE_TOP - (block - round(tall * k))) / tall
        block = title_h + TITLE_GAP + card_h + CARD_GAP + round(tall * k)
    # ONE BLOCK, centred in the safe box, with a FIXED gap between the card and
    # the canvas. Floating the canvas in the leftover band instead put 190px of
    # nothing between them and another 143 underneath - two holes rather than
    # one margin. Centred as a unit the slack goes outside the content, top and
    # bottom, where it reads as air.
    y0 = SAFE_TOP + (SAFE_BOT - SAFE_TOP - block) // 2
    return dict(tsz=tsz, csz=csz, clines=clines, card_h=card_h, block=block,
                y0=y0, top=y0 + title_h + TITLE_GAP,
                art_top=y0 + title_h + TITLE_GAP + card_h + CARD_GAP, k=k)


def build(s, L):
    im = ground()
    d = ImageDraw.Draw(im)
    tsz = L["tsz"]

    y = L["y0"] + int(tsz * .727)
    x = LEFT
    if s.get("n"):
        x = draw_tracked(d, (x, y), f"{s['n']}.", F(tsz, "Bold"), NUM, TITLE_TRACK * tsz)
        x += F(tsz, "Bold").getlength(" ")
    draw_tracked(d, (x, y), s["title"], F(tsz, "Bold"), LIGHT, TITLE_TRACK * tsz)

    if "claim" in s:
        claim_card(im, d, LEFT, L["top"], MEASURE, s, L["csz"])
    else:
        tools_card(im, d, LEFT, L["top"], MEASURE, s["tools"])

    bottom = plate(im, source(f"{WF}/{s['workflow']}"), L["k"], L["art_top"])
    return im, dict(bottom=bottom)


def build_closer(c):
    im = ground() if "ground" in globals() else grain(
        Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    y = SB.draw_closer(ImageDraw.Draw(im), c, RIGHT - LEFT, SAFE_TOP, SAFE_BOT,
                       CLOSER_INK, CLOSER_DIM)
    return im, dict(bottom=y)


SLIDES = [
    dict(n="1", title="Sales Agent", workflow="2-1.png",
         stat="100%", stat_label="of leads answered",
         claim="Replies to every lead instantly with the sales data attached"),

    dict(n="2", title="Lead Generation AI", workflow="3.png",
         stat="0h", stat_label="of manual research",
         claim="Drops your product data straight into the conversation"),

    dict(n="3", title="Calendar and Ads Spy", workflow="5.png",
         stat="24/7", stat_label="booking window",
         claim="Books and reschedules without anyone lifting a finger"),

    dict(n="4", title="CRM Agent", workflow="6.png",
         stat="100%", stat_label="of records in sync",
         claim="Creates and updates every lead inside the CRM you use"),

    dict(title="Tools", workflow="7.png",
         tools=[("n8n", "n8n", "Every workflow in this set runs entirely on it"),
                ("airtable", "Airtable", "The table each agent reads from and writes back to")]),

    dict(title="Integrations", workflow="573712346.png",
         tools=[("openai", "OpenAI", "The model behind every agent node"),
                ("make", "Make", "For the pipes that are quicker assembled than coded")]),
]

# THE CTA IS ALWAYS COMMENT. Five short rows, every one of them able to be set
# large - the previous copy carried "and I will send you", nineteen characters
# that capped the whole stack's size and said nothing. The number is a NUMERAL:
# at 0.6s a figure is read and a word is parsed.
#
# Sizes are RELATIVE. fit_closer scales them until the widest line hits the
# measure or the stack fills the safe box, whichever binds first, so the copy can
# change without anyone re-picking numbers.
CLOSER = [("comment", "Medium", 0.42),
          ("“AI”", "ExtraBold", 1.00),
          ("and get", "Medium", 0.40),
          ("all 6 builds", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/stats"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    print(f"  title {L['tsz']}  claim {L['csz']} x{L['clines']}  card {L['card_h']}  "
          f"canvas at {L['k']:.3f}x\n")
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {(s.get('title','closer') if isinstance(s, dict) else 'closer'):22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (18, 18, 18))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

#!/usr/bin/env python3
"""The stat-and-claim deck - 1080x1920 reel frames, dark.

Sixth family. A numbered title, then a ROW of two cards - a small dark tile
carrying one number, and a light card carrying the claim in heavy type - and the
workflow underneath, dimmed so it reads as evidence rather than as the subject.

That inversion is the idea. On every other deck the canvas is the point and the
words caption it. Here the claim is the point and the canvas is the receipt, so
the canvas is knocked back and the type is the brightest thing on the frame.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the
horizontal safe box is 60..950 and nothing crosses it.

Two departures from the reference, which said structure was loose:

  THE SWIPE ARROW IS GONE. The reference ends every frame with a circular arrow.
  Section 1 of the design kit bans arrows suggesting a swipe outright, and in a
  reel it is worse than banned, it is wrong - there is nothing to swipe, the
  frames advance on their own. It was the only element on the frame that was
  instructing rather than saying something.

  The last two frames drop the stat tile. Their subject is named tools, so the
  claim card becomes two tool cards - which is also the one case where the kit
  allows a logo at all: when the subject genuinely IS the tool.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_spec = importlib.util.spec_from_file_location(
    "slide_body", os.path.join(os.path.dirname(os.path.abspath(__file__)), "slide-body.py"))
SB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SB)
F, adv, wrap, draw_tracked, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 60, 950
MEASURE = 890

BG = (11, 11, 12)
TILE = (23, 23, 25)
TILE_EDGE = (44, 44, 47)
LIGHT = (255, 255, 255)
INK = (17, 17, 18)
NUM = (128, 128, 132)
DIM = (150, 150, 154)
BAR = (238, 224, 224)
BAR_HOT = (246, 176, 176)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 66, 44, -0.028
CLAIM_MAX, CLAIM_MIN = 38, 28
TITLE_GAP, ROW_GAP = 46, 40
ROW_H, TILE_W, CARD_GAP = 306, 224, 22
STRIP_W, STRIP_H = 250, 104        # the week strip's own footprint
PLATE_R = 22

WF = os.environ.get("WORKFLOWS", "../another no name workflow")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(5).normal(0, 1.8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def stat_tile(d, x, y, s):
    """Dark tile, one number. The label is above and small, the number is the
    only thing on it with any weight - a tile carrying two equal-weight facts
    carries neither."""
    d.rounded_rectangle([x, y, x + TILE_W, y + ROW_H], radius=22, fill=TILE,
                        outline=TILE_EDGE, width=1)
    d.rounded_rectangle([x + 26, y + 26, x + 26 + 76, y + 26 + 76], radius=20, fill=LIGHT)
    d.ellipse([x + 48, y + 48, x + 84, y + 84], outline=(52, 116, 240), width=6)
    d.ellipse([x + 58, y + 58, x + 74, y + 74], fill=(52, 116, 240))
    d.text((x + 26, y + ROW_H - 62), s["stat_label"], font=F(20, "Medium"),
           fill=DIM, anchor="ls")
    d.text((x + 26, y + ROW_H - 24), s["stat"], font=F(40, "Bold"), fill=LIGHT, anchor="ls")


def week_strip(d, x, y, w, hot=4):
    """Five faint columns with the last one lit. Not a chart - it is a texture
    that says `every weekday`, and labelling it as data it does not have would
    be the chart equivalent of inventing a number."""
    cw, gap = (w - 4 * 10) // 5, 10
    for i in range(5):
        cx = x + i * (cw + gap)
        d.rounded_rectangle([cx, y, cx + cw, y + 68], radius=8,
                            fill=BAR_HOT if i == hot else BAR)
        d.text((cx + cw // 2, y + 92), ["Mon", "Tue", "Wed", "Thu", "Fri"][i],
               font=F(15, "Medium"), fill=(150, 146, 142), anchor="ms")


def claim_card(d, x, y, w, text, sz):
    """Text in the upper band, week strip pinned to the bottom right, and the
    two never share vertical space. The first version drew the strip at a fixed
    offset from the card bottom and let the text run as long as it liked, so a
    four-line claim printed straight through it."""
    d.rounded_rectangle([x, y, x + w, y + ROW_H], radius=22, fill=LIGHT)
    yy = y + 40 + int(sz * .727)
    for line in wrap(text, F(sz, "Bold"), w - 56):
        d.text((x + 28, yy), line, font=F(sz, "Bold"), fill=INK, anchor="ls")
        yy += round(sz * 1.18)
    week_strip(d, x + w - 28 - STRIP_W, y + ROW_H - STRIP_H - 22, STRIP_W)


def tool_card(im, d, x, y, w, h, logo, name, line):
    d.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=LIGHT)
    p = f"{LOGOS}/{logo}.png"
    if os.path.exists(p):
        im.alpha_composite(Image.open(p).convert("RGBA").resize((72, 72), Image.LANCZOS),
                           (x + 28, y + (h - 72) // 2))
    d.text((x + 124, y + h // 2 - 8), name, font=F(30, "Bold"), fill=INK, anchor="ls")
    for i, ln in enumerate(wrap(line, F(21, "Regular"), w - 160)[:2]):
        d.text((x + 124, y + h // 2 + 26 + i * 28), ln, font=F(21, "Regular"),
               fill=(122, 120, 118), anchor="ls")


def plate(im, src, k, top):
    """Knocked back to about a third. The canvas is the receipt on this deck,
    not the subject, and at full strength it out-shouts the claim card above it."""
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    faded = Image.blend(Image.new("RGBA", (w, h), (*TILE, 255)), src, 0.42)
    box = [LEFT, top, LEFT + w, top + h]
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(faded, (box[0], box[1]), mask)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(*TILE_EDGE, 255), width=1)
    im.alpha_composite(ov)
    return box[3]


def solve(slides):
    """One title size, one claim size, one canvas scale, across the SET."""
    def head(s):
        return f"{s['n']}. {s['title']}" if s.get("n") else s["title"]
    tsz = next((t for t in range(TITLE_MAX, TITLE_MIN - 1, -1)
                if all(len(wrap(head(s), F(t, "Bold"), MEASURE, TITLE_TRACK * t)) == 1
                       for s in slides)), TITLE_MIN)
    cards = [s for s in slides if "claim" in s]
    csz = next((c for c in range(CLAIM_MAX, CLAIM_MIN - 1, -1)
                if len({len(wrap(s["claim"], F(c, "Bold"), MEASURE - TILE_W - CARD_GAP - 56))
                        for s in cards}) == 1), CLAIM_MIN)
    fixed = int(tsz * .727) + int(tsz * .24) + TITLE_GAP + ROW_H + ROW_GAP
    band = SAFE_BOT - SAFE_TOP - fixed
    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides if s.get("workflow"))
    k = min(MEASURE / 818, band / tall)
    return dict(tsz=tsz, csz=csz, k=k, fixed=fixed, band=band,
                art_top=SAFE_TOP + fixed)


def build(s, L):
    im = ground()
    d = ImageDraw.Draw(im)
    tsz = L["tsz"]

    y = SAFE_TOP + int(tsz * .727)
    x = LEFT
    if s.get("n"):
        x = draw_tracked(d, (x, y), f"{s['n']}.", F(tsz, "Bold"), NUM, TITLE_TRACK * tsz)
        x += F(tsz, "Bold").getlength(" ")
    draw_tracked(d, (x, y), s["title"], F(tsz, "Bold"), LIGHT, TITLE_TRACK * tsz)
    y += int(tsz * .24) + TITLE_GAP

    if "claim" in s:
        stat_tile(d, LEFT, y, s)
        claim_card(d, LEFT + TILE_W + CARD_GAP, y,
                   MEASURE - TILE_W - CARD_GAP, s["claim"], L["csz"])
    else:
        h = (ROW_H - 18) // 2
        for i, (logo, name, line) in enumerate(s["tools"]):
            tool_card(im, d, LEFT, y + i * (h + 18), MEASURE, h, logo, name, line)
    y += ROW_H + ROW_GAP

    bottom = y
    if s.get("workflow"):
        src = source(f"{WF}/{s['workflow']}")
        h = round(src.height * L["k"])
        bottom = plate(im, src, L["k"], y + (L["band"] - h) // 2)
    return im, dict(bottom=bottom)


def build_closer(c):
    im = ground()
    d = ImageDraw.Draw(im)
    rows, pitches = c["stack"], c["pitch"]
    block = sum(pitches) + int(rows[-1][1] * .727)
    y = (SAFE_TOP + SAFE_BOT - block) // 2 + int(rows[0][1] * .727)
    cx = (LEFT + RIGHT) // 2
    for i, (t, sz, w) in enumerate(rows):
        d.text((cx, y), t, font=F(sz, w), fill=LIGHT if w != "Regular" else DIM, anchor="ms")
        if i < len(pitches):
            y += pitches[i]
    return im, dict(bottom=y)


# The reference's copy, sentence case rather than its Title Case On Every Word -
# the kit bans uppercase labels and title case on a running sentence is the same
# fault at half strength, and at 0.6s it slows the read for nothing.
SLIDES = [
    dict(n="1", title="Sales Agent", workflow="2-1.png",
         stat_label="Automated", stat="100%",
         claim="Replies to every lead instantly with the sales data attached"),

    dict(n="2", title="Lead Generation AI", workflow="3.png",
         stat_label="Manual work", stat="0h",
         claim="Drops your product data straight into the conversation"),

    dict(n="3", title="Calendar and Ads Spy", workflow="5.png",
         stat_label="Bookings", stat="24/7",
         claim="Books and reschedules without anyone lifting a finger"),

    dict(n="4", title="CRM Agent", workflow="6.png",
         stat_label="Leads synced", stat="100%",
         claim="Creates and updates every lead inside the CRM you use"),

    dict(title="Tools", workflow="7.png",
         tools=[("n8n", "n8n", "Every workflow in this set runs entirely on it"),
                ("airtable", "Airtable", "The table each agent reads from and writes back to")]),

    dict(title="Integrations", workflow="573712346.png",
         tools=[("openai", "OpenAI", "The model behind the agent nodes"),
                ("make", "Make", "Where a pipe is easier built than coded")]),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = dict(stack=[("comment", 68, "Regular"),
                     ("“AI”", 86, "Bold"),
                     ("and I will send you", 60, "Regular"),
                     ("ALL SIX", 86, "ExtraBold"),
                     ("100% FREE", 46, "SemiBold")],
              pitch=[100, 98, 106, 92])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/stats"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    print(f"  title {L['tsz']}  claim {L['csz']}  canvas at {L['k']:.3f}x\n")
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if "stack" in s else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {s.get('title', 'closer'):22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (18, 18, 18))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

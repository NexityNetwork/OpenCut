#!/usr/bin/env python3
"""The Sales System deck - 1080x1920 carousel frames on paper.

Eleventh family, and the sibling of the Frontend deck: same paper, same numbered
title in the accent over a hairline, same one-line description under it. Five
steps in order, then the close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

NO CTA PILL. The reference puts `comment W for my sales system` on all five body
frames. It goes on the close and nowhere else.

TWO THINGS IN THE REFERENCE ARE NOT COPIED.

  ITS NUMBERING IS BROKEN. Frames one and two are both `01`, then it jumps to
  `03`. Set here as 01 to 05.

  ITS LAST FRAME IS A PHOTOGRAPH OF A REAL PERSON beside a Stripe notification
  saying he paid ten thousand dollars, from his address. That is a fabricated
  payment record attributed to a named individual and it is not going on a
  frame. The notification stays, because the point of the frame is that money
  lands; it just says `from a new client` and nobody's face is on it.

THE TOOL BRANDS ARE SWAPPED, which was allowed for. The reference names four
products this account does not have marks for. The pairs here do the same job
with tools that are actually in the stack: contact data and a clean list on the
verify frame, email and SMS on the outreach frame.
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
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 62, -0.028
SUB_SZ, SUB_LEAD = 36, 1.42
GAP = 64
PLATE_R = 22

WF_B = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=22, blur=28, alpha=52, drop=16):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 12, box[1] + drop, box[2] - 12, box[3] + drop], radius=r,
        fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh]
    shadow(im, box)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def logo_row(im, names, y, sz=74, gp=30):
    tiles = [f"{LOGOS}/{n}.png" for n in names]
    tiles = [t for t in tiles if os.path.exists(t)]
    x = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
    for t in tiles:
        im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz), Image.LANCZOS),
                           (x, y))
        x += sz + gp
    return y + sz


def head(d, n, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n:02d}."
    fb = F(TITLE_SZ, "Bold")
    tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), title, fb, T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def build(i, s):
    """THE CONTENT BAND IS FIXED. Title pinned, then a TWO LINE band reserved
    for the description whether it uses both or not, then the band. On the first
    pass frame 1's one-line description started its canvas 51px above everyone
    else's cards, and five frames whose content all begins at a different height
    is not five variations, it is five slides from different decks."""
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, i, s["title"])
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    top = SAFE_TOP + int(TITLE_SZ * .727) + int(TITLE_SZ * .24) + 24 + GAP \
        + 2 * round(SUB_SZ * SUB_LEAD) + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "art":
        # The workflow, then what came OUT of it. A canvas alone says `a system
        # exists`; the rows underneath say it produced these.
        src = source(f"{WF_B}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        ph = s.get("panel_h", 0)
        stack = ah + ((GAP - 16) + ph if ph else 0)
        if s.get("chat"):
            stack += (GAP - 16) + BL.chat(d, LEFT, 0, MEASURE, T, s["chat"],
                                          measure_only=True)
        yy = top + max(0, (band - stack) // 2)
        yy = plate(im, src, yy)
        if ph:
            yy = BL.list_panel(im, d, LEFT, yy + GAP - 16, MEASURE, ph, T,
                               *s["panel"], logos=LOGOS)
        if s.get("chat"):
            yy = BL.chat(d, LEFT, yy + GAP - 16, MEASURE, T, s["chat"])
        return im, dict(bottom=yy)

    if kind == "panel":
        ph = s["panel_h"]
        lr = 96 + GAP if s.get("logos") else 0
        yy = top + max(0, (band - ph - lr) // 2)
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=s.get("panel_rz", 31))
        if s.get("logos"):
            yy = logo_row(im, s["logos"], yy + GAP, sz=96, gp=36)
        return im, dict(bottom=yy)

    if kind == "seq":
        yy = BL.seq(im, d, LEFT, top, MEASURE, band, T, s["stops"], logos=LOGOS)
        return im, dict(bottom=yy)

    ph, note_h = s["panel_h"], 300
    yy = top + max(0, (band - ph - GAP - note_h) // 2)
    yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"], logos=LOGOS)
    yy = BL.notify(im, d, LEFT, yy + GAP, MEASURE, T, *s["notify"],
                   h=note_h, logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy

SLIDES = [
    # The canvas, then three of the leads it pulled - with the platform each one
    # came off. The reference hangs the platform icons in a bare row; here they
    # are the source column of the output.
    dict(title="Finding Clients", kind="art",
         sub="Scrape potential leads using this automation.",
         art="my-first-n8n-workflow-v0-562n19bdcfpf1 2.png",
         panel_h=274,
         panel=("Scraped this week", "500+ leads", [
             ("google-maps", "Northlake Kitchens", "hello@northlake.com", None),
             ("instagram", "Ardent Fitness", "team@ardentfit.co", None),
             ("linkedin", "Boro Dental", "front@borodental.com", None)])),

    # The check ITSELF: four addresses in, one struck out. A list where
    # everything passes is decoration - the reject is the reason to look.
    dict(title="Verify Leads", kind="panel",
         sub="Verify scraped leads before outreach to have a higher rate.",
         panel_h=600, panel_rz=37,
         panel=("List check", "412 of 500 kept", [
             (None, "hello@northlake.com", "valid", "green"),
             (None, "team@ardentfit.co", "valid", "green"),
             (None, "front@borodental.com", "risky", "amber"),
             (None, "info@closeddown.net", "removed", "strike")]),
         logos=["apollo", "airtable"]),

    # The claim is the sentence AND the reply. A personalized message is proven
    # by what comes back.
    dict(title="Personalized DM", kind="art",
         sub="Studies their business and writes personalized messages.",
         art="Group 2147203619.png",
         chat=[("me", "You only take bookings by phone."),
               ("me", "We wire your DMs into the calendar."),
               ("them", "That is our bottleneck. Friday?")]),

    # The outreach system AS the week it runs, not the logos it runs on.
    dict(title="Outreach System", kind="seq",
         sub="Use these tools to build your outreach system that works 24/7.",
         stops=[("gmail", "Day 1", "Intro email", False),
                ("gmail", "Day 3", "Follow up", False),
                ("twilio", "Day 5", "SMS nudge", False),
                ("calendly", "Day 7", "Call booked", True)]),

    # The calls on the calendar, then the money landing. That order is the
    # frame's own copy.
    dict(title="Set Calls & Close", kind="close",
         sub="Set the sales calls with clients and generate revenue.",
         panel_h=360,
         panel=("Today", "3 calls", [
             (None, "10:00  Northlake Kitchens", "confirmed", "green"),
             (None, "13:30  Ardent Fitness", "confirmed", "green"),
             (None, "16:00  Boro Dental", "confirmed", "green")]),
         notify=("Stripe", "from a new client", "$10,000.00")),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("for my full", "Medium", 0.40),
          ("SALES SYSTEM", "ExtraBold", 0.54)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/sales"
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
        print(f"  {i:02d}  {name:20} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

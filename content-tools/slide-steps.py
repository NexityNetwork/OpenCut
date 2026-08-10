#!/usr/bin/env python3
"""The walkthrough deck - 1080x1920 reel frames, paper, one step per frame.

Fifth family. Title, blurb, then ONE OR TWO artworks stacked - which is the
whole structural difference from the others. A step in a walkthrough is often
two things next to each other (the code and the sheet it writes into, the run
and what it produced), and forcing that onto one image either crops it or
shrinks it to nothing.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame, a duration only a
video has. A reel is never cropped; the UI is drawn ON TOP, and the piece that
bites is the RIGHT RAIL at x > 950. Horizontal safe box is 60..950.

Three of the six steps here are NOT workflows - a node's input settings, a code
step wired into a sheet, and a results dashboard - so they come from panels.py,
drawn rather than screenshotted. See that file for why drawing them is the
honest option and not the lazy one.

ONE SCALE FOR THE WHOLE SET, and it is solved against the tallest STACK rather
than the tallest image. Two 553px panels stacked are 1130px of artwork where a
single 372px canvas is 372; sizing off the tallest single image puts the twin
stacks through the floor of the frame.
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
PN = _load("panels")
F, adv, wrap, draw_tracked, grain, source = (
    SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.grain, SB.source)

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 60, 950
M_TITLE, M_BLURB = 890, 720

GROUND = (253, 252, 250)
INK = (20, 19, 17)
BLURB = (112, 108, 102)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 82, 52, -0.032
BLURB_MAX, BLURB_MIN, BLURB_LEAD = 40, 32, 1.46
TITLE_GAP, BLURB_GAP, STACK_GAP = 40, 66, 26
PLATE_W, PLATE_R = 890, 22

WF = os.environ.get("WORKFLOWS", "../differnt types of workflows")


def art(name):
    """`panel:config` draws one; anything else is a file in the workflow folder.
    Both come back at 818 wide so a drawn panel and a real export land at the
    same scale on the plate and read as siblings."""
    if name.startswith("panel:"):
        return PN.PANELS[name.split(":", 1)[1]]()
    return source(f"{WF}/{name}")


def plate(im, src, k, top):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [LEFT, top, LEFT + w, top + h]

    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 22, box[1] + 30, box[2] - 22, box[3] + 10], radius=PLATE_R,
        fill=(78, 70, 58, 88))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    # Hairline on its own layer - ImageDraw on RGBA writes alpha rather than
    # blending it, so a translucent outline punches a hole through the page.
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(20, 19, 17, 32), width=1)
    im.alpha_composite(ov)
    return box[3]


def stack_h(s, k):
    ims = [art(a) for a in s["art"]]
    return sum(round(i.height * k) for i in ims) + STACK_GAP * (len(ims) - 1)


def shape(s, tsz, bsz):
    return (len(wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)),
            len(wrap(s["blurb"], F(bsz, "Regular"), M_BLURB)))


def solve(slides):
    """One title size, one blurb size, one artwork scale, one artwork top - all
    across the SET, because at 0.6s a frame anything that moves between frames
    reads as a rendering fault. The sizes are the largest at which the whole set
    holds ONE SHAPE, not merely the largest that fits."""
    tsz = next((t for t in range(TITLE_MAX, TITLE_MIN - 1, -1)
                if all(shape(s, t, BLURB_MAX)[0] == 1 for s in slides)), TITLE_MIN)
    bsz, blines = None, None
    for b in range(BLURB_MAX, BLURB_MIN - 1, -1):
        n = {shape(s, tsz, b)[1] for s in slides}
        if len(n) == 1:
            bsz, blines = b, n.pop()
            break
    if bsz is None:
        bsz, blines = BLURB_MIN, max(shape(s, tsz, BLURB_MIN)[1] for s in slides)

    fixed = (int(tsz * .727) + int(tsz * .24) + TITLE_GAP
             + blines * round(bsz * BLURB_LEAD) + BLURB_GAP)
    art_top = SAFE_TOP + fixed
    band = SAFE_BOT - art_top
    # Solved against the tallest STACK, not the tallest image: two 553px panels
    # stacked are 1130px of artwork where a single 372px canvas is 372.
    k = min(PLATE_W / 818, min(band / stack_h(s, 1.0) for s in slides))
    # The copy is pinned to the safe line and the ART BAND is fixed under it;
    # each stack CENTRES inside that band. Pinning every stack to the top of the
    # band instead left the one-artwork slides with 400px of hole underneath,
    # which is section 4's dead band. Centred, the slack splits and reads as
    # margin, and the title still does not move between frames.
    return dict(tsz=tsz, bsz=bsz, blines=blines, k=k, fixed=fixed,
                top=SAFE_TOP, art_top=art_top, band=band,
                uniform=len({shape(s, tsz, bsz) for s in slides}) == 1)


def build(s, L):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    d = ImageDraw.Draw(im)
    tsz, bsz = L["tsz"], L["bsz"]

    y = L["top"] + int(tsz * .727)
    draw_tracked(d, (LEFT, y), wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)[0],
                 F(tsz, "Bold"), INK, TITLE_TRACK * tsz)
    y += int(tsz * .24) + TITLE_GAP

    for line in wrap(s["blurb"], F(bsz, "Regular"), M_BLURB):
        d.text((LEFT, y), line, font=F(bsz, "Regular"), fill=BLURB, anchor="ls")
        y += round(bsz * BLURB_LEAD)
    y += BLURB_GAP

    y = L["art_top"] + (L["band"] - stack_h(s, L["k"])) // 2
    for i, a in enumerate(s["art"]):
        y = plate(im, art(a), L["k"], y) + (STACK_GAP if i + 1 < len(s["art"]) else 0)
    return im, dict(bottom=y)


def build_closer(c):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    d = ImageDraw.Draw(im)
    rows, pitches = c["stack"], c["pitch"]
    block = sum(pitches) + int(rows[-1][1] * .727)
    y = (SAFE_TOP + SAFE_BOT - block) // 2 + int(rows[0][1] * .727)
    cx = (LEFT + RIGHT) // 2
    for i, (t, sz, w) in enumerate(rows):
        d.text((cx, y), t, font=F(sz, w), fill=INK if w != "Regular" else BLURB, anchor="ms")
        if i < len(pitches):
            y += pitches[i]
    return im, dict(bottom=y)


# The reference's copy, word for word. `art` recycles canvases out of the twenty
# and pulls the three non-workflow steps from panels.py.
SLIDES = [
    dict(title="The AI Agent",
         blurb="The AI Agent will pre-fill the Google Maps Apify Scraper with "
               "your search query.",
         art=["Client Scraper.png"]),

    dict(title="Data Entry",
         blurb="Enter your search query to find your leads based on your "
               "preferred location and parameters.",
         art=["panel:config"]),

    dict(title="Processing",
         blurb="Data is processed and added to a Google Sheet for you to review "
               "and deploy.",
         art=["panel:code"]),

    dict(title="Lead Scoring",
         blurb="Agent sends HTTPS requests based on the generated queries to "
               "extract emails, social links and websites.",
         art=["Email Closer.png"]),

    dict(title="SDR",
         blurb="Agent does research and tells if the lead is an ideal customer "
               "then generates a personalized message.",
         art=["SM Research Bot.png", "panel:dashboard"]),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = dict(stack=[("comment", 68, "Regular"),
                     ("“AI”", 86, "Bold"),
                     ("to get ALL", 62, "Regular"),
                     ("MY SETUPS", 86, "ExtraBold"),
                     ("100% FREE", 48, "SemiBold")],
              pitch=[100, 98, 106, 94])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/steps"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape down to {BLURB_MIN}px - "
              f"rewrite the odd one out.")
    print(f"  title {L['tsz']}  blurb {L['bsz']} x{L['blines']}  art at {L['k']:.3f}x\n")

    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if "stack" in s else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {s.get('title', 'closer'):16} {len(s.get('art', [])) or '-'} art  "
              f"ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

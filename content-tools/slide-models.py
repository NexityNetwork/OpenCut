#!/usr/bin/env python3
"""The Business Models deck - 1080x1920 carousel frames on paper.

Tenth family. Five models you can sell, an operations frame, then the close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

NO CTA LINE UNDER THE PICTURE. The reference repeats `comment CEO and I'll show
you how` on all seven frames. It goes on the close and nowhere else.

NOTHING MOVES BETWEEN FRAMES. Not the title, not the subtitle, not the tick
list, and not the picture - the surface is drawn at one fixed size on every
frame, so the whole deck is one composition with the words swapped. That is only
possible because the picture is DRAWN. Five screenshots of different heights can
never do it.

THE PICTURE IS THE SOFTWARE YOU WOULD SELL FOR THAT MODEL. The reference hangs a
different stock UI mockup off each frame - a project tracker, a kanban, a truck
configurator - and not one of them has anything to do with the model named above
it. Same object, six sets of true words, in blocks.py as MODEL_OS.

TWO FRAMES OF THE REFERENCE ARE THE SAME FRAME. Its sixth and seventh slides
carry identical copy - `Ensures systems run smoothly as you scale` and the same
three bullets - under two different titles, one of which is a repeat of slide
five's. That is a mistake in the source, not a frame, so it is set once here.
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
SF = _load("surfaces")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(24, 26, 32), dim=(24, 26, 32), meta=(128, 130, 138),
         rule=(214, 212, 205), accent=(24, 26, 32))

# Solved across the SET, not per frame. 54 is the largest at which the longest
# title, AI CHAT & SUPPORT SYSTEMS, still sets on one line at this measure; 34
# is the largest at which every subtitle does. The tick list is capped at 40 and
# its long lines wrap - the alternative was 31px, which is a footnote.
TITLE_SZ, TITLE_TRACK = 54, -0.020
SUB_SZ = 34
BULLET_CAP, BULLET_LEAD = 40, 1.32
LIST_BAND = 288
PAD_H, PAD_IN = 648, 24


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)

    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    y += int(TITLE_SZ * .24) + 48

    d.text((LEFT, y + int(SUB_SZ * .727)), s["sub"], font=F(SUB_SZ, "Medium"),
           fill=T["ink"], anchor="ls")
    y += int(SUB_SZ * 1.20) + 44

    BL.checks(d, LEFT, y, MEASURE, LIST_BAND, T, s["bullets"],
              cap=BULLET_CAP, lead=BULLET_LEAD, col=T["ink"], bold=(2,))
    y += LIST_BAND + 44

    # The surface sits on a tinted pad, the reference's own move - the
    # screenshot never touches the paper directly.
    surf = SF.SURFACES[s["surf"]]()
    pad = SF.PADS[s["surf"]]
    yy = y + max(0, (SAFE_BOT - y - PAD_H) // 2)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [LEFT + 10, yy + 16, LEFT + MEASURE - 10, yy + PAD_H + 16],
        radius=24, fill=(0, 0, 0, 52))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + PAD_H], radius=24,
                        fill=pad)
    im.alpha_composite(surf, (LEFT + (MEASURE - surf.width) // 2, yy + PAD_IN))
    return im, dict(bottom=yy + PAD_H)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed. The bullet that carries the money is the third one on every
# frame, which is the reference's own order and the right one - the price lands
# after the reason, not before it.

SLIDES = [
    dict(title="AI AUTOMATION BUSINESS", sub="You remove boring work from real businesses.",
         bullets=["Replace manual tasks with AI systems",
                  "You sell time once, they get leverage forever",
                  "Retainers scale to $3K-$10K/month per client"],
         surf=0),

    dict(title="AI MARKETING OPERATIONS", sub="You make growth less random.",
         bullets=["Run ads, content, and email using AI systems",
                  "Brands pay to stop guessing what works",
                  "E-com brands pay $1K-$8K/month"],
         surf=1),

    dict(title="AI CHAT & SUPPORT SYSTEMS", sub="You replace people where speed matters.",
         bullets=["Install AI bots for support, sales, lead qualification",
                  "After setup, you're mostly out of the loop",
                  "Charge $500-$2K per bot"],
         surf=2),

    dict(title="AI CONTENT MACHINES", sub="You turn content into a machine.",
         bullets=["Build content engines (blogs, posts, scripts, SEO)",
                  "Output goes up without working more",
                  "Charge $50-$200+ per piece"],
         surf=3),

    dict(title="AI SOFTWARE COMPANY",
         sub="You stop selling services and start owning products.",
         bullets=["Launch pre-dev software instead of building from 0",
                  "Test demand first, scale only what works",
                  "Potential: $10K/month+ recurring"],
         surf=4),

    dict(title="OPERATIONS DASHBOARD", sub="Ensures systems run smoothly as you scale.",
         bullets=["Monitor automations and workflows",
                  "Identify bottlenecks and failures",
                  "Track operational load across products"],
         surf=5),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.40),
          ("“CEO”", "ExtraBold", 1.00),
          ("and I will", "Medium", 0.38),
          ("SHOW YOU HOW", "ExtraBold", 0.52)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/models"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {name:26} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

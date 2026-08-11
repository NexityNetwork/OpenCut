#!/usr/bin/env python3
"""The Five Agents deck - 1080x1920 carousel frames on paper, dark canvases.

Ninth family. Five agents, one frame each, then the close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

NO CTA PILL. The reference carries `comment 5 to get all my agents` on every
single body frame and it is not going on any of these. None of the eight decks
built here has one, the close already asks for the comment, and a pill repeated
five times is five chances to read it and ignore it.

THE COPY IS THE REFERENCE'S, WORD FOR WORD. Two claims per agent: what it does,
then what it cost to have a person do it. That second line is the whole post -
`replaced 2K a month` is the reason anybody stops scrolling - so it is set at
the same size as the first, never smaller.

One repair: the reference reads `190 post per day`. That is a typo, not copy,
and it is set here as `posts`.

THE GEOMETRY IS SOLVED ACROSS THE SET, NOT PER FRAME. One title size that fits
the longest title, one body size at which all TEN paragraphs are exactly two
lines, so the title, both paragraphs and every baseline land on the same pixel
on all five frames. At half a second a frame the only thing that may change is
the words and the picture. Anything else moving reads as a glitch.
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
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)

# Slate rather than black, which is the reference's own colour and the right one
# on paper. NO GREY BODY TEXT - the emphasised runs are BOLD and the same slate.
# A dimmed line at half a second reads as switched off.
T = dict(ink=(28, 36, 50), dim=(28, 36, 50), rule=(212, 210, 203))

TITLE_SZ, TITLE_TRACK = 88, -0.028
# 52 is not a taste call. It is the largest size at which every one of the ten
# paragraphs in this deck sets to exactly two lines on an 820 measure - one line
# short and the block jumps up a frame, one line long and it jumps down.
BODY_SZ, BODY_LEAD = 52, 1.42
GAP, PARA, HEAD = 64, 56, 92
PLATE_R = 22

WF = os.environ.get("WORKFLOWS", "../another no name workflow")
WF_B = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")


def wf_path(name):
    return f"{WF_B}/{name[2:]}" if name.startswith("b:") else f"{WF}/{name}"


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def plate(im, src, top, w=MEASURE):
    """A dark canvas on paper. It gets a drop and NO outline - the screenshot is
    almost black, so a hairline round it would be a light line drawn on a dark
    edge, which is a halo rather than a border. Two pixels come off first
    because Figma stamps a 1px rule on every export."""
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh]
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [box[0] + 12, box[1] + 16, box[2] - 12, box[3] + 16], radius=PLATE_R,
        fill=(0, 0, 0, 58))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def para(d, y, s):
    for ln in SB.rich_lines(s, BODY_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, BODY_SZ, T["ink"], T["ink"])
        y += round(BODY_SZ * BODY_LEAD)
    return y


def build(s):
    """Everything above the canvas is PINNED. The canvas is centred in what is
    left, so each frame is balanced on its own and the type never moves - the
    five workflow exports are 375 to 557 tall and no arrangement can hold both
    of that picture's edges still as well."""
    im = ground()
    d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    y += int(TITLE_SZ * .24) + HEAD
    y = para(d, y, s["does"]) + PARA
    y = para(d, y, s["cost"])

    src = source(wf_path(s["art"]))
    ah = round(src.height * MEASURE / (src.width - 4))
    return im, dict(bottom=plate(im, src, y + max(GAP, (SAFE_BOT - y - ah) // 2)))


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed. The canvases are recycled off the twenty and each one is the
# workflow that actually does the job on its frame, not a picture of a workflow:
# the lead scraper really is the Google Places scrape into email extraction, the
# social one really is the four-step content factory that publishes to the
# feeds. A canvas chosen for density alone is a stock photo with nodes in it.

SLIDES = [
    dict(title="Lead Scraper",
         does="Scrapes **500+ qualified leads** weekly.",
         cost="Replaced **$2K/month** agency or employees.",
         art="b:my-first-n8n-workflow-v0-562n19bdcfpf1 2.png"),

    dict(title="Sales Agent",
         does="**Books meetings 24/7** with a killer funnel.",
         cost="Eliminated **2 SDRs at $8K/month** or external workforce.",
         art="b:Group 2147203619.png"),

    dict(title="Social Media Agent",
         does="We post **190 posts per day** on Instagram, Youtube and TikTok.",
         cost="Replaced **$3K/month** manager and a lot of scheduling tools.",
         art="b:Group 2147203103.png"),

    dict(title="Cold Email Agent",
         does="**2500+** personalized emails daily with **1.8% response rate**.",
         cost="Eliminated **$1.5K/month** agency or **$2K/month** employee.",
         art="b:Group 2147203101.png"),

    dict(title="Support Agent",
         does="**200+ inquiries daily** from all our software products.",
         cost="Replaced **3 reps at $7.5K/month** and a lot of management issues.",
         art="b:Group 2147203619-1.png"),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“5”", "ExtraBold", 1.00),
          ("to get ALL", "Medium", 0.40),
          ("MY AGENTS", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/five"
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
        print(f"  {i:02d}  {name:20} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

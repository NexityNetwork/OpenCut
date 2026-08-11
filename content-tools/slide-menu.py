#!/usr/bin/env python3
"""The Agent Menu deck - 1080x1920 carousel frames on paper.

Twenty-second family. The reference crams four sections of bullets on every
frame; per instruction this deck strips it to what survives half a second:
a numbered title, ONE line of what the agent does, the recycled canvas, and
a pinned two-row register - who it sells to, what it charges. Five agents,
five of the light canvases off the twenty, then the close.
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
FOOT_H = 210
WF_C = os.environ.get("WORKFLOWS_C", "../differnt types of workflows")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=PLATE_R, blur=26, alpha=48, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh_ = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh_), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh_]
    shadow(im, box)
    mask = Image.new("L", (sw, sh_), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1],
                                           radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def head(d, n, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n}."
    fb = F(TITLE_SZ, "Bold")
    tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), title, fb,
                 T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def foot(d, sells, price):
    """Two pinned rows: who buys it, what it charges. The reference's four
    bullet sections compressed to the two answers anybody actually wants."""
    y0 = SAFE_BOT - FOOT_H
    d.line([(LEFT, y0), (RIGHT, y0)], fill=T["rule"], width=1)
    d.text((LEFT, y0 + 66), "Sells to", font=F(32, "Regular"), fill=T["ink"],
           anchor="ls")
    d.text((RIGHT, y0 + 66), sells, font=F(32, "SemiBold"), fill=T["ink"],
           anchor="rs")
    y1 = y0 + 105
    d.line([(LEFT, y1), (RIGHT, y1)], fill=T["rule"], width=1)
    d.text((LEFT, y1 + 66), "Pricing", font=F(32, "Regular"), fill=T["ink"],
           anchor="ls")
    d.text((RIGHT, y1 + 66), price, font=F(32, "Bold"), fill=T["ink"],
           anchor="rs")
    return y0


def build(i, s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, i, s["title"])
    for ln in SB.rich_lines(s["does"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    bot = foot(d, s["sells"], s["price"])
    src = source(f"{WF_C}/{s['art']}")
    ah = round(src.height * MEASURE / (src.width - 4))
    yy = y + max(GAP, (bot - GAP - y - ah) // 2)
    yy = plate(im, src, yy)
    return im, dict(bottom=SAFE_BOT)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# The reference's five agents, each compressed to one line of what it does
# plus the two footer answers. Canvases recycled off the twenty - the light
# set, one per agent.

SLIDES = [
    dict(title="AI Voice Call Agent",
         does="Books appointments, answers the FAQs and chases no-shows. "
              "**Ten calls at a time, 24/7.**",
         sells="Real estate, clinics, law firms, SaaS",
         price="$2,000-$5,000 setup  ·  $500-$2,000/mo",
         art="Appointment Setter.png"),

    dict(title="Lead Generation Agent",
         does="**50 to 1,000 personalized emails a day** - researched, "
              "scraped, qualified, followed up.",
         sells="Agencies, law firms, SaaS, B2B",
         price="$1,500-$4,000 setup  ·  $1,000-$3,000/mo",
         art="Client Scraper.png"),

    dict(title="AI Appointment Setter",
         does="Qualifies inbound DMs and **books the ones worth your "
              "closer's time.**",
         sells="Coaches, agencies, influencers, lawyers",
         price="$1,000-$3,000 setup  ·  $500-$1,500/mo",
         art="Email Closer.png"),

    dict(title="AI Clone Generator",
         does="Finds the topic, writes the script, renders your "
              "**talking-head video** and posts it.",
         sells="Personal brands, online influencers",
         price="$2,000-$6,000 setup  ·  $500-$2,000/mo",
         art="Content Engine.png"),

    dict(title="AI UGC Video Generator",
         does="**One product image in, a batch of influencer-style ads "
              "out.** Sora plus n8n.",
         sells="E-commerce, DTC brands",
         price="$1,000-$3,000 setup  ·  $1,000-$5,000/mo",
         art="SM Research Bot.png"),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“AGENTS”", "ExtraBold", 1.00),
          ("for all five", "Medium", 0.40),
          ("BUILDS", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/menu"
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
        print(f"  {i:02d}  {name:24} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

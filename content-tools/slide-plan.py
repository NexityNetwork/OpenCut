#!/usr/bin/env python3
"""The Custom Plan deck - 1080x1920 carousel frames on paper.

Nineteenth family, the business-models deck's sibling by instruction: same
vibe, new copy, and each frame carries a logo row under its surface - this
variant's own move. Six systems, each with a drawn product surface from
surfaces.py on its tinted pad, then the close.

COPY IS THE REFERENCE'S, transcribed. THE CTA IS ALWAYS COMMENT - the
reference repeats `comment 30 for a custom plan` on every frame and it goes
on the close only.
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

TITLE_SZ, TITLE_TRACK = 54, -0.020
SUB_SZ = 34
LIST_BAND = 252
PAD_H, PAD_IN = 600, 24
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def logo_row(im, names, y, sz=56, gp=26):
    tiles = [f"{LOGOS}/{n}.png" for n in names]
    tiles = [t for t in tiles if os.path.exists(t)]
    x = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
    d = ImageDraw.Draw(im)
    for t in tiles:
        BL.logo_tile(im, d, x, y, sz, os.path.basename(t)[:-4],
                     dict(rule=(214, 212, 205)), LOGOS)
        x += sz + gp
    return y + sz


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
              cap=38, lead=1.30, col=T["ink"])
    y += LIST_BAND + 44

    surf = SF.SURFACES[s["surf"]]()
    surf = surf.resize((700, 550), Image.LANCZOS)
    pad = SF.PADS[s["surf"]]
    block = PAD_H + 24 + 56
    yy = y + max(0, (SAFE_BOT - y - block) // 2)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [LEFT + 10, yy + 16, LEFT + MEASURE - 10, yy + PAD_H + 16],
        radius=24, fill=(0, 0, 0, 52))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + PAD_H], radius=24,
                        fill=pad)
    im.alpha_composite(surf, (LEFT + (MEASURE - surf.width) // 2, yy + PAD_IN + 1))
    yy = logo_row(im, s["logos"], yy + PAD_H + 24)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed from the reference.

SLIDES = [
    dict(title="CENTRAL HUB", sub="Your business at a glance, anywhere you are.",
         bullets=["Monitor active products and their performance",
                  "Track revenue trajectory and customer engagement",
                  "Spot opportunities that deserve your attention"],
         surf=5, logos=["claude", "n8n", "notion", "hubspot", "stripe", "gmail"]),

    dict(title="MONEY CENTRAL",
         sub="Follow the money as it moves through your funnel.",
         bullets=["Watch daily conversions happen in real time",
                  "Benchmark each product against the others",
                  "Discover which offers actually drive income"],
         surf=1, logos=["claude", "n8n", "stripe", "gmail", "hubspot"]),

    dict(title="CONTENT ENGINE",
         sub="See what's working before you waste budget.",
         bullets=["Measure content reach and engagement rates",
                  "Analyze conversion paths from click to customer",
                  "Find the messaging that generates real demand"],
         surf=3, logos=["n8n", "perplexity", "instagram", "linkedin",
                        "tiktok", "x"]),

    dict(title="SALES AGENT", sub="Stay profitable without surprises.",
         bullets=["Compare income against operating expenses",
                  "Watch margins and liquidity in real time",
                  "Predict problems before they become crises"],
         surf=2, logos=["n8n", "hubspot", "claude", "google-maps", "calendly"]),

    dict(title="MANAGEMENT & OPS",
         sub="Scale without breaking what already works.",
         bullets=["Track performance and completion rates",
                  "Catch errors before customers notice",
                  "Measure system capacity across all products"],
         surf=4, logos=["claude", "n8n", "notion", "slack", "calendly"]),

    dict(title="SUPPORT & RETENTION", sub="Know what your users actually think.",
         bullets=["Monitor ticket volume and resolution speed",
                  "Spot patterns in recurring complaints",
                  "Track satisfaction scores and churn signals"],
         surf=6, logos=["openai", "gmail", "hubspot", "telegram"]),
]

# THE CTA IS ALWAYS COMMENT. The reference's own line.
CLOSER = [("comment", "Medium", 0.42),
          ("“30”", "ExtraBold", 1.00),
          ("for a", "Medium", 0.40),
          ("CUSTOM PLAN", "ExtraBold", 0.58)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/plan"
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
        print(f"  {i:02d}  {name:22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 236
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

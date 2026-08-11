#!/usr/bin/env python3
"""The Blueprint deck - 1080x1920 carousel frames on paper.

Eighteenth family. The reference's five-frame dealmaker funnel reframed to
ultron, per instruction, with its dark cover not built. One REAL screenshot
per frame, matching the reference's own format: the resources library, the
Lead Qualifier, stripe.com for the model frame, and the stack as labels
beside real marks.

COPY IS THE REFERENCE'S with the standing swaps: dealmaker.world becomes
51ultron.com, `DEPLOY IT to Replit or Lovable` becomes deploy on ultron, and
the CHOSE typo is set as CHOOSE. No CTA pill on body frames - the reference
repeats `comment W` on every frame and it goes on the close only.
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
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 54, -0.020
SUB_SZ, SUB_LEAD = 36, 1.42
GAP = 64
PLATE_R = 22
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")


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


def plate(im, src_path, top, w=MEASURE, crop=None):
    src = Image.open(f"{SHOTS}/{src_path}").convert("RGB")
    if crop:
        src = src.crop(crop)
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


def head(d, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), title, F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, s["title"])
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    y += 44
    if s.get("ticks"):
        BL.checks(d, LEFT, y, MEASURE, 216, T, s["ticks"],
                  cap=38, lead=1.28, col=T["ink"])
        y += 216
    top = y + GAP
    band = SAFE_BOT - top

    if s.get("shot"):
        c = s.get("crop")
        w0, h0 = (c[2] - c[0], c[3] - c[1]) if c else Image.open(
            f"{SHOTS}/{s['shot']}").size
        ph = round(h0 * MEASURE / w0)
        yy = top + max(0, (band - ph) // 2)
        yy = plate(im, s["shot"], yy, crop=c)
    else:
        yy = BL.stack(im, d, LEFT, top, MEASURE, band, T, s["rows"],
                      logos=LOGOS, tile=80)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed; dealmaker swapped for ultron, CHOSE set as CHOOSE.

SLIDES = [
    dict(title="START WITH A CLEAR GOAL",
         sub="Most founders **waste months** building products "
             "**nobody wants.**",
         ticks=["Go to 51ultron.com",
                "Grab ready-made templates and tools",
                "Launch the same day, not 6 months later"],
         shot="step1.png", crop=(0, 0, 2400, 1800)),

    dict(title="VALIDATE FIRST",
         sub="Use the existing products to **test the market** and let your "
             "customers tell you what they want.",
         ticks=["Pick one product that can GO VIRAL quickly",
                "DEPLOY IT on ultron",
                "Focus on FINDING CUSTOMERS, not coding"],
         shot="step2.png", crop=(0, 0, 2400, 1800)),

    dict(title="CHOOSE A WINNING MODEL",
         sub="**Start with a subscription model** and you can move to "
             "service once you know the market.",
         ticks=["One-time: $19-$197 (easy sale, no churn)",
                "Monthly SaaS: $19-$97 (recurring revenue)",
                "Service + Product: $500-$3K (high LTV)"],
         shot="step4.png", crop=(0, 0, 2400, 1800)),

    dict(title="PICK YOUR TOOL STACK",
         sub="To avoid extra costs, **ALWAYS keep your stack lean** and "
             "you can scale it later.",
         rows=[("Brain", ["claude"]),
               ("Products", ["ultron"]),
               ("Automation", ["n8n", "make"]),
               ("Clients", ["instagram", "google-maps", "tiktok", "linkedin"]),
               ("Payments", ["stripe"]),
               ("Sales", ["calendly", "hubspot"])]),
]

# THE CTA IS ALWAYS COMMENT. The reference's own close.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("to get my", "Medium", 0.40),
          ("BLUEPRINT", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/blueprint"
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

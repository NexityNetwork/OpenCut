#!/usr/bin/env python3
"""The CEO In 24h deck - 1080x1920 carousel frames on paper.

Sixteenth family. The reference's five-step funnel with its first two steps -
which sold the old template product - replaced by ultron, per instruction.
Steps 3, 4 and 5 keep their jobs: landing page, payments, go viral.

FRAMES 01 AND 02 ARE BUILT FROM THE SITE'S OWN HOOK CARDS, opened and
transcribed: the six staffed seats behind `get 20 hours a week back`, and the
lead grading behind `your next 10 buyers already on your calendar` - with the
site's own example names on the panel.

WE CALL THESE CAROUSELS. 1080x1920 on the reel safe box, 0.5-0.8s a frame.
NO CTA PILL on body frames - the reference repeats `comment W to become a CEO
in 24h` on every frame and it goes on the close only.
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
ST = _load("slide-thirty")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

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
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=22, blur=26, alpha=48, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src_path, top, w=MEASURE, crop=None):
    """A REAL capture on a plate. The reference's format is one screenshot per
    frame, and a deck that spent an hour capturing the product and then shipped
    empty chips instead deserved exactly the reaction it got."""
    SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")
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
                                           radius=22, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def head(d, n, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n:02d}."
    fb = F(TITLE_SZ, "Bold")
    tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), title, fb,
                 T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def build(i, s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, i, s["title"])
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    top = y + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "shot":
        w0, h0 = Image.open(f"{os.environ.get('ULTRON_SHOTS', 'ultron-shots')}/"
                            f"{s['shot']}").size
        if s.get("crop"):
            c = s["crop"]; w0, h0 = c[2] - c[0], c[3] - c[1]
        ph = round(h0 * MEASURE / w0)
        yy = top + max(0, (band - ph) // 2)
        yy = plate(im, s["shot"], yy, crop=s.get("crop"))
    elif kind == "panel":
        ph = s["panel_h"]
        yy = top + max(0, (band - ph) // 2)
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=s.get("panel_rz", 33),
                           foot=s.get("panel_foot"))
    elif kind == "browser":
        bh = min(band - 24, 760)
        yy = ST.browser(im, d, LEFT, top + max(0, (band - bh) // 2), MEASURE, T,
                        *s["page"], h=bh)
    elif kind == "money":
        nh, gp = 210, 40
        stack = nh * 3 + gp * 2
        yy = top + max(0, (band - stack) // 2)
        for app, line, amount, when in s["payments"]:
            yy = BL.notify(im, d, LEFT, yy, MEASURE, T, app, line, amount,
                           h=nh, logos=LOGOS, when=when) + gp
        yy -= gp
    else:
        ah = len(s["alerts"]) * 150 + (len(s["alerts"]) - 1) * 26
        yy = top + max(0, (band - ah) // 2)
        yy = BL.alerts(im, d, LEFT, yy, MEASURE, T, s["alerts"], logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Frames 01-02 from 51ultron.com's own hook cards, opened and transcribed.
# Frames 03-05 keep the reference's steps.

SLIDES = [
    dict(title="Don't Reinvent The Wheel", kind="shot",
         sub="Go to **app.51ultron.com/resources** - high-converting "
             "templates and free tools that **help you scale faster.**",
         shot="step1.png", crop=(0, 0, 2300, 2100)),

    dict(title="Buyers On Your Calendar", kind="shot",
         sub="Grab the **Lead Qualifier.** Every name graded before it "
             "hears from you - **your next 10 buyers, queued.**",
         shot="step2.png", crop=(0, 0, 2300, 2100)),

    dict(title="Skip The Setup Months", kind="shot",
         sub="**Working templates** in Crescendo - get to market faster "
             "with **powerful building blocks.**",
         shot="step3.png", crop=(0, 0, 2300, 2100)),

    dict(title="Connect Payments", kind="shot",
         sub="**Connect Stripe** so people can pay the moment "
             "demand shows up.",
         shot="step4.png", crop=(0, 0, 2300, 2100)),

    dict(title="Go Viral On Short-Form", kind="shot",
         sub="Create an **Instagram and TikTok** account and post "
             "short-form to **test demand.**",
         shot="win-brand-visibility.png", crop=(0, 0, 1512, 1251)),
]

# THE CTA IS ALWAYS COMMENT. The reference's own close.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("and become a", "Medium", 0.40),
          ("CEO IN 24H", "ExtraBold", 0.60)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/ceo"
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

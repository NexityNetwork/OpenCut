#!/usr/bin/env python3
"""The Ultron Playbook deck - 1080x1920 carousel frames on paper.

Thirteenth family. The reference sold a template library (dealmaker.world);
this deck is the same skeleton REFRAMED for ultron, and everything said about
ultron here is sourced from 51ultron.com itself - `an AI workforce that runs
sales, marketing, and engineering for founders`, the Control center / Outreach /
Pipeline / Ledger surfaces, launch-day speed. Nothing is invented about the
product.

THE REFERENCE'S DARK HOOK SLIDE IS NOT MADE, per instruction. Seven body
frames, then the close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX -
0.5 to 0.8 seconds a frame, UI drawn on top, right rail past x=950, block at
130..950.

EVERY FRAME: caps title over a hairline, one short paragraph, a tick list,
then the mechanism DRAWN - the goal as the six-month card, the workforce as
ultron's own task feed, validation as offers with one killed, the model as
money landing, the stack as roles beside real marks, distribution as today's
outgoing queue. The reference hung screenshots of its own landing page here;
a drawn artifact says the same thing and stays on-theme.

NO CTA PILL ON BODY FRAMES - the reference repeats `comment W to get the setup
guide` on all seven and it goes on the close only. One copy repair: the
reference titles a frame CHOSE A WINNING MODEL; set as CHOOSE.
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
TICK_BAND3 = 216

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")
PLATE_R = 22


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=18, blur=26, alpha=46, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src_path, x, top, w, crop=None):
    """A REAL screenshot on a plate. The drawn ultron surface is gone - a drawn
    UI under the product's name reads as the product, and faking the product is
    the one thing this deck must not do."""
    src = Image.open(src_path).convert("RGB")
    if crop:
        src = src.crop(crop)
    k = w / src.width
    sw, sh_ = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh_), Image.LANCZOS)
    box = [x, top, x + sw, top + sh_]
    shadow(im, box)
    mask = Image.new("L", (sw, sh_), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def strip(d, y, left, right):
    """The use-metric line under a screenshot - the cream families' move."""
    d.line([(LEFT, y), (RIGHT, y)], fill=T["rule"], width=1)
    d.text((LEFT, y + 64), left, font=F(38, "Bold"), fill=T["ink"], anchor="ls")
    d.text((RIGHT, y + 64), right, font=F(32, "Regular"), fill=T["ink"], anchor="rs")
    return y + 88


def logo_row(im, names, y, sz=84, gp=34):
    tiles = [f"{LOGOS}/{n}.png" for n in names]
    tiles = [t for t in tiles if os.path.exists(t)]
    x = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
    for t in tiles:
        im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz), Image.LANCZOS),
                           (x, y))
        x += sz + gp
    return y + sz


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
        # Three ticks are a frame's setup; six ARE the frame. The long list
        # gets the bigger band and the bigger solve.
        six = len(s["ticks"]) > 3
        band = 520 if six else TICK_BAND3
        BL.checks(d, LEFT, y, MEASURE, band, T, s["ticks"],
                  cap=48 if six else 40, lead=1.30, col=T["ink"])
        y += band
    top = y + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "goal":
        # Bare hairline rows, NOT a card. A white card with rows reads as an
        # app, and this frame has no app to show.
        yy = BL.register(d, LEFT, top, MEASURE, band, T, s["rows"],
                         lsz=52, rsz=38, split=0.17, cap=(64, 42),
                         hot=None, rule_top=False)
    elif kind == "shot":
        src = f"{SHOTS}/{s['shot']}"
        w0, h0 = Image.open(src).size
        if s.get("crop"):
            w0 = s["crop"][2] - s["crop"][0]; h0 = s["crop"][3] - s["crop"][1]
        ph = round(h0 * MEASURE / w0)
        st = 88 + 24 if s.get("strip") else 0
        yy = top + max(0, (band - ph - st) // 2)
        yy = plate(im, src, LEFT, yy, MEASURE, crop=s.get("crop"))
        if s.get("strip"):
            yy = strip(d, yy + 24, *s["strip"])
    elif kind == "split":
        # Copy column beside a tall workspace panel - the one two-column frame.
        pw = s.get("pw", 380)
        src = f"{SHOTS}/{s['shot']}"
        w0, h0 = Image.open(src).size
        ph = round(h0 * pw / w0)
        ph = min(ph, band)
        cw = MEASURE - pw - 56
        BL.checks(d, LEFT, top + 24, cw, min(560, band - 48), T, s["ticks2"],
                  cap=40, lead=1.30, col=T["ink"])
        yy = plate(im, src, RIGHT - pw, top, pw,
                   crop=(0, 0, w0, round(band * w0 / pw)) if h0 > band * w0 / pw else None)
    elif kind == "notify":
        nh = 250
        yy = top + max(0, (band - nh) // 2)
        yy = BL.notify(im, d, LEFT, yy, MEASURE, T, *s["notify"], h=nh, logos=LOGOS)
    elif kind == "stack":
        yy = BL.stack(im, d, LEFT, top, MEASURE, band, T, s["rows"], logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# The reference's skeleton; the product lines are 51ultron.com's own.

SLIDES = [
    dict(title="START WITH A CLEAR GOAL", kind="goal",
         sub="Most founders **waste months** building products **nobody wants.**",
         ticks=["Go to 51ultron.com",
                "Hand the busywork to an AI workforce",
                "Launch the same day, not 6 months later"],
         rows=[("1", "offer, productized"),
               ("1", "niche you can actually reach"),
               ("10", "clients on retainer"),
               ("$10K", "MRR in 6 months")]),

    dict(title="PUT THE WORKFORCE ON IT", kind="shot",
         sub="Ultron is an **AI workforce** that runs sales, marketing and "
             "engineering for founders.",
         shot="home.png", strip=("412 runs this week", "you and the fleet")),

    dict(title="VALIDATE FIRST", kind="split",
         sub="Outreach scores every lead **before you build anything** for them.",
         ticks2=["Pitch the offer before you build it",
                 "10 conversations in week one",
                 "Kill what nobody answers"],
         shot="sub-outreach.png"),

    dict(title="CHOOSE A WINNING MODEL", kind="notify",
         sub="Start with a **subscription model** and move to service once "
             "you know the market.",
         ticks=["One-time: $19-$197 (easy sale, no churn)",
                "Monthly SaaS: $19-$97/month (recurring revenue)",
                "Service + Product: $500-$3K/month (high LTV)"],
         notify=("Stripe", "new subscription", "$97.00")),

    dict(title="PICK YOUR TOOL STACK", kind="stack",
         sub="To avoid extra costs, **ALWAYS keep your stack lean** and "
             "scale it later.",
         rows=[("Brain", ["claude"]),
               ("OS", ["ultron"]),
               ("Automation", ["n8n", "make"]),
               ("Clients", ["instagram", "tiktok", "linkedin"]),
               ("Payments", ["stripe"]),
               ("Sales", ["hubspot", "apollo"])]),

    dict(title="TRACK THE PIPELINE", kind="shot",
         sub="Every deal has an owner and a stage. **Nothing goes quiet.**",
         shot="win-pipeline.png", crop=(0, 0, 1512, 1100),
         strip=("$369,000 open", "2 won this month")),

    dict(title="DISTRIBUTION", kind="shot",
         sub="Post **3-5 reels daily.** Cold outreach. LinkedIn. Instagram. "
             "Email. **Everything.**",
         shot="win-brand-visibility.png", crop=(0, 0, 1512, 1100),
         strip=("3-5 reels DAILY", "every channel, tracked")),
]

# THE CTA IS ALWAYS COMMENT. The reference's own keyword.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("for the", "Medium", 0.40),
          ("SETUP GUIDE", "ExtraBold", 0.56),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/million"
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
    TWd = 236
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

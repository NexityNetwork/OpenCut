#!/usr/bin/env python3
"""The 30-Day Client deck - 1080x1920 carousel frames on paper.

Fourteenth family. Four steps to pick the work, then four steps to ship it,
then the close. The reference's dark cover is not made, per instruction.

THE COPY IS THE REFERENCE'S with two kinds of swap, both instructed or
precedented:

  THE JOKES ARE SWAPPED. `Single guys looking for a GF`, `Jerking off` and
  `Auto-swiping on dating apps` were a bit that did not land; each is replaced
  with a real item of the same shape.

  THE OLD PRODUCT IS SWAPPED FOR ULTRON. Frames 01-03 of the reference's
  second half sell dealmaker.world and Framer; this deck points at
  51ultron.com and shows REAL captures of it - the demo dashboard, the
  Techniques library, the control center. Nothing drawn pretending to be the
  product.

  THE LAST FRAME'S ELON MUSK PHOTO AND elonmusk@tesla.com PAYMENT ARE NOT
  COPIED - a fabricated payment record attributed to a real person. The
  notification stays, from `a new client`.

WE CALL THESE CAROUSELS. 1080x1920 on the reel safe box, 0.5-0.8s a frame,
UI drawn on top, right rail past x=950, block at 130..950. NO CTA PILL on
body frames - the reference repeats `comment W` on every frame and it goes on
the close only.
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

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")
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
    if isinstance(src, str):
        src = Image.open(src).convert("RGB")
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
    top = SAFE_TOP + int(TITLE_SZ * .727) + int(TITLE_SZ * .24) + 24 + GAP \
        + 2 * round(SUB_SZ * SUB_LEAD) + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "ticks":
        BL.checks(d, LEFT, top, MEASURE, band - 24, T, s["ticks"],
                  cap=46, lead=1.28, col=T["ink"])
        yy = SAFE_BOT
    elif kind == "ticks_art":
        src = source(f"{WF_C}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        th = band - ah - GAP
        BL.checks(d, LEFT, top, MEASURE, th, T, s["ticks"],
                  cap=40, lead=1.26, col=T["ink"])
        yy = plate(im, src.convert("RGB"), top + th + GAP)
    elif kind == "shot":
        src = f"{SHOTS}/{s['shot']}"
        w0, h0 = Image.open(src).size
        if s.get("crop"):
            c = s["crop"]
            w0, h0 = c[2] - c[0], c[3] - c[1]
        ph = round(h0 * MEASURE / w0)
        yy = top + max(0, (band - ph) // 2)
        img = Image.open(src).convert("RGB")
        if s.get("crop"):
            img = img.crop(s["crop"])
        yy = plate(im, img, yy)
    else:
        nh = 280
        yy = top + max(0, (band - nh) // 2)
        yy = BL.notify(im, d, LEFT, yy, MEASURE, T, *s["notify"], h=nh,
                       logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy

SLIDES = [
    dict(title="One Customer", kind="ticks",
         sub="Pick **ONE CUSTOMER.** Stop saying "
             "**“everyone is my customer”.**",
         ticks=["Local businesses", "Digital agencies", "Software companies",
                "E-commerce brands", "Real estate companies",
                "Coaches and consultants"]),

    dict(title="One Painful Problem", kind="ticks",
         sub="Pick **ONE PAINFUL PROBLEM.** Stop trying to solve "
             "everything at once.",
         ticks=["Leads not replying", "Content taking too long", "No-shows",
                "Manual follow-ups", "Customer retention",
                "Quotes going out late"]),

    # Build ONE AI workflow - so the frame carries one, recycled off the
    # twenty canvases.
    dict(title="One AI Workflow", kind="ticks_art",
         sub="Build **ONE AI WORKFLOW.** You are selling the **result**, "
             "not the tech.",
         ticks=["Automate first", "Speed up the process",
                "Improve consistency", "Reduce workload",
                "24/7 support and nurturing"],
         art="Appointment Setter.png"),

    dict(title="Sell It Before Ready", kind="ticks",
         sub="Sell it **BEFORE you feel READY.** This is where most "
             "people freeze.",
         ticks=["You don't need more time", "Action creates clarity",
                "People don't buy perfection", "They buy relief",
                "Stop building, start polishing"]),

    dict(title="Start On Ultron", kind="shot",
         sub="Go to **51ultron.com** and put the workforce on it instead "
             "of building from scratch.",
         shot="home.png"),

    dict(title="Grab A Playbook", kind="shot",
         sub="**Working templates** that skip you straight past the "
             "setup months.",
         shot="win-techniques.png", crop=(0, 0, 1512, 1000)),

    dict(title="Ship The Landing Page", kind="shot",
         sub="Explain the offer and **capture interest.** Ultron builds "
             "and deploys it.",
         shot="win-control-center.png", crop=(0, 0, 1512, 1000)),

    dict(title="Connect Payments", kind="notify",
         sub="**Connect Stripe** and start **SELLING** who your ideal "
             "clients become working with you.",
         notify=("Stripe", "from a new client", "$8,500.00")),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("Comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.36),
          ("a FREE GUIDE", "ExtraBold", 0.54)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/thirty"
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
    TWd = 224
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

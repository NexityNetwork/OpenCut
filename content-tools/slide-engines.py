#!/usr/bin/env python3
"""The AI Engines deck - 1080x1920 carousel frames on paper.

Twentieth family, last of the dashboard variants: six niche systems, the
reference's copy transcribed, each frame carrying a drawn product surface on
its tinted pad and a row of brand tiles - per instruction. The reference
repeats `comment OS and I'll send them to you` on every frame; it goes on
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
SUB_SZ, SUB_LEAD = 34, 1.40
LIST_BAND = 216
PAD_H, PAD_IN = 560, 22
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def logo_row(im, names, y, sz=52, gp=24):
    d = ImageDraw.Draw(im)
    names = [n for n in names if os.path.exists(f"{LOGOS}/{n}.png")]
    x = W // 2 - (len(names) * sz + (len(names) - 1) * gp) // 2
    for n in names:
        BL.logo_tile(im, d, x, y, sz, n, dict(rule=(214, 212, 205)), LOGOS)
        x += sz + gp
    return y + sz


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    y += int(TITLE_SZ * .24) + 44
    for ln in BL.wrap(s["sub"], F(SUB_SZ, "Medium"), MEASURE):
        d.text((LEFT, y + int(SUB_SZ * .727)), ln, font=F(SUB_SZ, "Medium"),
               fill=T["ink"], anchor="ls")
        y += round(SUB_SZ * SUB_LEAD)
    y += 36
    BL.checks(d, LEFT, y, MEASURE, LIST_BAND, T, s["bullets"],
              cap=36, lead=1.28, col=T["ink"])
    y += LIST_BAND + 36

    surf = SF.SURFACES[s["surf"]]().resize((656, 516), Image.LANCZOS)
    pad = SF.PADS[s["surf"]]
    block = PAD_H + 20 + 52
    yy = y + max(0, (SAFE_BOT - y - block) // 2)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [LEFT + 10, yy + 14, LEFT + MEASURE - 10, yy + PAD_H + 14],
        radius=24, fill=(0, 0, 0, 52))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + PAD_H], radius=24,
                        fill=pad)
    im.alpha_composite(surf, (LEFT + (MEASURE - surf.width) // 2, yy + PAD_IN))
    yy = logo_row(im, s["logos"], yy + PAD_H + 20)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed from the reference.

SLIDES = [
    dict(title="AI COMPLIANCE ENGINE",
         sub="Turn compliance from a cost center into a revenue engine "
             "for your clients.",
         bullets=["Automated consent ledger management",
                  "Real-time opt-out processing across channels",
                  "Evidence pack generation for audits"],
         surf=6, logos=["gmail", "telegram", "slack", "notion"]),

    dict(title="AI RECRUITMENT PIPELINE",
         sub="Replace 80% of recruiter busy-work while avoiding bias and "
             "maintaining fairness controls.",
         bullets=["CV parsing and structured candidate profiles",
                  "Automated screening question generation",
                  "Interview scheduling with calendar sync"],
         surf=0, logos=["slack", "gmail", "google-sheets", "make", "calendly"]),

    dict(title="AI PROCUREMENT SYSTEM",
         sub="Prevent stockouts and overstocks by automating the reorder "
             "decision flow with human approval gates.",
         bullets=["Demand forecasting from sales velocity",
                  "Supplier price sheet monitoring",
                  "PO draft generation with approval routing"],
         surf=2, logos=["slack", "google-sheets", "gmail", "hubspot", "make"]),

    dict(title="AI UPSELL ENGINE",
         sub="Monetize the 48-hour post-purchase attention window with "
             "personalized add-on and bundle offers.",
         bullets=["Next-best offer modeling from purchase history",
                  "Personalized message generation",
                  "Conversion tracking per cohort"],
         surf=1, logos=["tiktok", "instagram", "x", "linkedin", "make", "gmail"]),

    dict(title="AI COLLECTION ENGINE",
         sub="Turn accounts receivable into a predictable cash flow machine "
             "without burning customer relationships.",
         bullets=["Invoice aging threshold triggers",
                  "Reminder generation with payment links",
                  "High-value overdue alerts to account owners"],
         surf=5, logos=["stripe", "make", "gmail", "telegram", "slack"]),

    dict(title="AI TRACKING ENGINE",
         sub="Turn company docs into a continuous improvement system by "
             "tracking what employees ask.",
         bullets=["RAG query logging with confidence scores",
                  "Weekly question clustering",
                  "“SOP updates needed” report generation"],
         surf=4, logos=["slack", "notion", "make", "gmail"]),
]

# THE CTA IS ALWAYS COMMENT. The reference's own line.
CLOSER = [("comment", "Medium", 0.42),
          ("“OS”", "ExtraBold", 1.00),
          ("and I will", "Medium", 0.40),
          ("SEND THEM TO YOU", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/engines"
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
        print(f"  {i:02d}  {name:24} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 236
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

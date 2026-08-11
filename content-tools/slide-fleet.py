#!/usr/bin/env python3
"""The Agent Blueprint deck - 1080x1920 carousel frames on paper.

Twenty-first family. The reference's five agent frames with its two slop
frames redesigned per instruction: the CLAUDE CODE pixel-brick art becomes
the actual pair that does the job - Claude and ultron as tool tiles - and
the pentagon-orb architecture diagram becomes the five agents on the ruled
register, names bold, jobs beside them.

Frames 1-3 keep the reference's structure: ticks with the money bold, then
the artifact - a real recycled n8n canvas for research, the Opsline
leaderboard surface for outreach, and the CRM-update chat with its tool row
for sales. THE CTA IS ALWAYS COMMENT; the reference repeats `comment W` on
every frame and it goes on the close only.
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
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 58, -0.024
SUB_SZ = 34
LIST_BAND = 216
PLATE_R = 22
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
WF = os.environ.get("WORKFLOWS", "../another no name workflow")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=PLATE_R, blur=26, alpha=50, drop=14):
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


def logo_row(im, names, y, sz=72, gp=30):
    d = ImageDraw.Draw(im)
    names = [n for n in names if os.path.exists(f"{LOGOS}/{n}.png")]
    x = W // 2 - (len(names) * sz + (len(names) - 1) * gp) // 2
    for n in names:
        BL.logo_tile(im, d, x, y, sz, n, dict(rule=T["rule"]), LOGOS)
        x += sz + gp
    return y + sz


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    y = ry + 52
    for ln in BL.wrap(s["sub"], F(SUB_SZ, "Medium"), MEASURE):
        d.text((LEFT, y + int(SUB_SZ * .727)), ln, font=F(SUB_SZ, "Medium"),
               fill=T["ink"], anchor="ls")
        y += round(SUB_SZ * 1.40)
    y += 36
    if s.get("ticks"):
        BL.checks(d, LEFT, y, MEASURE, LIST_BAND, T, s["ticks"],
                  cap=38, lead=1.28, col=T["ink"], bold=s.get("bold", ()))
        y += LIST_BAND + 36
    top = y + 28
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "art":
        src = source(f"{WF}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        yy = top + max(0, (band - ah) // 2)
        yy = plate(im, src, yy)
    elif kind == "pad":
        surf = SF.SURFACES[s["surf"]]().resize((656, 516), Image.LANCZOS)
        pad = SF.PADS[s["surf"]]
        ph = 560
        yy = top + max(0, (band - ph) // 2)
        shadow(im, [LEFT, yy, LEFT + MEASURE, yy + ph], r=24)
        d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + ph], radius=24,
                            fill=pad)
        im.alpha_composite(surf, (LEFT + (MEASURE - 656) // 2, yy + 22))
        yy += ph
    elif kind == "chat":
        ch = BL.chat(d, LEFT, 0, MEASURE, T, s["chat"], measure_only=True)
        stack = ch + 48 + 64
        yy = top + max(0, (band - stack) // 2)
        yy = BL.chat(d, LEFT, yy, MEASURE, T, s["chat"])
        yy = logo_row(im, s["logos"], yy + 48)
    elif kind == "pair":
        yy = top + max(0, (band - 300) // 2)
        yy = BL.tool_pair(im, d, LEFT, yy, MEASURE, T,
                          ("Claude", "claude", False), ("ultron", "ultron", True),
                          tile=190, logos=LOGOS)
    else:
        # No ticks above this frame, so the register owns the whole band -
        # but the band math above still added the tick reserve; recompute.
        yy = BL.register(d, LEFT, top, MEASURE, SAFE_BOT - top - 130, T, s["rows"],
                         lsz=46, rsz=36, split=0.34, cap=(56, 42),
                         hot=None, rule_top=True)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed. The two redesigned frames keep their copy; only the pictures
# changed.

SLIDES = [
    dict(title="Research & Intelligence", kind="art",
         sub="Monitor and research your customer daily.",
         ticks=["Deploy task systems that run continuously",
                "Build once, they get charged forever",
                "Clients pay $2K-$8K/month per setup"],
         bold=(2,), art="6.png"),

    dict(title="Outreach & Lead Gen", kind="pad",
         sub="You scale revenue without adding headcount.",
         ticks=["Campaigns, messaging, and prospecting",
                "Teams stop testing blindly",
                "Retainers run $800-$4K/month"],
         bold=(2,), surf=0),

    dict(title="Sales & Deal Tracking", kind="chat",
         sub="You handle volume where humans create delays.",
         ticks=["Manage inquiries, score leads, trigger follow-ups",
                "Once live, you're mostly hands-off",
                "Price at $400-$1.5K per deployment"],
         bold=(2,),
         chat=[("me", "Create a customer record for the Northlake lead."),
               ("them", "Done. C-1024 is in the CRM, assigned to Mara. "
                        "Welcome email queued for 10:00.")],
         logos=["claude", "n8n", "telegram", "google-drive", "notion"]),

    dict(title="Infrastructure", kind="pair",
         sub="You go from services to owning assets.",
         ticks=["Deploy software rather than coding from 0",
                "Test markets fast, double down on winners only",
                "Target: $10K/month+ recurring revenue"],
         bold=(2,)),

    dict(title="The 5-Agent Blueprint", kind="register",
         sub="What a fully automated founder-led business looks like.",
         rows=[("CORTEX", "Research & Intelligence"),
               ("SPECTER", "Outreach & Lead Gen"),
               ("STRIKER", "Sales & Deal Tracking"),
               ("PULSE", "Content & Social Media"),
               ("SENTINEL", "Infrastructure & Monitoring")]),
]

# THE CTA IS ALWAYS COMMENT. The reference's own close.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.36),
          ("A FREE BLUEPRINT", "ExtraBold", 0.48)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/fleet"
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
    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

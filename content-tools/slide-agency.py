#!/usr/bin/env python3
"""The Agency In 2026 deck - 1080x1920 carousel frames on paper.

Twenty-third family. Six steps, each with its OWN mechanism drawn, then the
close. The reference's cover is not built, per instruction.

The copy is the reference's, compressed to what survives half a second - its
frames run four paragraphs deep and a reel gives you one.
"""
import glob, importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw


def _load(n):
    s = importlib.util.spec_from_file_location(
        n.replace("-", "_"), os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{n}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB, BL, ST = _load("slide-body"), _load("blocks"), _load("slide-thirty")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))
TITLE_SZ, SUB_SZ, GAP = 56, 36, 64
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def head(d, n, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n}."
    fb = F(TITLE_SZ, "Bold"); tr = -0.024 * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    x0 = LEFT + adv(num, fb, tr) + TITLE_SZ * .30
    lines = BL.wrap(title, fb, MEASURE - (x0 - LEFT))
    draw_tracked(d, (x0, y), lines[0], fb, T["ink"], tr)
    for ln in lines[1:]:
        y += round(TITLE_SZ * 1.16)
        draw_tracked(d, (LEFT, y), ln, fb, T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def money_math(d, x, y, w, h, T):
    """The arithmetic, drawn. `You don't need 20 clients` struck out, then the
    equation that replaces it at display size."""
    f = F(58, "Regular")
    s = "20 clients a month"
    yy = y + max(84, (h - 660) // 2 + 84)
    d.text((x, yy), s, font=f, fill=T["meta"], anchor="ls")
    d.line([(x - 6, yy - 20), (x + f.getlength(s) + 8, yy - 20)],
           fill=T["meta"], width=5)
    yy += 190
    d.text((x, yy), "4", font=F(210, "Bold"), fill=T["accent"], anchor="ls")
    d.text((x + 160, yy - 66), "clients", font=F(54, "Bold"), fill=T["ink"], anchor="ls")
    d.text((x + 160, yy - 4), "at $2,500 a month", font=F(54, "Regular"),
           fill=T["ink"], anchor="ls")
    yy += 96
    d.line([(x, yy), (x + w, yy)], fill=T["rule"], width=3)
    yy += 150
    d.text((x, yy), "$10,000", font=F(150, "Bold"), fill=T["ink"], anchor="ls")
    d.text((x + w, yy), "a month", font=F(46, "Regular"), fill=T["ink"], anchor="rs")
    return yy + 40


def build(i, s):
    im = ground(); d = ImageDraw.Draw(im)
    y = head(d, i, s["title"])
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * 1.42)
    top = y + GAP; band = SAFE_BOT - top
    k = s["kind"]
    if k == "steps":
        yy = ST.steps_rows(d, LEFT, top, MEASURE, band, T, s["steps"])
    elif k == "chips":
        yy = ST.chips_grid(d, LEFT, top, MEASURE, band, T, s["chips"], s["hot"])
    elif k == "panel":
        ph = s["panel_h"]; yy = top + max(0, (band - ph) // 2)
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=s.get("rz", 33), foot=s.get("pfoot"))
    elif k == "chat":
        ch = BL.chat(d, LEFT, 0, MEASURE, T, s["chat"], sz=42, measure_only=True)
        rows = 3 * 116
        stack = ch + 56 + rows
        yy = top + max(0, (band - stack) // 2)
        yy = BL.chat(d, LEFT, yy, MEASURE, T, s["chat"], sz=42) + 56
        yy = BL.checks(d, LEFT, yy, MEASURE, rows, T, s["asks"], cap=54,
                       lead=1.28, col=T["ink"])
    else:
        yy = money_math(d, LEFT, top, MEASURE, band, T)
    return im, dict(bottom=min(yy, SAFE_BOT))


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


SLIDES = [
    dict(title="Pick an industry you already understand", kind="steps",
         sub="Chasing **high-ticket** industries you don't understand is the "
             "**biggest mistake beginners make.**",
         steps=[("Past work experience", "you already speak the language"),
                ("Friends or family in it", "the first call is a favour, not a pitch"),
                ("You know how money flows", "so you know what a fix is worth")]),

    dict(title="Identify ONE painful, expensive problem", kind="panel",
         sub="It costs them time daily, loses them money, and **bores the "
             "staff doing it.**",
         panel_h=650, rz=38,
         panel=("Problems worth fixing", "pick one", [
             (None, "DMs pile up, leads go cold", "daily", "amber"),
             (None, "Hours of outreach, 20 emails out", "daily", "amber"),
             (None, "No time to post anywhere", "weekly", None)]),
         pfoot=("If the problem hurts enough", "price becomes secondary")),

    dict(title="Master ONE service", kind="chips",
         sub="You do **not** need 10 tools and 8 services. Get dangerous "
             "at one.",
         chips=["AI Voice Agent", "Lead Gen Engine", "IG DM Setter",
                "AI Clone Agent", "UGC Ads Generator", "Booking Chatbot"],
         hot=1),

    dict(title="Get your first client without selling", kind="chat",
         sub="Land the first one through a **warm connection** and ask for "
             "proof instead of money.",
         chat=[("me", "Built something that clears your DM backlog. Want it "
                      "on your account for free?"),
               ("them", "Seriously? Yes. When can you start?")],
         asks=["A testimonial", "A case study", "A referral"]),

    dict(title="Post content to attract global clients", kind="panel",
         sub="This is how clients arrive **without a single cold email.**",
         panel_h=650, rz=38,
         panel=("This week's posts", "3 ideas that always work", [
             ("tiktok", "Sales call breakdown", "posted", "green"),
             ("instagram", "The agent I built this week", "posted", "green"),
             ("linkedin", "Agency behind the scenes", "queued", "amber")]),
         pfoot=("You show people why to trust you", "before they ever ask")),

    dict(title="Scale to $10k/month", kind="math",
         sub="You have testimonials, referrals and one clear service. "
             "**Now do the math.**"),
]

CLOSER = [("comment", "Medium", 0.42), ("“2026”", "ExtraBold", 1.00),
          ("for the full", "Medium", 0.40), ("AGENCY PLAN", "ExtraBold", 0.58)]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/agency"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"): os.remove(p)
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(i, s)
        im.convert("RGB").save(f"{out}/{i:02d}.png")
        nm = s["title"][:24] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {nm:26} ends {m['bottom']:4d}"
              f"{'  PAST' if m['bottom'] > SAFE_BOT else ''}")

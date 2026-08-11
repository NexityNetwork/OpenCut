#!/usr/bin/env python3
"""The Ultron Hooks deck - 1080x1920 carousel frames on paper.

Seventeenth family, and the first PURE BRAND deck: every line on it is
51ultron.com's own landing copy, transcribed - the hero, the OS line, the
four numbers, the six hook cards, the outcomes triplet, the integrations
line, the identity lines. Nothing written here, only set.

Statement frames carry the hooks at display size - the hook IS the frame.
The two hook triptychs borrow the site's own identity lines as their
headlines (`for the ones who can't slow down`, `for the ones who'd rather
bet on themselves`).

WE CALL THESE CAROUSELS. 1080x1920 on the reel safe box, 0.5-0.8s a frame.
No CTA pill on body frames; the close asks for the comment.
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
    src = Image.open(src_path).convert("RGB")
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


def head(d, title, sz=64):
    """The headline IS landing copy, so it may wrap - display type over the
    rule, then the sub."""
    y = SAFE_TOP + int(sz * .727)
    for ln in BL.wrap(title, F(sz, "Bold"), MEASURE):
        draw_tracked(d, (LEFT, y), ln, F(sz, "Bold"), T["ink"], -0.028 * sz)
        y += round(sz * 1.16)
    y -= round(sz * 1.16)
    ry = y + int(sz * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def sub_lines(d, y, s):
    for ln in SB.rich_lines(s, SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    return y


def hook_rows(d, x, y, w, h, T, hooks):
    """Three of the site's hook cards as display rows - the hook is the
    content, so it gets the size."""
    n = len(hooks)
    rh = h // n
    y0 = y
    for i, t in enumerate(hooks):
        lines = BL.wrap(t, F(50, "Bold"), w)
        bh = len(lines) * 62
        ty = y0 + i * rh + (rh - bh) // 2 + 50
        for ln in lines:
            d.text((x, ty), ln, font=F(50, "Bold"), fill=T["ink"], anchor="ls")
            ty += 62
        if i + 1 < n:
            d.line([(x, y0 + (i + 1) * rh), (x + w, y0 + (i + 1) * rh)],
                   fill=T["rule"], width=1)
    return y0 + rh * n


def bigstats(d, x, y, w, h, T, stats):
    """The four numbers, 2x2, at the size numbers this good deserve."""
    gap = 36
    cw, chh = (w - gap) // 2, (h - gap) // 2
    for i, (num, cap) in enumerate(stats):
        cx = x + (i % 2) * (cw + gap)
        cy = y + (i // 2) * (chh + gap)
        d.rounded_rectangle([cx, cy, cx + cw, cy + chh], radius=28,
                            fill=(255, 255, 255), outline=T["rule"], width=1)
        d.text((cx + 40, cy + int(chh * .47)), num, font=F(84, "Bold"),
               fill=T["ink"], anchor="ls")
        ty = cy + int(chh * .60) + 14
        for ln in BL.wrap(cap, F(28, "Regular"), cw - 80):
            d.text((cx + 40, ty + 22), ln, font=F(28, "Regular"),
                   fill=T["ink"], anchor="ls")
            ty += 38
    return y + h


def logo_grid(im, d, x, y, w, h, T, keys, cols=4, tile=118):
    n = len(keys)
    rows = (n + cols - 1) // cols
    gx = (w - cols * tile) // (cols - 1)
    gy = 44
    total = rows * tile + (rows - 1) * gy
    y += max(0, (h - total) // 2)
    for i, k in enumerate(keys):
        tx = x + (i % cols) * (tile + gx)
        ty = y + (i // cols) * (tile + gy)
        BL.logo_tile(im, d, tx, ty, tile, k, T, LOGOS)
    return y + total


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, s["title"], sz=s.get("tsz", 64))
    y = sub_lines(d, y, s["sub"])
    top = y + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "type":
        yy = top
    elif kind == "shot":
        ph = round(2000 * MEASURE / 3200)
        st = 96
        yy = top + max(0, (band - ph - st) // 2)
        yy = plate(im, f"{SHOTS}/{s['shot']}", yy)
        ry = yy + 44
        d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
        d.text((W // 2, ry + 58), s["strip"], font=F(28, "SemiBold"),
               fill=T["ink"], anchor="ms")
        yy = ry + 76
    elif kind == "alerts":
        ah = len(s["alerts"]) * 150 + (len(s["alerts"]) - 1) * 26
        yy = top + max(0, (band - ah) // 2)
        yy = BL.alerts(im, d, LEFT, yy, MEASURE, T, s["alerts"], logos=LOGOS)
    elif kind == "stats":
        sh_ = min(band - 20, 760)
        yy = top + max(0, (band - sh_) // 2)
        yy = bigstats(d, LEFT, yy, MEASURE, sh_, T, s["stats"])
    elif kind == "hooks":
        yy = hook_rows(d, LEFT, top, MEASURE, band, T, s["hooks"])
    elif kind == "steps":
        yy = ST.steps_rows(d, LEFT, top, MEASURE, band, T, s["steps"])
    else:
        yy = logo_grid(im, d, LEFT, top, MEASURE, band, T, s["keys"])
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# All of it 51ultron.com's, word for word.

SLIDES = [
    dict(title="Build, run and finally monetize your business.", kind="type",
         tsz=72,
         sub="We're giving founders the flexibility to **compete with big "
             "teams** and move into new markets at a speed that "
             "**wasn't possible before.**"),

    dict(title="The operating system your startup lives on.", kind="shot",
         sub="The growth engine that **knows where you are,** shows you what "
             "to do next, **does the work** and tracks progress.",
         shot="home.png",
         strip="Outreach · Pipeline · Ledger · Console · Techniques · Brand"),

    dict(title="It reports back only when something needs you.", kind="alerts",
         sub="Automations, missions and scheduled tasks that **run on "
             "their own.**",
         alerts=[(("g", "doc"), "Daily brief sent", "ran at 07:00, clean",
                  "done", None),
                 (("g", "grid"), "Pipeline rechecked", "nothing going stale",
                  "done", None),
                 (("g", "lens"), "One contract needs your name",
                  "the only thing today", "needs you", "amber")]),

    dict(title="Replacing headcount with an infinite workforce.",
         kind="stats",
         sub="Thousands of founders **stopped waiting on hires,** handed "
             "the work to Ultron, and built their dream.",
         stats=[("9,000+", "founders running their companies on it"),
                ("100K+", "tasks finished without a human touching them"),
                ("30K+", "hours of real work handed off completely"),
                ("$800K+", "in salaries that never had to be paid out")]),

    dict(title="For the ones who can't ever slow down.", kind="hooks",
         sub="**Three promises,** straight off the front page.",
         hooks=["Make your AI bill stop being a number you fear.",
                "Wake up to a workspace that improved overnight.",
                "Close the gap between your idea and your first revenue."]),

    dict(title="For the ones who'd rather bet on themselves.", kind="hooks",
         sub="**Three more.** This is the whole pitch.",
         hooks=["Get 20 hours a week back, for less than a coffee a day.",
                "Stop being the best product nobody has heard of.",
                "Have your next 10 buyers already on your calendar."]),

    dict(title="We go all the way to outcomes.", kind="steps",
         sub="The big things that used to require big teams and funding now "
             "require only your **imagination and drive.**",
         steps=[("Stop reinventing the wheel", "the startup one, specifically"),
                ("Get to market faster", "with powerful building blocks"),
                ("Future-proof the business", "a team that delivers outcomes")]),

    dict(title="Give Ultron the keys to your stack.", kind="grid",
         sub="And **never worry about tools losing touch** again.",
         keys=["hubspot", "gmail", "calendly", "slack",
               "telegram", "notion", "github", "stripe",
               "n8n", "make", "apify", "supabase"]),
]

# THE CTA IS ALWAYS COMMENT. `Take it for a spin` is the site's own close.
CLOSER = [("comment", "Medium", 0.42),
          ("“SPIN”", "ExtraBold", 1.00),
          ("to see what it changes", "Medium", 0.34),
          ("IN YOUR COMPANY", "ExtraBold", 0.50),
          ("100% FREE", "ExtraBold", 0.44)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/hooks"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = (s["title"][:26] if isinstance(s, dict) else "closer")
        print(f"  {i:02d}  {name:28} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 224
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

#!/usr/bin/env python3
"""The Content Agent deck - 1080x1920 carousel frames on paper.

Fifteenth family. The reference is a photo-background carousel whose layout is
explicitly not wanted - ONLY ITS CONTENT is taken, re-set in this system:
paper, numbered titles over a hairline, one drawn mechanism per frame.

THE STACK IS UPDATED, per instruction. n8n and Claude stay. ultron is the OS
the agent runs on. DALL-E and model-version worship (`Claude 3.7 = best
writer`) are outdated and gone - the writing frame is about the rules, the
visuals frame is about using your own photos. OpenRouter and Slack give way
to ultron and Telegram, which is the approval channel this operation
actually uses.

WE CALL THESE CAROUSELS. 1080x1920 on the reel safe box, 0.5-0.8s a frame.
No CTA pill on body frames; the close asks for the comment.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB = _load("slide-body")
BL = _load("blocks")
ST = _load("slide-thirty")          # pick_rows, arrows3, steps_rows, head-style
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


def logo_row(im, names, y, sz=84, gp=34):
    tiles = [f"{LOGOS}/{n}.png" for n in names]
    tiles = [t for t in tiles if os.path.exists(t)]
    x = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
    for t in tiles:
        im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz),
                           Image.LANCZOS), (x, y))
        x += sz + gp
    return y + sz


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
    if kind == "checks":
        lr = (84 + GAP) if s.get("logos") else 0
        BL.checks(d, LEFT, top, MEASURE, band - lr, T, s["ticks"],
                  cap=48, lead=1.28, col=T["ink"])
        yy = SAFE_BOT - lr
        if s.get("logos"):
            yy = logo_row(im, s["logos"], yy + GAP - 24)
    elif kind == "seq":
        yy = BL.seq(im, d, LEFT, top, MEASURE, band, T, s["stops"], logos=LOGOS)
    elif kind == "panel":
        ph = s["panel_h"]
        yy = top + max(0, (band - ph) // 2)
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=s.get("panel_rz", 35),
                           foot=s.get("panel_foot"))
    elif kind == "pick":
        yy = ST.pick_rows(d, LEFT, top, MEASURE, band, T, s["ticks"], s["keep"])
    elif kind == "steps":
        yy = ST.steps_rows(d, LEFT, top, MEASURE, band, T, s["steps"])
    elif kind == "alerts":
        ah = len(s["alerts"]) * 150 + (len(s["alerts"]) - 1) * 26
        yy = top + max(0, (band - ah) // 2)
        yy = BL.alerts(im, d, LEFT, yy, MEASURE, T, s["alerts"], logos=LOGOS)
    elif kind == "stack":
        yy = BL.stack(im, d, LEFT, top, MEASURE, band, T, s["rows"], logos=LOGOS,
                      align="right")
    else:
        yy = ST.arrows3(d, LEFT, top, MEASURE, band, T, s["pairs"])
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# The reference's content, re-set. Its layout is not wanted and not used.

SLIDES = [
    dict(title="9 Hours To 10 Minutes", kind="checks",
         sub="One content agent runs the whole job. **You review, it ships.**",
         ticks=["Researches what performs", "Generates viral ideas",
                "Validates with real data", "Writes full posts",
                "Creates the images", "Auto-publishes"]),

    dict(title="Smart Research", kind="seq",
         sub="Know what works **before you create.** Copy what is "
             "already winning.",
         stops=[("x", "Trending posts analyzed", "your niche, daily", "", False),
                ("apify", "Top videos scraped", "transcripts included", "", False),
                ("claude", "Merged into one brief", "what to make next",
                 "", True)]),

    dict(title="Idea Generator", kind="panel",
         sub="Fresh angles, **not copies.** Every post gets its own POV.",
         panel_h=430,
         panel=("One idea, three parts", "per post", [
             (None, "Title", "The boring agent", None),
             (None, "Hook", "Nobody posts about this", None),
             (None, "Format", "45 second reel", None)]),
         panel_foot=("Scroll-stopping or it does not ship", "niche-specific")),

    dict(title="Fact-Check Everything", kind="checks",
         sub="No more **AI hallucinations.** Grounded before it is written.",
         ticks=["Validated with Perplexity", "Case studies found",
                "Industry insights gathered", "Every claim sourced"]),

    dict(title="Writing Rules", kind="pick",
         sub="**Claude writes it.** Context is everything, and some things "
             "never ship.",
         ticks=["Hashtags", "Emojis", "M-dashes (the AI giveaway)",
                "Direct, confident voice"],
         keep="Direct, confident voice"),

    dict(title="Images That Convert", kind="steps",
         sub="**Your own photos beat generated ones.** Every time.",
         steps=[("Skip generated images", "they read as AI from a mile away"),
                ("Pull from your library", "50+ real photos in Drive"),
                ("Rotate them randomly", "random selection reads authentic")]),

    dict(title="Human Touch", kind="seq",
         sub="A quality gate before anything ships. **You stay the editor.**",
         stops=[("google-drive", "Draft lands in Docs", "full post, formatted",
                 "", False),
                ("telegram", "You review it", "edit or approve, one tap",
                 "", False),
                ("ultron", "It ships", "scheduled and tracked", "", True)]),

    dict(title="Auto-Publish", kind="alerts",
         sub="Set it and **forget it.** Formatted, image attached, gone.",
         alerts=[("tiktok", "Reel published", "formatted for the feed",
                  "07:00", "green"),
                 ("instagram", "Carousel published", "image attached",
                  "12:00", "green"),
                 ("linkedin", "Post queued", "goes out at peak hour",
                  "18:00", None)]),

    dict(title="The Complete Stack", kind="stack",
         sub="**Keep it lean.** Six tools, one agent, no glue work.",
         rows=[("OS", ["ultron"]),
               ("Automation", ["n8n"]),
               ("Writing", ["claude"]),
               ("Research", ["perplexity"]),
               ("Scraping", ["apify"]),
               ("Approvals", ["telegram"])]),

    dict(title="The Real ROI", kind="arrows",
         sub="Manual: **6 to 9 hours.** Automated: **10 minutes.**",
         pairs=[("Research: 2-3 hrs", "Keyword: 30 sec"),
                ("Writing: 1-2 hrs", "Review: 5-10 min"),
                ("Formatting: 30 min", "Publish: 30 sec")]),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“BUILD”", "ExtraBold", 1.00),
          ("for the full", "Medium", 0.40),
          ("CONTENT AGENT", "ExtraBold", 0.52),
          ("100% FREE", "ExtraBold", 0.44)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/content"
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
    TWd = 200
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

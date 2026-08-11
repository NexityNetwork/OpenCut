#!/usr/bin/env python3
"""The Ten Agents deck - 1080x1920 carousel frames on paper.

Twenty-sixth family. Ten agents, ten DISTINCT canvases off the library - no
canvas is used twice - then the close.

The reference runs four headed sections of body copy per frame. At half a
second a frame that is unreadable, so each agent keeps one two-line claim,
its real workflow, and the marks it is actually built on. Titles are trimmed
to one line so the rule under them never moves.

The canvas is matched to the job, not picked for density: the faceless
channel frame carries the four-step script-media-assembly-storage factory,
the lead scraper carries the Places search into email extraction, the FAQ bot
carries the DM-to-agent-to-reply flow.
"""
import glob, importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _load(n):
    s = importlib.util.spec_from_file_location(
        n.replace("-", "_"), os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{n}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB, BL = _load("slide-body"), _load("blocks")
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))
TITLE_SZ, TITLE_TRACK = 58, -0.026
SUB_SZ, SUB_LEAD = 36, 1.42
GAP, PLATE_R = 64, 22
LOGO_SZ = 66
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
WF = os.environ.get("WORKFLOWS", "../another no name workflow")
WF_B = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")


def wf_path(n):
    return f"{WF_B}/{n[2:]}" if n.startswith("b:") else f"{WF}/{n}"


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh_ = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh_), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh_]
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 12, box[1] + 16, box[2] - 12, box[3] + 16], radius=PLATE_R,
        fill=(0, 0, 0, 56))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    mask = Image.new("L", (sw, sh_), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def build(i, s):
    """THE LOGO ROW IS PINNED and the canvas centres above it, so ten exports
    of wildly different heights still produce ten frames with the same
    footprint."""
    im = ground(); d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{i}."
    fb = F(TITLE_SZ, "Bold"); tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), s["title"],
                 fb, T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    y = ry + GAP
    for ln in SB.rich_lines(s["does"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)

    # A PINNED FOOTER, so ten exports from 375 to 557 tall still make ten
    # frames with one footprint. Without it the short canvases floated with
    # 250px of dead paper above AND below them.
    ly = SAFE_BOT - LOGO_SZ
    fy = SAFE_BOT - 196
    d.line([(LEFT, fy), (RIGHT, fy)], fill=T["rule"], width=1)
    d.text((LEFT, fy + 62), "In the wild", font=F(30, "Regular"), fill=T["ink"],
           anchor="ls")
    d.text((RIGHT, fy + 62), s["use"], font=F(32, "Bold"), fill=T["ink"],
           anchor="rs")
    src = source(wf_path(s["art"]))
    ah = round(src.height * MEASURE / (src.width - 4))
    top = y + 20
    plate(im, src, top + max(GAP - 20, (fy - 44 - top - ah) // 2))
    names = [n for n in s["logos"] if os.path.exists(f"{LOGOS}/{n}.png")]
    x = W // 2 - (len(names) * LOGO_SZ + (len(names) - 1) * 30) // 2
    for n in names:
        BL.logo_tile(im, d, x, ly, LOGO_SZ, n, T, LOGOS)
        x += LOGO_SZ + 30
    return im, dict(bottom=SAFE_BOT)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


SLIDES = [
    dict(title="AI Faceless Channel",
         does="Ideas to scripts to videos to published posts. "
              "**Nobody is ever on camera.**",
         art="b:Group 2147203098.png",
         logos=["n8n", "openai", "tiktok", "instagram"],
         use="Post daily, never on camera"),

    dict(title="AI UGC Ad Spy",
         does="Analyzes winning ads, extracts the structure, and rebuilds them "
              "as **UGC scripts for your product.**",
         art="b:Group 2147203101.png",
         logos=["n8n", "google-gemini", "airtable"],
         use="Reverse-engineer any winning ad"),

    dict(title="AI Avatar Generator",
         does="Finds the topic, writes the script, renders a **realistic "
              "talking-head video** and posts it.",
         art="b:Group 2147203103.png",
         logos=["n8n", "openai", "google-drive", "youtube"],
         use="Stay consistent while offline"),

    dict(title="Multilingual FAQ Bot",
         does="Answers in real time, checks the calendar, **books the slot** "
              "and logs who booked it.",
         art="3.png",
         logos=["openai", "google-calendar", "google-sheets", "n8n"],
         use="Scheduling in any language"),

    dict(title="YouTube Idea Engine",
         does="Pulls the best performing videos in your niche and returns "
              "**titles, keywords and angles.**",
         art="573712346.png",
         logos=["n8n", "youtube", "airtable"],
         use="Ideas backed by real data"),

    dict(title="AI Appointment Setter",
         does="Qualifies inbound IG DMs and **books the ones worth a "
              "closer's time.**",
         art="7.png",
         logos=["n8n", "instagram", "calendly"],
         use="Turn DMs into booked calls"),

    dict(title="Lead Scraping Agent",
         does="Scrapes any site, even behind Cloudflare, and drops "
              "**structured leads into a sheet.**",
         art="b:my-first-n8n-workflow-v0-562n19bdcfpf1 2.png",
         logos=["n8n", "apify", "google-sheets"],
         use="Even Cloudflare-protected sites"),

    dict(title="AI Content Agent",
         does="Generates the idea, renders the vertical video, and "
              "**uploads it to every platform.**",
         art="6.png",
         logos=["openai", "youtube", "instagram", "tiktok"],
         use="Idea to posted, untouched"),

    dict(title="Lead Generation Agent",
         does="**50 to 1,000 personalized emails a day** - researched, "
              "scraped, qualified and followed up.",
         art="b:Group 2147203619.png",
         logos=["apollo", "apify", "gmail", "google-sheets"],
         use="Cold outreach on autopilot"),

    dict(title="AI Voice Call Agent",
         does="Books, answers the FAQs and chases no-shows. **Ten calls at "
              "once, 30+ languages, 24/7.**",
         art="b:Group 2147203619-1.png",
         logos=["n8n", "twilio", "google-calendar"],
         use="Ten calls at once, 24/7"),
]

CLOSER = [("comment", "Medium", 0.42), ("“10”", "ExtraBold", 1.00),
          ("for all ten", "Medium", 0.40), ("BUILDS", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/ten"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"): os.remove(p)
    seen = set()
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        if isinstance(s, dict):
            assert s["art"] not in seen, f"canvas reused: {s['art']}"
            seen.add(s["art"])
        im, m = build_closer(s) if isinstance(s, list) else build(i, s)
        im.convert("RGB").save(f"{out}/{i:02d}.png")
        nm = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {nm:24} ends {m['bottom']:4d}"
              f"{'  PAST' if m['bottom'] > SAFE_BOT else ''}")

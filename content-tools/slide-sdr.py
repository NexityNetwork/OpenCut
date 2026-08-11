#!/usr/bin/env python3
"""The SDR System deck - 1080x1920 carousel frames on paper.

Twenty-fifth family. One sellable system explained end to end: who buys it,
the app layer as a drawn dashboard, the automation layer as a recycled n8n
canvas with its cost table, the run order, what it replaces, and the charge.

Better structure than the reference, per instruction - its frames run six
paragraphs of body copy and a reel gives you half a second. Every frame here
carries one artifact and the short version of the claim. Its final frame is a
photograph of a real person beside a fabricated payment from his address;
that is not copied - the notification stays, from a new client.
"""
import glob, importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _load(n):
    s = importlib.util.spec_from_file_location(
        n.replace("-", "_"), os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{n}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB, BL, SF = _load("slide-body"), _load("blocks"), _load("surfaces")
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))
TITLE_SZ, SUB_SZ, GAP, PLATE_R = 58, 36, 64, 22
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
WF = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=PLATE_R, blur=26, alpha=50, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop], radius=r,
        fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh_ = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh_), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh_]
    shadow(im, box)
    mask = Image.new("L", (sw, sh_), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def audience(d, x, y, w, h, T, cards):
    """Two buyers, two cards. The frame answers one question so it holds two
    answers and nothing else."""
    gap = 32
    ch = min(300, (h - gap) // 2)
    y += max(0, (h - (ch * 2 + gap)) // 2)
    for title, body in cards:
        d.rounded_rectangle([x, y, x + w, y + ch], radius=26,
                            fill=(255, 255, 255), outline=T["rule"], width=1)
        ty = y + 84
        for ln in BL.wrap(title, F(46, "Bold"), w - 80):
            d.text((x + 40, ty), ln, font=F(46, "Bold"), fill=T["ink"], anchor="ls")
            ty += 56
        ty += 14
        for ln in BL.wrap(body, F(31, "Regular"), w - 80):
            d.text((x + 40, ty), ln, font=F(31, "Regular"), fill=T["ink"], anchor="ls")
            ty += 42
        y += ch + gap
    return y - gap


def build(s):
    im = ground(); d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 -0.024 * TITLE_SZ)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    y = ry + GAP
    if s.get("sub"):
        for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
            SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
            y += round(SUB_SZ * 1.42)
        y += 12
    top = y + GAP - 20
    band = SAFE_BOT - top

    k = s["kind"]
    if k == "cards":
        yy = audience(d, LEFT, top, MEASURE, band, T, s["cards"])
    elif k == "surface":
        surf = SF.SURFACES[s["surf"]]().resize((700, 550), Image.LANCZOS)
        ph, lh = 596, 64 + 40
        yy = top + max(0, (band - ph - lh) // 2)
        shadow(im, [LEFT, yy, LEFT + MEASURE, yy + ph], r=24)
        d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + ph], radius=24,
                            fill=SF.PADS[s["surf"]])
        im.alpha_composite(surf, (LEFT + (MEASURE - 700) // 2, yy + 23))
        yy += ph + 40
        names = [n for n in s["logos"] if os.path.exists(f"{LOGOS}/{n}.png")]
        x = W // 2 - (len(names) * 64 + (len(names) - 1) * 28) // 2
        for n in names:
            BL.logo_tile(im, d, x, yy, 64, n, T, LOGOS)
            x += 92
        yy += 64
    elif k == "art":
        src = source(f"{WF}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        ph = s["panel_h"]
        yy = top + max(0, (band - ah - 44 - ph) // 2)
        yy = plate(im, src, yy) + 44
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=32)
    elif k == "seq":
        yy = BL.seq(im, d, LEFT, top, MEASURE, band, T, s["stops"], logos=LOGOS)
    elif k == "pairs":
        yy = BL.pairs(d, LEFT, top, MEASURE, band, T, s["rows"])
    else:
        nh = 280
        yy = top + max(0, (band - nh) // 2)
        yy = BL.notify(im, d, LEFT, yy, MEASURE, T, *s["notify"], h=nh, logos=LOGOS)
    return im, dict(bottom=min(yy, SAFE_BOT))


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


SLIDES = [
    dict(title="Who Is This For", kind="cards",
         sub="Two buyers, and they pay for the same thing "
             "**for different reasons.**",
         cards=[("B2B with outbound sales teams",
                 "They send cold email and want higher reply rates without "
                 "hiring more SDRs."),
                ("Agencies running outreach",
                 "Duplicate the workflow per client, swap the sender and the "
                 "pitch, run it all from one n8n instance.")]),

    dict(title="Application Layer", kind="surface",
         sub="The **operational hub** the client's sales team opens every "
             "morning.",
         surf=1, logos=["claude", "airtable", "n8n", "ultron"]),

    dict(title="Automation Layer", kind="art",
         sub="One workflow behind it, and the whole running cost on "
             "**one page.**",
         art="Group 2147203103.png", panel_h=330,
         panel=("What it costs to run", "per month", [
             ("n8n", "Workflow engine", "$24", None),
             ("airtable", "Data layer and state", "$20", None),
             ("openai", "Personalization and cleaning", "usage", None)])),

    dict(title="How It Works End2End", kind="seq",
         sub="You send one target description. **The rest is machinery.**",
         stops=[("apollo", "Builds the search", "up to 500 matching leads",
                 "instant", False),
                ("apify", "Scrapes and validates", "every email checked",
                 "2 min", False),
                ("perplexity", "Profiles each prospect", "real-time context",
                 "4 min", False),
                ("gmail", "Sends the personalized mail", "logged back to base",
                 "on schedule", True)]),

    dict(title="What It Replaces", kind="pairs",
         sub="One person running this produces what **three to five SDRs** do.",
         rows=[("SDR lead research",
                "Four sources enriched and profiled in under 30 seconds."),
               ("Generic email templates",
                "Personalization that references real company news pushes reply "
                "rates to 15-18%."),
               ("A fragmented tool stack",
                "One system instead of a data tool, a mail tool and a "
                "spreadsheet."),
               ("Manual follow-up tracking",
                "Sent, bounced, replied - the status updates itself.")]),

    dict(title="What To Charge", kind="notify",
         sub="Start selling **who your ideal clients become** working with you.",
         notify=("Stripe", "from a new client", "$8,500.00")),
]

CLOSER = [("comment", "Medium", 0.42), ("“W”", "ExtraBold", 1.00),
          ("for the full", "Medium", 0.40), ("BLUEPRINT", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/sdr"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"): os.remove(p)
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s)
        im.convert("RGB").save(f"{out}/{i:02d}.png")
        nm = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {nm:24} ends {m['bottom']:4d}"
              f"{'  PAST' if m['bottom'] > SAFE_BOT else ''}")

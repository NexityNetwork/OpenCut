#!/usr/bin/env python3
"""The OS deck - 1080x1920 reel frames, dark, mostly type.

Seventh family, and the one that is least like the others: only two of its eight
frames carry a picture. The rest are structured type, which is what the
reference actually does and what two previous attempts at this missed.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

NO CTA PILL, ON THIS DECK OR ANY OTHER. None of the decks built here carry one
and this file bolted one onto every frame, which makes the set inconsistent with
itself for no reason. The close asks for the comment; a body frame does not.

THE COPY IS THE REFERENCE'S, WORD FOR WORD. It is proven; it has run. The one
thing this file may not do is improve it, and a previous pass rewrote every line
of a deck into invented copy that said nothing. Titles, blurbs, step names, the
tool table, the pricing - all of it is transcribed, and the only thing built
here is the setting.

EVERY BLOCK IS JUSTIFIED to the safe box. That is the second thing the reference
does that is easy to miss - its five pairs run from the title to the bottom of
the frame rather than sitting in a stack in the middle. See blocks.py.
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
F, adv, wrap, draw_tracked, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (12, 12, 13)
# NO GREY TEXT ON THE DARK GROUND. Every word on the frame is full ink; emphasis
# is BOLD and nothing else. Setting a body line at 62 percent and its key phrase
# at 100 makes the body look switched off - the phrase already stands out from
# being heavier, and dimming everything around it just costs legibility on a
# frame that is on screen for half a second.
#
# `dim` survives for one job only: micro-labels INSIDE the white app surface,
# where grey sits on light and is ordinary.
T = dict(ink=(252, 252, 252), dim=(252, 252, 252), rule=(70, 70, 74),
         spine=(62, 62, 66), card=(252, 252, 252), card_ink=(18, 18, 20),
         accent=(64, 124, 246))

TITLE_SZ, TITLE_TRACK = 62, -0.028
BLURB_SZ, BLURB_LEAD = 36, 1.42
# ONE GAP between every major element, and the whole block centred in the safe
# box. Before this the artwork floated in whatever band was left over, so the
# space above it, below it and under the logos were three different sizes and
# none of them were chosen.
GAP = 64
PLATE_R = 22

CLOSER_INK, CLOSER_DIM = T["ink"], T["dim"]

# Workflow PNGs live in more than one folder, so a slide names the folder it
# wants. WORKFLOWS is the default; WORKFLOWS_B is the second set.
WF = os.environ.get("WORKFLOWS", "../another no name workflow")
WF_B = os.environ.get("WORKFLOWS_B", "../6 boring use cases example")


def wf_path(name):
    return f"{WF_B}/{name[2:]}" if name.startswith("b:") else f"{WF}/{name}"


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    k = w / src.width
    sw, sh = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh]
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(*T["rule"], 255), width=1)
    im.alpha_composite(ov)
    return box[3]


def rich(d, x, y, w, s, sz, lead, ink, dim):
    """Blurb with `**bold**` runs, using the shared tokeniser - the one that
    knows the space between two runs belongs to the run before it."""
    for ln in SB.rich_lines(s, sz, w):
        SB.draw_line(d, x, y, ln, sz, ink, dim)
        y += round(sz * lead)
    return y


def measure(s):
    """Every element's height, before anything is drawn, so the block can be
    centred as a unit and the gaps between its parts can all be the same."""
    h = [int(TITLE_SZ * .727) + int(TITLE_SZ * .24)]
    if s.get("blurb"):
        h.append(len(SB.rich_lines(s["blurb"], BLURB_SZ, MEASURE)) * round(BLURB_SZ * BLURB_LEAD))
    if s.get("surface"):
        h.append(660)
    elif s.get("art"):
        h += [round(source(wf_path(a)).height * MEASURE / (source(wf_path(a)).width - 4))
              for a in s["art"]]
    if s.get("logos"):
        h.append(74)
    return h


def build(s):
    """THE TITLE IS PINNED. It sits at the same y on every frame, full stop.

    Centring the whole block as a unit moved the title down by a different
    amount on each slide - furthest on the sparse ones - so flicking through the
    deck the headline jumped around while everything else stayed put. A title
    that moves is the first thing the eye catches and the last thing that should
    be catching it. Everything under it fills what is left."""
    im = ground()
    d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    y += int(TITLE_SZ * .24) + GAP

    if s.get("blurb"):
        y = rich(d, LEFT, y, MEASURE, s["blurb"], BLURB_SZ, BLURB_LEAD,
                 T["ink"], T["ink"]) + GAP
    bot = SAFE_BOT

    if s.get("surface"):
        surf = BL.app_surface(theme=T)
        lh = 74 + GAP if s.get("logos") else 0
        yy = y + max(0, (bot - y - surf.height - lh) // 2)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [LEFT + 24, yy + 30, LEFT + MEASURE - 24, yy + surf.height + 12],
            radius=20, fill=(0, 0, 0, 170))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
        im.alpha_composite(surf, (LEFT, yy))
        yy += surf.height + GAP
        if s.get("logos"):
            sz, gp = 74, 26
            tiles = [f"{os.environ.get('TOOL_LOGOS', '../apps/web/public/tools')}/{n}.png"
                     for n in s["logos"]]
            tiles = [t for t in tiles if os.path.exists(t)]
            tx = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
            for t in tiles:
                im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz),
                                   Image.LANCZOS), (tx, yy))
                tx += sz + gp
    elif s.get("art"):
        # The canvas and the fan are ONE stack and get centred together. Centring
        # the canvas alone and hanging the fan off its bottom ran the fan straight
        # through the fan.
        srcs = [source(wf_path(a)) for a in s["art"]]
        ah = sum(round(i.height * MEASURE / (i.width - 4)) for i in srcs) + GAP * (len(srcs) - 1)
        lh = 74 + GAP if s.get("logos") else 0
        yy = y + max(0, (bot - y - ah - lh) // 2)
        for i, src in enumerate(srcs):
            yy = plate(im, src, yy) + GAP
        if s.get("logos"):
            sz, gp = 74, 26
            tiles = [f"{os.environ.get('TOOL_LOGOS', '../apps/web/public/tools')}/{n}.png"
                     for n in s["logos"]]
            tiles = [t for t in tiles if os.path.exists(t)]
            tx = W // 2 - (len(tiles) * sz + (len(tiles) - 1) * gp) // 2
            for t in tiles:
                im.alpha_composite(Image.open(t).convert("RGBA").resize((sz, sz),
                                   Image.LANCZOS), (tx, yy))
                tx += sz + gp
    else:
        kind, data, *rest = s["block"]
        BL.BLOCKS[kind](d, LEFT, y, MEASURE, bot - y, T, data, **(rest[0] if rest else {}))

    return im, dict(bottom=bot)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       CLOSER_INK, CLOSER_DIM)
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# All of it transcribed from the reference. Nothing here is written by this file.
#
# `Application OS` carries two product screenshots in the reference and there is
# no source for those in the twenty canvases - screenshotting a real account
# would put somebody's data in a post. It keeps its place in the deck with a
# recycled canvas and the tool row, rather than being cut. A previous pass cut
# it silently, which is the worse of the two options by a distance: a deck that
# is missing a frame should say so.

SLIDES = [
    dict(title="Application OS", surface=True, logos=[
        "n8n", "airtable", "openai", "apify", "google-drive"],
         blurb="One base where **every input, brief and playbook** lives, with a "
               "filtered view for each platform."),

    # The densest workflow in the set - seven platform lanes, which is what the
    # copy claims. The logos sit in a ROW, not the reference's rainbow arc: an
    # arc is decoration, and slide 1 already establishes a row of marks as this
    # deck's way of saying `and these`.
    dict(title="Automation OS", art=["b:Group 2147203103.png"],
         logos=["tiktok", "instagram", "youtube", "x", "linkedin",
                "facebook", "telegram"],
         blurb="Seven workflows that scrape **all social platforms**, analyze "
               "audience sentiment, and auto-generate viral content playbooks."),

    dict(title="System Replaces:", block=("pairs", [
        ("Trend research", "The system scrapes all platforms automatically."),
        ("Comment analysis", "GPT-4o extracts sentiment, questions, and insights."),
        ("Competitor monitoring", "Add competitor profiles to the Inputs table."),
        ("Content brief creation",
         "Generates briefs with hooks, scripts, captions, and targeting."),
        ("Cross-platform reporting",
         "Everything lives in one Airtable with filtered views per platform."),
    ])),

    # A flow, not a numbered list. The claim on this frame is that each step
    # comes OUT of the one above it, and a list cannot make that claim.
    dict(title="How it works", block=("flow", [
        ("Configure inputs", "fields"),
        ("Scraping fires automatically", "rows"),
        ("Comments get analyzed", "bars"),
        ("Populates the dashboard", "tiles"),
        ("Playbooks get generated", "page"),
    ])),

    dict(title="Who To Sell This To", block=("iconrow", [
        ("grid", "Marketing agencies"),
        ("bag", "E-commerce brands"),
        ("play", "Media companies"),
        ("lens", "Creator economy businesses"),
        ("doc", "Publishers"),
    ])),

    dict(title="Core Infrastructure", block=("spec", [
        ("n8n", "Workflow orchestration"),
        ("Apify", "Data scraping (6 platforms)"),
        ("GPT-4o", "Sentiment + playbook gen"),
        ("GPT-4.1-mini", "Transcript summarization"),
        ("Airtable", "Intelligence database"),
        ("Google Drive", "Playbook storage"),
    ])),

    dict(title="What To Charge", block=("tiers", [
        ("$29", ["Starter", "1 platform, 5 inputs, weekly scraping"]),
        ("$79", ["Pro", "3 platforms, 20 inputs, daily scraping"]),
        ("$199", ["Agency", "All 6 platforms, unlimited inputs, team access"]),
        ("$5,000", ["Setup fee", "One time, built and handed over"]),
        ("$1,500", ["Retainer", "A month, optional"]),
    ], dict(foot="Your costs are $200 to $400 a month. Profitable at 8 Pro clients."))),
]

# THE CTA IS ALWAYS COMMENT. The reference's own close, word for word.
CLOSER = [("comment", "Medium", 0.42),
          ("“OS”", "ExtraBold", 1.00),
          ("for my full", "Medium", 0.40),
          ("BLUEPRINT", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/os"
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
    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (20, 20, 21))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

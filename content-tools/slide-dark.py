#!/usr/bin/env python3
"""The dark deck - 1080x1920 reel frames.

Fourth family. Same skeleton as slide-agent.py (title, blurb, canvas, tool row,
comment pill) reversed out onto a dark ground, and left-aligned rather than
centred so the whole frame hangs off one edge at x=60.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - every frame is on screen for 0.5 to 0.8 seconds,
which is a duration only a video has. The name is not the format.

A reel is NEVER cropped; the UI is drawn ON TOP. The piece that bites is the
RIGHT RAIL - the like/comment/share column covers x > 950 - so the horizontal
safe box is 60..950 and nothing on the frame may cross it.

The ground is a vertical ramp, near-black at the bottom and lifting to a soft
charcoal behind the headline. That is not decoration: the canvases this deck
uses are themselves near-black, and on a flat black ground a black screenshot
has no edge and dissolves. The ramp gives the top of the frame something for the
type to sit on and the bottom something for the plate to sit against.

Gradients band on export, so the ramp is dithered - the design kit calls for
grain on any large gradient for exactly this reason, and at these levels a
plain ramp shows visible steps across 1920px.

THE TWENTY CANVASES ARE FIXED INPUTS. Titles and copy change per deck; the
artwork is recycled. Six dark canvases live in `another no name workflow` at
818x372, which is why this deck is six wide.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_spec = importlib.util.spec_from_file_location(
    "slide_body", os.path.join(os.path.dirname(os.path.abspath(__file__)), "slide-body.py"))
SB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SB)
F, adv, wrap, draw_tracked, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 60, 950                    # the rail covers x > 950
M_TITLE, M_BLURB = 890, 700

TOP_GREY = (74, 74, 76)                  # behind the headline
BOT_BLACK = (8, 8, 9)
INK = (250, 250, 250)
BLURB = (150, 149, 147)
PLATE_EDGE = (58, 58, 60)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 74, 48, -0.030
BLURB_MAX, BLURB_MIN, BLURB_LEAD = 38, 32, 1.46
TITLE_GAP, BLURB_GAP = 44, 62
ROW_GAP, PILL_GAP, PILL_H = 58, 46, 76
PLATE_W, PLATE_R = 890, 22               # 60..950, stops AT the rail
LOGO_SZ, LOGO_GAP = 62, 18
CTA_SZ = 28

WF = os.environ.get("WORKFLOWS", "../another no name workflow")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    """Near-black at the bottom, lifting to charcoal behind the headline.

    Dithered, not smooth. A 1920px ramp between two dark values steps visibly on
    an 8-bit export - the bands are wider than the whole difference in level -
    so a little noise is what makes it read as a surface instead of as stripes."""
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    t = np.clip((t - 0.02) / 0.55, 0, 1) ** 0.85
    ramp = (np.array(TOP_GREY, np.float32) * (1 - t)
            + np.array(BOT_BLACK, np.float32) * t)
    a = np.repeat(ramp[:, None, :], W, axis=1)
    a += np.random.default_rng(11).normal(0, 2.2, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def plate(im, src, k, top):
    """Dark canvas on a dark ground, so the edge has to be drawn rather than
    implied - a hairline plus a shadow that is really a soft dark halo."""
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [LEFT, top, LEFT + w, top + h]

    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 16, box[1] + 26, box[2] - 16, box[3] + 12], radius=PLATE_R,
        fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    # Hairline on its own layer - ImageDraw on RGBA writes alpha, it does not
    # blend it, so a translucent outline punches a hole through the frame.
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(*PLATE_EDGE, 255), width=1)
    im.alpha_composite(ov)
    return box[3]


def logo_row(im, names, cy):
    tiles = [Image.open(f"{LOGOS}/{n}.png").convert("RGBA").resize(
        (LOGO_SZ, LOGO_SZ), Image.LANCZOS) for n in names
        if os.path.exists(f"{LOGOS}/{n}.png")]
    x = LEFT
    for t in tiles:
        im.alpha_composite(t, (x, cy - LOGO_SZ // 2))
        x += LOGO_SZ + LOGO_GAP


def cta_pill(im, text, cy):
    f = F(CTA_SZ, "SemiBold")
    pw = int(adv(text, f, -0.2)) + 76
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(
        [LEFT, cy - PILL_H // 2, LEFT + pw, cy + PILL_H // 2], radius=PILL_H // 2,
        fill=(250, 250, 250, 255))
    im.alpha_composite(ov)
    draw_tracked(ImageDraw.Draw(im), (LEFT + 38, cy + 10), text, f, (16, 16, 17), -0.2)


def shape(s, tsz, bsz):
    return (len(wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)),
            len(wrap(s["blurb"], F(bsz, "Regular"), M_BLURB)))


def solve(slides):
    """One of everything, across the SET. Nothing may move between frames except
    the artwork - at 0.6s a frame an element that shifts 40px reads as a
    rendering fault rather than as a layout. The sizes are the largest at which
    the whole set holds ONE SHAPE, not merely the largest that fits."""
    tsz = next((t for t in range(TITLE_MAX, TITLE_MIN - 1, -1)
                if all(shape(s, t, BLURB_MAX)[0] == 1 for s in slides)), TITLE_MIN)
    bsz, blines = None, None
    for b in range(BLURB_MAX, BLURB_MIN - 1, -1):
        n = {shape(s, tsz, b)[1] for s in slides}
        if len(n) == 1:
            bsz, blines = b, n.pop()
            break
    if bsz is None:
        bsz, blines = BLURB_MIN, max(shape(s, tsz, BLURB_MIN)[1] for s in slides)

    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides)
    k = PLATE_W / 818
    canvas = round(tall * k)
    fixed = (int(tsz * .727) + int(tsz * .24) + TITLE_GAP + blines * round(bsz * BLURB_LEAD)
             + BLURB_GAP + ROW_GAP + LOGO_SZ + PILL_GAP + PILL_H)
    if fixed + canvas > SAFE_BOT - SAFE_TOP:
        k = (SAFE_BOT - SAFE_TOP - fixed) / tall
        canvas = round(tall * k)
    top = (SAFE_TOP + SAFE_BOT - fixed - canvas) // 2
    return dict(tsz=tsz, bsz=bsz, blines=blines, k=k, top=top, block=fixed + canvas,
                uniform=len({shape(s, tsz, bsz) for s in slides}) == 1)


def build(s, L):
    im = ground()
    d = ImageDraw.Draw(im)
    tsz, bsz = L["tsz"], L["bsz"]

    y = L["top"] + int(tsz * .727)
    draw_tracked(d, (LEFT, y), wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)[0],
                 F(tsz, "Bold"), INK, TITLE_TRACK * tsz)
    y += int(tsz * .24) + TITLE_GAP

    for line in wrap(s["blurb"], F(bsz, "Regular"), M_BLURB):
        d.text((LEFT, y), line, font=F(bsz, "Regular"), fill=BLURB, anchor="ls")
        y += round(bsz * BLURB_LEAD)
    y += BLURB_GAP

    bottom = plate(im, source(f"{WF}/{s['workflow']}"), L["k"], y)
    logo_row(im, s["logos"], bottom + ROW_GAP + LOGO_SZ // 2)
    cy = bottom + ROW_GAP + LOGO_SZ + PILL_GAP + PILL_H // 2
    cta_pill(im, s.get("cta", CTA), cy)
    return im, dict(bottom=cy + PILL_H // 2)


def build_closer(c):
    im = ground()
    d = ImageDraw.Draw(im)
    rows, pitches = c["stack"], c["pitch"]
    block = sum(pitches) + int(rows[-1][1] * .727)
    y = (SAFE_TOP + SAFE_BOT - block) // 2 + int(rows[0][1] * .727)
    cx = (LEFT + RIGHT) // 2
    for i, (t, sz, w) in enumerate(rows):
        d.text((cx, y), t, font=F(sz, w), fill=INK if w != "Regular" else BLURB, anchor="ms")
        if i < len(pitches):
            y += pitches[i]
    return im, dict(bottom=y)


CTA = 'comment "W" to get my AI Operating Systems'

# The reference's copy, word for word. Its first slide's pill reads
# `comment "30" for a custom plan` while the other five read `comment "W" ...`;
# that is a copy-paste slip in their deck and one keyword per post is the rule,
# so every frame here says the same thing.
#
# Six dark canvases recycled out of the twenty. `logos` is read off each
# canvas's node labels rather than guessed by category.
SLIDES = [
    dict(title="Lead Generation", workflow="2-1.png",
         blurb="Incoming leads get distributed instantly to the right person or "
               "system based on criteria you set.",
         logos=["n8n", "slack", "notion", "airtable"]),

    dict(title="Outreach Automation", workflow="3.png",
         blurb="Personalized emails get written and sent automatically using data "
               "from your CRM and research tools.",
         logos=["n8n", "hubspot", "gmail", "openai"]),

    dict(title="Lead Nurturing System", workflow="5.png",
         blurb="Scheduled follow ups get sent automatically when prospects go "
               "silent after initial contact.",
         logos=["n8n", "gmail", "airtable", "openai"]),

    dict(title="Lead Qualifier", workflow="573712346.png",
         blurb="Customer questions get answered immediately using your knowledge "
               "base and past ticket resolutions.",
         logos=["n8n", "openai", "notion", "slack"]),

    dict(title="Distribution Engine", workflow="6.png",
         blurb="Original content gets adapted automatically into platform "
               "specific formats for every social channel.",
         logos=["n8n", "instagram", "tiktok", "linkedin", "x"]),

    dict(title="Invoice Tracker", workflow="7.png",
         blurb="Invoices get generated and sent automatically when services are "
               "delivered or milestones are hit.",
         logos=["n8n", "stripe", "google-sheets", "airtable"]),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = dict(stack=[("comment", 66, "Regular"),
                     ("“W”", 84, "Bold"),
                     ("to get ALL", 60, "Regular"),
                     ("MY AI FREEBIES", 76, "ExtraBold"),
                     ("100% FREE", 46, "SemiBold")],
              pitch=[100, 96, 104, 92])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/dark"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape down to {BLURB_MIN}px - "
              f"rewrite the odd one out.")
    print(f"  title {L['tsz']}  blurb {L['bsz']} x{L['blines']}  canvas at {L['k']:.3f}x  "
          f"block {L['top']}..{L['top'] + L['block']} in {SAFE_TOP}..{SAFE_BOT}\n")

    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if "stack" in s else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {s.get('title', 'closer'):22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (18, 18, 18))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

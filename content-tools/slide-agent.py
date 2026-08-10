#!/usr/bin/env python3
"""The named-agent deck - 1080x1350 carousel frames, centred on paper.

A second family, not a variant of slide-body.py. That one hangs everything off
one left edge at x=88 and carries a dark n8n canvas; this one centres every
element and carries a LIGHT canvas, so the two share machinery and share nothing
about how they look. Keeping them apart is cheaper than a mode flag: the geometry
constants are the whole design, and a file with two sets of them has neither.

    slide-body.py    left edge, dark canvas, tick list, no per-slide CTA
    slide-agent.py   centred, light canvas, three-line blurb, CTA on every frame

Same discipline as the other one, and for the same reason - EVERY FRAME IS ON
SCREEN FOR 0.5 TO 0.8 SECONDS:

  Nothing may move between frames except the artwork. One title size, one blurb
  size, one canvas scale, one logo baseline, one CTA baseline, all solved across
  the SET. An element that shifts 40px between two frames half a second apart
  reads as a rendering fault rather than as a layout.

  The sizes are the largest at which the whole set holds ONE SHAPE - every title
  on one line, every blurb the same number of lines. Not "at which nothing
  overflows": a slide whose blurb runs a line longer is a slide whose canvas
  jumps. If no size works the renderer says so rather than shrinking on.

  Every mark in a logo row is a tool that appears in THAT slide's canvas, read
  off its node labels. The design kit bans logo rows outright and it is right
  about a page you dwell on, where a row of marks is texture. At 0.6s a row of
  marks is the fastest thing on the frame, read in one glance and in parallel
  while a sentence is still being parsed. It earns that by being true.

The ground is paper with two very large, very soft circles on it. They are the
reference's, and they do a job: a flat fill behind a light screenshot leaves the
screenshot with nothing to sit on, and these give the frame a slow gradient
without being a gradient. Section 3 of the kit - decoration never sits under
type - so they are placed to clear the text block and the canvas both.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# slide-body.py has a hyphen in it, so it cannot be imported by name. The shared
# half is the typesetting - tracked display type, the bold-run tokeniser that
# knows a space belongs to the run before it, the alpha trim, the grain.
_spec = importlib.util.spec_from_file_location(
    "slide_body", os.path.join(os.path.dirname(os.path.abspath(__file__)), "slide-body.py"))
SB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SB)
F, adv, wrap, draw_tracked, grain, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.grain, SB.source

# 1080x1350, NOT 1080x1920 - Instagram accepts 4:5 at most in a feed carousel and
# centre crops anything taller, losing 285px top and bottom without telling you.
# Render at the target size; no margin survives a crop. See danger-zones.py.
W, H = 1080, 1350
SAFE_TOP, SAFE_BOT = 84, 1266
# TWO measures, not one. The canvas gets the full safe width because it is a
# picture and wants every pixel; the blurb does NOT, because a centred paragraph
# set to the full width becomes a slab. Setting both to 890 is what made the copy
# read as cramped: three long lines packed edge to edge directly under the title,
# with no shape and nowhere for the eye to rest.
M_TITLE, M_BLURB = 890, 760

GROUND = (250, 248, 245)
INK = (22, 19, 14)
BLURB = (104, 100, 94)
CIRCLE = (238, 234, 228)
PILL_EDGE = (222, 218, 211)
PILL_INK = (72, 68, 63)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 92, 58, -0.040
BLURB_MAX, BLURB_MIN = 40, 34
# The gap under the title hangs off its DESCENDER and still has to clear a 99px
# cap height. 34 put the blurb's ascenders into the title's tail.
TITLE_GAP, BLURB_GAP = 52, 56
BLURB_LEAD = 1.52                        # centred prose needs more than the 1.4
                                         # a left-aligned column gets away with
ROW_GAP, PILL_GAP, PILL_H = 54, 40, 78
PLATE_W, PLATE_R = 890, 24               # 60..950, stops AT the rail
LEFT, RIGHT = 60, 950                    # the reel's button rail
                                         # covers x > 950. Nothing crosses it.
BCX = (LEFT + RIGHT) // 2                # safe-box centre x=505, so a
                                         # centred 890 block still clears it
LOGO_SZ, LOGO_GAP = 70, 22
CTA_SZ = 34

WF = os.environ.get("WORKFLOWS", "../differnt types of workflows")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    """Paper, two soft circles, then grain over the lot.

    The circles are drawn at 4x and downsampled rather than blurred: a
    GaussianBlur wide enough to soften a 900px circle costs more than the whole
    rest of the frame, and the edge it leaves is still slightly banded."""
    s = 4
    im = Image.new("RGB", (W * s, H * s), GROUND)
    d = ImageDraw.Draw(im)
    for cx, cy, r in ((0.88, 0.10, 0.62), (0.10, 0.86, 0.70)):
        d.ellipse([(cx - r) * W * s, (cy - r) * H * s * 0.56,
                   (cx + r) * W * s, (cy + r) * H * s * 0.56], fill=CIRCLE)
    im = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(18))
    return grain(im.convert("RGBA"), 2.0)


def plate(im, src, k, top):
    """The canvas: rounded, hairlined, lifted off the paper by a soft shadow.

    These canvases are LIGHT, unlike the other deck's. A light screenshot on a
    light ground has no edge of its own, so the shadow is doing structural work
    here rather than decorative - without it the frame reads as one flat sheet
    with some diagram printed on it."""
    # Drop the export's own 1px frame first. Figma stamps a (222,191,191) rule
    # around every one of these, and rounding a 20px radius over it leaves a pink
    # hairline arcing round the corners - it reads as a rendering artefact
    # because it is one.
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    x0 = BCX - w // 2
    box = [x0, top, x0 + w, top + h]

    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 22, box[1] + 34, box[2] - 22, box[3] + 10], radius=PLATE_R,
        fill=(84, 74, 60, 92))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    # Hairline on its own layer: ImageDraw on an RGBA image writes alpha rather
    # than blending it, so a translucent outline punches a hole and flattens to
    # solid white.
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(22, 19, 14, 38), width=1)
    im.alpha_composite(ov)
    return box[3]


def logo_row(im, names, cy):
    tiles = [Image.open(f"{LOGOS}/{n}.png").convert("RGBA").resize(
        (LOGO_SZ, LOGO_SZ), Image.LANCZOS) for n in names
        if os.path.exists(f"{LOGOS}/{n}.png")]
    if not tiles:
        return
    x = BCX - (len(tiles) * LOGO_SZ + (len(tiles) - 1) * LOGO_GAP) // 2
    for t in tiles:
        im.alpha_composite(t, (x, cy - LOGO_SZ // 2))
        x += LOGO_SZ + LOGO_GAP


def cta_pill(im, text, cy):
    f = F(CTA_SZ, "SemiBold")
    pw, ph = int(adv(text, f, -0.3)) + 88, PILL_H
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(
        [BCX - pw // 2, cy - ph // 2, BCX + pw // 2, cy + ph // 2], radius=ph // 2,
        fill=(255, 255, 255, 235), outline=(*PILL_EDGE, 255), width=2)
    im.alpha_composite(ov)
    draw_tracked(ImageDraw.Draw(im), (BCX - int(adv(text, f, -0.3)) // 2, cy + 13),
                 text, f, PILL_INK, -0.3)


def shape(s, tsz, bsz):
    return (len(wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)),
            len(wrap(s["blurb"], F(bsz, "Regular"), M_BLURB)))


def solve(slides):
    """One title size, one blurb size, one canvas scale and one set of baselines
    for the whole SET. At 0.6s a frame, anything that moves between frames is a
    fault rather than a layout.

    The five elements are ONE BLOCK, centred in the safe box. The first version
    pinned the copy to the top and the pill to the bottom and let the canvas
    float in between, which is `space-between` with short copy - section 4's
    dead band, named there as the defect that got more renders rejected than
    everything else combined. It left 234px of nothing above the canvas and 234
    below. Measuring the block and centring it puts that slack outside the
    content, where it is margin."""
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
    head = int(tsz * 0.727) + int(tsz * 0.24) + TITLE_GAP + blines * round(bsz * BLURB_LEAD)
    block = head + BLURB_GAP + canvas + ROW_GAP + LOGO_SZ + PILL_GAP + PILL_H
    # If the block will not fit the safe box, the canvas gives the height back -
    # it is the only element here with any give in it.
    if block > SAFE_BOT - SAFE_TOP:
        k = (canvas - (block - (SAFE_BOT - SAFE_TOP))) / tall
        canvas = round(tall * k)
        block = head + BLURB_GAP + canvas + ROW_GAP + LOGO_SZ + PILL_GAP + PILL_H

    top = (SAFE_TOP + SAFE_BOT - block) // 2
    return dict(tsz=tsz, bsz=bsz, blines=blines, k=k, top=top, block=block,
                canvas_y=top + head + BLURB_GAP,
                logo_y=top + head + BLURB_GAP + canvas + ROW_GAP + LOGO_SZ // 2,
                cta_y=top + block - PILL_H // 2,
                uniform=len({shape(s, tsz, bsz) for s in slides}) == 1)


def build(s, L):
    im = ground()
    d = ImageDraw.Draw(im)
    tsz, bsz = L["tsz"], L["bsz"]
    pitch = round(bsz * BLURB_LEAD)

    y = L["top"] + int(tsz * 0.727)
    ln = wrap(s["title"], F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)[0]
    draw_tracked(d, (BCX - int(adv(ln, F(tsz, "Bold"), TITLE_TRACK * tsz)) // 2, y),
                 ln, F(tsz, "Bold"), INK, TITLE_TRACK * tsz)
    y += int(tsz * 0.24) + TITLE_GAP

    for line in wrap(s["blurb"], F(bsz, "Regular"), M_BLURB):
        d.text((BCX, y), line, font=F(bsz, "Regular"), fill=BLURB, anchor="ms")
        y += pitch

    src = source(f"{WF}/{s['workflow']}")
    bottom = plate(im, src, L["k"], L["canvas_y"])
    logo_row(im, s["logos"], L["logo_y"])
    cta_pill(im, s.get("cta", CTA), L["cta_y"])
    return im, dict(bottom=bottom)


def build_closer(c):
    """Same paper, same circles, no canvas. The kit's closer inverts to a dark
    ground; in a reel a dark frame is a CUT, and a cut at the end reads as a
    different video rather than as the end of this one."""
    im = ground()
    d = ImageDraw.Draw(im)
    rows, pitches = c["stack"], c["pitch"]
    block = sum(pitches) + int(rows[-1][1] * 0.727)
    y = (SAFE_TOP + SAFE_BOT - block) // 2 + int(rows[0][1] * 0.727)
    for i, (t, sz, w) in enumerate(rows):
        d.text((BCX, y), t, font=F(sz, w), fill=INK if w != "Regular" else BLURB,
               anchor="ms")
        if i < len(pitches):
            y += pitches[i]
    return im, dict(bottom=y)


CTA = 'comment "AI" for a free guide'

# The reference's copy, word for word. Titles are the workflow filenames because
# that is what they are called; `logos` is read off each canvas's node labels,
# never guessed - n8n leads every row because every one of these IS an n8n canvas.
SLIDES = [
    dict(title="Email Closer",
         blurb="Writes personalized outreach emails that book meetings on "
               "autopilot without you touching your keyboard.",
         workflow="Email Closer.png",
         logos=["n8n", "google-sheets", "openai", "hubspot"]),

    dict(title="Content Engine",
         blurb="Turns one video into 20 platform-ready posts so you never "
               "stare at a blank screen again.",
         workflow="Content Engine.png",
         logos=["n8n", "airtable", "openai"]),

    dict(title="Client Scraper",
         blurb="Finds and qualifies your ideal customers while you sleep so "
               "your pipeline stays full.",
         workflow="Client Scraper.png",
         logos=["n8n", "apify", "apollo", "airtable"]),

    dict(title="AutoInvoice Agent",
         blurb="Generates and sends invoices the moment work is complete so "
               "you get paid faster.",
         workflow="AutoInvoice Agent.png",
         logos=["n8n", "airtable", "google-drive", "google-sheets"]),

    dict(title="Appointment Setter",
         blurb="Handles calendar coordination and reminder sequences so your "
               "meetings actually happen.",
         workflow="Appointment Setter.png",
         logos=["n8n", "google-calendar", "mailchimp", "twilio", "google-sheets"]),

    dict(title="SM Research Bot",
         blurb="Monitors competitors and trending topics then suggests what "
               "content to create next.",
         workflow="SM Research Bot.png",
         logos=["n8n", "mistralai", "airtable"]),
]

# The close is the reference's, word for word. THE CTA IS ALWAYS COMMENT.
CLOSER = dict(stack=[("Comment", 74, "Regular"),
                     ("“AI”", 90, "Bold"),
                     ("and I will send you", 62, "Regular"),
                     ("a FREE guide", 90, "Bold")],
              pitch=[106, 104, 112])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/agents"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape down to {BLURB_MIN}px - "
              f"the canvas sits lower than it needs to. rewrite the odd one out.")
    print(f"  title {L['tsz']}  blurb {L['bsz']} x{L['blines']}  "
          f"canvas at {L['k']:.3f}x  block {L['top']}..{L['top'] + L['block']} "
          f"in {SAFE_TOP}..{SAFE_BOT}\n")

    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if "stack" in s else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {s.get('title', 'closer'):22} canvas ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

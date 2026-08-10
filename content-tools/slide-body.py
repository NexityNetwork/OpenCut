#!/usr/bin/env python3
"""Body slides for the n8n reels - 1080x1920 frames, not overlays.

Built against `carousel-design-kit/DESIGN-RULES.md`. That kit renders at
1080x1350 and we render at 1080x1920, but the frames are the SAME WIDTH and the
usable height is nearly the same too - their page is 1124px between paddings,
our reel-safe band is 1190px between the chrome. So the kit's numbers transfer
almost 1:1 and are used directly rather than rescaled. Type size follows frame
width and viewing distance, and neither of those changed.

What the kit cost this file, in the order the rules are listed there:

  HARD BAN, logos. The first draft carried a row of four to six tool logos per
  slide, guessed by category. "logos without genuinely named tools produces the
  exact logos-for-the-sake-of-logos failure the rules ban." The subject of these
  slides is an agent, not a toolchain. Row deleted.

  HARD BAN, uppercase. Titles were set ALL CAPS off the reference. Sentence case
  everywhere, no exceptions listed.

  Section 6, one bolded clause per line. The draft had no bold at all, so all
  three lines scanned identically. Bold is heavier AND darker here, the way the
  kit does it - 600 at full ink against 400 at 80 percent.

  Section 6, the lead line. The draft set it lighter than the lines under it.
  The kit's `.lead` is the DARKEST and heaviest thing in the prose block. It is
  the sentence that has to land if nothing else does, so it was backwards.

  Section 4, the dead band. Copy this thin in a frame this tall leaves 130-320px
  of slack above the image no matter where the image is pinned. Centring it just
  spreads the hole (the rules say so explicitly). Fixed by a hairline rule at a
  constant y=800: the copy gets a bottom edge, the gap becomes a margin, and the
  page reads as two registers instead of one page with a hole in it.

  Section 7, render and look at it. Three passes. The first had every workflow
  at a different scale, the second was still logo'd and shouting in caps.

Two deliberate deviations, both because the kit assumes a static carousel and
this is a reel:

  No CTA on a body slide. The kit's structure is cover + 6 body + cta and the
  CTA is its own page. The reference stamped `comment "AI"` on all six, which at
  0.5s per slide is the same pill flashing six times. It goes on the closer.

  Grain on the ground only, never over the plate. Every family in the kit paints
  grain over the whole page. Their screenshots are marketing pages set at 40px;
  ours are n8n canvases whose node labels are 8px, and noise over 8px type is
  mush. The ground gets it, the screenshot does not.

Geometry, all fixed px, no derived values:

    left edge / measure   88 / 820      title  88px, -3.6 track, 1.02 lh
    title cap-top        262            body   34px, 1.40 lh, 20 gap
    rule                 800            plate  88..948, k=1.051
    plate top            856            safe   250..1440, rail at 950
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
LEFT, MEASURE = 88, 820

# The kit's palette, not ours: ink #16130E rather than #111, and a ground with
# a little warmth in it. A pure #FFF ground next to Instagram's own white chrome
# reads as a screenshot of a browser; a warm one reads as paper.
GROUND = (250, 248, 244)
INK = (22, 19, 14)
BODY = (68, 65, 60)          # ink at 80% over the ground, the kit's .lines p
RULE = (218, 216, 212)       # ink at 14%, the kit's --rule

TITLE_SZ, TITLE_TRACK, TITLE_PITCH = 88, -3.6, 90
TITLE_TOP = 262
BODY_MAX, BODY_MIN = 34, 30
TITLE_GAP, PARA_GAP = 34, 20
PLATE_TOP = 856
PLATE = (LEFT, LEFT + 860)   # 88..948, clears the 950 rail by 2px
PLATE_R = 20

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
WF = os.environ.get("WORKFLOWS", "../6 boring use cases example")
_f = {}


def F(sz, w="Regular"):
    if (sz, w) not in _f:
        _f[(sz, w)] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _f[(sz, w)]


def adv(s, f, track=0.0):
    """Advance width with letter-spacing applied. PIL has no tracking, and at
    88px the kit's -3.2 to -4.6 is not a nicety - untracked Inter Bold at display
    size reads as a default, which is the whole difference between set and
    typed."""
    return sum(f.getlength(c) for c in s) + track * max(0, len(s) - 1)


def draw_tracked(d, xy, s, f, fill, track=0.0):
    x, y = xy
    for c in s:
        d.text((x, y), c, font=f, fill=fill, anchor="ls")
        x += f.getlength(c) + track
    return x


def wrap(s, f, maxw, track=0.0):
    out, line = [], ""
    for word in s.split():
        cand = f"{line} {word}".strip()
        if line and adv(cand, f, track) > maxw:
            out.append(line)
            line = word
        else:
            line = cand
    if line:
        out.append(line)
    return out


def runs(s):
    """Split `plain **bold** plain` into (text, is_bold) pairs."""
    out, bold = [], False
    for part in s.split("**"):
        if part:
            out.append((part, bold))
        bold = not bold
    return out


def rich_lines(s, size, maxw):
    """Wrap a `plain **bold** plain` string into lines of (word, is_bold).

    Wrapping has to happen over the runs rather than over the plain string,
    because the bold face is wider and a line measured in Regular overflows once
    part of it is set in SemiBold."""
    reg, sem = F(size, "Regular"), F(size, "SemiBold")
    words = [(wd, b) for text, b in runs(s) for wd in text.split()]
    lines, cur, curw = [], [], 0.0
    for wd, b in words:
        f = sem if b else reg
        gap = reg.getlength(" ") if cur else 0
        if cur and curw + gap + f.getlength(wd) > maxw:
            lines.append(cur)
            cur, curw = [(wd, b)], f.getlength(wd)
        else:
            cur.append((wd, b))
            curw += gap + f.getlength(wd)
    if cur:
        lines.append(cur)
    return lines


def fits(slide, sz, maxw):
    return (len(wrap(slide["setup"], F(sz, "Medium"), maxw)) == 1 and
            all(len(rich_lines(b, sz, maxw)) == 1 for b in slide["lines"]))


def body_size(slides, maxw):
    """Largest body size at which every line of every slide sets on ONE line.

    Solved once across the SET, not per slide. Sized per slide it landed on 32,
    33 and 34 in the same six, and body type that changes size between slides
    shown half a second apart reads as a rendering fault.

    A widow is not a typographic nitpick here, it is a structural break: the
    plate top is fixed so the six read as a set, and one wrapped line pushes the
    copy into it. Floor is 30 - the README puts the readable floor on a 1080
    frame at about 32 - so anything still wrapping at 30 is reported as a COPY
    problem to be rewritten, never silently shrunk further."""
    for sz in range(BODY_MAX, BODY_MIN - 1, -1):
        if all(fits(s, sz, maxw) for s in slides):
            return sz, []
    over = [b for s in slides for b in [s["setup"]] + s["lines"]
            if len(rich_lines(b, BODY_MIN, maxw)) > 1]
    return BODY_MIN, over


def grain(im, amount=3.0, seed=7):
    """A whisper of noise on the ground. A flat digital fill at this size looks
    like an empty canvas rather than a surface; every family in the kit carries
    grain for the same reason. 3 levels is under the JPEG quantiser but it is
    enough to stop the ground reading as nothing."""
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    n = np.random.default_rng(seed).normal(0, amount, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8)).convert("RGBA")


def plate(im, path):
    """The screenshot, given the kit's cream-notes treatment: rounded, hairlined,
    and lifted off the ground by a wide soft shadow.

    Not the cream-slab dark-bezel treatment, which is the other option in the
    kit. That one exists so a bright screen has something to push against on a
    cream ground; an n8n canvas is already near-black, so a dark bezel around it
    would merge into one dark mass and the screen would stop reading as a screen.

    Trim the alpha before fitting. Figma exports the frame, not the drawing:
    Group 2147203619 is 818x752 on canvas with 340px of nothing under it, so
    fitting the canvas scaled the one workflow that needed no scaling to 0.81x
    while the other five sat native."""
    x0, x1 = PLATE
    src = Image.open(path).convert("RGBA")
    bb = src.split()[3].getbbox()
    if bb:
        src = src.crop(bb)
    k = (x1 - x0) / src.width
    w, h = x1 - x0, int(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [x0, PLATE_TOP, x0 + w, PLATE_TOP + h]

    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 28, box[1] + 62, box[2] - 28, box[3] + 6], radius=PLATE_R,
        fill=(70, 44, 18, 102))                      # 0 34px 60px -28px, .4
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)

    # Both hairlines go on their own layer and get composited. ImageDraw on an
    # RGBA image WRITES alpha, it does not blend it - a 35 percent line drawn
    # straight onto the page is a hole with the raw colour behind it, and on
    # flatten the plate came out ringed in solid white.
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.rounded_rectangle([box[0] + 1, box[1] + 1, box[2] - 2, box[3] - 2],
                         radius=PLATE_R, outline=(255, 255, 255, 90), width=1)
    od.rounded_rectangle(box, radius=PLATE_R, outline=(22, 19, 14, 31), width=1)
    im.alpha_composite(ov)
    return k, box[3]


def build(slide, sz):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)))
    d = ImageDraw.Draw(im)
    pitch = round(sz * 1.4)

    y = TITLE_TOP + int(TITLE_SZ * 0.727)            # cap-top -> baseline
    for ln in wrap(slide["title"], F(TITLE_SZ, "Bold"), MEASURE, TITLE_TRACK):
        draw_tracked(d, (LEFT, y), ln, F(TITLE_SZ, "Bold"), INK, TITLE_TRACK)
        y += TITLE_PITCH
    y += TITLE_GAP

    # The lead is the heaviest and darkest line in the block, not the lightest.
    for ln in wrap(slide["setup"], F(sz, "Medium"), MEASURE):
        d.text((LEFT, y), ln, font=F(sz, "Medium"), fill=INK, anchor="ls")
        y += pitch
    y += PARA_GAP

    reg, sem = F(sz, "Regular"), F(sz, "SemiBold")
    for b in slide["lines"]:
        for ln in rich_lines(b, sz, MEASURE):
            cx = LEFT
            for i, (wd, bold) in enumerate(ln):
                if i:
                    cx += reg.getlength(" ")
                f = sem if bold else reg
                d.text((cx, y), wd, font=f, fill=INK if bold else BODY, anchor="ls")
                cx += f.getlength(wd)
            y += pitch
        y += PARA_GAP

    k, bottom = plate(im, f"{WF}/{slide['workflow']}")
    return im, dict(k=k, copy_end=y - PARA_GAP, bottom=bottom)


# The reference's own copy, kept word for word except where a rule forced a
# change. Each workflow was matched to a title by reading its node labels.
SLIDES = [
    dict(title="AI ops & management agent",
         setup="You make the business run without you.",
         lines=["Turn repetitive ops into **automated workflows**",
                "Keep tasks, deadlines, and handoffs **organized daily**",
                "Track weekly performance so **nothing slips**"],
         workflow="Group 2147203098.png"),

    dict(title="AI content engine agent",
         setup="You turn attention into daily content output.",
         lines=["Turn 1 idea into **10+ ready-to-post assets**",
                "Repurpose once, **publish everywhere** automatically",
                "Stay consistent **without burnout** or creative blocks"],
         workflow="Group 2147203103.png"),

    dict(title="AI product & dev agent",
         setup="You ship features fast without chaos.",
         lines=["Build faster with **repeatable dev workflows**",
                "Turn messy ideas into **clean specs + tasks**",
                "Retainers scale to **$3K-$10K/month** per client"],
         workflow="Group 2147203619-1.png"),

    dict(title="AI sales & growth agent",
         setup="You generate revenue with repeatable systems.",
         lines=["Write offers + messaging that **actually converts**",
                "Generate leads with **consistent outreach systems**",
                "Improve close rates with **weekly optimization loops**"],
         workflow="my-first-n8n-workflow-v0-562n19bdcfpf1 2.png"),

    dict(title="AI research & spy agent",
         setup="You find what’s working before everyone else does.",
         lines=["Track **competitor ads, hooks, and offers**",
                "Spot trends **before your market catches up**",
                "Turn insights into executions you can **deploy fast**"],
         workflow="Group 2147203101.png"),

    dict(title="AI funnel & lead gen agent",
         setup="You turn traffic into customers at scale.",
         lines=["Fix **funnel leaks** that kill conversions",
                "Launch tests that **improve sales week by week**",
                "Scale what works with a **predictable growth loop**"],
         workflow="Group 2147203619.png"),
]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/slides"
    os.makedirs(out, exist_ok=True)
    made = []
    sz, over = body_size(SLIDES, MEASURE)
    for line in over:
        print(f"  overflows at {BODY_MIN}px, shorten it: {line}")
    for i, s in enumerate(SLIDES, 1):
        im, m = build(s, sz)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        # Three numbers worth watching: whether the copy cleared the fixed plate
        # top, whether the plate cleared the bottom of the safe box, and how
        # much of a hole is left between them.
        bad = []
        if m["copy_end"] > PLATE_TOP - 24:
            bad.append("COPY INTO PLATE")
        if m["bottom"] > 1440:
            bad.append("PLATE OVER 1440")
        if PLATE_TOP - m["copy_end"] > 300:
            bad.append("DEAD BAND")
        print(f"  {i:02d}  {s['title']:28} {m['k']:.3f}x  body {sz}  "
              f"copy ends {m['copy_end']:4.0f}  plate ..{m['bottom']}"
              f"  {'  '.join(bad)}")
    TWd = 300
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"-> {out}/  and {out}/_sheet.png")

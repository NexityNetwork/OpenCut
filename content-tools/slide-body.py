#!/usr/bin/env python3
"""Body slides and the closer for the n8n reels - 1080x1920 frames, not overlays.

Built against `carousel-design-kit/DESIGN-RULES.md`. That kit renders at
1080x1350 and we render at 1080x1920, but the frames are the SAME WIDTH and the
usable height is nearly the same too - their page is 1124px between paddings,
our reel-safe band is 1190px between the chrome. So the kit's numbers transfer
almost 1:1 and are used directly rather than rescaled. Type size follows frame
width and viewing distance, and neither of those changed.

EVERY FRAME IS ON SCREEN FOR 0.5 TO 0.8 SECONDS. That number decides more here
than the design kit does, and where the two disagree it wins:

  Short clauses, not sentences. A draft went the other way - section 6 says
  write outcomes, not tasks, and outcomes do not fit on one line - and it was
  wrong for this medium. Nobody reads two lines of prose in 0.6s. One clause
  with the point in bold is the whole budget.

  Logos stay, and section 1 bans them. It bans them for a page someone dwells
  on, where a row of marks is texture. At 0.6s a row of marks is the fastest
  thing on the frame - it is read as a glance, in parallel, while a sentence is
  still being parsed. They earn it by being TRUE: every mark on a slide is a
  tool that appears in that slide's canvas, read off the node labels.

  The closer is the same white page as the bodies, not the kit's inverted one.
  A dark page in a reel is a cut, and a cut at the end reads as a different
  video rather than as the end of this one.

What the kit still costs, and what it does not:

  HARD BAN, uppercase - kept on the bodies. Titles came off the reference in
  caps and are sentence case here. Broken deliberately on the CLOSER only,
  where the reference sets its payoff words in caps and at 0.6s that is doing
  work rather than shouting.

  Section 6, one bolded clause per line - kept, and it is the whole reason the
  short form still reads. Bold is heavier AND darker, 600 at full ink against
  400 at 80 percent, so the point is the only thing you have to land.

  Section 6, the lead line is the DARKEST thing in the prose block, not the
  lightest. An early draft had it grey, which is backwards.

  Section 4, the dead band - solved by the plate absorbing whatever the copy
  leaves, not by moving type around.

  Section 7, render and look at it. Six passes. Nothing here shipped first try.

Two deliberate deviations, both because the kit assumes a static carousel:

  Grain on the ground only, never over the plate. Every family in the kit paints
  grain over the whole page. Their screenshots are marketing pages set at 40px;
  ours are n8n canvases whose node labels are 8px, and noise over 8px type is
  mush. The paper gets it, the screenshot never.

  The plate top and the plate scale are SOLVED ACROSS THE SET, not per slide.
  Nothing may move between slides except the artwork itself - these are frames
  of a reel at roughly half a second each, and an element that shifts 40px
  between two of them reads as a rendering fault rather than as a layout.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440          # reel chrome: 250 top, 480 bottom, 130 right rail
LEFT, MEASURE = 88, 820                 # text: 88..908
PLATE_W = 860                           # artwork: 88..948, clears the rail at 950

# The kit's ink, #16130E rather than #111. Its ground is a warm cream and this is
# not: side by side against the reference the cream read as grey, and the whole
# format depends on the paper looking like the reference's paper. A hair of
# warmth is left so the grain has something to sit on.
GROUND = (253, 252, 250)
INK = (22, 19, 14)
BODY = (70, 67, 62)                     # ink at 80% over the ground, the kit's .lines p
SOFT = (44, 41, 37)                     # the closer's light lines - near ink, not grey

TICK_RING = (198, 201, 207)
TICK_MARK = (60, 63, 70)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 88, 56, -0.041   # track is per-px of size
BODY_MAX, BODY_MIN = 34, 30
TITLE_GAP, PARA_GAP, PLATE_GAP = 34, 22, 60
PLATE_R = 20
LOGO_SZ, LOGO_GAP, LOGO_PAD = 62, 20, 46

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
WF = os.environ.get("WORKFLOWS", "../6 boring use cases example")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
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


def words_of(s):
    """`plain **bold** plain` -> [(word, is_bold, space_before)].

    The space flag is the whole point, and it has to be carried ACROSS the
    boundary rather than read off one side of it. Both halves bite:

        `the **caption**.`      -> `caption` and `.` rejoined as `caption .`
        `so **the work**`       -> `so` and `the` rejoined as `sothe`

    because the space that separates them belongs to the end of the run before,
    which `split()` has already thrown away. So whitespace is remembered as
    pending across parts. A token that did not follow any never takes a space
    and never starts a line."""
    out, bold, sp = [], False, False
    for part in s.split("**"):
        if part:
            sp = sp or part[:1].isspace()
            for i, wd in enumerate(part.split()):
                out.append((wd, bold, bool(out) and (sp if i == 0 else True)))
            sp = part[-1:].isspace()
        bold = not bold
    return out


def rich_lines(s, size, maxw):
    """Wrap into lines of (word, is_bold, space_before).

    Wrapping has to happen over the runs rather than over the plain string,
    because the bold face is wider and a line measured in Regular overflows once
    part of it is set in SemiBold."""
    reg, sem = F(size, "Regular"), F(size, "SemiBold")
    lines, cur, curw = [], [], 0.0
    for wd, b, sp in words_of(s):
        f = sem if b else reg
        gap = reg.getlength(" ") if sp else 0
        if cur and sp and curw + gap + f.getlength(wd) > maxw:
            lines.append(cur)
            cur, curw = [(wd, b, False)], f.getlength(wd)
        else:
            cur.append((wd, b, sp and bool(cur)))
            curw += gap + f.getlength(wd)
    if cur:
        lines.append(cur)
    return lines


def draw_line(d, x, y, ln, size, ink, dim):
    reg = F(size, "Regular")
    for wd, bold, sp in ln:
        if sp:
            x += reg.getlength(" ")
        f = F(size, "SemiBold" if bold else "Regular")
        d.text((x, y), wd, font=f, fill=ink if bold else dim, anchor="ls")
        x += f.getlength(wd)


def draw_rich(d, x, y, s, size, maxw, pitch, ink, dim):
    for ln in rich_lines(s, size, maxw):
        draw_line(d, x, y, ln, size, ink, dim)
        y += pitch
    return y


def grain(im, amount, seed=7):
    """Noise on the ground. A flat digital fill at this size looks like an empty
    canvas rather than a surface, and section 2 requires it outright on anything
    with a gradient - without it a big soft ramp bands visibly on export. The
    dark mesh gets roughly twice the paper's, because banding shows in shadow."""
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    n = np.random.default_rng(seed).normal(0, amount, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8)).convert("RGBA")


def tick(d, x, y, r=15):
    """Ring plus check. Drawn rather than an emoji, because a system glyph
    renders differently on every platform and reads as a text message."""
    d.ellipse([x - r, y - r, x + r, y + r], outline=TICK_RING, width=3)
    d.line([(x - r * .42, y + r * .02), (x - r * .08, y + r * .38)], fill=TICK_MARK, width=3)
    d.line([(x - r * .10, y + r * .38), (x + r * .46, y - r * .36)], fill=TICK_MARK, width=3)


def logo_row(im, names, cy):
    """The tools that are ACTUALLY in this slide's canvas, read off its node
    labels - not a category guess.

    That distinction is the whole defence for keeping the row at all. The design
    kit bans logos outright unless the subject genuinely is named tools, because
    marks placed for texture are the fastest way to make a page look cheap. It
    is right about a page someone dwells on. At 0.6s a row of marks is the
    fastest element on the frame, read in one glance and in parallel, while a
    sentence is still being parsed - so it stays, and it earns that by being
    true. If a mark is not in the canvas above it, it does not go in the row.

    Six of these did not exist and were baked into apps/web/public/tools rather
    than fetched, so this script keeps needing nothing but Pillow."""
    tiles = [Image.open(f"{LOGOS}/{n}.png").convert("RGBA").resize(
        (LOGO_SZ, LOGO_SZ), Image.LANCZOS) for n in names
        if os.path.exists(f"{LOGOS}/{n}.png")]
    if not tiles:
        return
    x = (W - (len(tiles) * LOGO_SZ + (len(tiles) - 1) * LOGO_GAP)) // 2
    for t in tiles:
        im.alpha_composite(t, (x, cy - LOGO_SZ // 2))
        x += LOGO_SZ + LOGO_GAP


def source(path):
    """Trim the alpha before doing anything else. Figma exports the FRAME, not
    the drawing: Group 2147203619 is 818x752 on canvas with 340px of nothing
    under it, so fitting the canvas scaled the one workflow that needed no
    scaling to 0.81x while the other five sat native, and six slides read as six
    unrelated pictures."""
    src = Image.open(path).convert("RGBA")
    bb = src.split()[3].getbbox()
    return src.crop(bb) if bb else src


def plate(im, src, k, top):
    """The screenshot, given the kit's cream-notes treatment: rounded, hairlined,
    and lifted off the ground by a wide soft shadow.

    Not the cream-slab dark-bezel treatment, which is the other option in the
    kit. That one exists so a bright screen has something to push against on a
    cream ground; an n8n canvas is already near-black, so a dark bezel around it
    would merge into one dark mass and the screen would stop reading as a
    screen."""
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [LEFT, top, LEFT + w, top + h]

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
    return box[3]


def title_lines(slide, tsz):
    return wrap(slide["title"], F(tsz, "Bold"), MEASURE, TITLE_TRACK * tsz)


def prose_shape(slide, sz):
    """Lines of prose - the page's vertical cost without drawing anything, so the
    plate can be solved before the first pixel."""
    return (len(wrap(slide["setup"], F(sz, "Medium"), MEASURE)) +
            sum(len(rich_lines(b, sz, MEASURE - 52)) for b in slide["lines"]))


def copy_end(slide, tsz, sz):
    # TITLE_GAP hangs off the title's DESCENDER, not its baseline. Measured off
    # the baseline it collapsed to nothing once the title stopped wrapping.
    return (SAFE_TOP + int(tsz * 0.727) + int(tsz * 0.24) + TITLE_GAP
            + prose_shape(slide, sz) * round(sz * 1.4)
            + len(slide["lines"]) * PARA_GAP)


def solve(slides):
    """One body size, one plate top and one plate scale for the whole set.

    Solved across the SET rather than per slide, because these are frames of a
    reel. Sized per slide the body landed on 32, 33 and 34 within the same six,
    and type that changes size between slides half a second apart reads as a
    rendering fault. Same argument for the plate: it is the heaviest object on
    the page and it may not move.

    Both sizes are the largest at which the whole set holds ONE shape - every
    title on one line, every prose block the same number of lines. Not "at which
    nothing overflows": a set where one slide's copy runs a line longer is a set
    with a plate that jumps.

    The title is solved for ONE LINE rather than for a matching count. At 0.6s a
    headline that wraps has already lost - the second line arrives after the eye
    has moved on - and a one-line title also hands 90px back to the artwork."""
    tsz = next((t for t in range(TITLE_MAX, TITLE_MIN - 1, -1)
                if all(len(title_lines(s, t)) == 1 for s in slides)), TITLE_MIN)
    best = None
    for sz in range(BODY_MAX, BODY_MIN - 1, -1):
        if len({prose_shape(s, sz) for s in slides}) == 1:
            best = sz
            break
    sz = best or BODY_MIN
    top = max(copy_end(s, tsz, sz) for s in slides) + PLATE_GAP
    # The row is pinned to the safe line, so the plate's band is what is left
    # between the copy and the row - and the plate is CENTRED in that band
    # rather than hung from its top. Hung from the top, a short canvas left 340px
    # of white above the row while a tall one left none, which is the dead band
    # the rules open with. Centred, the slack is halved and it is symmetrical, so
    # it reads as margin instead of as a hole.
    bot = SAFE_BOT - LOGO_SZ - LOGO_PAD
    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides)
    k = min(PLATE_W / 818, (bot - top) / tall)
    return dict(sz=sz, tsz=tsz, band=(top, bot), k=k, uniform=best is not None,
                logo_y=SAFE_BOT - LOGO_SZ // 2)


def build(slide, L):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 3.0)
    d = ImageDraw.Draw(im)
    sz, pitch = L["sz"], round(L["sz"] * 1.4)

    tsz = L["tsz"]
    y = SAFE_TOP + int(tsz * 0.727)                  # cap-top -> baseline
    draw_tracked(d, (LEFT, y), title_lines(slide, tsz)[0], F(tsz, "Bold"), INK,
                 TITLE_TRACK * tsz)
    y += int(tsz * 0.24) + TITLE_GAP

    # The lead is the heaviest and darkest line in the block, not the lightest.
    for ln in wrap(slide["setup"], F(sz, "Medium"), MEASURE):
        d.text((LEFT, y), ln, font=F(sz, "Medium"), fill=INK, anchor="ls")
        y += pitch
    y += PARA_GAP

    for b in slide["lines"]:
        tick(d, LEFT + 15, y - int(sz * 0.30))
        y = draw_rich(d, LEFT + 52, y, b, sz, MEASURE - 52, pitch, INK, BODY) + PARA_GAP

    src = source(f"{WF}/{slide['workflow']}")
    top, bot = L["band"]
    bottom = plate(im, src, L["k"], top + (bot - top - round(src.height * L["k"])) // 2)
    logo_row(im, slide["logos"], L["logo_y"])
    return im, dict(copy_end=y - PARA_GAP, bottom=bottom)


def build_cta(c):
    """The closer, on the SAME PAPER as the bodies.

    An earlier pass built the kit's inverted `cta-cream-notes` page - dark mesh,
    amber accent, a filled pill - and it was wrong for a reel. A carousel closer
    can invert because you arrive at it by swiping and the change of ground
    reads as "this is the end". In a reel a dark frame is a CUT, and a cut at
    the end reads as a different video rather than as the end of this one.

    The pass after that was the right page with the wrong type. Measured off the
    reference, its stack runs on a NEARLY CONSTANT 106px leading with only about
    1.35x between its lightest and heaviest line. The rebuild had 22px gaps and
    a 1.8x range, which turned five lines into five separate objects instead of
    one block. Weight carries the emphasis, size barely moves - same rule as
    stack-note.py, and for the same reason."""
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    d = ImageDraw.Draw(im)
    rows, pitches = c["stack"], c["pitch"]
    block = sum(pitches) + int(rows[-1][1] * 0.727)
    y = (SAFE_TOP + SAFE_BOT - block) // 2 + int(rows[0][1] * 0.727)

    for i, (t, sz, w) in enumerate(rows):
        d.text((W // 2, y), t, font=F(sz, w),
               fill=SOFT if w == "Regular" else INK, anchor="ms")
        if i < len(pitches):
            y += pitches[i]
    return im, dict(copy_end=0, bottom=y)


# The reference's own copy, back to clauses. An earlier pass rewrote all
# eighteen lines as two-line outcome sentences because section 6 says outcomes,
# not tasks - correct for a carousel, wrong at 0.6s a frame, where nobody reads
# prose. The bolded clause is what lands; everything around it is scaffolding.
#
# `logos` is read off each canvas's node labels, never guessed. n8n leads every
# row because every one of these IS an n8n canvas. Five workflows, not six:
# Group 2147203619 and Group 2147203619-1 are two exports of the SAME F5 install
# pipeline, so the sixth slide has no artwork and is not rendered.
SLIDES = [
    dict(title="AI content engine agent",
         setup="You turn one script into finished video.",
         lines=["Script and voiceover generated in **one pass**",
                "Shots, avatar and captions **assembled for you**",
                "Every render **logged with its status**"],
         workflow="Group 2147203098.png",
         logos=["n8n", "openai", "baserow"]),

    dict(title="AI publishing agent",
         setup="You post everywhere without touching a phone.",
         lines=["One brief becomes **a post per platform**",
                "Image generated and **approved before it ships**",
                "Results come back to you **in one message**"],
         workflow="Group 2147203103.png",
         logos=["n8n", "openai", "google-gemini", "instagram", "x",
                "facebook", "linkedin", "gmail", "telegram"]),

    dict(title="AI research & spy agent",
         setup="You find what’s working before everyone else.",
         lines=["Trending repos pulled **every 24 hours**",
                "Summarised down to **what actually changed**",
                "Filed and emailed **before you ask for it**"],
         workflow="Group 2147203101.png",
         logos=["n8n", "github", "google-gemini", "gmail"]),

    dict(title="AI sales & growth agent",
         setup="You generate leads with a repeatable system.",
         lines=["Businesses pulled straight from **the map**",
                "Sites scraped and **emails extracted**",
                "Outreach written and sent **by the agent**"],
         workflow="my-first-n8n-workflow-v0-562n19bdcfpf1 2.png",
         logos=["n8n", "google-maps", "openrouter", "gmail"]),

    dict(title="AI ops & infra agent",
         setup="You ship upgrades without a maintenance window.",
         lines=["Standby node found and **upgraded first**",
                "Every image **checksum verified before install**",
                "Failures **stop the loop instead of the fleet**"],
         workflow="Group 2147203619.png",
         logos=["n8n", "f5"]),
]

# Section 6 again: the closing line is the single best sentence in the set. It is
# also the only place the accent appears, and the only place the frame asks for
# anything. It asks for a read, not a comment - the caption carries the keyword,
# same standing rule as every other format here.
# THE CTA IS ALWAYS COMMENT. Not "read caption" - that rule came off the
# state-overlay format and does not belong here. This is the reference's own
# close, word for word, and it is the close for this format from now on.
#
# Curly quotes because they are the reference's. push-vault.py refuses a quote
# in a CAPTION, which is a different thing: that ban is about what gets typed
# into Instagram, not about what is drawn on a frame.
#
# Sizes and leading are measured off the reference rather than chosen:
# 74/90/74/100/62 on a 106px rhythm that only opens up before the last line.
CTA = dict(stack=[("comment", 74, "Regular"),
                  ("“AI”", 90, "Bold"),
                  ("for my full", 74, "Regular"),
                  ("BLUEPRINT", 100, "ExtraBold"),
                  ("100% FREE", 62, "Bold")],
           pitch=[106, 106, 108, 126])


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/slides"
    os.makedirs(out, exist_ok=True)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape at any size down to {BODY_MIN}px - "
              f"the plate will sit lower than it needs to. rewrite the odd one out.")
    print(f"  title {L['tsz']}  body {L['sz']}  "
          f"plate band {L['band'][0]}..{L['band'][1]} at {L['k']:.3f}x\n")

    made = []
    for i, (s, fn) in enumerate([(s, build) for s in SLIDES] + [(CTA, build_cta)], 1):
        im, m = fn(s, L) if fn is build else fn(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        bad = []
        if m["copy_end"] > L["band"][0] - 24:
            bad.append("COPY INTO PLATE")
        if m["bottom"] > SAFE_BOT:
            bad.append("PAST THE SAFE LINE")
        name = s.get("title", "closer")
        print(f"  {i:02d}  {name:30} ends {m['bottom']:4d}  {'  '.join(bad)}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

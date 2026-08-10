#!/usr/bin/env python3
"""Body slides and the closer for the n8n reels - 1080x1920 frames, not overlays.

Built against `carousel-design-kit/DESIGN-RULES.md`. That kit renders at
1080x1350 and we render at 1080x1920, but the frames are the SAME WIDTH and the
usable height is nearly the same too - their page is 1124px between paddings,
our reel-safe band is 1190px between the chrome. So the kit's numbers transfer
almost 1:1 and are used directly rather than rescaled. Type size follows frame
width and viewing distance, and neither of those changed.

Eight slides, two page shapes, and the second one is the inverse of the first:

    body   paper ground, black type, the workflow on a lifted plate
    cta    dark mesh, reversed type, the accent, one filled pill

That inversion is the kit's own structure (`body-cream-notes` against
`cta-cream-notes`) and it is what lets the family hold one accent. The bodies
are achromatic on purpose - the only colour on them is the screenshot's own, so
the canvas is the thing your eye goes to. The accent is saved for the closer,
where section 6 says the best sentence in the set gets reversed out of a filled
field.

What the kit cost the first two drafts, in the order the rules are listed there:

  HARD BAN, logos. The first draft carried a row of four to six tool logos per
  slide, guessed by category. "logos without genuinely named tools produces the
  exact logos-for-the-sake-of-logos failure the rules ban." The subject of these
  slides is an agent, not a toolchain. Row deleted.

  HARD BAN, uppercase. Titles were set ALL CAPS off the reference. Sentence case
  everywhere, no exceptions listed.

  Section 6, one bolded clause per line, and outcomes rather than tasks. Draft
  two had the bold but still had the reference's task list - "turn repetitive
  ops into automated workflows" is a thing you do, not a thing that is true
  afterwards. Rewritten as what is true afterwards, which is also what filled
  the page: a task fits on one line, an outcome does not.

  Section 6, the lead line. Draft one set it lighter than the lines under it.
  The kit's `.lead` is the DARKEST and heaviest thing in the prose block. It is
  the sentence that has to land if nothing else does, so it was backwards.

  Section 4, the dead band. Draft one left 130-320px of slack above the plate no
  matter where the plate was pinned, and centring only spreads a hole. Fixed
  twice over: the kit's display sizes (88px title, 32px body), then real
  sentences instead of clauses.

  Section 7, render and look at it. Four passes. Nothing here shipped first try.

Two deliberate deviations, both because the kit assumes a static carousel:

  Grain on the ground only, never over the plate. Every family in the kit paints
  grain over the whole page. Their screenshots are marketing pages set at 40px;
  ours are n8n canvases whose node labels are 8px, and noise over 8px type is
  mush. The paper gets it, the mesh needs it, the screenshot never.

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
LEFT, MEASURE = 88, 820                 # 88..908, clears the rail at 950

# The kit's palette, not ours. Ink #16130E rather than #111, and a ground with
# a little warmth in it: a pure #FFF ground next to Instagram's own white chrome
# reads as a screenshot of a browser, a warm one reads as paper.
GROUND = (250, 248, 244)
INK = (22, 19, 14)
BODY = (68, 65, 60)                     # ink at 80% over the ground, the kit's .lines p

DARK = (27, 23, 18)                     # #1B1712
LIGHT = (247, 238, 225)                 # #F7EEE1
MUTED = (185, 177, 166)                 # light at 72% over the mesh
ACCENT = (232, 162, 108)                # #E8A26C - the family's only accent, closer only
DRULE = (76, 69, 60)                    # light at 20%

TITLE_SZ, TITLE_TRACK, TITLE_PITCH = 88, -3.6, 90
BODY_MAX, BODY_MIN = 34, 30
TITLE_GAP, PARA_GAP, PLATE_GAP = 34, 20, 56
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


def mesh(layers, base):
    """The kit's four-stop radial mesh, as numpy rather than CSS.

    `radial-gradient(rx ry at cx cy, COL 0%, transparent stop)` - the ending
    shape is an ellipse of rx by ry as a fraction of the box, and the ray runs
    from the centre to that shape, so alpha is 1 - t/stop clipped. CSS paints the
    FIRST listed layer on top, hence the reversed loop."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    out = np.full((H, W, 3), base, dtype=np.float32)
    for cx, cy, rx, ry, col, stop in reversed(layers):
        t = np.sqrt(((xx - cx * W) / (rx * W)) ** 2 + ((yy - cy * H) / (ry * H)) ** 2)
        a = np.clip(1 - t / stop, 0, 1)[..., None]
        out = out * (1 - a) + np.array(col, dtype=np.float32) * a
    return Image.fromarray(out.astype(np.uint8)).convert("RGBA")


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


def copy_shape(slide, sz):
    """(lines in the title, lines in the prose) - the page's whole vertical cost
    without drawing anything, so the plate can be solved before the first pixel."""
    return (len(wrap(slide["title"], F(TITLE_SZ, "Bold"), MEASURE, TITLE_TRACK)),
            len(wrap(slide["setup"], F(sz, "Medium"), MEASURE)) +
            sum(len(rich_lines(b, sz, MEASURE)) for b in slide["lines"]))


def copy_end(slide, sz):
    t, p = copy_shape(slide, sz)
    pitch = round(sz * 1.4)
    return (SAFE_TOP + int(TITLE_SZ * 0.727) + t * TITLE_PITCH + TITLE_GAP
            + p * pitch + len(slide["lines"]) * PARA_GAP)


def solve(slides):
    """One body size, one plate top and one plate scale for the whole set.

    Solved across the SET rather than per slide, because these are frames of a
    reel. Sized per slide the body landed on 32, 33 and 34 within the same six,
    and type that changes size between slides half a second apart reads as a
    rendering fault. Same argument for the plate: it is the heaviest object on
    the page and it may not move.

    The body size is the largest at which the whole set holds ONE shape - every
    title the same number of lines, every prose block the same number of lines.
    Not "at which nothing overflows": a set where one slide's copy runs a line
    longer is a set with a plate that jumps."""
    best = None
    for sz in range(BODY_MAX, BODY_MIN - 1, -1):
        shapes = {copy_shape(s, sz) for s in slides}
        if len(shapes) == 1:
            best = sz
            break
    sz = best or BODY_MIN
    top = max(copy_end(s, sz) for s in slides) + PLATE_GAP
    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides)
    k = min(MEASURE / 818, (SAFE_BOT - top) / tall)
    return dict(sz=sz, top=top, k=k, uniform=best is not None)


def build(slide, L):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 3.0)
    d = ImageDraw.Draw(im)
    sz, pitch = L["sz"], round(L["sz"] * 1.4)

    y = SAFE_TOP + int(TITLE_SZ * 0.727)             # cap-top -> baseline
    for ln in wrap(slide["title"], F(TITLE_SZ, "Bold"), MEASURE, TITLE_TRACK):
        draw_tracked(d, (LEFT, y), ln, F(TITLE_SZ, "Bold"), INK, TITLE_TRACK)
        y += TITLE_PITCH
    y += TITLE_GAP

    # The lead is the heaviest and darkest line in the block, not the lightest.
    for ln in wrap(slide["setup"], F(sz, "Medium"), MEASURE):
        d.text((LEFT, y), ln, font=F(sz, "Medium"), fill=INK, anchor="ls")
        y += pitch
    y += PARA_GAP

    for b in slide["lines"]:
        y = draw_rich(d, LEFT, y, b, sz, MEASURE, pitch, INK, BODY) + PARA_GAP

    src = source(f"{WF}/{slide['workflow']}")
    bottom = plate(im, src, L["k"], L["top"])
    return im, dict(copy_end=y - PARA_GAP, bottom=bottom)


def build_cta(c):
    """The closer, inverted. Section 6: the closing line is the single best
    sentence in the set and it gets reversed out of a filled field, so it is the
    one page that is not paper - and the one page that carries the accent."""
    # Hotspot at 28% rather than the kit's 8%. Their page is 1350 tall so 8% sits
    # just above the headline; on 1920 the same fraction throws the light into
    # the empty top band and leaves the type in the dark half.
    im = grain(mesh([(0.80, 0.28, 0.96, 0.74, (74, 61, 49), 0.46),
                     (0.16, 0.34, 1.20, 0.92, (42, 35, 28), 0.52),
                     (0.70, 0.96, 1.30, 1.00, (23, 19, 16), 0.58),
                     (0.04, 0.98, 1.10, 0.95, (13, 10, 8), 0.56)], DARK), 5.0)
    d = ImageDraw.Draw(im)

    h1 = wrap(c["title"].replace("**", ""), F(108, "Bold"), MEASURE, -4.5)
    body = [rich_lines(p, 32, MEASURE) for p in c["body"]]
    # The accent run is whole words, marked in the copy the way bold is, and
    # resolved per word rather than per line.
    hot = set(c["title"].split("**")[1].split()) if "**" in c["title"] else set()
    big = F(108, "Bold")

    def place(y, ink=None):
        """One pass. Called once with ink=None to find the height and once to
        draw, so the two can never disagree - a hand-written height formula for
        this block was 23px out and pushed the pill past the safe line."""
        if ink:
            d.text((LEFT, y), c["eyebrow"], font=F(28, "Medium"), fill=ACCENT, anchor="ls")
        y += 28 + int(108 * 0.727)
        for ln in h1:
            x = LEFT
            for wd in ln.split():
                if ink:
                    draw_tracked(d, (x, y), wd, big,
                                 ACCENT if wd.strip(".,") in hot else LIGHT, -4.5)
                x += adv(wd, big, -4.5) + big.getlength(" ") - 4.5
            y += 105
        y += 44 - int(108 * 0.727) + int(32 * 0.727)
        for b in body:
            for ln in b:
                if ink:
                    draw_line(d, LEFT, y, ln, 32, LIGHT, MUTED)
                y += 45
            y += 20
        y += 46
        if ink:
            d.line([(LEFT, y), (LEFT + MEASURE, y)], fill=DRULE, width=1)
        y += 34
        if ink:
            bw = adv(c["button"], F(28, "SemiBold"), -0.5) + 88
            d.rounded_rectangle([LEFT, y, LEFT + bw, y + 86], radius=15, fill=LIGHT)
            draw_tracked(d, (LEFT + 44, y + 55), c["button"], F(28, "SemiBold"), INK, -0.5)
            d.text((LEFT + bw + 28, y + 55), c["signoff"], font=F(24, "Medium"),
                   fill=MUTED, anchor="ls")
        return y + 86

    # Bottom-aligned on the safe line, not centred in it. The body slides all end
    # with a plate against 1440, so a closer that floats in the middle of the
    # frame reads as a different deck. Section 4 again: the filled pill is the
    # only real mass on this page and it belongs in the half that needs it.
    top = SAFE_BOT - (place(39) - 39)
    return im, dict(copy_end=0, bottom=place(top, ink=True))


# The reference's substance, rewritten as outcomes. Section 6: "Timeline editor
# working", never "Build the timeline editor" - and a task fits on one line while
# an outcome does not, which is most of what filled the page. Each workflow was
# matched to a title by reading its node labels, not its filename.
SLIDES = [
    dict(title="AI ops & management agent",
         setup="You make the business run without you.",
         lines=["Every repeating process runs on a schedule, so "
                "**the work happens whether you show up or not**.",
                "Tasks and handoffs land already assigned, so "
                "**nothing waits on someone remembering**.",
                "The weekly rollup arrives before you ask for it, so "
                "**a number that slips is caught in days**."],
         workflow="Group 2147203098.png"),

    dict(title="AI content engine agent",
         setup="You turn attention into daily content output.",
         lines=["One idea goes in and **ten finished assets come out**, captioned "
                "for the platform each is going to.",
                "The same piece gets repurposed everywhere on its own, so "
                "**publishing stops being a daily decision**.",
                "Output holds through the weeks you have nothing to say, which is "
                "**where most accounts quietly stop**."],
         workflow="Group 2147203103.png"),

    dict(title="AI product & dev agent",
         setup="You ship features fast without chaos.",
         lines=["Build, check and rollback run the same way every time, so "
                "**shipping stops depending on who is on**.",
                "A messy voice note comes back as **a clean spec with the tasks "
                "already written** and assigned.",
                "Clients pay for the system rather than the hours, which is "
                "**how a retainer holds at $3K a month**."],
         workflow="Group 2147203619-1.png"),

    dict(title="AI sales & growth agent",
         setup="You generate revenue with repeatable systems.",
         lines=["Offers get written against what the market responded to, not "
                "**whatever sounded good on the call**.",
                "Leads arrive on a schedule from outreach that runs itself, so "
                "**the pipeline stops tracking your mood**.",
                "Each week the close rate is measured and one thing changes, so "
                "**the number moves, not the argument**."],
         workflow="my-first-n8n-workflow-v0-562n19bdcfpf1 2.png"),

    dict(title="AI research & spy agent",
         setup="You find what’s working before everyone else does.",
         lines=["Competitor ads, hooks and offers get read daily, so "
                "**you see the shift while it is still a shift**.",
                "Trends surface out of what people are shipping, not out of "
                "**somebody’s opinion about next year**.",
                "Each finding lands as something you can run this week, so "
                "**research stops being a dead folder**."],
         workflow="Group 2147203101.png"),

    dict(title="AI funnel & lead gen agent",
         setup="You turn traffic into customers at scale.",
         lines=["The step where people quietly leave gets found and named, so "
                "**you fix the leak, not the ad spend**.",
                "Tests launch and report on their own, so **the funnel improves on "
                "a weekly cycle**, not a yearly one.",
                "What works gets scaled on purpose, which is **the gap between "
                "a good month and a growth loop**."],
         workflow="Group 2147203619.png"),
]

# Section 6 again: the closing line is the single best sentence in the set. It is
# also the only place the accent appears, and the only place the frame asks for
# anything. It asks for a read, not a comment - the caption carries the keyword,
# same standing rule as every other format here.
CTA = dict(eyebrow="the boring ones",
           title="Boring is where **the money is**.",
           body=["Nobody posts the ops agent that quietly files things correctly every "
                 "morning. **It is the one that pays for itself by March.**",
                 "Every canvas above, what each node actually does and where it broke "
                 "first, is written out in the **caption**."],
           button="read the caption",
           signoff="no link, no DM, it is right there")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/slides"
    os.makedirs(out, exist_ok=True)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape at any size down to {BODY_MIN}px - "
              f"the plate will sit lower than it needs to. rewrite the odd one out.")
    print(f"  body {L['sz']}  plate {L['top']} at {L['k']:.3f}x\n")

    made = []
    for i, (s, fn) in enumerate([(s, build) for s in SLIDES] + [(CTA, build_cta)], 1):
        im, m = fn(s, L) if fn is build else fn(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        bad = []
        if m["copy_end"] > L["top"] - 24:
            bad.append("COPY INTO PLATE")
        if m["bottom"] > SAFE_BOT:
            bad.append("PAST THE SAFE LINE")
        name = s.get("title", "").replace("**", "")
        print(f"  {i:02d}  {name:30} ends {m['bottom']:4d}  {'  '.join(bad)}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

#!/usr/bin/env python3
"""The wrong-vs-right deck - 1080x1920 reel frames.

The third family. What makes it its own thing is the PAIR at the bottom: the
cost of not having the agent, a rule, then what you get instead. Everything else
on the frame exists to set that up.

    slide-body.py    left edge, dark canvas, tick list
    slide-agent.py   centred, light canvas, blurb, CTA pill on every frame
    slide-pair.py    left edge, dark canvas, numbered, the wrong/right pair

The pair carries its weight through CONTRAST, not through colour. The cross sits
in a hollow ring in the muted ink and the check sits in a SOLID ink disc with the
mark knocked out of it. That asymmetry is the argument: one is an outline of a
problem, the other is a filled answer. Colour-coding it red and green would say
the same thing louder and cheaper, and would be the only colour on an otherwise
achromatic frame - the canvas is supposed to be the only thing with hue on it.

Two rules from `carousel-design-kit/DESIGN-RULES.md` are broken here on purpose:

  Section 1 bans numbers on slides outright - no step numbers, no counters. It
  is right for a carousel, where you set your own pace and a counter is noise.
  At 0.5-0.8s a frame a numeral is the only thing telling you where you are in
  the run and that there is more coming, and it is read before any word on the
  frame is.

  Section 1 bans logo rows. Not used here at all, so the question does not
  arise - this deck's bottom third is the pair, and a row of marks under it
  would compete with the one thing the frame is for.

Everything that could move between frames is solved across the SET: one title
size, one blurb size, one canvas scale, one baseline for each half of the pair.
An element that shifts 40px between two frames half a second apart reads as a
rendering fault rather than as a layout.
"""
import glob
import importlib.util
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

_spec = importlib.util.spec_from_file_location(
    "slide_body", os.path.join(os.path.dirname(os.path.abspath(__file__)), "slide-body.py"))
SB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SB)
F, adv, wrap, draw_tracked, grain, source = SB.F, SB.adv, SB.wrap, SB.draw_tracked, SB.grain, SB.source

# 1080x1920 REEL FRAME. An earlier pass took the word "carousel" and rendered
# these at 1080x1350 to dodge a feed crop, which cost 570px of frame to solve a
# problem a reel does not have - a reel is never cropped, its UI is drawn ON TOP.
# The only thing that bites is the RIGHT RAIL at x > 950.
W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
# EQUAL MARGINS. The rail covers x > 950, so the right margin is forced to 130.
# Using 60 on the left gave a block at 60..950 - 60 one side, 130 the other - and
# it reads as shoved left, because it is. The margin the rail forces sets BOTH:
# 130..950 is 820 wide, centred on the frame at 540, right edge exactly on the
# rail. 70px narrower than before and worth every one of them.
LEFT, RIGHT = 130, 950
                                         # covers x > 950. Nothing crosses it.
M_TITLE, M_BLURB, M_PAIR = 820, 740, 820

GROUND = (252, 251, 249)
INK = (18, 17, 16)
NUM = (176, 172, 166)                    # the numeral, deliberately quiet
BLURB = (110, 106, 100)
PAIR_INK = (34, 32, 30)
RULE = (226, 223, 218)
RING = (188, 184, 178)

TITLE_MAX, TITLE_MIN, TITLE_TRACK = 88, 56, -0.032
BLURB_MAX, BLURB_MIN, BLURB_LEAD = 40, 34, 1.44
PAIR_SZ, PAIR_LEAD = 44, 1.34
# The gap under the title hangs off its DESCENDER and still has to clear a 60px
# cap height. 34 put the blurb's ascenders in the title's tail and is the single
# thing that made this read as cramped.
TITLE_GAP, BLURB_GAP = 58, 58
MARK_R, MARK_GAP, PAIR_GAP, RULE_GAP = 28, 22, 48, 40
PLATE_W, PLATE_R = 820, 24               # 60..950, stops AT the rail
BX = W // 2

CLOSER_INK, CLOSER_DIM = INK, BLURB

WF = os.environ.get("WORKFLOWS", "../another no name workflow")


def cross(d, cx, cy):
    """A HOLLOW ring. The problem is an outline."""
    d.ellipse([cx - MARK_R, cy - MARK_R, cx + MARK_R, cy + MARK_R],
              outline=RING, width=3)
    a = MARK_R * 0.42
    d.line([(cx - a, cy - a), (cx + a, cy + a)], fill=RING, width=3)
    d.line([(cx - a, cy + a), (cx + a, cy - a)], fill=RING, width=3)


def check(d, cx, cy):
    """A SOLID disc with the mark knocked out. The answer has mass."""
    d.ellipse([cx - MARK_R, cy - MARK_R, cx + MARK_R, cy + MARK_R], fill=INK)
    d.line([(cx - MARK_R * .46, cy + MARK_R * .04), (cx - MARK_R * .10, cy + MARK_R * .40)],
           fill=(255, 255, 255), width=4)
    d.line([(cx - MARK_R * .12, cy + MARK_R * .40), (cx + MARK_R * .50, cy - MARK_R * .38)],
           fill=(255, 255, 255), width=4)


def plate(im, src, k, top):
    # Drop the export's own 1px frame first, or a 20px radius rounds over it and
    # leaves a hairline arcing round the corners.
    src = src.crop((2, 2, src.width - 2, src.height - 2))
    w, h = round(src.width * k), round(src.height * k)
    src = src.resize((w, h), Image.LANCZOS)
    box = [LEFT, top, LEFT + w, top + h]

    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 24, box[1] + 38, box[2] - 24, box[3] + 10], radius=PLATE_R,
        fill=(70, 62, 52, 96))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    # Hairline on its own layer: ImageDraw on RGBA writes alpha rather than
    # blending it, so a translucent outline punches a hole and flattens to white.
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle(box, radius=PLATE_R,
                                         outline=(18, 17, 16, 34), width=1)
    im.alpha_composite(ov)
    return box[3]


def head(s, tsz):
    return f"{s['n']}. {s['title']}"


def shape(s, tsz, bsz):
    return (len(wrap(head(s, tsz), F(tsz, "Bold"), M_TITLE, TITLE_TRACK * tsz)),
            len(wrap(s["blurb"], F(bsz, "Regular"), M_BLURB)),
            len(wrap(s["wrong"], F(PAIR_SZ, "Medium"), M_PAIR)),
            len(wrap(s["right"], F(PAIR_SZ, "SemiBold"), M_PAIR)))


def solve(slides):
    """One of everything, for the whole SET, and the canvas absorbs the rest.

    The sizes are the largest at which the set holds ONE SHAPE - every title on
    one line, every blurb the same number of lines, both halves of every pair on
    one line. Not "at which nothing overflows": a slide whose blurb runs a line
    longer is a slide whose canvas and whose pair both jump."""
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
    plines = max(max(shape(s, tsz, bsz)[2:]) for s in slides)

    tall = max(source(f"{WF}/{s['workflow']}").height for s in slides)
    k = PLATE_W / 818
    canvas = round(tall * k)
    ptext = round(PAIR_SZ * PAIR_LEAD) * plines
    fixed = (int(tsz * .727) + int(tsz * .24) + TITLE_GAP + blines * round(bsz * BLURB_LEAD)
             + BLURB_GAP + PAIR_GAP + MARK_R * 2 + MARK_GAP + ptext
             + RULE_GAP * 2 + MARK_R * 2 + MARK_GAP + ptext)
    if fixed + canvas > SAFE_BOT - SAFE_TOP:
        k = (SAFE_BOT - SAFE_TOP - fixed) / tall
        canvas = round(tall * k)
    return dict(tsz=tsz, bsz=bsz, blines=blines, plines=plines, k=k, canvas=canvas,
                block=fixed + canvas, top=(SAFE_TOP + SAFE_BOT - fixed - canvas) // 2,
                uniform=len({shape(s, tsz, bsz) for s in slides}) == 1)


def build(s, L):
    im = grain(Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    d = ImageDraw.Draw(im)
    tsz, bsz = L["tsz"], L["bsz"]

    # The numeral is set in the same face and size as the name but in a much
    # lighter ink, so it reads as an index rather than as a word.
    y = L["top"] + int(tsz * .727)
    x = draw_tracked(d, (LEFT, y), f"{s['n']}.", F(tsz, "Bold"), NUM, TITLE_TRACK * tsz)
    draw_tracked(d, (x + F(tsz, "Bold").getlength(" "), y), s["title"], F(tsz, "Bold"),
                 INK, TITLE_TRACK * tsz)
    y += int(tsz * .24) + TITLE_GAP

    for line in wrap(s["blurb"], F(bsz, "Regular"), M_BLURB):
        d.text((LEFT, y), line, font=F(bsz, "Regular"), fill=BLURB, anchor="ls")
        y += round(bsz * BLURB_LEAD)
    y += BLURB_GAP

    bottom = plate(im, source(f"{WF}/{s['workflow']}"), L["k"], y)
    y = bottom + PAIR_GAP

    pitch = round(PAIR_SZ * PAIR_LEAD)
    for mark, text, face in ((cross, s["wrong"], "Medium"), (check, s["right"], "SemiBold")):
        mark(d, LEFT + MARK_R, y + MARK_R)
        yy = y + MARK_R * 2 + MARK_GAP + int(PAIR_SZ * .727)
        for line in wrap(text, F(PAIR_SZ, face), M_PAIR):
            d.text((LEFT, yy), line, font=F(PAIR_SZ, face), fill=PAIR_INK, anchor="ls")
            yy += pitch
        y += MARK_R * 2 + MARK_GAP + pitch * L["plines"]
        if mark is cross:
            d.line([(LEFT, y + RULE_GAP - 8), (LEFT + M_PAIR, y + RULE_GAP - 8)],
                   fill=RULE, width=1)
            y += RULE_GAP * 2
    return im, dict(bottom=y)


def build_closer(c):
    im = ground() if "ground" in globals() else grain(
        Image.new("RGBA", (W, H), (*GROUND, 255)), 2.0)
    y = SB.draw_closer(ImageDraw.Draw(im), c, RIGHT - LEFT, SAFE_TOP, SAFE_BOT,
                       CLOSER_INK, CLOSER_DIM)
    return im, dict(bottom=y)


# The reference's copy, word for word, with one correction. Their deck has a
# copy-paste fault from slide 4 on: Support and SM Content carry the SAME pair
# ("Refunds and chargebacks" / "Instant replies 24/7"), and the pair printed
# under AutoInvoice ("2-4 hours per post" / "Daily posting without more work")
# is plainly SM Content's. The rows are shifted by one. Support keeps the pair
# that fits it, SM Content gets its own back, and AutoInvoice needed a new one.
#
# Seven canvases, seven agents. The folder holds eight files but 2.png and
# 2-1.png are byte-identical. Names and order are assigned rather than derived -
# the exports carry neither.
SLIDES = [
    dict(n="01", title="Routing Agent", workflow="2-1.png",
         blurb="Leads come in. Then someone forgets to reply. This agent makes "
               "sure every lead gets attention.",
         wrong="Leads wait 5-60 minutes for a reply",
         right="24/7 capture without more people"),

    dict(n="02", title="Cold Email Agent", workflow="3.png",
         blurb="You have seen copy-paste emails. You ignore them. This agent "
               "helps your message sound real.",
         wrong="Cost per booked call: $150-$300",
         right="Cost per booked call: $20-$40"),

    dict(n="03", title="Follow up Agent", workflow="5.png",
         blurb="Most deals do not fail. They are just forgotten. This agent "
               "remembers to follow up when you do not.",
         wrong="Manual follow ups take 1-2 hours a day",
         right="10% more booking rate"),

    dict(n="04", title="Support Agent", workflow="573712346.png",
         blurb="Customers do not want to wait. This agent replies instantly and "
               "steps in only when needed.",
         wrong="Refunds and chargebacks",
         right="Instant replies 24/7"),

    dict(n="05", title="SM Content Agent", workflow="6.png",
         blurb="You want to post consistently. This agent takes one piece of "
               "content and turns it into 20 copies.",
         wrong="2-4 hours per post",
         right="Daily posting without more work"),

    dict(n="06", title="AutoInvoice Agent", workflow="7.png",
         blurb="You know how bills pile up? This agent just keeps things clean "
               "so payments do not get delayed.",
         wrong="Invoices go out days after the work",
         right="Sent the moment the job is done"),

    dict(n="07", title="Onboarding Agent", workflow="8.png",
         blurb="The first experience matters. This agent guides your customers "
               "clearly through your product.",
         wrong="40% of users never activate",
         right="Users reach the first win faster"),
]

# THE CTA IS ALWAYS COMMENT. Five short rows, every one of them able to be set
# large - the previous copy carried "and I will send you", nineteen characters
# that capped the whole stack's size and said nothing. The number is a NUMERAL:
# at 0.6s a figure is read and a word is parsed.
#
# Sizes are RELATIVE. fit_closer scales them until the widest line hits the
# measure or the stack fills the safe box, whichever binds first, so the copy can
# change without anyone re-picking numbers.
CLOSER = [("comment", "Medium", 0.42),
          ("“AI”", "ExtraBold", 1.00),
          ("and get", "Medium", 0.40),
          ("all 7 builds", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/pairs"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    L = solve(SLIDES)
    if not L["uniform"]:
        print(f"  the set does not hold one shape down to {BLURB_MIN}px - "
              f"rewrite the odd one out.")
    print(f"  title {L['tsz']}  blurb {L['bsz']} x{L['blines']}  pair x{L['plines']}  "
          f"canvas at {L['k']:.3f}x  block {L['top']}..{L['top'] + L['block']} "
          f"in {SAFE_TOP}..{SAFE_BOT}\n")

    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s, L)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {(s.get('title','closer') if isinstance(s, dict) else 'closer'):20} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")

    TWd = 268
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

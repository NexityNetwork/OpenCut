#!/usr/bin/env python3
"""The hook frames - one 1080x1920 card per hook, each one its own post.

    python3 slide-hook.py brand/hooks h016 h030 h034     # a few
    python3 slide-hook.py brand/hooks --all              # the whole book

NOT A CAROUSEL. Every hook is a single frame and a single vault item, because a
hook IS the post - the body already exists somewhere else and gets attached
later. Rendering 43 hooks into one deck would make one post out of forty-three.

THE HOOK IS THE ONLY THING ON THE FRAME. Marks, headline, and the ask. No
subtitle explaining the headline, no list under it, no logo row that is really a
tool list. At 0.5s a second idea is not a bonus, it is the thing that stops the
first one landing.

NO GREY. Every glyph is the same ink and contrast comes from WEIGHT and SIZE.
On a #1A1A1A card grey is the first thing to vanish on a phone at arm's length,
and a grey supporting line under a white headline is two tones doing one job.

THE MARKS ARE THE SUBJECT, NOT DECORATION. A hook about selling agents gets
ultron. A hook naming Claude and n8n gets both. A hook about nothing in
particular gets ultron alone, because the frame still has to say whose it is.
Two marks take a `+` between them the way the reference sets them; three or more
drop to a row at half size, because four big tiles is a stack diagram.

THE HEADLINE IS SOLVED, NOT PICKED. One size for the whole frame, the largest
that fits the measure at an acceptable line count. `|` in the copy is a
deliberate break and is obeyed exactly; everything else is balanced so the last
line is never a widow.

THE TYPE SPEC IS COPIED OFF THE FIGMA PANEL, NOT ESTIMATED. Inter, 60, line
height 110 percent, letter spacing MINUS ONE PERCENT, centred; the ask is 42
Regular at the same tracking with a long arrow. Three passes were spent guessing
these off compressed screenshots and each one was wrong in a different way - an
84px headline running the full measure, then the right sizes at 1.24 leading,
then 1.13 with a 28px tracked-out ask. The tracking is why: PIL has no
letter-spacing, so untracked Inter measures wider than the same line in the file,
every solved size came out a step small, and the rest of the layout got loosened
to compensate. Apply the -1% and the sizes fall out on their own.

BOLD COMES FROM THE HOOK, NOT FROM A GUESS. `**...**` is the stored convention.
Where a hook has none, EMPH names the run to lift by hand - auto-bolding every
capital word turned `AI INFRASTRUCTURE in 24h` into a wall and lost the contrast
that makes the line readable in half a second.

PLACEHOLDERS GET FILLED. Several hooks were transcribed with `[]`, `[something]`
or `[SOMETHING]` where the reference named its own product. That slot is ours,
so it says ultron.
"""
import importlib.util
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB = _load("slide-body")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
# The Figma text layer is 857 wide, so the copy runs nearly the full frame and
# the earlier 700 was me inventing a margin that was never there.
COPY = 857
CX = W // 2

BG = (26, 26, 26)
INK = (240, 239, 236)

# Straight off the Figma panel, not off my eye: Inter, 60, line height 110%,
# letter spacing -1%, centred. HEAD_MAX is 60 and the solver only ever goes DOWN
# from it when a hook genuinely will not fit.
HEAD_MAX, HEAD_MIN, LEAD, TRACK = 60, 42, 1.10, -0.01
TILE, TILE_SMALL, TILE_GAP = 198, 120, 34
ROW_TILE, ROW_GAP, GAP_ROW = 54, 14, 38
GAP_MARKS = int(os.environ.get('HOOK_GAP', 58))
GAP_ASK, PARA_GAP = 150, 50
# The ask is 42 Regular at -1%, not a small tracked-out label. Setting it at 28
# with +2.4 tracking made it a caption apologising under the headline; it is
# supposed to sit close to the copy in weight and read at a glance.
ASK_SZ, ASK_TRACK = 42, -0.01
ASK = "SAVE FOR LATER"
ARROW = "\u27f6"

# Where the block's middle sits. NOT the middle of the safe box - that is 845,
# which is 44 percent up the frame and leaves the card looking like it slid off
# the top. The reference sets its type just past halfway, so the block centres
# at 52 percent and is then clamped so it can still never cross the safe edges.
BLOCK_CY = int(H * .52)

PLATE = {}
FILL = {"ultron": .74, "n8n": .70, "claude": .66, "openai": .60, "notion": .62,
        "stripe": .66, "make": .66, "telegram": .70, "instagram": .72,
        "tiktok": .68, "linkedin": .70, "supabase": .64, "airtable": .66,
        "apollo": .66, "perplexity": .64, "hubspot": .66, "apify": .66}
_cover = {}

# Which marks belong on which hook, and the run to set in bold where the stored
# hook carries no `**`. Anything not named here falls back to ultron alone and
# no emphasis, which is a legible frame rather than a wrong one.
CARD = {
 "h002": dict(marks=["ultron"], emph=["START SELLING"]),
 "h006": dict(marks=["ultron"], emph=["10 Ai Agents"]),
 "h007": dict(marks=["ultron"], emph=["#1 Untapped Business Model"]),
 "h009": dict(marks=["ultron"], emph=["5 Ai Agents"]),
 "h012": dict(marks=["claude", "ultron"], emph=["CLAUDE CODE"]),
 "h014": dict(marks=["ultron"],
          text="**6 BORING USE CASES** | for **ULTRON** || you can sell for **$5K** each"),
 "h016": dict(marks=["ultron"],
          text="These **5 ULTRON** | **AGENTS** will make you | **$50,000** this year."),
 "h019": dict(marks=["ultron"], emph=["6 dashboards"]),
 "h020": dict(marks=["ultron"], emph=["6 agents"]),
 "h022": dict(marks=["ultron"], emph=["6 AI TOOLS"]),
 "h024": dict(marks=["ultron"], emph=["6 MORE BORING AUTOMATIONS"]),
 "h025": dict(marks=["ultron"], emph=["24H"]),
 "h028": dict(marks=["ultron"], emph=["10 Boring industries"]),
 "h030": dict(marks=["ultron", "claude"],
          text="**EVERYONE’S** telling you to | build **AI INFRASTRUCTURE** || but they never show you how"),
 "h026": dict(marks=["ultron", "claude"],
          text="A complete **AI STACK** | to **$10,000 a month**",
          row=["n8n", "make", "notion", "stripe", "instagram", "apollo"]),
 "h031": dict(marks=["ultron"], emph=["$1M BUSINESS"]),
 "h032": dict(marks=["n8n", "ultron"], emph=["7 AI Automations"]),
 "h033": dict(marks=["ultron"], emph=["AI AUTOMATION BUSINESS"]),
 "h034": dict(marks=["n8n", "claude"],
          text="I built an | **AI Content AGENT** | with **n8n** and **Claude**"),
 "h035": dict(marks=["ultron"], emph=["GHOST", "20 YEARS AHEAD"]),
 "h036": dict(marks=["ultron"], emph=["10 AI Agents"]),
 "h037": dict(marks=["ultron"], emph=["4 industries"]),
 "h039": dict(marks=["ultron"], emph=["11 AI Systems"]),
 "h040": dict(marks=["ultron"], emph=["10 AI Automations"]),
 "h041": dict(marks=["ultron"], emph=["8 industries"]),
 "h043": dict(marks=["ultron"], emph=["9 AI systems", "20 years ahead"]),
}

_cover = {}


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(7).normal(0, .8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def mask(sz, r):
    m = Image.new("L", (sz * 4, sz * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, sz * 4 - 1, sz * 4 - 1],
                                        radius=r * 4, fill=255)
    return m.resize((sz, sz), Image.LANCZOS)


def tile(im, x, y, sz, key):
    """A mark on its plate. claude, n8n and the rest already ARE finished white
    tiles and get used as they are; a bare mark gets plated.

    The plate colour is NOT a thing this file decides on a whim. A pass of it
    put ultron on black off my own reading of a reference, which was never
    asked for and was not what was wrong with these frames."""
    src = Image.open(f"{LOGOS}/{key}.png").convert("RGBA")
    if key not in _cover:
        _cover[key] = (np.asarray(src)[..., 3] > 30).mean()
    if _cover[key] >= .85:
        plate = src.resize((sz, sz), Image.LANCZOS)
    else:
        plate = Image.new("RGBA", (sz, sz), PLATE.get(key, (255, 255, 255)) + (255,))
        n = int(sz * FILL.get(key, .64))
        plate.alpha_composite(src.resize((n, n), Image.LANCZOS), ((sz - n) // 2,) * 2)
    plate.putalpha(mask(sz, int(sz * .24)))
    im.alpha_composite(plate, (x, y))


# ---------------------------------------------------------------- text -----

# The runs that are ALWAYS the point of the line, whether or not anybody named
# them: money, and a count with its unit. `30 days` reading as quiet body copy
# while `9 AI SYSTEMS` shouts is the same hook set two different ways.
AUTO = [re.compile(r"\$[\d,]+(?:\.\d+)?[KM]?(?:/(?:MO|MONTH))?"),
        re.compile(r"\b\d+\s+(?:days?|weeks?|months?|years?|hours?)\b", re.I)]
# And when nothing at all is named, the opening count carries the frame.
LEAD_COUNT = re.compile(r"^\W*\d+\s+(?:AI\s+|BORING\s+|MORE\s+)*[A-Za-z]+"
                        r"(?:\s+[A-Za-z]+){0,2}", re.I)


def tokens(line, emph):
    """(text, bold) runs. `**x**` wins; otherwise EMPH's phrases are lifted."""
    parts, out = re.split(r"(\*\*[^*]+\*\*)", line), []
    for p in parts:
        if not p:
            continue
        if p.startswith("**") and p.endswith("**"):
            out.append((p[2:-2].upper(), True))
        else:
            out.append((p, False))
    auto = list(emph)
    for pat in AUTO:
        auto += [m.group(0) for m in pat.finditer(line)]
    if not auto and not any(b for _, b in out):
        m = LEAD_COUNT.match(line)
        if m:
            auto = [m.group(0).strip()]
    if any(b for _, b in out):
        return out
    for phrase in sorted(set(auto), key=len, reverse=True):
        # Word boundaries, and never right before an apostrophe: lifting
        # EVERYONE out of EVERYONE'S left a bold word and a stray 'S beside it.
        pat = re.compile(rf"(?<!\w){re.escape(phrase)}(?![\w’'])")
        nxt = []
        for txt, bold in out:
            if bold:
                nxt.append((txt, bold)); continue
            last = 0
            for m in pat.finditer(txt):
                nxt += [(txt[last:m.start()], False), (m.group(0).upper(), True)]
                last = m.end()
            nxt.append((txt[last:], False))
        out = [(t, b) for t, b in nxt if t]
    return out or [(line, False)]


def words(runs):
    """Runs to (word, bold), so wrapping can break anywhere a space is."""
    out = []
    for txt, bold in runs:
        for i, w in enumerate(txt.split(" ")):
            if w:
                out.append((w, bold))
    return out


def width(ws, sz, weight="Medium"):
    """Advance with TRACKING applied per character, the way Figma's -1% does it.
    PIL has no letter-spacing, so untracked Inter at 60px measured wider than
    the same line in the file and every solved size came out one step small."""
    reg, bold = F(sz, weight), F(sz, "Bold")
    t = sz * TRACK
    return sum(adv(w, bold if b else reg, t) for w, b in ws) + \
        (reg.getlength(" ") + t) * max(0, len(ws) - 1)


def wrap(ws, sz, measure):
    """Minimum-raggedness wrap, not greedy.

    Greedy packs each line to the edge and dumps the remainder on the last one,
    which is how `These 5 ULTRON / AGENTS will make / you $50,000 this / year.`
    happened - three full lines and the word `year.` alone underneath. Centred
    display type has nowhere to hide a widow like that.

    The cost of a line is its shortfall against the measure, SQUARED, and the
    last line is charged like every other one. That is the whole difference: a
    wrap that pays for the last line will not leave one word on it."""
    n = len(ws)
    if not n:
        return []
    best = [None] * (n + 1)
    best[n] = (0, n)
    for i in range(n - 1, -1, -1):
        for j in range(i + 1, n + 1):
            w = width(ws[i:j], sz)
            if w > measure and j > i + 1:
                break
            slack = (measure - w) ** 2
            if best[j] is None:
                continue
            c = slack + best[j][0]
            if best[i] is None or c < best[i][0]:
                best[i] = (c, j)
    lines, i = [], 0
    while i < n and best[i]:
        j = best[i][1]
        lines.append(ws[i:j])
        i = j
    return lines or [ws]


def solve(blocks, measure, room, hard=False):
    """One size for the frame: the largest that fits the measure and the room.

    A `|` is not a hint, it is the line. When the copy carries breaks the size
    is the largest at which EVERY block fits on ONE line - letting a block wrap
    on top of its own break gave `I built an AI / Content AGENT / with n8n / and
    Claude`, four lines where two were asked for."""
    for sz in range(HEAD_MAX, HEAD_MIN - 1, -1):
        if hard:
            lines = blocks
            if any(width(b, sz) > measure for b in blocks):
                continue
        else:
            lines = [l for b in blocks for l in wrap(b, sz, measure)]
            if any(width(l, sz) > measure for l in lines):
                continue
        if len(lines) * int(sz * LEAD) <= room:
            return sz, lines
    sz = HEAD_MIN
    return sz, [l for b in blocks for l in wrap(b, sz, measure)]


# EVERY GLYPH CARRIES A 1px BLACK STROKE. White ink on a #1A1A1A card is fine
# on its own, but these frames get a video laid behind them, and a headline that
# crosses a bright patch of screen goes soft exactly where it matters. The
# stroke is hairline on purpose - at 2px it starts thickening the letterforms.
STROKE, STROKE_INK = 1, (0, 0, 0)


def stroked(d, xy, s, f, **kw):
    d.text(xy, s, font=f, fill=INK, stroke_width=STROKE,
           stroke_fill=STROKE_INK, **kw)


def tracked(d, xy, s, f, track, pass_=None):
    """Per-character walk, in TWO PASSES.

    Drawing each character complete - stroke then fill - lays that character's
    black stroke over the white ink of the one before it, so every letter gets
    a dark notch down its left side and the word looks eroded. All the strokes
    go down first, then all the fills on top."""
    x, y = xy
    for c in s:
        if pass_ == "stroke":
            d.text((x, y), c, font=f, fill=STROKE_INK, stroke_width=STROKE,
                   stroke_fill=STROKE_INK, anchor="ls")
        elif pass_ == "fill":
            d.text((x, y), c, font=f, fill=INK, anchor="ls")
        else:
            stroked(d, (x, y), c, f, anchor="ls")
        x += f.getlength(c) + track
    return x


def draw_line(d, ws, cx, baseline, sz, weight="Medium"):
    reg, bold = F(sz, weight), F(sz, "Bold")
    t = sz * TRACK
    for p in ("stroke", "fill"):
        x = cx - width(ws, sz, weight) / 2
        for i, (w, b) in enumerate(ws):
            x = tracked(d, (x, baseline), w, bold if b else reg, t, p)
            if i < len(ws) - 1:
                x += reg.getlength(" ") + t


def rise(ws, sz):
    """Ink height above the baseline, measured rather than taken off a cap
    ratio - `int(sz * .727)` is a pixel or two short of Inter's real cap and at
    82px that is enough to push a block off centre."""
    d = ImageDraw.Draw(Image.new("L", (8, 8)))
    return max(-d.textbbox((0, 0), w, font=F(sz, "Bold" if b else "Medium"),
                           anchor="ls")[1] for w, b in ws)


# ---------------------------------------------------------------- frame ----

def paras(text):
    """`||` is a paragraph, `|` is a line inside one. Both set at the SAME size -
    the second block in the reference is not a smaller caption, it is the rest of
    the sentence with air in front of it."""
    out = []
    for p in text.split("||"):
        lines = [words(tokens(l.strip(), CARD_EMPH)) for l in p.split("|")]
        lines = [l for l in lines if l]
        if lines:
            out.append(lines)
    return out


def frame(text, marks, row=()):
    im = ground()
    d = ImageDraw.Draw(im)

    para = paras(text)
    flat = [l for p in para for l in p]

    tsz = TILE if len(marks) <= 2 else TILE_SMALL
    marks_h = tsz if marks else 0
    ask_h = int(ASK_SZ * .727)
    gaps = PARA_GAP * (len(para) - 1)
    room = (SAFE_BOT - SAFE_TOP) - marks_h - GAP_MARKS - GAP_ASK - ask_h - gaps
    sz, flat = solve(flat, COPY, room, hard="|" in text)
    pitch = int(sz * LEAD)

    # Re-attach the solved lines to their paragraphs. With hard breaks the counts
    # match one for one; without them a paragraph may have wrapped, so walk it.
    sized, i = [], 0
    for p in para:
        n = len(p) if "|" in text else max(1, len(flat) - i if p is para[-1] else 1)
        sized.append(flat[i:i + len(p)] if "|" in text else flat[i:i + n])
        i += len(sized[-1])
    if i < len(flat):
        sized[-1] += flat[i:]
    sized = [s for s in sized if s]

    head_h = sum((len(s) - 1) * pitch for s in sized) + pitch * (len(sized) - 1) \
        + gaps + rise(sized[0][0], sz)
    row_h = (GAP_ROW + ROW_TILE) if row else 0
    total = marks_h + GAP_MARKS + head_h + row_h + GAP_ASK + ask_h
    y = max(SAFE_TOP, min(BLOCK_CY - total // 2, SAFE_BOT - total))

    if marks:
        plus = F(int(tsz * .40), "Medium")
        gap = TILE_GAP if len(marks) > 2 else int(TILE_GAP * 1.4)
        pw = plus.getlength("+") if len(marks) == 2 else 0
        mw = len(marks) * tsz + (len(marks) - 1) * gap + (pw + gap if pw else 0)
        x = CX - mw / 2
        for i, key in enumerate(marks):
            tile(im, int(x), y, tsz, key)
            x += tsz
            if i < len(marks) - 1:
                x += gap
                if pw:
                    stroked(d, (x, y + tsz / 2), "+", plus, anchor="lm")
                    x += pw + gap
        y += tsz + GAP_MARKS

    y += rise(sized[0][0], sz)
    for j, block in enumerate(sized):
        for i, ln in enumerate(block):
            draw_line(d, ln, CX, y + i * pitch, sz)
        y += (len(block) - 1) * pitch
        if j < len(sized) - 1:
            y += pitch + PARA_GAP

    if row:
        rw = len(row) * ROW_TILE + (len(row) - 1) * ROW_GAP
        x = CX - rw / 2
        for key in row:
            tile(im, int(x), y + GAP_ROW, ROW_TILE, key)
            x += ROW_TILE + ROW_GAP
        y += GAP_ROW + ROW_TILE

    y += GAP_ASK + ask_h
    f = F(ASK_SZ, "Regular")
    t = ASK_SZ * ASK_TRACK
    s = ASK + " " + ARROW
    for p in ("stroke", "fill"):
        tracked(d, (CX - adv(s, f, t) / 2, y), s, f, t, p)

    assert y <= SAFE_BOT, f"ask at {y}, safe bottom {SAFE_BOT}"
    return im, sz, len(flat)


CARD_EMPH = []

PLACEHOLDER = re.compile(r"\[\s*(something|SOMETHING)?\s*\]", re.I)

# Slips that came off the screenshots with the hooks. The hook book keeps them -
# it is the record of what was collected - but nothing ships with them on it.
TYPO = {"Auomation": "Automation", "alwyas": "always", "oyur": "your",
        "busienss": "business", "that that": "that", "everyone’s": "everyone's"}

# HOW A NUMBER IS SET. `$10k/mo` is three mistakes in six characters: a lowercase
# thousand, an abbreviation nobody reads at 0.5s, and no emphasis on the only
# part of the line anybody came for.
UNIT = [(r"(?<=\d)k\b", "K"), (r"/\s?mo\b", "/MO"), (r"/\s?month\b", "/MONTH"),
        (r"(?<=\d)\s?mm?\b", "M")]


# ULTRON NEVER STANDS ALONE. A single mark on a card says "here is a product";
# a pair says "here is a stack, and this is the part of it you do not have yet",
# which is the whole argument. Automation-shaped hooks pair with n8n, everything
# else with Claude, and ultron always sits on the right as the payoff.
AUTOMATION = re.compile(r"automat|workflow|system|agenc|n8n", re.I)


def pair(marks, text):
    marks = [m for m in marks if m]
    if marks and marks != ["ultron"]:
        return marks
    other = "n8n" if AUTOMATION.search(text) else "claude"
    return [other, "ultron"]


def clean(s):
    for a, b in TYPO.items():
        s = s.replace(a, b)
    for pat, rep in UNIT:
        s = re.sub(pat, rep, s)
    return s


def hooks():
    return {r["id"]: r for r in json.load(open(f"{HERE}/hooks.json"))}


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/hooks"
    want = [a for a in sys.argv[2:] if not a.startswith("--")]
    book = hooks()
    if "--all" in sys.argv or not want:
        want = sorted(book)
    os.makedirs(out, exist_ok=True)

    for hid in want:
        row = book.get(hid)
        if not row:
            print(f"  no hook {hid}"); continue
        cfg = CARD.get(hid, {})
        CARD_EMPH = cfg.get("emph", [])
        globals()["CARD_EMPH"] = CARD_EMPH
        # `text` in CARD overrides the stored hook for RENDERING only - where
        # the break falls, which run is bold, `claude` set as Claude. The hook
        # book itself is never touched; it is the reference, not the artwork.
        text = clean(PLACEHOLDER.sub("ULTRON", cfg.get("text") or row["text"]))
        marks = pair(cfg.get("marks", ["ultron"]), text)
        im, sz, n = frame(text, marks, cfg.get("row", ()))
        p = f"{out}/{hid}.png"
        im.convert("RGB").save(p)
        print(f"  {hid}  {sz}px x{n}  {'+'.join(marks):18} {row['text'][:58]}")
    print(f"\n-> {out}/")

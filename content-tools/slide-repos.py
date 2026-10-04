#!/usr/bin/env python3
"""The repo deck - 1080x1920 reel frames, dark, one GitHub repo per frame.

    python3 slide-repos.py deck.json out/

Rebuilt. The first version rendered the seven repo reels that shipped in
September and was never committed, so a container wipe took it; this one is
measured off a frame of `reel-repos-behaviour.mp4` rather than remembered, and
every number below is what that frame actually has:

    ground      #1a1a1a, grained
    0N.         Inter Medium 33, cap top on SAFE_TOP
    name        Archivo Bold 78 at width 100 - Archivo, not Inter: it is the one
                face on the frame that is not the body face, which is what makes
                the name read as a name rather than as the first line of copy
    blurb       Inter 44 on a 62 pitch, a SemiBold lead-in and Regular after it
    card        GitHub's own OG card, fitted whole to 820 and never cropped,
                bottom edge on SAFE_BOT
    footer      Archivo SemiBold 42, grey, centred under the safe box

THE CARD IS GITHUB'S, NOT OURS. opengraph.githubassets.com renders the name,
the description, the avatar and the live counts itself, so nothing on it can be
mistyped. A repo that does not exist still gets a card - a generic 1200x630 one
- so every card is checked against a canary before it is used (see
verify_repos.py in the Jev work); a real one is 1200x600.

JUSTIFIED, NOT STACKED. Label, name, blurb and card share the safe box with
equal gaps between them, which is what the shipped frames do: the card sits on
the floor of the safe box on every frame and the type spaces itself above it.
That only holds still from frame to frame if every blurb sets to the same
number of lines, so the deck refuses to render when one does not - rewrite the
odd one out rather than letting one frame's card jump.

THE NAME IS ONE SIZE ACROSS THE SET: the largest at or under 78 at which every
name fits the measure on one line. A name that shrinks on its own frame reads as
less important than its neighbours, which it is not.

A generic repo name is not a name. `skills` tells nobody anything, so the title
falls back to the owner (`mattpocock`, `typesafe-ai`) - set `title` on the card
to override either way.

deck.json:

    {"footer": "Save this before your next project",
     "closer": [["comment", "Medium", 0.42], ["“JEV”", "ExtraBold", 1.0], ...],
     "cards": [{"repo": "owner/name", "og": "path/to/og.png",
                "blurb": "**Lead-in.** The rest of the line.", "title": "optional"}]}
"""
import glob
import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB = _load("slide-body")
F = SB.F

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (26, 26, 26)
INK = (250, 250, 248)
FOOT = (187, 186, 191)

LABEL_SZ = 33
NAME_MAX, NAME_MIN = 78, 52
BLURB_SZ, BLURB_PITCH, BLURB_MEASURE = 44, 62, 790
FOOT_SZ, FOOT_BASE = 42, 1792
CARD_R = 24

ARCHIVO = os.environ.get("ARCHIVO", os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "ultron-monolith",
    "reel-kit", "assets", "fonts", "Archivo.ttf"))
_arc = {}
GENERIC = {"skills", "awesome", "docs", "plugin", "plugins", "tools", "config",
           "dotfiles", "prompts", "agents"}


def A(sz, wght):
    """Archivo is a variable font (wght 100-900, wdth 62-125); PIL needs the
    axes set per instance or it renders the default SemiBold for everything."""
    k = (sz, wght)
    if k not in _arc:
        f = ImageFont.truetype(ARCHIVO, sz)
        f.set_variation_by_axes([wght, 100])
        _arc[k] = f
    return _arc[k]


def title_of(c):
    if c.get("title"):
        return c["title"]
    owner, name = c["repo"].split("/")
    return owner if name.lower() in GENERIC or name.lower().startswith("awesome") else name


def ink_h(f, s):
    """Height of the ink above the baseline - cap height for `02.` and `N`,
    x-height for a lowercase name. Gaps are measured between INK, not between
    font boxes: a 78px Archivo line box carries 20-odd px of air above the
    x-height that the eye does not count."""
    l, t, r, b = f.getbbox(s, anchor="ls")
    return -t


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(9).normal(0, 1.8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def card_of(c):
    src = Image.open(c["og"]).convert("RGB")
    if src.size != (1200, 600):
        raise SystemExit(f"  {c['repo']}: card is {src.size}, not 1200x600 - "
                         f"that is GitHub's placeholder for a repo it cannot find")
    w = MEASURE
    h = round(src.height * w / src.width)
    return src.resize((w, h), Image.LANCZOS)


def solve(cards):
    nsz = next((s for s in range(NAME_MAX, NAME_MIN - 1, -1)
                if all(A(s, 700).getlength(title_of(c)) <= MEASURE for c in cards)),
               NAME_MIN)
    lines = {len(SB.rich_lines(c["blurb"], BLURB_SZ, BLURB_MEASURE)) for c in cards}
    if len(lines) != 1:
        bad = [(c["repo"], len(SB.rich_lines(c["blurb"], BLURB_SZ, BLURB_MEASURE)))
               for c in cards]
        raise SystemExit(f"  blurbs set to different line counts {sorted(lines)} - "
                         f"rewrite the odd one out:\n" +
                         "\n".join(f"    {r:45} {n} lines" for r, n in bad))
    n = lines.pop()
    label_h = ink_h(F(LABEL_SZ, "Medium"), "0123456789")
    name_h = max(ink_h(A(nsz, 700), title_of(c)) for c in cards)
    blurb_h = ink_h(F(BLURB_SZ, "Regular"), "N") + (n - 1) * BLURB_PITCH
    card_h = round(600 * MEASURE / 1200)
    gap = (SAFE_BOT - SAFE_TOP - label_h - name_h - blurb_h - card_h) / 3
    y_label = SAFE_TOP + label_h
    y_name = y_label + gap + name_h
    y_blurb = y_name + gap + ink_h(F(BLURB_SZ, "Regular"), "N")
    y_card = SAFE_BOT - card_h
    return dict(nsz=nsz, lines=n, gap=gap, y_label=round(y_label),
                y_name=round(y_name), y_blurb=round(y_blurb), y_card=y_card)


def build(c, i, L, footer):
    im = ground()
    d = ImageDraw.Draw(im)
    d.text((LEFT, L["y_label"]), f"{i:02d}.", font=F(LABEL_SZ, "Medium"), fill=INK, anchor="ls")
    d.text((LEFT, L["y_name"]), title_of(c), font=A(L["nsz"], 700), fill=INK, anchor="ls")
    y = L["y_blurb"]
    for ln in SB.rich_lines(c["blurb"], BLURB_SZ, BLURB_MEASURE):
        SB.draw_line(d, LEFT, y, ln, BLURB_SZ, INK, INK)
        y += BLURB_PITCH

    card = card_of(c)
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, card.width - 1, card.height - 1],
                                           radius=CARD_R, fill=255)
    im.paste(card, (LEFT, L["y_card"]), mask)

    if footer:
        f = A(FOOT_SZ, 600)
        d.text((W // 2 - f.getlength(footer) / 2, FOOT_BASE), footer, font=f,
               fill=FOOT, anchor="ls")
    return im, dict(bottom=L["y_card"] + card.height)


def build_closer(rows):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), rows, MEASURE, SAFE_TOP, SAFE_BOT, INK, INK)
    return im, dict(bottom=y)


if __name__ == "__main__":
    deck = json.load(open(sys.argv[1]))
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    out = sys.argv[2] if len(sys.argv) > 2 else "brand/repos"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    cards = deck["cards"]
    for c in cards:
        c["og"] = c["og"] if os.path.isabs(c["og"]) else os.path.join(base, c["og"])
    seen = {}
    for c in cards:
        if c["repo"] in seen:
            raise SystemExit(f"  {c['repo']} is on the deck twice")
        seen[c["repo"]] = 1
    L = solve(cards)
    print(f"  name {L['nsz']}  blurb {BLURB_SZ} x{L['lines']}  gap {L['gap']:.0f}\n")

    made = []
    for i, c in enumerate(cards, 1):
        im, m = build(c, i, L, deck.get("footer"))
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {title_of(c):24} {c['repo']:42} ends {m['bottom']}")
    if deck.get("closer"):
        im, m = build_closer([tuple(r) for r in deck["closer"]])
        p = f"{out}/{len(made) + 1:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {len(made):02d}  closer")

    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (60, 60, 60))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

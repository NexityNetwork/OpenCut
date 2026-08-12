#!/usr/bin/env python3
"""The AI Content Agent deck - 1080x1920 carousel frames on the dark card.

The workflows are OURS and they are real: six n8n graphs exported to PNG, living
in `n8n content work` on this branch. Nothing here is drawn, mocked or lifted
off somebody's screenshot - the strips are the actual canvases.

    python3 slide-agent6.py brand/agent6

THERE IS NO COVER FRAME AND THERE IS NOT MEANT TO BE. The reference's first
slide is captured for context only; it is never rebuilt. Every deck here starts
on the first real frame - here that is Instagram - and ends on the comment ask.

IT IS A BUILD, NOT A LIST. Frame two shows Instagram. Frame three shows
Instagram AND TikTok, with Instagram in exactly the pixel it was on. By frame
seven all six are on screen and none of them has moved once. That is the whole
mechanic of the reference and it only works if the stack is PINNED TO THE TOP of
the safe box and the positions are computed once off the full list - centring
each frame's own stack would slide every earlier row down as the next one lands
and turn a build into six unrelated pictures.

THE STRIPS ARE 818px AND THE MEASURE IS 820. They are pasted at native size, not
scaled: an n8n canvas is 10px type at that width and a resample of any kind
turns the node labels into grey mush.

THE ROW HEIGHTS ARE NOT EQUAL and are not made equal. Facebook and LinkedIn fan
into two branches and run 127 and 119 tall against Instagram's 93; padding them
to a common height would put a hole under the short ones. The gap between rows
is the constant instead.

DARK, because the export is dark. An n8n canvas on paper would be a black slab
in the middle of a cream frame.
"""
import glob
import importlib.util
import os
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

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
CX = W // 2

BG = (26, 26, 26)
INK = (240, 239, 236)

LBL_SZ, LBL_GAP, ROW_GAP = 34, 16, 60

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
FLOWS = os.environ.get("N8N_FLOWS", "n8n content work")

# The file names say nothing; the first node of each canvas says which platform
# it is. Order is the reference's, which is also the order they were built in.
FLOW = [
    ("Instagram Data Acquisition", "image (1) 1.png"),
    ("TikTok Data Acquisition", "image 1398.png"),
    ("Youtube Data Acquisition", "image (2) 1.png"),
    ("Twitter Data Acquisition", "image (3) 1.png"),
    ("Facebook Data Acquisition", "image (5) 1.png"),
    ("LinkedIn Data Acquisition", "image (4) 1.png"),
]

CLOSER = [("comment", "Medium", 0.40),
          ("“AGENT”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("ALL SIX FLOWS", "ExtraBold", 0.54)]


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, .8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def strip(name):
    src = Image.open(f"{FLOWS}/{name}").convert("RGBA")
    flat = Image.new("RGBA", src.size, BG + (255,))
    flat.alpha_composite(src)
    return flat


def label_rise():
    """How far a label's ink sits above its baseline, measured rather than taken
    off a cap ratio. `int(sz * .727)` is a pixel or two short of Inter's real
    cap, which put the first row's label two pixels above the safe top. The MAX
    across the six is used so all six rows keep one geometry."""
    d = ImageDraw.Draw(Image.new("L", (8, 8)))
    f = F(LBL_SZ, "Medium")
    return max(-d.textbbox((0, 0), nm, font=f, anchor="ls")[1] for nm, _ in FLOW)


def layout():
    """Where every row sits, computed once off the FULL list. Frame two and
    frame seven put Instagram on the same pixel because both read this."""
    rise = label_rise()
    ys, y = [], SAFE_TOP
    for _, fn in FLOW:
        s = strip(fn)
        ys.append((y + rise, y + rise + LBL_GAP, s))
        y += rise + LBL_GAP + s.height + ROW_GAP
    return ys, y - ROW_GAP


def build_step(n, rows):
    im = ground()
    d = ImageDraw.Draw(im)
    for i in range(n):
        by, sy, s = rows[i]
        d.text((LEFT, by), FLOW[i][0], font=F(LBL_SZ, "Medium"), fill=INK,
               anchor="ls")
        im.alpha_composite(s, (LEFT + (MEASURE - s.width) // 2, sy))
    return im


def build_closer():
    im = ground()
    SB.draw_closer(ImageDraw.Draw(im), CLOSER, MEASURE, SAFE_TOP, SAFE_BOT,
                   INK, INK)
    return im


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/agent6"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)

    rows, bottom = layout()
    assert bottom <= SAFE_BOT, f"the six rows need {bottom}, safe bottom is {SAFE_BOT}"
    print(f"  six rows end at {bottom}, safe bottom {SAFE_BOT}\n")

    made = []
    for i in range(len(FLOW) + 1):
        if i < len(FLOW):
            im, name = build_step(i + 1, rows), FLOW[i][0]
        else:
            im, name = build_closer(), "closer"
        p = f"{out}/{i+1:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i+1:02d}  {name}")

    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (16, 16, 16))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

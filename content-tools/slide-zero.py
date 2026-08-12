#!/usr/bin/env python3
"""The Zero Budget deck - 1080x1920 carousel frames on the dark card.

Two acts, the reference's own shape. Four cards for the stack that costs
nothing, then five for what to do with it. NO HOOK FRAMES: his opener and his
`but I don't know what to sell` interstitial are captured for context and are
never rebuilt.

    python3 slide-zero.py brand/zero

NOTHING IN HERE IS NEW MATERIAL. Every capture already existed in the repo
before this file did - the four 51ultron.com pages and the seven product windows
in `ultron-shots`, the marks in `apps/web/public/tools`. The job was to look at
what we hold and assemble it, not to shoot anything.

ULTRON IS NOT ON A $0 CARD, and that is deliberate. The gag of act one is that
the whole stack is free, and our own pricing page - the capture used on step two
of act two - says $4,000 and $600 a month. Putting ultron behind a $0 would be
the one claim a reader can disprove by clicking the link in the bio. Telegram
takes the fourth slot instead, because it genuinely is free and it is the
surface the rest of it gets run from.

SO ULTRON CARRIES ACT TWO INSTEAD, all five frames of it, on captures of the
real product. His act two walks you to his own storefront; ours walks the same
five steps through ours.

BOTH CARD TYPES FILL THE SAFE BOX. The fixed parts are measured and the GAPS
take the slack, so a card is never a short stack floating at the top of the
frame with 400px of ground under it.
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
BAND = SAFE_BOT - SAFE_TOP
CX = W // 2

BG = (26, 26, 26)
INK = (241, 240, 237)

NAME_SZ, TILE, CHK_SZ, CHK_LEAD = 60, 200, 42, 66
ZERO_SZ, BODY_SZ, BODY_LEAD, PARA_GAP = 300, 50, 1.38, 44
NUM_SZ, TITLE_SZ, STEP_SZ, STEP_LEAD = 32, 66, 44, 1.40
SHOT_W, SHOT_H, SHOT_R = MEASURE, 620, 26

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")

# ---- act one. Four things that really are free to start, described the way he
# describes his. Ultron is not one of them; see the note at the top.
TOOLS = [
    ("n8n", "n8n", ["Automations", "Integrations", "Workflows"],
     ["Backbone for complex AI automations.",
      "Everything talks to everything, on autopilot."]),
    ("MAKE", "make", ["Speed", "Automations", "Client ready"],
     ["Fast and reliable for quick automation builds.",
      "Perfect for MVPs, integrations, and delivery."]),
    ("CLAUDE", "claude", ["Brain", "Strategy", "Execution"],
     ["Business brain that controls everything.",
      "Plans, reviews, writes, and thinks for the system."]),
    ("TELEGRAM", "telegram", ["Control", "Alerts", "Approvals"],
     ["The whole business in one thread.",
      "Approve, reject, and redirect it from your phone."]),
]

# ---- act two. Five steps, five captures we already hold.
STEPS = [
    ("Browse the library",
     "Start from a build that **already works** instead of a blank canvas.",
     f"{SHOTS}/step1.png"),
    ("Pick the job that pays",
     "Lead qualifier, content engine, email agent. Pick **one job a business "
     "already pays somebody to do.**",
     f"{SHOTS}/step2.png"),
    ("Load the template",
     "Every build in the library is a template. **Load it, point it at the "
     "client, done.**",
     f"{SHOTS}/step3.png"),
    ("Let it run",
     "Four jobs in flight, a queue that needs you, and **12 automations armed "
     "underneath.**",
     f"{SHOTS}/win-control-center.png"),
    ("Watch the pipeline fill",
     "Deals move themselves. **You look at the number,** not at the work.",
     f"{SHOTS}/win-pipeline.png"),
]

CLOSER = [("comment", "Medium", 0.40),
          ("“ZERO”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("THE WHOLE STACK", "ExtraBold", 0.52)]

_cover = {}


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, .8, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def mask(w, h, r):
    m = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1],
                                        radius=r * 4, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def tile(im, x, y, sz, key):
    src = Image.open(f"{LOGOS}/{key}.png").convert("RGBA")
    if key not in _cover:
        _cover[key] = (np.asarray(src)[..., 3] > 30).mean()
    if _cover[key] >= .85:
        plate = src.resize((sz, sz), Image.LANCZOS)
    else:
        plate = Image.new("RGBA", (sz, sz), (255, 255, 255, 255))
        n = int(sz * .62)
        plate.alpha_composite(src.resize((n, n), Image.LANCZOS), ((sz - n) // 2,) * 2)
    plate.putalpha(mask(sz, sz, int(sz * .24)))
    im.alpha_composite(plate, (x, y))


def cap(sz):
    return int(sz * .727)


def rise(d, text, f):
    """Ink above the baseline, measured. The cap ratio is a pixel or two short
    of Inter's real cap and that is enough to cross the safe top."""
    return -d.textbbox((0, 0), text, font=f, anchor="ls")[1]


def check(d, x, y, r, col):
    d.ellipse([x, y - r, x + 2 * r, y + r], outline=col, width=2)
    d.line([(x + r * .58, y), (x + r * .88, y + r * .34),
            (x + r * 1.42, y - r * .40)], fill=col, width=3)


def rich_w(ln, sz):
    reg = F(sz, "Regular")
    return sum((reg.getlength(" ") if sp else 0)
               + F(sz, "SemiBold" if b else "Regular").getlength(wd)
               for wd, b, sp in ln)


def build_tool(name, key, checks, paras):
    im = ground()
    d = ImageDraw.Draw(im)

    nf = F(NAME_SZ, "Medium")
    zf = F(ZERO_SZ, "Bold")
    nr, zr = rise(d, name, nf), rise(d, "$0", zf)

    body = [SB.rich_lines(p, BODY_SZ, MEASURE) for p in paras]
    lead = round(BODY_SZ * BODY_LEAD)
    nlines = sum(len(b) for b in body)
    # The FULL descender, not half of it. `delivery.` and `autopilot.` both end
    # on a `p` or a `y`, so half a descender put the last line six pixels under
    # the safe bottom on every card.
    body_h = (cap(BODY_SZ) + (nlines - 1) * lead
              + (len(body) - 1) * PARA_GAP + int(BODY_SZ * .24))

    parts = nr + TILE + zr + body_h
    gap = (BAND - parts) // 3

    y = SAFE_TOP + nr
    d.text((CX, y), name, font=nf, fill=INK, anchor="ms")

    ty = y + gap
    tile(im, LEFT, ty, TILE, key)
    cy = ty + TILE // 2 - (len(checks) - 1) * CHK_LEAD // 2
    cf = F(CHK_SZ, "Regular")
    for c in checks:
        check(d, LEFT + TILE + 52, cy, 15, INK)
        d.text((LEFT + TILE + 52 + 52, cy + cap(CHK_SZ) // 2), c, font=cf,
               fill=INK, anchor="ls")
        cy += CHK_LEAD

    zy = ty + TILE + gap + zr
    d.text((LEFT, zy), "$0", font=zf, fill=INK, anchor="ls")

    by = zy + gap + cap(BODY_SZ)
    for bi, blk in enumerate(body):
        for ln in blk:
            SB.draw_line(d, LEFT, by, ln, BODY_SZ, INK, INK)
            by += lead
        if bi + 1 < len(body):
            by += PARA_GAP - lead + lead
    return im


def build_step(i, title, copy, shot):
    im = ground()
    d = ImageDraw.Draw(im)

    numf, tf = F(NUM_SZ, "Medium"), F(TITLE_SZ, "Bold")
    nr, tr = rise(d, "01.", numf), rise(d, title, tf)
    lines = SB.rich_lines(copy, STEP_SZ, MEASURE)
    lead = round(STEP_SZ * STEP_LEAD)
    copy_h = cap(STEP_SZ) + (len(lines) - 1) * lead + int(STEP_SZ * .12)

    # The capture is PINNED to the safe bottom and the text takes the room
    # above it. Sharing the slack between all three gaps instead left the
    # capture ending at 1306 with 134px of ground under it.
    shot_y = SAFE_BOT - SHOT_H
    room = shot_y - SAFE_TOP
    gap = (room - (nr + tr + copy_h)) // 3

    y = SAFE_TOP + nr
    d.text((LEFT, y), f"{i:02d}.", font=numf, fill=INK, anchor="ls")

    y += gap + tr
    d.text((LEFT, y), title, font=tf, fill=INK, anchor="ls")

    y += gap + cap(STEP_SZ)
    for ln in lines:
        SB.draw_line(d, LEFT, y, ln, STEP_SZ, INK, INK)
        y += lead
    y = shot_y

    src = Image.open(shot).convert("RGB")
    k = max(SHOT_W / src.width, SHOT_H / src.height)
    nw, nh = max(SHOT_W, round(src.width * k)), max(SHOT_H, round(src.height * k))
    card = src.resize((nw, nh), Image.LANCZOS).crop(
        ((nw - SHOT_W) // 2, 0, (nw - SHOT_W) // 2 + SHOT_W, SHOT_H)).convert("RGBA")
    card.putalpha(mask(SHOT_W, SHOT_H, SHOT_R))
    im.alpha_composite(card, (LEFT, y))
    return im, y + SHOT_H


def build_closer():
    im = ground()
    SB.draw_closer(ImageDraw.Draw(im), CLOSER, MEASURE, SAFE_TOP, SAFE_BOT,
                   INK, INK)
    return im


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/zero"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)

    made = []
    n = 0
    for name, key, checks, paras in TOOLS:
        n += 1
        build_tool(name, key, checks, paras).convert("RGB").save(f"{out}/{n:02d}.png")
        made.append((f"{out}/{n:02d}.png", name))
    for i, (title, copy, shot) in enumerate(STEPS, 1):
        n += 1
        im, bot = build_step(i, title, copy, shot)
        im.convert("RGB").save(f"{out}/{n:02d}.png")
        made.append((f"{out}/{n:02d}.png", title))
    n += 1
    build_closer().convert("RGB").save(f"{out}/{n:02d}.png")
    made.append((f"{out}/{n:02d}.png", "closer"))

    for p, nm in made:
        a = np.asarray(Image.open(p).convert("L")).astype(int) > 60
        r = np.where(a.sum(axis=1) > 2)[0]
        c = np.where(a.sum(axis=0) > 2)[0]
        ok = r.min() >= SAFE_TOP and r.max() <= SAFE_BOT and c.min() >= LEFT \
            and c.max() <= RIGHT
        print(f"  {p[-6:-4]}  {nm:26} y {r.min()}..{r.max()}  x {c.min()}..{c.max()}"
              f"  {'inside' if ok else 'OUTSIDE THE SAFE BOX'}")

    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (16, 16, 16))
    for i, (p, _) in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

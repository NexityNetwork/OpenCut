#!/usr/bin/env python3
"""The 30-Day Client deck - 1080x1920 carousel frames on paper.

Fourteenth family. Four steps to pick the work, then four steps to ship it,
then the close. The reference's dark cover is not made, per instruction.

THE COPY IS THE REFERENCE'S with two kinds of swap, both instructed or
precedented:

  THE JOKES ARE SWAPPED. `Single guys looking for a GF`, `Jerking off` and
  `Auto-swiping on dating apps` were a bit that did not land; each is replaced
  with a real item of the same shape.

  THE OLD PRODUCT IS SWAPPED FOR ULTRON. Frames 01-03 of the reference's
  second half sell dealmaker.world and Framer; this deck points at
  51ultron.com and shows REAL captures of it - the demo dashboard, the
  Techniques library, the control center. Nothing drawn pretending to be the
  product.

  THE LAST FRAME'S ELON MUSK PHOTO AND elonmusk@tesla.com PAYMENT ARE NOT
  COPIED - a fabricated payment record attributed to a real person. The
  notification stays, from `a new client`.

WE CALL THESE CAROUSELS. 1080x1920 on the reel safe box, 0.5-0.8s a frame,
UI drawn on top, right rail past x=950, block at 130..950. NO CTA PILL on
body frames - the reference repeats `comment W` on every frame and it goes on
the close only.
"""
import glob
import importlib.util
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB = _load("slide-body")
BL = _load("blocks")
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 62, -0.028
SUB_SZ, SUB_LEAD = 36, 1.42
GAP = 64
PLATE_R = 22

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")
WF_C = os.environ.get("WORKFLOWS_C", "../differnt types of workflows")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=PLATE_R, blur=26, alpha=48, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    if isinstance(src, str):
        src = Image.open(src).convert("RGB")
    k = w / src.width
    sw, sh_ = round(src.width * k), round(src.height * k)
    src = src.resize((sw, sh_), Image.LANCZOS)
    box = [LEFT, top, LEFT + sw, top + sh_]
    shadow(im, box)
    mask = Image.new("L", (sw, sh_), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1],
                                           radius=PLATE_R, fill=255)
    im.paste(src, (box[0], box[1]), mask)
    return box[3]


def head(d, n, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    num = f"{n:02d}."
    fb = F(TITLE_SZ, "Bold")
    tr = TITLE_TRACK * TITLE_SZ
    draw_tracked(d, (LEFT, y), num, fb, T["accent"], tr)
    draw_tracked(d, (LEFT + adv(num, fb, tr) + TITLE_SZ * .30, y), title, fb,
                 T["ink"], tr)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def chips_grid(d, x, y, w, h, T, items, hot_i):
    """Six candidates, ONE chosen - the frame's verb is `pick`, so the picking
    is drawn: five plain chips and the chosen one in the accent."""
    cols, rows = 2, 3
    gap = 28
    cw = (w - gap) // 2
    ch = min(178, (h - gap * (rows - 1)) // rows)
    y += max(0, (h - (ch * rows + gap * (rows - 1)))) // 2
    for i, t in enumerate(items):
        cx = x + (i % 2) * (cw + gap)
        cy = y + (i // 2) * (ch + gap)
        hot = i == hot_i
        d.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=26,
                            fill=T["accent"] if hot else (255, 255, 255),
                            outline=None if hot else T["rule"], width=1)
        col = (255, 255, 255) if hot else T["ink"]
        f = F(33, "Bold" if hot else "SemiBold")
        for k, ln in enumerate(BL.wrap(t, f, cw - 60)):
            d.text((cx + 32, cy + ch // 2 + 11 + (k - 0.5 * (len(BL.wrap(t, f, cw - 60)) - 1)) * 40),
                   ln, font=f, fill=col, anchor="ls")
        if hot:
            d.text((cx + cw - 30, cy + 40), "PICK ONE", font=F(20, "Bold"),
                   fill=(255, 255, 255), anchor="rs")
    return y + ch * rows + gap * (rows - 1)


def converge(d, x, y, w, h, T, items, target):
    """Many problems, one target - `stop trying to solve everything at once`
    drawn as the convergence it asks for."""
    n = len(items)
    lh = min(116, h // n)
    y0 = y + max(0, (h - lh * n) // 2)
    tx = x + int(w * 0.62)
    ty = y0 + (lh * n) // 2
    for i, t in enumerate(items):
        ly = y0 + i * lh + lh // 2
        d.text((x, ly + 12), t, font=F(36, "Regular"), fill=T["ink"], anchor="ls")
        lx = x + int(F(36, "Regular").getlength(t)) + 24
        d.line([(min(lx, tx - 40), ly), (tx - 24, ty)], fill=T["rule"], width=3)
    bw, bh = int(w * 0.38), 156
    d.rounded_rectangle([tx - 20, ty - bh // 2, tx - 20 + bw, ty + bh // 2],
                        radius=26, fill=T["accent"])
    for k, ln in enumerate(BL.wrap(target, F(34, "Bold"), bw - 56)):
        d.text((tx + 10, ty + 12 + (k - 0.5) * 42 + 8), ln, font=F(34, "Bold"),
               fill=(255, 255, 255), anchor="ls")
    return y0 + lh * n


def arrows3(d, x, y, w, h, T, pairs):
    """The copy is three oppositions, so the frame is three transformations -
    plain thing, arrow, bold thing."""
    n = len(pairs)
    rh = min(212, h // n)
    y += max(0, (h - rh * n)) // 2
    mid = x + int(w * 0.46)
    for i, (a, b) in enumerate(pairs):
        by = y + i * rh + rh // 2 + 14
        d.text((x, by), a, font=F(42, "Regular"), fill=T["ink"], anchor="ls")
        ax = mid + 40
        d.line([(ax, by - 13), (ax + 64, by - 13)], fill=T["ink"], width=5)
        d.polygon([(ax + 64, by - 25), (ax + 92, by - 13), (ax + 64, by - 1)],
                  fill=T["ink"])
        d.text((ax + 116, by), b, font=F(42, "Bold"), fill=T["ink"], anchor="ls")
        if i + 1 < n:
            d.line([(x, y + (i + 1) * rh), (x + w, y + (i + 1) * rh)],
                   fill=T["rule"], width=1)
    return y + rh * n


def browser(im, d, x, y, w, T, url, headline, subline, button):
    """A landing page as the artifact - a drawn CLIENT page, not a screenshot
    of anything real, because the client's page does not exist yet. That is
    the point of the frame."""
    h = 560
    d.rounded_rectangle([x, y, x + w, y + h], radius=26, fill=(255, 255, 255),
                        outline=T["rule"], width=1)
    for i, c in enumerate(((226, 92, 92), (232, 176, 66), (98, 186, 106))):
        d.ellipse([x + 34 + i * 34, y + 34, x + 54 + i * 34, y + 54], fill=c)
    d.rounded_rectangle([x + 150, y + 26, x + w - 34, y + 62], radius=18,
                        fill=(240, 240, 243))
    d.text((x + 172, y + 56), url, font=F(24, "Regular"), fill=T["meta"], anchor="ls")
    d.line([(x, y + 88), (x + w, y + 88)], fill=(236, 236, 239), width=1)
    cy = y + 88 + 96
    for ln in BL.wrap(headline, F(52, "Bold"), w - 160):
        d.text((x + w // 2, cy), ln, font=F(52, "Bold"), fill=T["ink"], anchor="ms")
        cy += 66
    cy += 18
    for ln in BL.wrap(subline, F(30, "Regular"), w - 220):
        d.text((x + w // 2, cy), ln, font=F(30, "Regular"), fill=T["ink"], anchor="ms")
        cy += 44
    bw = int(F(32, "SemiBold").getlength(button)) + 88
    d.rounded_rectangle([x + (w - bw) // 2, cy + 26, x + (w + bw) // 2, cy + 96],
                        radius=35, fill=T["accent"])
    d.text((x + w // 2, cy + 72), button, font=F(32, "SemiBold"),
           fill=(255, 255, 255), anchor="ms")
    return y + h


def build(i, s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, i, s["title"])
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * SUB_LEAD)
    top = y + GAP
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "chips":
        yy = chips_grid(d, LEFT, top, MEASURE, band, T, s["ticks"], s["hot"])
    elif kind == "converge":
        yy = converge(d, LEFT, top + 20, MEASURE, band - 40, T, s["ticks"],
                      s["target"])
    elif kind == "arrows":
        yy = arrows3(d, LEFT, top, MEASURE, band, T, s["pairs"])
    elif kind == "browser":
        bh = 560
        yy = browser(im, d, LEFT, top + max(0, (band - bh) // 2), MEASURE, T,
                     *s["page"])
    elif kind == "split":
        src = Image.open(f"{SHOTS}/{s['shot']}").convert("RGB")
        pw = 400
        ph = min(band, round(src.height * pw / src.width))
        BL.checks(d, LEFT, top + 20, MEASURE - pw - 56, band - 40, T,
                  s["ticks"], cap=36, lead=1.30, col=T["ink"], rule=False)
        k = pw / src.width
        if src.height * k > band:
            src = src.crop((0, 0, src.width, int(band / k)))
        sw, sh_ = pw, round(src.height * k)
        src = src.resize((sw, sh_), Image.LANCZOS)
        box = [RIGHT - pw, top, RIGHT, top + sh_]
        shadow(im, box)
        mask = Image.new("L", (sw, sh_), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh_ - 1],
                                               radius=PLATE_R, fill=255)
        im.paste(src, (box[0], box[1]), mask)
        yy = box[3]
    elif kind == "ticks_art":
        src = source(f"{WF_C}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        th = band - ah - GAP
        BL.checks(d, LEFT, top, MEASURE, th, T, s["ticks"],
                  cap=40, lead=1.26, col=T["ink"])
        yy = plate(im, src.convert("RGB"), top + th + GAP)
    elif kind == "shot":
        src = f"{SHOTS}/{s['shot']}"
        w0, h0 = Image.open(src).size
        if s.get("crop"):
            c = s["crop"]
            w0, h0 = c[2] - c[0], c[3] - c[1]
        ph = round(h0 * MEASURE / w0)
        yy = top + max(0, (band - ph) // 2)
        img = Image.open(src).convert("RGB")
        if s.get("crop"):
            img = img.crop(s["crop"])
        yy = plate(im, img, yy)
    else:
        nh = 280
        yy = top + max(0, (band - nh) // 2)
        yy = BL.notify(im, d, LEFT, yy, MEASURE, T, *s["notify"], h=nh,
                       logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy

SLIDES = [
    dict(title="One Customer", kind="chips",
         sub="Pick **ONE CUSTOMER.** Stop saying "
             "**“everyone is my customer”.**",
         ticks=["Local businesses", "Digital agencies", "Software companies",
                "E-commerce brands", "Real estate companies",
                "Coaches and consultants"],
         hot=0),

    dict(title="One Painful Problem", kind="converge",
         sub="Pick **ONE PAINFUL PROBLEM.** Stop trying to solve "
             "everything at once.",
         ticks=["Content taking too long", "No-shows", "Manual follow-ups",
                "Customer retention", "Quotes going out late"],
         target="Leads not replying"),

    dict(title="One AI Workflow", kind="ticks_art",
         sub="Build **ONE AI WORKFLOW.** You are selling the **result**, "
             "not the tech.",
         ticks=["Automate first", "Speed up the process",
                "Improve consistency", "Reduce workload",
                "24/7 support and nurturing"],
         art="Appointment Setter.png"),

    dict(title="Sell It Before Ready", kind="arrows",
         sub="Sell it **BEFORE you feel READY.** This is where most "
             "people freeze.",
         pairs=[("More time", "Action creates clarity"),
                ("Perfection", "They buy relief"),
                ("Building", "Start polishing")]),

    dict(title="Start On Ultron", kind="shot",
         sub="Go to **51ultron.com** and put the workforce on it instead "
             "of building from scratch.",
         shot="home.png"),

    dict(title="Grab A Playbook", kind="split",
         sub="**Working templates** that skip you straight past the "
             "setup months.",
         ticks=["Pick the playbook", "Wire your accounts",
                "Launch this week"],
         shot="sub-techniques.png"),

    dict(title="Ship The Landing Page", kind="browser",
         sub="Explain the offer and **capture interest.** Ultron builds "
             "and deploys it.",
         page=("northlake-kitchens.com", "Never miss another booking",
               "The AI receptionist that answers, books and follows up.",
               "Book a call")),

    dict(title="Connect Payments", kind="notify",
         sub="**Connect Stripe** and start **SELLING** who your ideal "
             "clients become working with you.",
         notify=("Stripe", "from a new client", "$8,500.00")),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("Comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.36),
          ("a FREE GUIDE", "ExtraBold", 0.54)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/thirty"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(i, s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {name:24} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 224
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

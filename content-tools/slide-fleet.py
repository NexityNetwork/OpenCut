#!/usr/bin/env python3
"""The Agent Blueprint deck - 1080x1920 carousel frames on paper.

Twenty-first family. The reference's five agent frames with its two slop
frames redesigned per instruction: the CLAUDE CODE pixel-brick art becomes
the actual pair that does the job - Claude and ultron as tool tiles - and
the pentagon-orb architecture diagram becomes the five agents on the ruled
register, names bold, jobs beside them.

Frames 1-3 keep the reference's structure: ticks with the money bold, then
the artifact - a real recycled n8n canvas for research, the Opsline
leaderboard surface for outreach, and the CRM-update chat with its tool row
for sales. THE CTA IS ALWAYS COMMENT; the reference repeats `comment W` on
every frame and it goes on the close only.
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
SF = _load("surfaces")
F, adv, draw_tracked, source = SB.F, SB.adv, SB.draw_tracked, SB.source

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 58, -0.024
SUB_SZ = 34
LIST_BAND = 216
PLATE_R = 22
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
WF = os.environ.get("WORKFLOWS", "../another no name workflow")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def shadow(im, box, r=PLATE_R, blur=26, alpha=50, drop=14):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0] + 10, box[1] + drop, box[2] - 10, box[3] + drop],
        radius=r, fill=(0, 0, 0, alpha))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def plate(im, src, top, w=MEASURE):
    src = src.crop((2, 2, src.width - 2, src.height - 2))
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


def logo_row(im, names, y, sz=72, gp=30):
    d = ImageDraw.Draw(im)
    names = [n for n in names if os.path.exists(f"{LOGOS}/{n}.png")]
    x = W // 2 - (len(names) * sz + (len(names) - 1) * gp) // 2
    for n in names:
        BL.logo_tile(im, d, x, y, sz, n, dict(rule=T["rule"]), LOGOS)
        x += sz + gp
    return y + sz


def portfolio(d, x, y, w, h, T, rows, total):
    """OWNING ASSETS, drawn as the assets. `You go from services to owning
    assets` is a claim about a portfolio, so the frame shows one: products you
    own, each with its own trend and its own monthly line, one of them killed
    because the tick above says double down on winners ONLY - and the total is
    the target the third tick names.

    Two logo tiles and a plus said none of that. They said `these are two
    products that exist`."""
    d.text((x, y + 34), "Products you own", font=F(32, "Bold"), fill=T["ink"],
           anchor="ls")
    d.text((x + w, y + 34), "recurring", font=F(28, "Regular"), fill=T["meta"],
           anchor="rs")
    ry = y + 62
    d.line([(x, ry), (x + w, ry)], fill=T["rule"], width=1)
    rh = 96
    for i, (name, pts, mrr, dead) in enumerate(rows):
        by = ry + i * rh + 60
        col = T["meta"] if dead else T["ink"]
        f = F(38, "SemiBold")
        d.text((x, by), name, font=f, fill=col, anchor="ls")
        if dead:
            d.line([(x - 4, by - 13), (x + f.getlength(name) + 6, by - 13)],
                   fill=T["meta"], width=3)
        # the trend, small and honest: a killed product's line falls
        sx, sw_, sh_ = x + int(w * .52), 150, 44
        P = [(sx + int(sw_ * k / (len(pts) - 1)), by - 12 - int(sh_ * v))
             for k, v in enumerate(pts)]
        d.line(P, fill=T["meta"] if dead else T["accent"], width=4, joint="curve")
        d.text((x + w, by), mrr, font=F(38, "Bold"), fill=col, anchor="rs")
        if i + 1 < len(rows):
            d.line([(x, ry + (i + 1) * rh), (x + w, ry + (i + 1) * rh)],
                   fill=T["rule"], width=1)
    ty = ry + len(rows) * rh
    d.line([(x, ty), (x + w, ty)], fill=T["ink"], width=3)
    d.text((x, ty + 82), "Recurring, every month", font=F(34, "Regular"),
           fill=T["ink"], anchor="ls")
    d.text((x + w, ty + 92), total, font=F(76, "Bold"), fill=T["ink"], anchor="rs")
    return ty + 110


def cycle(d, x, y, w, h, T, nodes, base):
    """THE BLUEPRINT AS THE LOOP IT IS. Four agents handing to each other -
    research feeds outreach, outreach feeds sales, sales feeds content,
    content feeds research back - with the fifth sitting UNDER all of them
    because monitoring is not a step, it is the floor.

    A two-column list of five names was a staff directory. This is the
    architecture the frame's title claims."""
    gap = 64
    bw = (w - gap) // 2
    bh = 196
    ys = [y, y + bh + gap]
    pos = [(x, ys[0]), (x + bw + gap, ys[0]),
           (x + bw + gap, ys[1]), (x, ys[1])]
    for (bx, by), (name, role) in zip(pos, nodes):
        d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=22,
                            fill=(255, 255, 255), outline=T["rule"], width=1)
        d.text((bx + 28, by + 66), name, font=F(38, "Bold"), fill=T["ink"], anchor="ls")
        ty = by + 112
        for ln in BL.wrap(role, F(29, "Regular"), bw - 56):
            d.text((bx + 28, ty), ln, font=F(29, "Regular"), fill=T["ink"], anchor="ls")
            ty += 38

    def arrow(x0, y0, x1, y1):
        d.line([(x0, y0), (x1, y1)], fill=T["ink"], width=4)
        dx, dy = x1 - x0, y1 - y0
        n = max(1, (dx * dx + dy * dy) ** .5)
        ux, uy = dx / n, dy / n
        px, py = -uy, ux
        d.polygon([(x1, y1), (x1 - ux * 20 + px * 11, y1 - uy * 20 + py * 11),
                   (x1 - ux * 20 - px * 11, y1 - uy * 20 - py * 11)], fill=T["ink"])

    m = 14
    arrow(x + bw + m, ys[0] + bh // 2, x + bw + gap - m, ys[0] + bh // 2)
    arrow(x + bw + gap + bw // 2, ys[0] + bh + m,
          x + bw + gap + bw // 2, ys[1] - m)
    arrow(x + bw + gap - m, ys[1] + bh // 2, x + bw + m, ys[1] + bh // 2)
    arrow(x + bw // 2, ys[1] - m, x + bw // 2, ys[0] + bh + m)

    by = ys[1] + bh + 56
    d.rounded_rectangle([x, by, x + w, by + 128], radius=22, fill=T["ink"])
    d.text((x + 28, by + 58), base[0], font=F(38, "Bold"), fill=(250, 250, 250),
           anchor="ls")
    d.text((x + 28, by + 100), base[1], font=F(29, "Regular"),
           fill=(196, 198, 204), anchor="ls")
    d.text((x + w - 28, by + 82), base[2], font=F(28, "SemiBold"),
           fill=(196, 198, 204), anchor="rs")
    return by + 128


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), s["title"], F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    # The subhead goes through the bold parser like every other deck. Without
    # it the asterisks print, which is what shipped on frame 5.
    y = ry + 52 + int(SUB_SZ * .727)
    for ln in SB.rich_lines(s["sub"], SUB_SZ, MEASURE):
        SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
        y += round(SUB_SZ * 1.40)
    y -= int(SUB_SZ * .727)
    y += 36
    if s.get("ticks"):
        BL.checks(d, LEFT, y, MEASURE, LIST_BAND, T, s["ticks"],
                  cap=38, lead=1.28, col=T["ink"], bold=s.get("bold", ()))
        y += LIST_BAND + 36
    top = y + 28
    band = SAFE_BOT - top

    kind = s["kind"]
    if kind == "art":
        src = source(f"{WF}/{s['art']}")
        ah = round(src.height * MEASURE / (src.width - 4))
        yy = top + max(0, (band - ah) // 2)
        yy = plate(im, src, yy)
    elif kind == "pad":
        surf = SF.SURFACES[s["surf"]]().resize((656, 516), Image.LANCZOS)
        pad = SF.PADS[s["surf"]]
        ph = 560
        yy = top + max(0, (band - ph) // 2)
        shadow(im, [LEFT, yy, LEFT + MEASURE, yy + ph], r=24)
        d.rounded_rectangle([LEFT, yy, LEFT + MEASURE, yy + ph], radius=24,
                            fill=pad)
        im.alpha_composite(surf, (LEFT + (MEASURE - 656) // 2, yy + 22))
        yy += ph
    elif kind == "chat":
        ch = BL.chat(d, LEFT, 0, MEASURE, T, s["chat"], measure_only=True)
        stack = ch + 48 + 64
        yy = top + max(0, (band - stack) // 2)
        yy = BL.chat(d, LEFT, yy, MEASURE, T, s["chat"])
        yy = logo_row(im, s["logos"], yy + 48)
    elif kind == "pair":
        ph = 560
        yy = top + max(0, (band - ph) // 2)
        yy = portfolio(d, LEFT, yy, MEASURE, ph, T, s["rows"], s["total"])
    elif kind == "cycle":
        ch = 196 * 2 + 64 + 56 + 128
        yy = top + max(0, (band - ch) // 2)
        yy = cycle(d, LEFT, yy, MEASURE, ch, T, s["nodes"], s["base"])
    else:
        # No ticks above this frame, so the register owns the whole band -
        # but the band math above still added the tick reserve; recompute.
        yy = BL.register(d, LEFT, top, MEASURE, SAFE_BOT - top - 130, T, s["rows"],
                         lsz=46, rsz=36, split=0.34, cap=(56, 42),
                         hot=None, rule_top=True)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed. The two redesigned frames keep their copy; only the pictures
# changed.

SLIDES = [
    dict(title="Research & Intelligence", kind="art",
         sub="Monitor and research your customer daily.",
         ticks=["Deploy task systems that run continuously",
                "Build once, they get charged forever",
                "Clients pay $2K-$8K/month per setup"],
         bold=(2,), art="6.png"),

    dict(title="Outreach & Lead Gen", kind="pad",
         sub="You scale revenue without adding headcount.",
         ticks=["Campaigns, messaging, and prospecting",
                "Teams stop testing blindly",
                "Retainers run $800-$4K/month"],
         bold=(2,), surf=0),

    dict(title="Sales & Deal Tracking", kind="chat",
         sub="You handle volume where humans create delays.",
         ticks=["Manage inquiries, score leads, trigger follow-ups",
                "Once live, you're mostly hands-off",
                "Price at $400-$1.5K per deployment"],
         bold=(2,),
         chat=[("me", "Create a customer record for the Northlake lead."),
               ("them", "Done. C-1024 is in the CRM, assigned to Mara. "
                        "Welcome email queued for 10:00.")],
         logos=["claude", "n8n", "telegram", "google-drive", "notion"]),

    dict(title="Infrastructure", kind="pair",
         sub="You go from services to owning assets.",
         ticks=["Deploy software rather than coding from 0",
                "Test markets fast, double down on winners only",
                "Target: $10K/month+ recurring revenue"],
         bold=(2,),
         rows=[("Intake bot", [.15, .3, .45, .62, .8], "$4,200", False),
               ("Quote engine", [.2, .35, .4, .58, .72], "$3,100", False),
               ("Review chaser", [.5, .38, .26, .16, .08], "killed", True),
               ("Booking portal", [.1, .22, .38, .5, .66], "$2,700", False)],
         total="$10,000"),

    dict(title="The 5-Agent Blueprint", kind="cycle",
         sub="Four agents hand to each other. **The fifth watches all of them.**",
         nodes=[("CORTEX", "Research & intelligence"),
                ("SPECTER", "Outreach & lead gen"),
                ("STRIKER", "Sales & deal tracking"),
                ("PULSE", "Content & social media")],
         base=("SENTINEL", "Infrastructure & monitoring", "under all four")),
]

# THE CTA IS ALWAYS COMMENT. The reference's own close.
CLOSER = [("comment", "Medium", 0.42),
          ("“W”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.36),
          ("A FREE BLUEPRINT", "ExtraBold", 0.48)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/fleet"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"):
        os.remove(p)
    made = []
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        name = s["title"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {name:24} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

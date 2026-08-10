#!/usr/bin/env python3
"""Body slides for the n8n reels - 1080x1920 frames, not overlays.

Proportions come off the reference sheet, then get pulled back inside the reel
safe box. Everything hangs off one left edge at x=100 except the logo row and the
CTA, which centre.

    title    296        setup    378
    bullets  456 / 528 / 600
    image    660 .. 1270
    logos   1318        cta     1412

Two corrections to the reference, both forced by the frame rather than by taste.

The reference puts its logo row at 72 percent and its CTA at 79 percent, which on
1080x1920 is y 1382 and y 1513. The bottom 480px of a reel is Instagram's own
chrome - username, caption, audio strip - so their CTA ships underneath it. Ours
moves up to 1412 and everything above it moves with it. The white band below is
not dead space, it is where the app draws.

That reclaimed height goes into the image, which is the whole point of the slide.
The exports are a constant 818 wide but run 420 to 752 tall, so the box is sized
so that FIVE OF SIX land at native width and only the tall one scales, to 0.81.
Matching the scale of the n8n node labels across slides is what makes six frames
read as a set; matching bounding boxes is what crushed the tall one to 0.57 and
made them read as six unrelated pictures.

The CTA is `read caption`, not the reference's `comment "AI"`. Same standing rule
as every other format here: the frame points at the caption, the caption carries
the keyword.
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
LEFT = 100
BG = (255, 255, 255)
INK = (17, 17, 17)
GREY = (90, 90, 92)
BULLET = (34, 34, 34)
TICK_RING = (198, 201, 207)
TICK_MARK = (60, 63, 70)

TITLE_BASE, SETUP_BASE = 296, 378
BULLET_BASE, BULLET_PITCH = 456, 72
IMG_BOX = (132, 660, 948, 1270)
LOGO_Y, LOGO_SZ, LOGO_GAP = 1318, 54, 22
CTA_BASE = 1412

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
WF = os.environ.get("WORKFLOWS", "../6 boring use cases example")
_f = {}


def F(sz, w="Bold"):
    if (sz, w) not in _f:
        _f[(sz, w)] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _f[(sz, w)]


_D = ImageDraw.Draw(Image.new("RGB", (1, 1)))
def tw(s, f): return _D.textbbox((0, 0), s, font=f)[2]


def fit(text, sz, weight, maxw, lo=30):
    while sz > lo and tw(text, F(sz, weight)) > maxw:
        sz -= 1
    return F(sz, weight)


def tick(d, x, y, r=15):
    """Ring plus check, the reference's bullet. Drawn rather than an emoji so it
    is the same shape on every device."""
    d.ellipse([x - r, y - r, x + r, y + r], outline=TICK_RING, width=3)
    d.line([(x - r * 0.42, y + r * 0.02), (x - r * 0.08, y + r * 0.38)],
           fill=TICK_MARK, width=3)
    d.line([(x - r * 0.10, y + r * 0.38), (x + r * 0.46, y - r * 0.36)],
           fill=TICK_MARK, width=3)


def logo_row(im, names, cy):
    tiles = []
    for n in names:
        p = f"{LOGOS}/{n}.png"
        if os.path.exists(p):
            tiles.append(Image.open(p).convert("RGBA").resize((LOGO_SZ, LOGO_SZ),
                                                              Image.LANCZOS))
    if not tiles:
        return
    total = len(tiles) * LOGO_SZ + (len(tiles) - 1) * LOGO_GAP
    x = (W - total) // 2
    for t in tiles:
        im.alpha_composite(t, (x, cy - LOGO_SZ // 2))
        x += LOGO_SZ + LOGO_GAP


def workflow(im, path):
    """Scale to fit the box, centred, never past 1:1.

    Trim the alpha first. Figma exports the frame, not the drawing: one of these
    six is 818x752 on canvas with 340px of nothing under it, and fitting the
    canvas scaled the only workflow that needed no scaling down to 0.81 while the
    other five sat at native. Trimmed, all six are native and the set matches."""
    x0, y0, x1, y1 = IMG_BOX
    src = Image.open(path).convert("RGBA")
    bb = src.split()[3].getbbox()
    if bb:
        src = src.crop(bb)
    k = min((x1 - x0) / src.width, (y1 - y0) / src.height, 1.0)
    w, h = int(src.width * k), int(src.height * k)
    im.alpha_composite(src.resize((w, h), Image.LANCZOS),
                       (x0 + (x1 - x0 - w) // 2, y0 + (y1 - y0 - h) // 2))
    return k


def cta_pill(d, text, cy):
    f = F(30, "Bold")
    tww = tw(text, f)
    pw, ph = tww + 76, 62
    x = (W - pw) // 2
    d.rounded_rectangle([x, cy - ph // 2, x + pw, cy + ph // 2], radius=ph // 2,
                        fill=(255, 255, 255), outline=(214, 216, 220), width=2)
    d.text((W // 2, cy), text, font=f, fill=(38, 38, 40), anchor="mm")


def build(slide):
    im = Image.new("RGBA", (W, H), (*BG, 255))
    d = ImageDraw.Draw(im)

    d.text((LEFT, TITLE_BASE), slide["title"],
           font=fit(slide["title"], 54, "Bold", W - LEFT * 2), fill=INK, anchor="ls")
    d.text((LEFT, SETUP_BASE), slide["setup"],
           font=fit(slide["setup"], 32, "Regular", W - LEFT * 2), fill=GREY, anchor="ls")

    for i, b in enumerate(slide["bullets"]):
        y = BULLET_BASE + i * BULLET_PITCH
        tick(d, LEFT + 15, y - 10)
        f = fit(b, 32, "Regular", W - LEFT - 60 - LEFT)
        d.text((LEFT + 48, y), b, font=f, fill=BULLET, anchor="ls")

    k = workflow(im, f"{WF}/{slide['workflow']}")
    logo_row(im, slide["logos"], LOGO_Y)
    cta_pill(d, slide.get("cta", "read caption"), CTA_BASE)
    return im, k


# The reference's own copy, and the workflow each one actually is - matched by
# reading the node labels, not by filename.
SLIDES = [
    dict(title="AI OPS & MANAGEMENT AGENT",
         setup="You make the business run without you.",
         bullets=["Turn repetitive ops into automated workflows",
                  "Keep tasks, deadlines, and handoffs organized daily",
                  "Track weekly performance so nothing slips"],
         workflow="Group 2147203098.png",
         logos=["notion", "slack", "gmail", "airtable", "make"]),

    dict(title="AI CONTENT ENGINE AGENT",
         setup="You turn attention into daily content output.",
         bullets=["Turn 1 idea into 10+ ready-to-post assets",
                  "Repurpose once, publish everywhere automatically",
                  "Stay consistent without burnout or creative blocks"],
         workflow="Group 2147203103.png",
         logos=["tiktok", "instagram", "x", "linkedin", "youtube", "gmail"]),

    dict(title="AI PRODUCT & DEV AGENT",
         setup="You ship features fast without chaos.",
         bullets=["Build faster with repeatable dev workflows",
                  "Turn messy ideas into clean specs + tasks",
                  "Retainers scale to $3K-$10K/month per client"],
         workflow="Group 2147203619-1.png",
         logos=["supabase", "notion", "slack", "openai"]),

    dict(title="AI SALES & GROWTH AGENT",
         setup="You generate revenue with repeatable systems.",
         bullets=["Write offers + messaging that actually converts",
                  "Generate leads with consistent outreach systems",
                  "Improve close rates/weekly optimization loops"],
         workflow="my-first-n8n-workflow-v0-562n19bdcfpf1 2.png",
         logos=["google-maps", "gmail", "hubspot", "calendly"]),

    dict(title="AI RESEARCH & SPY AGENT",
         setup="You find what's working before everyone else does.",
         bullets=["Track competitor ads, hooks, and offers",
                  "Spot trends before your market catches up",
                  "Turn insights into executions you can deploy fast"],
         workflow="Group 2147203101.png",
         logos=["perplexity", "openai", "notion", "gmail"]),

    dict(title="AI FUNNEL & GEN. AGENT",
         setup="You turn traffic into customers at scale.",
         bullets=["Fix funnel leaks that kill conversions",
                  "Launch tests that improve sales week by week",
                  "Scale what works with a predictable growth loop"],
         workflow="Group 2147203619.png",
         logos=["twilio", "supabase", "instagram", "stripe"]),
]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/slides"
    os.makedirs(out, exist_ok=True)
    made = []
    for i, s in enumerate(SLIDES, 1):
        im, k = build(s)
        p = f"{out}/{i:02d}.png"
        im.convert("RGB").save(p)
        made.append(p)
        print(f"  {i:02d}  {s['title']:28} {k:.2f}x  {s['workflow']}")
    # contact sheet so six can be judged as a set rather than one at a time
    TWd = 300
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (24, 24, 23))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"-> {out}/  and {out}/_sheet.png")

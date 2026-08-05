#!/usr/bin/env python3
# OLD vs NEW, with the structure the reference actually has.
#
# What makes the reference read as a system is the plumbing:
#   - both sides are CARDS, not columns of loose text
#   - the middle is a flow: tinted chips, one per task, joined by arrows
#   - two routing lines bracket the spine and turn into each card, so the chips
#     are visibly wired to both answers rather than floating between them
#
# Two things this pass fixes.
#
# COLOUR. The surface version was white cards and near-black type. Dropped on a
# dark clip that is exactly backwards - the type disappears and the cards read as
# holes punched in the video. So the whole palette lives in THEMES and every draw
# call reads from it; "dark" reverses it - lifted charcoal panels, near-white type,
# the pastel chips pulled down onto the dark field with their hue intact.
#
# SIZE. It filled the safe box top to bottom, which on a clip is a wall. The block
# is now MEASURED first and then centred in the safe box, so it occupies about two
# thirds of the available height with real air above and below. Seven rows became
# five - the point is made by the pattern, not by the inventory.
#
# The block is 860 wide sitting at x 90..950. That is the widest it can be while
# still clearing the TikTok rail on the right, and it puts the block centre at 520
# against a frame centre of 540 - close enough to read as centred, safe on both.
import colorsys, io, json, os
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 60, 950, 250, 1440

# block geometry - everything below is derived from these four numbers
BL, BR = 90, 950                       # block edges, both inside the safe box
BCX = (BL + BR) // 2                   # 520
CARDW = 300
CHIPW = 160

FD = "brand/fonts/extras/ttf"
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
_fc, _lc = {}, {}
def F(sz, w="Bold"):
    if (sz, w) not in _fc:
        _fc[(sz, w)] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _fc[(sz, w)]

MARK = json.load(open("brand/wordmark_paths.json"))
_D = ImageDraw.Draw(Image.new("RGB", (1, 1)))
def tw(s, f): return _D.textbbox((0, 0), s, font=f)[2]


def mark_img(width_px, colour="#FEF8E6", solid=True, stroke_px=3.0):
    asc = width_px * MARK["asc"] / MARK["w"]
    k = asc / MARK["asc"]
    w, h = int(MARK["w"] * k) + 8, int(asc) + 8
    style = (f'fill="{colour}"' if solid else
             f'fill="none" stroke="{colour}" stroke-width="{stroke_px/k:.2f}" stroke-linejoin="round"')
    body = "".join(f'<path d="{p["d"]}" {style}/>' for p in MARK["paths"])
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="-4 {-MARK["asc"]-4} {MARK["w"]+8} {MARK["asc"]+8}">{body}</svg>')
    return Image.open(io.BytesIO(cairosvg.svg2png(
        bytestring=svg.encode(), output_width=w, output_height=h))).convert("RGBA")


def logo(im, x, y, s, name, radius=15):
    """Half these logos ship as full-bleed white tiles, which on a dark card is a
    row of white squares - the exact thing that was wrong with the first overlay.
    Rounding them turns a square into an app icon, which is how a reader already
    expects to see a tool's mark, and it gives ultron's round orb something to
    line up with."""
    if (name, s, radius) not in _lc:
        t = Image.open(f"{LOGOS}/{name}.png").convert("RGBA").resize((s, s), Image.LANCZOS)
        mask = Image.new("L", (s * 4, s * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s * 4 - 1, s * 4 - 1],
                                               radius=radius * 4, fill=255)
        mask = mask.resize((s, s), Image.LANCZOS)
        a = t.getchannel("A").point(lambda v: v)
        t.putalpha(Image.composite(a, Image.new("L", (s, s), 0), mask))
        _lc[(name, s, radius)] = t
    im.alpha_composite(_lc[(name, s, radius)], (int(x), int(y)))


def fit(s, hi, weight, maxw, lo=24):
    while hi > lo and tw(s, F(hi, weight)) > maxw:
        hi -= 1
    return F(hi, weight)


# task, tint, old, new-logo (None = ultron), new-name.
# Five rows, not seven. Every row past the fourth is the reader confirming a
# pattern they already got, and each one costs height the clip needs back.
ROWS = [
    ("Writing",    (226, 224, 246), "Google Docs",       "claude",     "Claude"),
    ("Research",   (216, 240, 224), "Google Search",     "perplexity", "Perplexity"),
    ("Coding",     (250, 240, 214), "Stack Overflow",    "claude",     "Claude Code"),
    ("Outreach",   (248, 224, 232), "Mailchimp",         "hubspot",    "HubSpot"),
    ("Running it", (245, 221, 170), "Doing it yourself", None,         None),
]

TITLE = ("Which ", "tool", " should you use?")
SUB = "Use the right tool for the right task."
NAME_ASC = 34            # cap height of the names in the NEW column


THEMES = {
    # on paper
    "light": dict(
        bg=(246, 244, 240, 255), card=(255, 255, 255, 255), edge=(223, 218, 210),
        text=(24, 22, 20), muted=(96, 90, 84), title=(24, 22, 20), mark="#161513",
        band=(232, 229, 223, 255), band_text=(74, 70, 65),
        old=(196, 88, 62), new=(46, 132, 92),
        old_pill=(253, 242, 238, 255), new_pill=(233, 246, 238, 255),
        tan=(183, 132, 84), teal=(74, 140, 138),
        chip_v=None, chip_text=(46, 42, 38), rule=(223, 218, 210), shadow=False),
    # on video: nothing behind the type but the clip, so the whole thing reverses.
    # The clip this rides on is near black, so the panels have to LIFT off it -
    # a 16/15/14 card would be invisible. 30/29/27 at 88% plus a light hairline.
    "dark": dict(
        bg=(0, 0, 0, 0), card=(30, 29, 27, 224), edge=(92, 88, 82),
        text=(247, 245, 241), muted=(178, 172, 164), title=(255, 255, 255), mark="#F7F5F1",
        band=(30, 29, 27, 224), band_text=(238, 235, 230),
        old=(236, 130, 102), new=(94, 204, 146),
        old_pill=(60, 34, 28, 224), new_pill=(22, 56, 42, 224),
        tan=(212, 166, 112), teal=(112, 188, 186),
        chip_v=0.34, chip_text=(246, 244, 240), rule=(70, 67, 62), shadow=True),
}


def chip_fill(rgb, T):
    """A pastel scaled straight down goes to mud - a 10%-saturated tint at 30%
    brightness is grey with an opinion. Hold the hue, push the saturation up as
    far as the brightness comes down, and the chips stay colour-coded on video."""
    if T["chip_v"] is None:
        return rgb
    h, s, _ = colorsys.rgb_to_hsv(*[c / 255 for c in rgb[:3]])
    r, g, b = colorsys.hsv_to_rgb(h, min(0.80, max(0.52, s * 4.0)), T["chip_v"])
    return tuple(int(c * 255) for c in (r, g, b))


def arrow(d, x, gap_top, gap_bot, col):
    """A short, chunky connector centred in the gap. Spanning the whole gap makes
    it a thin stem, which is what read as wrong - the reference's arrows are small
    and sit between the chips rather than stretching to fill the space."""
    gap = gap_bot - gap_top
    length = max(24, int(gap * 0.56))
    y1 = gap_top + (gap + length) // 2
    y0 = y1 - length
    head = 13
    d.line([(x, y0), (x, y1 - head + 2)], fill=col, width=5)
    d.polygon([(x - head // 2 - 2, y1 - head), (x + head // 2 + 2, y1 - head), (x, y1)], fill=col)


def route(d, x, y_top, y_bot, card_x, col, radius=10, width=3):
    """A line that leaves the card, runs the length of the spine and turns back in.
    This is what makes the chips read as wired to the card instead of adjacent.

    Which quadrant each corner needs depends on which side the card is on. The
    previous version drew the left-hand corners on both sides, so the right route
    had two little arcs pointing the wrong way."""
    r = radius
    if card_x < x:                                   # card on the left, corners open left
        d.line([(card_x, y_top), (x - r, y_top)], fill=col, width=width)
        d.arc([x - 2 * r, y_top, x, y_top + 2 * r], 270, 360, fill=col, width=width)
        d.arc([x - 2 * r, y_bot - 2 * r, x, y_bot], 0, 90, fill=col, width=width)
        d.line([(x - r, y_bot), (card_x, y_bot)], fill=col, width=width)
    else:                                            # card on the right
        d.line([(card_x, y_top), (x + r, y_top)], fill=col, width=width)
        d.arc([x, y_top, x + 2 * r, y_top + 2 * r], 180, 270, fill=col, width=width)
        d.arc([x, y_bot - 2 * r, x + 2 * r, y_bot], 90, 180, fill=col, width=width)
        d.line([(x + r, y_bot), (card_x, y_bot)], fill=col, width=width)
    d.line([(x, y_top + r), (x, y_bot - r)], fill=col, width=width)


def draw_ultron(im, d, rx, cy, ICON, T):
    """The icon already exists - it is the favicon, public/newlogo.png. No tile
    needed to be designed; one was sitting in the repo the whole time."""
    logo(im, rx + 18, cy - ICON // 2, ICON, "ultron")
    m = mark_img(NAME_ASC * MARK["w"] / MARK["asc"], colour=T["mark"])
    im.alpha_composite(m, (rx + 18 + ICON + 14, int(cy - m.height // 2)))


def title_font():
    """Fitted once, up front, because the block height depends on it."""
    for sz in range(60, 39, -2):
        fa, fb = F(sz, "ExtraBold"), F(sz, "ExtraBoldItalic")
        if tw(TITLE[0], fa) + tw(TITLE[1], fb) + tw(TITLE[2], fa) <= BR - BL:
            return fa, fb, sz
    return F(40, "ExtraBold"), F(40, "ExtraBoldItalic"), 40


def measure():
    """Every vertical number in one place, so the block can be centred rather than
    stretched to whatever is left over. This is the bit that was missing."""
    _, _, tsz = title_font()
    m = dict(title_h=int(tsz * 1.22), gap1=22, band_h=64, gap2=30,
             pad_top=46, head_gap=46, pitch=96, pad_bot=16)
    m["card_h"] = m["pad_top"] + m["head_gap"] + len(ROWS) * m["pitch"] + m["pad_bot"]
    m["total"] = m["title_h"] + m["gap1"] + m["band_h"] + m["gap2"] + m["card_h"]
    return m


def build(surface=True, theme=None):
    T = THEMES[theme or ("light" if surface else "dark")]
    M = measure()
    im = Image.new("RGBA", (W, H), T["bg"])
    d = ImageDraw.Draw(im, "RGBA")

    y = SAFE_T + (SAFE_B - SAFE_T - M["total"]) // 2      # centred, not top-aligned

    # ---- title -------------------------------------------------------------
    fa, fb, _ = title_font()
    a, b, c = TITLE
    total = tw(a, fa) + tw(b, fb) + tw(c, fa)
    ty = y + M["title_h"] // 2
    x0 = BCX - total // 2
    if T["shadow"]:
        # on video the title has no plate under it, so it needs its own separation
        # two passes: a wide one to hold it over a bright frame, a tight one so the
        # letterforms keep their edge. This clip ends on a lit screen; one soft pass
        # was not enough there.
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        x = x0
        sd.text((x, ty), a, font=fa, fill=(0, 0, 0, 235), anchor="lm"); x += tw(a, fa) + tw(b, fb)
        sd.text((x, ty), c, font=fa, fill=(0, 0, 0, 235), anchor="lm")
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(4)))
    x = x0
    d.text((x, ty), a, font=fa, fill=T["title"], anchor="lm"); x += tw(a, fa)
    hl_pad = int(fa.size * 0.07)
    d.rounded_rectangle([x - hl_pad, ty - int(fa.size * 0.44), x + tw(b, fb) + hl_pad,
                         ty + int(fa.size * 0.44)], radius=8, fill=T["new"])
    d.text((x, ty), b, font=fb, fill=(16, 15, 14), anchor="lm"); x += tw(b, fb)
    d.text((x, ty), c, font=fa, fill=T["title"], anchor="lm")
    y += M["title_h"] + M["gap1"]

    # ---- subtitle band -----------------------------------------------------
    # Block width, not full bleed. Edge to edge only works when there is a surface
    # under it; on a clip it runs straight out through the unsafe margins.
    d.rounded_rectangle([BL, y, BR, y + M["band_h"]], radius=M["band_h"] // 2, fill=T["band"])
    d.text((BCX, y + M["band_h"] // 2), SUB, font=fit(SUB, 32, "Bold", BR - BL - 60),
           fill=T["band_text"], anchor="mm")
    y += M["band_h"] + M["gap2"]

    # ---- cards -------------------------------------------------------------
    lx, rx = BL, BR - CARDW
    chip_x = BCX - CHIPW // 2
    route_l, route_r = lx + CARDW + 30, rx - 30

    top, bot = y, y + M["card_h"]
    for cx in (lx, rx):
        d.rounded_rectangle([cx, top, cx + CARDW, bot], radius=22,
                            fill=T["card"], outline=T["edge"], width=2)

    hy = top + M["pad_top"]
    for cx, label, col, pill in ((lx, "OLD", T["old"], T["old_pill"]),
                                 (rx, "NEW", T["new"], T["new_pill"])):
        pw, ph = 158, 52
        px = cx + (CARDW - pw) // 2
        d.rounded_rectangle([px, hy - ph // 2, px + pw, hy + ph // 2], radius=ph // 2,
                            fill=pill, outline=col, width=3)
        r, mx = 12, px + 28
        d.ellipse([mx - r, hy - r, mx + r, hy + r], fill=col)
        tick = (16, 15, 14) if theme == "dark" or not surface else (255, 255, 255)
        if label == "OLD":
            d.line([(mx - 5, hy - 5), (mx + 5, hy + 5)], fill=tick, width=3)
            d.line([(mx - 5, hy + 5), (mx + 5, hy - 5)], fill=tick, width=3)
        else:
            d.line([(mx - 5, hy), (mx - 1, hy + 5)], fill=tick, width=3)
            d.line([(mx - 1, hy + 5), (mx + 6, hy - 5)], fill=tick, width=3)
        d.text((px + pw // 2 + 15, hy), label, font=F(31, "ExtraBold"), fill=col, anchor="mm")

    # ---- rows --------------------------------------------------------------
    rows_top = hy + M["head_gap"]
    pitch, ICON = M["pitch"], 54
    first_cy = rows_top + pitch // 2
    last_cy = rows_top + (len(ROWS) - 1) * pitch + pitch // 2

    route(d, route_l, first_cy, last_cy, lx + CARDW, T["tan"])
    route(d, route_r, first_cy, last_cy, rx, T["teal"])

    for i, (task, tint, old, nlogo, nname) in enumerate(ROWS):
        cy = rows_top + i * pitch + pitch // 2

        d.text((lx + CARDW // 2, cy), old, font=fit(old, 32, "Medium", CARDW - 36),
               fill=T["muted"], anchor="mm")

        if nlogo is None:
            draw_ultron(im, d, rx, cy, ICON, T)
        else:
            logo(im, rx + 18, cy - ICON // 2, ICON, nlogo)
            d.text((rx + 18 + ICON + 14, cy), nname,
                   font=fit(nname, 32, "Bold", CARDW - ICON - 48), fill=T["text"], anchor="lm")

        d.rounded_rectangle([chip_x, cy - 25, chip_x + CHIPW, cy + 25],
                            radius=10, fill=chip_fill(tint, T))
        d.text((chip_x + CHIPW // 2, cy), task, font=fit(task, 27, "BoldItalic", CHIPW - 22),
               fill=T["chip_text"], anchor="mm")

        if i < len(ROWS) - 1:
            arrow(d, BCX, cy + 25, cy + pitch - 25, T["tan"] if i % 2 else T["teal"])
            yy = rows_top + (i + 1) * pitch
            d.line([(lx + 26, yy), (lx + CARDW - 26, yy)], fill=T["rule"], width=2)
            d.line([(rx + 26, yy), (rx + CARDW - 26, yy)], fill=T["rule"], width=2)

    return im, top, bot


def guides(im, path):
    g = im.convert("RGBA").copy()
    gd = ImageDraw.Draw(g, "RGBA")
    gd.rectangle([SAFE_L, SAFE_T, SAFE_R, SAFE_B], outline=(60, 220, 130, 220), width=4)
    gd.rectangle([SAFE_R, 0, W, H], fill=(206, 60, 60, 46))
    gd.rectangle([0, 0, W, SAFE_T], fill=(206, 60, 60, 46))
    gd.rectangle([0, SAFE_B, W, H], fill=(206, 60, 60, 46))
    gd.rectangle([0, 0, SAFE_L, H], fill=(206, 60, 60, 46))
    g.convert("RGB").save(path)


if __name__ == "__main__":
    M = measure()
    top = SAFE_T + (SAFE_B - SAFE_T - M["total"]) // 2
    print(f"block {M['total']}px in a {SAFE_B - SAFE_T}px safe box  "
          f"({M['total'] * 100 // (SAFE_B - SAFE_T)}%)   "
          f"y {top}..{top + M['total']}   x {BL}..{BR}")

    im, _, bot = build(surface=True)
    im.convert("RGB").save("brand/COMPARE2.png")
    guides(im, "brand/COMPARE2_GUIDES.png")

    ov, _, _ = build(surface=False)
    ov.save("brand/OVERLAY2.png")

    # what it actually looks like on the clip it is going on
    clip = Image.open("brand/frame2393.png").convert("RGBA").resize((W, H), Image.LANCZOS)
    comp = Image.alpha_composite(clip, ov)
    comp.convert("RGB").save("brand/OVER2_2393.png")
    guides(comp, "brand/OVER2_2393_GUIDES.png")
    print("-> brand/COMPARE2.png  brand/OVERLAY2.png  brand/OVER2_2393.png")

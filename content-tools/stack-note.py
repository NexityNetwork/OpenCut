#!/usr/bin/env python3
# The format that actually won. It is a note, not a design.
#
# Anatomy, in order of how much each part is carrying:
#
# 1. NO PANEL. Type sits directly on the clip. Every card, pill, rounded rectangle
#    and scrim we have been building says "an ad is happening". This says someone
#    typed something. That is the whole reason it works.
# 2. TWO TILES AND A PLUS. The pair is the hook and it is doing the recognising -
#    a reader knows the left mark before they read a word. Slot two is what you
#    are selling, borrowing the credibility of slot one.
# 3. ONE LEFT EDGE. The text starts at the left edge of the LEFT TILE, not at the
#    frame margin. That indent is what makes it read as one object. It leaves a
#    wide empty left margin and that is correct, not a mistake to fix.
# 4. WEIGHT IS THE ONLY EMPHASIS. No colour, no highlight, no accent. Regular for
#    the connective words, bold for the payload, and the bold words alone are the
#    whole message if you skim.
# 5. LITERAL HYPHENS. "- " not a bullet glyph. A bullet glyph is a document. A
#    hyphen is a person typing.
# 6. TOP THIRD ONLY. Four lines, then nothing. The bottom two thirds stay video,
#    which is what keeps a viewer watching instead of reading and leaving.
#
# The reference sits about 190px from the top, which is inside Instagram's chrome.
# It got away with it. We start at 260 instead, which costs nothing and does not
# rely on getting away with anything.
import io, json, os, sys
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
SAFE_T, SAFE_L, SAFE_R = 250, 60, 950

# Measured off the reference screenshot (660 wide) and scaled by 1080/660 = 1.636,
# because guessing these produced something that read as a designed layout rather
# than a typed note. What was wrong the first time, in order of how much it showed:
#
#   line pitch      56   ->   38    the big one. 1.18x the type size, not 1.5x.
#                                   Loose leading is what makes text look laid out.
#   tile gap        62   ->  105    the tiles were nearly touching
#   body size       37   ->   32    the reference is small on purpose. Four short
#                                   lines can be small; that is the trade
#   tiles to lead   74   ->   56
#   lead to list    82   ->   72
#
# Reference puts the tiles at y 214, which is inside Instagram's top chrome. Same
# metrics, shifted down to 250 so nothing depends on getting away with it.
TILE = 196
PLUS_GAP = 105
LEAD_SZ = 33
BODY_SZ = 32
LINE_H = 38
TILE_TO_LEAD = 56          # tile bottom -> lead baseline
LEAD_TO_LIST = 72          # lead baseline -> first list baseline

FD = "brand/fonts/extras/ttf"
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
_fc, _lc = {}, {}


def F(sz, w="Regular"):
    if (sz, w) not in _fc:
        _fc[(sz, w)] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _fc[(sz, w)]


_D = ImageDraw.Draw(Image.new("RGB", (1, 1)))
def tw(s, f): return _D.textbbox((0, 0), s, font=f)[2]


def tile(im, x, y, s, name, radius=None, plate=None, inset=0.82):
    """Rounded like an app icon, because that is what the reader's eye is trained
    on. iOS uses about 22 percent of the side.

    ultron's mark is a round orb on transparency, so on its own it reads as a
    floating ball next to a square - which is exactly what the pair must not do.
    `plate` gives it the tile the other logos already ship with. The reference did
    the same thing: Clawdbot's blob sits on a black square."""
    r = radius or int(s * 0.22)
    key = (name, s, r, plate, inset)
    if key not in _lc:
        src = Image.open(f"{LOGOS}/{name}.png").convert("RGBA")
        if plate:
            t = Image.new("RGBA", (s, s), (0, 0, 0, 0))
            ImageDraw.Draw(t).rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=plate)
            g = int(s * inset)
            t.alpha_composite(src.resize((g, g), Image.LANCZOS), ((s - g) // 2, (s - g) // 2))
        else:
            t = src.resize((s, s), Image.LANCZOS)
            m = Image.new("L", (s * 4, s * 4), 0)
            ImageDraw.Draw(m).rounded_rectangle([0, 0, s * 4 - 1, s * 4 - 1], radius=r * 4, fill=255)
            t.putalpha(Image.composite(t.getchannel("A"), Image.new("L", (s, s), 0),
                                       m.resize((s, s), Image.LANCZOS)))
        _lc[key] = t
    im.alpha_composite(_lc[key], (int(x), int(y)))


# logos whose art does not fill a square get one drawn for them
PLATE = {"ultron": (10, 10, 12, 255)}


def runs(text):
    """`Open **CLAUDE & ULTRON**` -> [(regular, 'Open '), (bold, 'CLAUDE & ULTRON')]"""
    out, bold = [], False
    for part in text.split("**"):
        if part:
            out.append((bold, part))
        bold = not bold
    return out


BODY_W, EMPH_W = "Medium", "Bold"


def measure(text, sz):
    return sum(tw(t, F(sz, EMPH_W if b else BODY_W)) for b, t in runs(text))


def draw_runs(d, x, y, text, sz, fill):
    for b, t in runs(text):
        f = F(sz, EMPH_W if b else BODY_W)
        d.text((x, y), t, font=f, fill=fill, anchor="ls")
        x += tw(t, f)
    return x


# left tile, right tile, lead line, four dash lines.
# Slot one is the mark that buys the stop. Slot two is what we are selling.
#
# The four lines are an ARGUMENT, not a list. Line 1 states the thing everyone
# already agrees with, line 2 turns it, line 3 says where that leaves you, line 4
# is us. A list of four features cannot use this format; a list of four beats can.
VARIANTS = {
    # the approved one. Kept verbatim - the arithmetic is the hook, and the caption
    # is where the actual answer goes, which is the only honest way to run a frame
    # that promises a number.
    "money": dict(
        tiles=("claude", "ultron"),
        lead="IF you're **18-35**:",
        lines=["Open **CLAUDE & ULTRON**",
               "Build one **AGENT running 24/7**",
               "Sell it **1,000** times at **$27**",
               "That's **$27,000** a month"]),
    "attention": dict(
        tiles=("claude", "ultron"),
        lead="**VIBECODING** changed one thing:",
        lines=["Building got **CHEAPER**",
               "Attention stayed **EXPENSIVE**",
               "The edge moved to **AFTER LAUNCH**",
               "**ULTRON** is that layer"]),
    "moat": dict(
        tiles=("claude", "ultron"),
        lead="IF you can ship in **a weekend**:",
        lines=["So can **EVERYONE ELSE**",
               "Launching is not the **MOAT**",
               "Research, outreach, **FOLLOW-UP**",
               "**ULTRON** runs all of it"]),
    "operate": dict(
        tiles=("claude", "ultron"),
        lead="IF you already **shipped**:",
        lines=["The build was the **EASY** part",
               "Operating is what **DECIDES** it",
               "Nobody keeps it up for **6 MONTHS**",
               "**ULTRON** does not get tired"]),
}


def build(v, surface=False):
    V = VARIANTS[v]
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255) if surface else (0, 0, 0, 0))
    d = ImageDraw.Draw(im, "RGBA")

    pair_w = TILE * 2 + PLUS_GAP
    lx = (W - pair_w) // 2                      # the pair is centred on the FRAME
    ty = SAFE_T + 10

    # everything below hangs off the left tile's left edge - one edge, no exceptions
    for i, name in enumerate(V["tiles"]):
        tile(im, lx + i * (TILE + PLUS_GAP), ty, TILE, name, plate=PLATE.get(name))

    pf = F(54, "Bold")
    d.text((lx + TILE + PLUS_GAP // 2, ty + TILE // 2), "+", font=pf,
           fill=(255, 255, 255), anchor="mm")

    # baselines, not a running cursor. The two gaps around the lead line are
    # different from the list's own pitch, so stepping by one number cannot express it.
    y0 = ty + TILE + TILE_TO_LEAD
    body = [(V["lead"], LEAD_SZ, y0)] + [
        ("- " + l, BODY_SZ, y0 + LEAD_TO_LIST + i * LINE_H) for i, l in enumerate(V["lines"])]

    # the reference has no visible glow. Just enough to survive a bright frame.
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for text, sz, y in body:
        draw_runs(sd, lx, y, text, sz, (0, 0, 0, 210))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7)))

    widest = 0
    for text, sz, y in body:
        widest = max(widest, draw_runs(d, lx, y, text, sz, (255, 255, 255)) - lx)
    y = body[-1][2]

    over = [t for t, sz, _ in body if lx + measure(t, sz) > SAFE_R]
    return im, lx, ty, y, lx + widest, over


if __name__ == "__main__":
    clip = Image.open("brand/frame2393.png").convert("RGBA").resize((W, H), Image.LANCZOS)
    outs = []
    for v in VARIANTS:
        im, lx, ty, bot, right, over = build(v)
        im.save(f"brand/NOTE_{v}.png")
        comp = Image.alpha_composite(clip, im)
        comp.convert("RGB").save(f"brand/NOTE_{v}_ON.png")
        outs.append((comp.convert("RGB"), v))
        print(f"  {v:7} x {lx}..{right}  y {ty}..{bot}   "
              f"{'inside' if right <= SAFE_R and ty >= SAFE_T else 'OVER'}  "
              f"block is {(bot - ty) * 100 // H}% of the frame")
        for t in over:
            print(f"          TOO LONG, cut it: {t}")

    TWd = 350
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(outs) * (TWd + 10), th + 42), (16, 16, 15))
    sd = ImageDraw.Draw(sheet)
    for i, (o, v) in enumerate(outs):
        x = i * (TWd + 10)
        sd.text((x + 6, 10), v, font=F(24, "Bold"), fill=(245, 221, 170))
        sheet.paste(o.resize((TWd, th), Image.LANCZOS), (x, 42))
    sheet.save("brand/NOTE_SHEET.png")
    print("-> brand/NOTE_SHEET.png")

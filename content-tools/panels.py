#!/usr/bin/env python3
"""Drawn stand-ins for the slides that are not workflows.

Three steps in the walkthrough are not canvases. They are a node's parameter
pane, a code step and what it emitted, and a run's results. Screenshotting those
puts somebody's real account data in a post, and nothing in the twenty canvases
looks like them, so they get DRAWN.

Drawn, not faked. No window chrome, no traffic lights, no browser frame - the
design kit bans those and they are exactly what makes a mock read as a lie. What
is reproduced is the MATERIAL: a card, a hairline, a label row, a monospaced
block, a bar. Everything comes out 818px wide, which is what every real export
in the set is, so a drawn panel and a real canvas land at the same scale on the
plate and read as siblings.

The rule these are rebuilt against, after a first version that looked like a
wireframe: A PANEL MUST BE AS DENSE AS THE CANVAS IT SITS BESIDE. An n8n canvas
is wall to wall with nodes and labels. A drawn panel with four fields and half a
card of white underneath does not read as the same kind of object - it reads as
something that failed to load. Density is not decoration here, it is the only
thing that makes the drawing belong on the frame.

Corollary: nothing floats. Every element runs to a margin or to another element.
The first version placed things from the top left and let the bottom right fall
empty on all three, which is section 4's dead band inside a 553px box.

    config_panel()  a node's parameter pane, controls then the body they build
    code_panel()    a code step above the rows it actually emitted
    dashboard()     a run's results: counts, a week of volume, the last rows
"""
import os

from PIL import Image, ImageDraw, ImageFont

CARD = (255, 255, 255)
EDGE = (224, 227, 232)
HAIR = (238, 240, 244)
INK = (28, 30, 34)
MUTED = (122, 127, 136)
FAINT = (166, 171, 180)
CODE_BG = (246, 248, 250)
S_KEY = (38, 42, 50)
S_STR = (176, 66, 50)
S_NUM = (52, 98, 196)
S_CMT = (150, 156, 166)
ACCENT = (240, 110, 60)
GREEN = (26, 154, 88)
BLUE = (52, 116, 240)
BAR = (218, 226, 240)
BAR_HOT = (52, 116, 240)

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
_f = {}


def F(sz, w="Regular"):
    k = (sz, w)
    if k not in _f:
        _f[k] = (ImageFont.truetype(MONO, int(sz)) if w == "mono"
                 else ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz)))
    return _f[k]


def card(d, box, r=12, fill=CARD, edge=EDGE, w=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=edge, width=w)


def topbar(d, x, y, w, name, tab="Parameters"):
    """Node name, a tab strip with one active, and a run button hard right. The
    active tab's underline is what says `this is a pane inside something`."""
    d.rounded_rectangle([x, y, x + 30, y + 30], radius=8, fill=BLUE)
    d.ellipse([x + 9, y + 9, x + 21, y + 21], outline=CARD, width=3)
    d.text((x + 42, y + 22), name, font=F(17, "SemiBold"), fill=INK, anchor="ls")

    tx = x + 42
    for t in ("Parameters", "Settings", "Docs"):
        f = F(13, "SemiBold" if t == tab else "Medium")
        tw = d.textbbox((0, 0), t, font=f)[2]
        d.text((tx, y + 58), t, font=f, fill=INK if t == tab else MUTED, anchor="ls")
        if t == tab:
            d.rectangle([tx, y + 68, tx + tw, y + 70], fill=INK)
        tx += tw + 26

    f = F(13, "SemiBold")
    t = "Test step"
    tw = d.textbbox((0, 0), t, font=f)[2]
    bx = x + w - tw - 46
    d.rounded_rectangle([bx, y + 6, x + w, y + 40], radius=17, fill=INK)
    d.polygon([(bx + 16, y + 15), (bx + 16, y + 31), (bx + 29, y + 23)], fill=CARD)
    d.text((bx + 36, y + 24), t, font=f, fill=CARD, anchor="lm")
    d.line([(x, y + 70), (x + w, y + 70)], fill=HAIR, width=2)
    return y + 70


def row(d, x, y, w, label, value, kind="text", req=True):
    """One parameter: label left, control right. A pane is a COLUMN OF THESE and
    that repetition is most of what makes it legible as a settings pane."""
    d.text((x, y + 22), label, font=F(13, "Medium"), fill=INK, anchor="ls")
    if req:
        d.text((x + d.textbbox((0, 0), label, font=F(13, "Medium"))[2] + 8, y + 22),
               "*", font=F(13, "SemiBold"), fill=ACCENT, anchor="ls")
    cx, cw = x + w - 366, 366
    if kind == "toggle":
        on = value == "on"
        d.rounded_rectangle([cx + cw - 52, y + 4, cx + cw, y + 30], radius=13,
                            fill=GREEN if on else (208, 212, 218))
        d.ellipse([cx + cw - (24 if on else 50), y + 6, cx + cw - (6 if on else 32), y + 28],
                  fill=CARD)
    else:
        card(d, [cx, y, cx + cw, y + 34], r=8)
        d.text((cx + 12, y + 18), value, font=F(12.5, "Regular"),
               fill=INK if kind == "text" else MUTED, anchor="lm")
        if kind == "select":
            d.polygon([(cx + cw - 24, y + 15), (cx + cw - 14, y + 15),
                       (cx + cw - 19, y + 21)], fill=MUTED)
    return y + 48


def code_block(d, box, lines, lead=16, pad=14, sz=11.5, gutter=True):
    """Monospaced, coloured per SEGMENT rather than per line - a line is a list
    of (kind, text) pieces drawn end to end, so a key and its value share a line
    in different colours. One kind per line was the first version and it silently
    doubled the line count, running the block out of its own box."""
    card(d, box, r=10, fill=CODE_BG, edge=HAIR)
    f = F(sz, "mono")
    if gutter:
        d.line([(box[0] + 40, box[1] + 10), (box[0] + 40, box[3] - 10)], fill=(228, 232, 238))
    need = pad * 2 + 10 + len(lines) * lead
    if need > box[3] - box[1]:
        raise ValueError(f"code_block: {len(lines)} lines need {need:.0f}px, "
                         f"box is {box[3] - box[1]:.0f}px")
    y = box[1] + pad + 10
    for i, line in enumerate(lines, 1):
        if gutter:
            d.text((box[0] + 30, y), str(i), font=F(sz - 1, "mono"), fill=FAINT, anchor="rs")
        x = box[0] + (54 if gutter else pad)
        for kind, text in ([line] if isinstance(line[0], str) else line):
            d.text((x, y), text, font=f,
                   fill={"key": S_KEY, "str": S_STR, "num": S_NUM,
                         "cmt": S_CMT, "dim": FAINT}[kind], anchor="ls")
            x += f.getlength(text)
        y += lead
    return box[3]


def table_h(n):
    """Height a table of n rows needs. Exposed so a panel can reserve it from
    the bottom rather than discover halfway down that it has run out."""
    return 14 + 28 + n * 30 + 10


def table(d, box, cols, rows):
    """A result grid. Zebra rows and a ruled header, because a table drawn
    without either reads as a paragraph set in columns."""
    x0, y0, x1, y1 = box
    need = table_h(len(rows))
    if need > y1 - y0:
        raise ValueError(f"table: {len(rows)} rows need {need}px, box is {y1 - y0}px")
    card(d, box, r=10)
    widths = [int((x1 - x0 - 28) * c[1]) for c in cols]
    y, cx = y0 + 14, x0 + 14
    for (name, _), wdt in zip(cols, widths):
        d.text((cx, y + 18), name, font=F(11.5, "SemiBold"), fill=MUTED, anchor="ls")
        cx += wdt
    y += 28
    d.line([(x0 + 14, y), (x1 - 14, y)], fill=HAIR, width=2)
    for i, r in enumerate(rows):
        if i % 2 == 0:
            d.rectangle([x0 + 6, y + 2, x1 - 6, y + 28], fill=(250, 251, 253))
        cx = x0 + 14
        for v, wdt in zip(r, widths):
            d.text((cx, y + 21), v, font=F(12, "Regular"), fill=INK, anchor="ls")
            cx += wdt
        y += 30
    return y


def config_panel(W=818, H=553):
    """A node's parameter pane: the controls you actually set, then the body they
    assemble into. Controls above JSON, not JSON alone - the JSON on its own is
    the OUTPUT of this screen, and a pane showing only its output is a screenshot
    of nothing being configured."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    card(d, [0, 0, W - 1, H - 1], r=16)
    x, w = 28, W - 56

    y = topbar(d, x, 20, w, "Apify") + 18
    d.text((x, y + 16), "Input Settings", font=F(13.5, "SemiBold"), fill=INK, anchor="ls")
    d.text((x + w, y + 16), "Required", font=F(11.5, "SemiBold"), fill=FAINT, anchor="rs")
    y += 28

    y = row(d, x, y, w, "Apify Actor", "compass/crawler-google-places", "select")
    y = row(d, x, y, w, "Search query", "{{ $json.search_strings }}")
    y = row(d, x, y, w, "Max places per search", "{{ $json.max_records }}", req=False)
    y = row(d, x, y, w, "Scrape contacts", "on", "toggle", req=False)

    # Same rule as the code panel: the JSON body is the point of this pane, so
    # it is reserved from the bottom and the controls take what is left above.
    body = [("language", '"en",', "str"),
            ("locationQuery", '"{{ location_query }}",', "str"),
            ("maxCrawledPlacesPerSearch", "{{ max_records }},", "num"),
            ("scrapeContacts", "true,", "num"),
            ("searchStringsArray", '["{{ search_strings }}"],', "str"),
            ("skipClosedPlaces", "false", "num")]
    b_top = H - 24 - (14 * 2 + 10 + (len(body) + 2) * 16)
    d.text((x, b_top - 14), "Custom body", font=F(13.5, "SemiBold"), fill=INK, anchor="ls")
    d.text((x + w, b_top - 14), "JSON", font=F(11.5, "SemiBold"), fill=FAINT, anchor="rs")

    def kv(k, v, kind="num"):
        return [("key", f'  "{k}": '), (kind, v)]
    code_block(d, [x, b_top, x + w, H - 24],
               [[("key", "{")]] + [kv(*b) for b in body] + [[("key", "}")]],
               lead=16, gutter=False)
    return im


def code_panel(W=818, H=553):
    """A code step AND the rows it emitted. ONE card, not two with a gap - the
    gap let the page ground through the middle of the plate and broke it in half.
    What makes this convincing is the output: a code node whose result you cannot
    see is the part of a screenshot nobody believes."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    card(d, [0, 0, W - 1, H - 1], r=16)
    x, w = 28, W - 56

    # Laid out from the BOTTOM. The output table's height is known, so it is
    # reserved first and the listing takes whatever is left - hand-tuning the
    # code box height instead meant every copy edit silently pushed the last
    # table row off the card.
    rows = [["Halcyon Dental", "halcyondental.co", "hello@halcyondental.co"],
            ["Northgate Motors", "northgatemotors.uk", "sales@northgatemotors.uk"],
            ["Bell and Co Legal", "bellcolegal.com", "contact@bellcolegal.com"]]
    t_top = H - 24 - table_h(len(rows))
    y = topbar(d, x, 20, w, "Code") + 14

    code_block(d, [x, y, x + w, t_top - 48], [
        [("cmt", "// flatten the payload into one row per place")],
        [("key", "const out = [];")],
        [("key", "for (const item of $input.all()) {")],
        [("key", "  for (const p of item.json.data ?? []) {")],
        [("key", "    if (!p.website) continue;")],
        [("key", "    out.push({ json: {")],
        [("key", "      name: p.title, site: p.website,")],
        [("key", "      email: p.emails?.[0] ?? null,")],
        [("key", "    }});")],
        [("key", "  } }")],
        [("key", "return out;")],
    ], lead=16)

    d.text((x, t_top - 16), "Output", font=F(13.5, "SemiBold"), fill=INK, anchor="ls")
    d.text((x + 84, t_top - 16), "412 items", font=F(12, "Medium"), fill=GREEN, anchor="ls")
    d.text((x + w, t_top - 16), "JSON    Table    Schema", font=F(11.5, "SemiBold"),
           fill=FAINT, anchor="rs")
    table(d, [x, t_top, x + w, H - 24],
          [("name", .34), ("site", .30), ("email", .36)], rows)
    return im


def dashboard(W=818, H=330):
    """What a run produced. Counts across the top, a week of volume and the last
    rows written filling the rest - so the panel says `it ran, this is how much,
    here is some of it`, which is the whole claim of the slide.

    Numbers are round on purpose. A drawn panel carrying 51,882 to the digit is
    claiming a measurement nobody took."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    card(d, [0, 0, W - 1, H - 1], r=16, fill=(250, 251, 253))
    x, w = 22, W - 44

    stats = [("Places found", "1,200", "+18%", GREEN),
             ("With a website", "820", "68% kept", MUTED),
             ("Emails extracted", "540", "+12%", GREEN),
             ("Messages sent", "500", "today", MUTED)]
    cw = (w - 3 * 12) // 4
    for i, (lab, num, sub, sc) in enumerate(stats):
        cx = x + i * (cw + 12)
        card(d, [cx, 20, cx + cw, 128])
        d.text((cx + 14, 46), lab, font=F(11.5, "Medium"), fill=MUTED, anchor="ls")
        d.text((cx + 14, 92), num, font=F(30, "Bold"), fill=INK, anchor="ls")
        d.text((cx + 14, 114), sub, font=F(11, "Medium"), fill=sc, anchor="ls")

    bw = int(w * .46)
    card(d, [x, 142, x + bw, H - 20])
    d.text((x + 14, 168), "Rows written", font=F(11.5, "SemiBold"), fill=MUTED, anchor="ls")
    vals = [.34, .52, .41, .78, .63, .95, .58]
    bx, bwid, gap = x + 16, 14, 10
    for i, v in enumerate(vals):
        h = int(84 * v)
        d.rounded_rectangle([bx + i * (bwid + gap), H - 52 - h,
                             bx + i * (bwid + gap) + bwid, H - 52], radius=4,
                            fill=BAR_HOT if i == 5 else BAR)
        d.text((bx + i * (bwid + gap) + bwid // 2, H - 34),
               "MTWTFSS"[i], font=F(10.5, "Medium"), fill=FAINT, anchor="ms")

    table(d, [x + bw + 12, 142, x + w, H - 20],
          [("last written", .58), ("status", .42)],
          [["Halcyon Dental", "sent"], ["Northgate Motors", "sent"],
           ["Bell and Co Legal", "queued"]])
    return im


PANELS = {"config": config_panel, "code": code_panel, "dashboard": dashboard}

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/panels"
    os.makedirs(out, exist_ok=True)
    for name, fn in PANELS.items():
        im = fn()
        im.convert("RGB").save(f"{out}/{name}.png")
        print(f"  {name:10} {im.width}x{im.height}  -> {out}/{name}.png")

#!/usr/bin/env python3
"""Drawn stand-ins for the slides that are not workflows.

Three of the six slides in one reference are not canvases at all. They are a
node's input settings, a code step wired into a sheet, and a results dashboard.
Screenshotting those from a real account would put someone's account data in a
post, and there is nothing to recycle from the twenty canvases that looks like
them, so they get DRAWN.

Drawn, not faked. These are not pretending to be photographs of a real screen -
they carry no window chrome, no traffic lights, no browser frame, which the
design kit bans outright and which is what makes a mock read as a lie. What they
reproduce is the MATERIAL: a card, a hairline, a label, a monospaced block, the
proportions those things have in the tools these workflows actually use. At the
size a canvas sits on the frame that is exactly as legible as the real thing and
it is honest about being a diagram.

Everything is 818px wide by default, which is what every real export in the set
is, so a panel and a canvas scale identically on the plate and read as siblings.

    config_panel()  a node's input settings, JSON body, required fields
    code_panel()    a code step above the sheet step it writes into
    dashboard()     result counts and a menu, the end of a run
"""
import os

from PIL import Image, ImageDraw, ImageFont

CARD = (255, 255, 255)
EDGE = (226, 228, 232)
INK = (32, 34, 38)
MUTED = (130, 134, 142)
FAINT = (168, 172, 180)
CODE_BG = (248, 249, 251)
S_KEY = (44, 48, 56)
S_STR = (176, 66, 50)
S_NUM = (52, 98, 196)
ACCENT = (240, 110, 60)
GREEN = (32, 160, 92)

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
_f = {}


def F(sz, w="Regular"):
    k = (sz, w)
    if k not in _f:
        _f[k] = (ImageFont.truetype(MONO, int(sz)) if w == "mono"
                 else ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz)))
    return _f[k]


def card(d, box, r=10, fill=CARD, edge=EDGE):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=edge, width=1)


def chip(d, x, y, text, fill, ink=(255, 255, 255), sz=11):
    f = F(sz, "SemiBold")
    w = d.textbbox((0, 0), text, font=f)[2]
    d.rounded_rectangle([x, y, x + w + 14, y + sz + 9], radius=(sz + 9) // 2, fill=fill)
    d.text((x + 7, y + (sz + 9) // 2), text, font=f, fill=ink, anchor="lm")
    return x + w + 14


def field(d, x, y, w, label, value, ph=False):
    """A labelled input. The label sits ABOVE the box and is smaller and lighter
    than the value - that hierarchy is most of what makes a drawn form read as a
    form rather than as a table."""
    d.text((x, y), label, font=F(11, "Medium"), fill=MUTED, anchor="ls")
    card(d, [x, y + 8, x + w, y + 40], r=6)
    d.text((x + 10, y + 24), value, font=F(11.5, "Regular"),
           fill=FAINT if ph else INK, anchor="lm")
    return y + 54


def code_block(d, box, lines, lead=15, pad=12, sz=10.5):
    """A monospaced block, coloured per SEGMENT rather than per line.

    A line is a list of (kind, text) pieces drawn end to end, so a key and its
    value sit on one line in different colours. Taking one kind per line instead
    was the first version and it silently doubled the line count, which ran the
    JSON straight out of its own box and through the fields underneath.

    Only four colours - at this size a real editor resolves to about that."""
    card(d, box, r=8, fill=CODE_BG, edge=(236, 238, 242))
    f = F(sz, "mono")
    y = box[1] + pad + 8
    for line in lines:
        x = box[0] + pad
        for kind, text in ([line] if isinstance(line[0], str) else line):
            col = {"key": S_KEY, "str": S_STR, "num": S_NUM, "dim": FAINT}[kind]
            d.text((x, y), text, font=f, fill=col, anchor="ls")
            x += f.getlength(text)
        y += lead
    return box[3]


def header(d, x, y, w, title, run=True):
    d.text((x, y), title, font=F(13, "SemiBold"), fill=INK, anchor="ls")
    if run:
        f = F(11, "SemiBold")
        t = "Run step"
        tw = d.textbbox((0, 0), t, font=f)[2]
        d.rounded_rectangle([x + w - tw - 34, y - 15, x + w, y + 7], radius=11,
                            outline=EDGE, width=1, fill=CARD)
        d.ellipse([x + w - tw - 27, y - 9, x + w - tw - 19, y - 1], fill=INK)
        d.text((x + w - tw - 10, y - 4), t, font=f, fill=INK, anchor="lm")


def config_panel(W=818, H=553):
    """A node's input settings. The one thing that makes this read as n8n rather
    than as a generic form is the Required chip against the section label."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    card(d, [0, 0, W - 1, H - 1], r=14)
    x, w = 30, W - 60

    d.rounded_rectangle([x, 22, x + 22, 44], radius=6, fill=(52, 116, 240))
    d.text((x + 30, 39), "Apify", font=F(14, "SemiBold"), fill=INK, anchor="ls")
    d.text((x + 30 + 44, 39), "✓", font=F(12, "SemiBold"), fill=GREEN, anchor="ls")

    d.text((x, 78), "Input Settings", font=F(12.5, "SemiBold"), fill=INK, anchor="ls")
    chip(d, x + 96, 64, "Required", (238, 240, 244), MUTED)

    def kv(k, v, kind="num"):
        return [("key", f'  "{k}": '), (kind, v)]
    code_block(d, [x, 92, x + w, 302], [
        [("key", "{")],
        kv("includeWebResults", "false,"),
        kv("language", '"en",', "str"),
        kv("locationQuery", '"{{location_query}}",', "str"),
        kv("maxCrawledPlacesPerSearch", "{{max_records}},"),
        kv("maxImages", "0,"),
        kv("maxReviews", "0,"),
        kv("maximumLeadsEnrichmentRecords", "0,"),
        kv("scrapeContacts", "false,"),
        kv("scrapeDirectories", "false,"),
        kv("scrapeImageAuthors", "false,"),
        kv("scrapePlaceDetailPage", "false,"),
        kv("searchStringsArray", '["{{search_strings}}"],', "str"),
        kv("skipClosedPlaces", "false"),
        [("key", "}")],
    ], lead=13.5)

    y = 322
    y = field(d, x, y, w, "Apify Actor Name  *  Required", "compass/crawler-google-places")
    y = field(d, x, y, w, "Dataset  *  Required", "Select dataset here", ph=True)
    d.text((x, y + 14), "+ New       Clear", font=F(11.5, "Medium"), fill=MUTED, anchor="ls")
    d.text((x + w, y + 14), "WRITE", font=F(10, "SemiBold"), fill=FAINT, anchor="rs")
    return im


def code_panel(W=818, H=553):
    """A code step above the sheet step it writes into. Two cards rather than
    one, because the point of the slide is the HANDOFF between them."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x, w, gap = 0, W, 22
    h1 = 250

    card(d, [x, 0, x + w - 1, h1], r=14)
    header(d, x + 26, 34, w - 52, "Javascript code")
    code_block(d, [x + 26, 50, x + w - 26, h1 - 26], [
        [("dim", "1  "), ("key", "const out = [];")],
        [("dim", "2  "), ("key", "for (const item of $input.all()) {")],
        [("dim", "3  "), ("key", "  const rows = item.json.data ?? [];")],
        [("dim", "4  "), ("key", "  for (const r of rows) out.push({ json: {")],
        [("dim", "5  "), ("key", "    name: r.title, email: r.emails?.[0] ?? null,")],
        [("dim", "6  "), ("key", "    site: r.website, phone: r.phone,")],
        [("dim", "7  "), ("key", "  }});")],
        [("dim", "8  "), ("key", "}")],
        [("dim", "9  "), ("key", "return out;")],
    ], lead=17)

    y2 = h1 + gap
    card(d, [x, y2, x + w - 1, H - 1], r=14)
    header(d, x + 26, y2 + 34, w - 52, "Add JSON array to Google Sheets")
    yy = y2 + 56
    yy = field(d, x + 26, yy, w - 52, "List of JSON objects  *  Required",
               "{{ $json.rows_transformed }}")
    yy = field(d, x + 26, yy, w - 52, "Spreadsheet URL  *  Required",
               "{{ $json.spreadsheet_url }}")
    yy = field(d, x + 26, yy, w - 52, "Google Sheets Account ID  *  Required",
               "{{ $credentials.oauth_id }}")
    # the toggle - one live control is enough to say "this is a settings pane"
    d.rounded_rectangle([x + w - 26 - 42, yy + 2, x + w - 26, yy + 24], radius=11, fill=GREEN)
    d.ellipse([x + w - 26 - 20, yy + 4, x + w - 26 - 2, yy + 22], fill=(255, 255, 255))
    d.text((x + 26, yy + 19), "Raise error on missing column",
           font=F(11.5, "Medium"), fill=INK, anchor="ls")
    return im


def dashboard(W=818, H=300):
    """The end of a run: what it produced, and the menu you reach for next.

    Numbers are illustrative and are written as such - round, plausible, not
    precise-looking. A drawn dashboard carrying 51,882 to the digit is claiming
    a measurement nobody took."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    card(d, [0, 0, W - 1, H - 1], r=14, fill=(250, 251, 252))

    stats = [("Contacts created", "540", "+12% this week", GREEN),
             ("Contacts tried", "150", "since last run", MUTED),
             ("Rows written", "51,000", "+1.9k", GREEN),
             ("Reach", "440,000", "+3.1%", GREEN)]
    cw, ch, gx = 178, 118, 14
    for i, (lab, num, sub, sc) in enumerate(stats):
        cx = 26 + i * (cw + gx)
        cy = 34 + (i // 4) * (ch + 14)
        card(d, [cx, cy, cx + cw, cy + ch], r=10)
        d.text((cx + 16, cy + 30), lab, font=F(11, "Medium"), fill=MUTED, anchor="ls")
        d.text((cx + 16, cy + 74), num, font=F(30, "Bold"), fill=INK, anchor="ls")
        d.text((cx + 16, cy + 98), sub, font=F(10.5, "Medium"), fill=sc, anchor="ls")

    # the menu, with the row you are about to click ringed in the accent
    # Short menu, short panel. The dashboard is the SECOND thing on a stacked
    # slide, and one artwork's height sets the scale for the whole set - a 400px
    # panel here pulled every canvas in the deck down to 1.007x.
    mx, my, mw = W - 26 - 250, 168, 250
    card(d, [mx, my, mx + mw, H - 24], r=10)
    rows = ["Extract selected column values", "Dashboard details",
            "Article Map", "Refresh all reports", "Email this dashboard"]
    for i, r in enumerate(rows):
        ry = my + 20 + i * 20
        if i == 2:
            d.rounded_rectangle([mx + 8, ry - 12, mx + mw - 8, ry + 6], radius=5,
                                outline=ACCENT, width=2)
        d.text((mx + 18, ry), r, font=F(10.5, "Regular"), fill=INK, anchor="ls")
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

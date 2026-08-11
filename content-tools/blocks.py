#!/usr/bin/env python3
"""One block, five configurations. The deck's theme, not the reference's.

The copy in these decks is the reference's and it is proven, so it is
transcribed word for word. THE DESIGN IS NOT. A previous pass copied both, and
what came back was six frames with six different treatments - white cards on
one, dot bullets on the next, nested monospace boxes on two more. That is the
reference's own inconsistency reproduced faithfully, which is not a theme, it is
a xerox.

THE THEME IS A RULED REGISTER. Every frame is the same object: a title, a rule,
then rows divided by hairlines, each row a left column and a right column. A
step, a bullet, a tool and its role, a price tier - all of them are that row.
What changes between blocks is only what goes in each column and whether the
right column is set in mono.

Three things carry it and nothing else is allowed to:

  THE HAIRLINE. It is the only division on any frame. No cards, no fills, no
  boxes - a card says `this item is a separate object` and every one of these
  lists is one object with parts.

  ONE ACCENT, ONCE A FRAME. The step number, the current tier, the row that
  matters. Two accents on a frame and neither is the answer.

  MONO ONLY FOR DATA. A tool name, a price, a count. Prose is never mono, and
  a monospace label on a sentence is costume.

THE DIRECTION, SET BY THE USER ON THE SALES DECK: frames like seq() - a
mechanism DRAWN down the frame, tool tiles on a spine, real records in rows,
a reject struck out, a reply bubble - and filled a bit further than that first
seq was. Brand tiles and paragraphs-in-boxes are the thing being replaced.

BANNED: an accent bar down a card's left edge. The chip already names the
category; a coloured stripe beside it is template decoration.

BANNED: the tall sub-* workspace captures (the phone-shaped right-panel
crops). Used once on the sales deck and retired by instruction.

Every block justifies to the height it is given - the rows spread from the rule
to the bottom of the safe box rather than stacking in the middle third. Fixed
gaps put a compact block in the middle of the frame with air above and below,
which reads as a slide that ran out of things to say.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
_f = {}


def F(sz, w="Regular"):
    k = (sz, w)
    if k not in _f:
        _f[k] = (ImageFont.truetype(MONO, int(sz)) if w == "mono"
                 else ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz)))
    return _f[k]


def wrap(s, f, maxw):
    out, line = [], ""
    for word in s.split():
        cand = f"{line} {word}".strip()
        if line and f.getlength(cand) > maxw:
            out.append(line)
            line = word
        else:
            line = cand
    if line:
        out.append(line)
    return out


SPLIT = 0.40          # where the left column ends, on every frame


def register(d, x, y, w, h, T, rows, lsz=34, rsz=32, lead=1.34, pad=30,
             mono_right=False, mono_left=False, hot=None, rule_top=True,
             split=SPLIT, stacked=False, cap=(48, 42), marks=None):
    """THE block. Everything else on this deck is a call to it.

    rows are (left, right) - right may be a string or a list of strings, and a
    list sets one under the other in the right column.

    The row height is SOLVED from the space, never chosen, so five rows fill the
    frame and eight rows still fit it."""
    # The split is per block, not global. One value for all of them put a
    # two-word number beside a canyon on the steps frame and ran a
    # twenty-two-character label straight into its own description on the pairs
    # frame. Long labels go STACKED instead: label on its own line, description
    # under it, which is what the reference does and what cannot collide.
    lw = w if stacked else int(w * split) - 24
    rw = w if stacked else w - int(w * split)

    n = len(rows)

    def measure(a, b):
        lfa = F(a, "mono" if mono_left else "Bold")
        rfa = F(b, "mono" if mono_right else "Regular")
        out = []
        for left, right in rows:
            parts = right if isinstance(right, (list, tuple)) else [right]
            out.append((left, [l for pt in parts for l in wrap(pt, rfa, w if stacked
                                                              else w - int(w * split) - 20)]))
        return out, lfa, rfa, sum((round(a * 1.3) if stacked and lf else 0)
                                  + max(1, len(ls)) * round(b * lead) for lf, ls in out)

    # SOLVE THE TYPE SIZE, not just the gap. Six rows of 26px spread down 1000px
    # of frame is a sparse table floating in the dark - the space got filled with
    # AIR because air was the only variable. Scaling the type until the rows plus
    # a decent gap use the height fills it with content instead, which is the
    # only kind of filling that reads as a slide rather than as a leftover.
    # CAPPED. Filling by scale alone drove a two-column table to 62px and its
    # values wrapped three deep, which is a different kind of broken from the
    # sparse table it replaced. Each block states the largest its type may get;
    # past that the leftover goes back to being gap, which is correct once the
    # type is already big enough to read.
    hi = min(cap[0] / lsz, cap[1] / rsz)
    lo = 1.0
    for _ in range(18):
        mid = (lo + hi) / 2
        _, _, _, ik = measure(round(lsz * mid), round(rsz * mid))
        if ik + n * pad * 1.6 <= h:
            lo = mid
        else:
            hi = mid
    lsz, rsz = round(lsz * lo), round(rsz * lo)
    body, lf, rf, ink = measure(lsz, rsz)
    # The column stop is DERIVED from the widest label at the size that was just
    # solved, not fixed. A fixed 34 percent was fine at 26px and ran GPT-4.1-mini
    # straight through Transcript once the type scaled up - the split has to move
    # with the thing it is splitting.
    if not stacked:
        need = max((lf.getlength(l) for l, _ in rows if l), default=0) + 44
        split = min(0.62, max(split, need / w))
        body, lf, rf, ink = measure(lsz, rsz)
    gap = max(pad, (h - ink - (n if rule_top else n - 1) * 2) // max(1, n))

    mw = round(lsz * 1.9) if marks else 0          # the glyph tile, if there is one
    if rule_top:
        d.line([(x, y), (x + w, y)], fill=T["rule"], width=2)
        y += gap
    # EACH ROW IS CENTRED IN ITS OWN BAND, and the left column is centred against
    # the right column's block.
    #
    # Before this the baseline was placed first and the gap split around it, so
    # every row sat hard against the rule above it and floated off the one below
    # - the space looked thrown in rather than measured. And a one-line price sat
    # at the TOP of a two-line description instead of against its middle, which
    # is the same fault on the other axis.
    rp = round(rsz * lead)
    for i, (left, ls) in enumerate(body):
        ink_h = (round(lsz * 1.3) if stacked and left else 0) + max(1, len(ls)) * rp
        top = y + gap // 2
        mid = top + ink_h / 2
        ry = top + rsz * 0.727

        if marks:
            glyph(d, x, mid - mw / 2, mw, T, marks[i])
        if left:
            col = T["accent"] if hot is not None and i == hot else T["ink"]
            ly = ry if stacked else mid + lsz * 0.36
            d.text((x + (mw + 28 if marks else 0), ly), left, font=lf, fill=col, anchor="ls")
            if stacked:
                ry += round(lsz * 1.3)
        rx = x if stacked else x + int(w * split)
        for ln in ls:
            d.text((rx, ry), ln, font=rf, fill=T["ink"], anchor="ls")
            ry += rp

        y = top + ink_h + gap // 2
        if i + 1 < n:
            d.line([(x, y), (x + w, y)], fill=T["rule"], width=1)
    return y


def pairs(d, x, y, w, h, T, items):
    """A label and what it means. Stacked, because these labels are sentences'
    worth of words and no column split survives them."""
    return register(d, x, y, w, h, T, items, lsz=36, rsz=32, stacked=True,
                    cap=(46, 38))


def steps(d, x, y, w, h, T, items, hot=None):
    """A sequence. The number is the left column and it is the accent - which is
    the whole reason the white step cards went: a card per step says five
    objects, a ruled row says one list with five entries."""
    return register(d, x, y, w, h, T, items, lsz=38, rsz=36,
                    hot=hot, split=0.13, cap=(54, 52))


def bullets(d, x, y, w, h, T, items, hot=None):
    """A plain list. No dots - the hairline already divides the rows, and a dot
    on top of a rule is two dividers doing one job."""
    return register(d, x, y, w, h, T, [("", t) for t in items],
                    rsz=38, hot=hot, cap=(48, 48))


def spec(d, x, y, w, h, T, rows, hot=None):
    """Tool and role.

    Set in the deck's own face, not mono. Mono was chosen because the content is
    `data`, which is a reason that exists in my head and nowhere on the frame -
    what a reader sees is one slide in a different typeface for no stated cause.
    A deck gets one face; if a column needs to read as a name rather than as
    prose, weight does that."""
    return register(d, x, y, w, h, T, rows, lsz=30, rsz=28, hot=hot, split=0.34,
                    cap=(40, 36))


def pricing(d, x, y, w, h, T, rows, hot=None):
    """A tier, its price, what it includes. Mono left because a price is data."""
    return register(d, x, y, w, h, T, rows, lsz=30, rsz=28,
                    mono_left=True, hot=hot, cap=(38, 34))


# -------------------------------------------------------------------- graphic

def fan(W=820, H=430, theme=None, logos=("instagram", "tiktok", "x", "linkedin",
                                         "facebook", "youtube", "gmail", "telegram",
                                         "notion", "airtable")):
    """One thing out to many. The only drawn graphic that survived, because it
    is the only one that shows a RELATIONSHIP rather than mimicking a screen -
    and the reference uses exactly it.

    An arc, not a row. A row of marks says `these exist`; an arc says `all of
    them, from here`. The vertical is squashed to 0.78 because a true circle
    piles everything overhead and the fan stops reading as a fan."""
    T = theme
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy, rad, sz = W // 2, H - 46, 300, 62
    n = len(logos)
    for i in range(n):
        a = math.pi * (0.04 + 0.92 * i / (n - 1))
        px, py = cx - rad * math.cos(a), cy - rad * math.sin(a) * 0.78
        d.line([(cx, cy - 16), (px, py)], fill=T["spine"], width=2)
    d.rounded_rectangle([cx - 48, cy - 44, cx + 48, cy + 24], radius=18, fill=T["accent"])
    d.rounded_rectangle([cx - 26, cy - 26, cx + 26, cy - 17], radius=4, fill=(255, 255, 255))
    d.rounded_rectangle([cx - 26, cy - 10, cx + 8, cy - 1], radius=4, fill=(255, 255, 255))
    for i, name in enumerate(logos):
        a = math.pi * (0.04 + 0.92 * i / (n - 1))
        px, py = cx - rad * math.cos(a), cy - rad * math.sin(a) * 0.78
        box = (int(px - sz / 2), int(py - sz / 2))
        p = f"{LOGOS}/{name}.png"
        if os.path.exists(p):
            im.alpha_composite(Image.open(p).convert("RGBA").resize((sz, sz), Image.LANCZOS),
                               box)
    return im


BLOCKS = {"pairs": pairs, "steps": steps, "bullets": bullets,
          "spec": spec, "pricing": pricing}


CONTENT_OS = dict(
    name="Content OS",
    nav=["Home", "Inputs*", "Competitors", "Comments", "Briefs", "Playbooks", "Reports"],
    foot=("PLATFORMS", [("TikTok", "ink"), ("Instagram", "pink"), ("YouTube", "red")]),
    stats=[("6", "platforms"), ("20", "inputs"), ("129", "briefs"), ("42", "playbooks")],
    title=("Content briefs", "filtered by platform"),
    cols=("platform", "hook", "status"),
    rows=[("TikTok", "Desk setup teardown", "done", "green"),
          ("Instagram", "One idea, ten posts", "done", "green"),
          ("YouTube", "The boring agent", "review", "amber"),
          ("LinkedIn", "What nobody posts", "review", "amber"),
          ("X", "Cost per booked call", "queued", "dim"),
          ("Facebook", "Follow ups that fire", "queued", "dim")])

# The same object, this deck's copy. A frontend dashboard for a local business:
# where the lead came from, what it wants, whether it is booked. Nothing here is
# a metric a client would not recognise on their own phone.
CLIENT_OS = dict(
    name="Client Portal",
    nav=["Overview", "Leads*", "Bookings", "Conversations", "Invoices", "Reports", "Settings"],
    foot=("CHANNELS", [("Instagram", "pink"), ("WhatsApp", "green"), ("Email", "blue")]),
    stats=[("412", "leads"), ("61", "booked"), ("38", "invoices"), ("9", "open")],
    title=("Leads", "this week"),
    cols=("source", "asked for", "status"),
    rows=[("Instagram", "Kitchen quote", "booked", "green"),
          ("Google", "Consult call", "booked", "green"),
          ("Referral", "Site visit", "replied", "amber"),
          ("Instagram", "Price list", "replied", "amber"),
          ("WhatsApp", "Callback", "new", "dim"),
          ("Google", "Consult call", "new", "dim")])


# The six business models, each as the software you would actually sell for it.
# The reference puts a different stock UI mockup on every frame - a Siphron
# dashboard, a kanban, a truck configurator - which is decoration, because none
# of them has anything to do with the model named above it. One object with six
# sets of true words says the same thing and says something.
MODEL_OS = [
    dict(name="Ops Console",
         nav=["Home", "Runs*", "Workflows", "Clients", "Errors", "Billing", "Settings"],
         foot=("CLIENTS", [("Northlake", "blue"), ("Ardent", "green"),
                           ("Boro Dental", "pink")]),
         stats=[("34", "workflows"), ("1,208", "runs"), ("6", "errors"), ("9", "clients")],
         title=("Runs", "last 24 hours"), cols=("client", "workflow", "status"),
         rows=[("Northlake", "Invoice chase", "done", "green"),
               ("Ardent", "Lead intake", "done", "green"),
               ("Boro Dental", "Booking sync", "done", "green"),
               ("Northlake", "Report build", "running", "amber"),
               ("Ardent", "Support triage", "running", "amber"),
               ("Boro Dental", "Payroll export", "queued", "dim")]),
    dict(name="Growth Desk",
         nav=["Overview", "Campaigns*", "Creatives", "Audiences", "Email", "Reports",
              "Settings"],
         foot=("CHANNELS", [("Paid social", "blue"), ("Search", "green"),
                            ("Email", "pink")]),
         stats=[("18", "campaigns"), ("4.2x", "ROAS"), ("62k", "reach"), ("311", "leads")],
         title=("Campaigns", "this week"), cols=("channel", "campaign", "status"),
         rows=[("Paid social", "Winter bundle", "scaling", "green"),
               ("Search", "Brand terms", "scaling", "green"),
               ("Email", "Win back", "testing", "amber"),
               ("Paid social", "Creator cuts", "testing", "amber"),
               ("Search", "Competitor", "paused", "dim"),
               ("Email", "Abandoned cart", "paused", "dim")]),
    dict(name="Inbox",
         nav=["Overview", "Conversations*", "Bots", "Handoffs", "Macros", "Reports",
              "Settings"],
         foot=("CHANNELS", [("Website", "blue"), ("WhatsApp", "green"),
                            ("Instagram", "pink")]),
         stats=[("1,940", "chats"), ("82%", "self served"), ("41s", "first reply"),
                ("12", "handoffs")],
         title=("Conversations", "live"), cols=("channel", "asked about", "status"),
         rows=[("Website", "Delivery time", "answered", "green"),
               ("WhatsApp", "Return policy", "answered", "green"),
               ("Instagram", "Price list", "answered", "green"),
               ("Website", "Custom order", "handed off", "amber"),
               ("WhatsApp", "Refund", "handed off", "amber"),
               ("Instagram", "Stock check", "waiting", "dim")]),
    dict(name="Content Engine",
         nav=["Overview", "Queue*", "Drafts", "Published", "Keywords", "Reports",
              "Settings"],
         foot=("CHANNELS", [("Blog", "blue"), ("YouTube", "red"), ("Newsletter", "pink")]),
         stats=[("129", "pieces"), ("42", "published"), ("18", "keywords"),
                ("6", "channels")],
         title=("Queue", "this week"), cols=("channel", "piece", "status"),
         rows=[("Blog", "Cost per booked call", "published", "green"),
               ("YouTube", "The boring agent", "published", "green"),
               ("Newsletter", "One idea, ten posts", "review", "amber"),
               ("Blog", "What nobody posts", "review", "amber"),
               ("YouTube", "Desk setup teardown", "drafting", "dim"),
               ("Blog", "Follow ups that fire", "drafting", "dim")]),
    dict(name="Product",
         nav=["Overview", "Users*", "Billing", "Feature flags", "Support", "Reports",
              "Settings"],
         foot=("PLANS", [("Starter", "blue"), ("Pro", "green"), ("Agency", "pink")]),
         stats=[("412", "users"), ("61", "paid"), ("8.4k", "MRR"), ("3%", "churn")],
         title=("Signups", "this week"), cols=("plan", "source", "status"),
         rows=[("Pro", "Search", "paid", "green"),
               ("Agency", "Referral", "paid", "green"),
               ("Starter", "Instagram", "trial", "amber"),
               ("Pro", "Search", "trial", "amber"),
               ("Starter", "YouTube", "free", "dim"),
               ("Starter", "Referral", "free", "dim")]),
    dict(name="Operations",
         nav=["Overview*", "Automations", "Incidents", "Load", "Clients", "Reports",
              "Settings"],
         foot=("SEVERITY", [("Failing", "red"), ("Slow", "amber"), ("Healthy", "green")]),
         stats=[("96", "automations"), ("2", "incidents"), ("99.4%", "uptime"),
                ("11", "products")],
         title=("Automations", "by load"), cols=("product", "automation", "status"),
         rows=[("Inbox", "Reply router", "healthy", "green"),
               ("Growth", "Budget sync", "healthy", "green"),
               ("Content", "Publish queue", "slow", "amber"),
               ("Billing", "Invoice chase", "slow", "amber"),
               ("Inbox", "Handoff rules", "failing", "red"),
               ("Growth", "Creative pull", "failing", "red")]),
]


def app_surface(W=820, H=660, theme=None, spec=None):
    """The application, as a surface. What goes where the reference puts two
    product screenshots.

    The copy comes in as a spec so two decks can show the same OBJECT with their
    own words. The alternative - a second near-identical function - is how a set
    ends up with two dashboards that are subtly different for no reason anybody
    chose.

    A workflow canvas was pasted here once and it was the wrong object entirely -
    the slide is called Application OS and a canvas is the automation, not the
    application.

    Not a replica and not a skeleton. Every word on it is real - the tables this
    system actually has, the platforms it actually covers - so nothing is
    invented, and it is dense and coloured because a product surface IS dense and
    coloured. Its internal type is small on purpose: at 820px on a frame this
    reads as an application the way a photograph of a city reads as a city, not
    as something you are meant to read word by word. The frame's own type carries
    the message; this carries the fact that a product exists.
    """
    S = spec or CONTENT_OS
    C = dict(bg=(255, 255, 255), rail=(247, 247, 249), edge=(228, 229, 233),
             ink=(24, 25, 28), dim=(126, 129, 136), faint=(196, 199, 205),
             chip=(238, 240, 244), blue=(52, 116, 240), green=(22, 158, 92),
             amber=(226, 148, 22), pink=(226, 66, 122), red=(220, 40, 40))
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=16, fill=C["bg"])

    rw = 208
    d.rounded_rectangle([0, 0, rw, H - 1], radius=16, fill=C["rail"])
    d.rectangle([rw - 16, 0, rw, H], fill=C["rail"])
    d.line([(rw, 0), (rw, H)], fill=C["edge"], width=1)
    d.text((22, 40), S["name"], font=F(21, "Bold"), fill=C["ink"], anchor="ls")
    nav = [(t.rstrip("*"), t.endswith("*")) for t in S["nav"]]
    for i, (t, on) in enumerate(nav):
        y = 82 + i * 40
        if on:
            d.rounded_rectangle([10, y, rw - 14, y + 32], radius=8, fill=(232, 236, 246))
        d.rounded_rectangle([22, y + 11, 32, y + 21], radius=3,
                            fill=C["blue"] if on else C["faint"])
        d.text((44, y + 23), t, font=F(17, "SemiBold" if on else "Regular"),
               fill=C["ink"] if on else C["dim"], anchor="ls")
    foot_t, foot_rows = S["foot"]
    d.text((22, H - 118), foot_t, font=F(12, "SemiBold"), fill=C["faint"], anchor="ls")
    for i, (t, c) in enumerate(foot_rows):
        d.ellipse([22, H - 100 + i * 26, 32, H - 90 + i * 26], fill=C[c])
        d.text((42, H - 90 + i * 26), t, font=F(15, "Regular"), fill=C["dim"], anchor="ls")

    x, w = rw + 26, W - rw - 52
    cw = (w - 3 * 12) // 4
    for i, (n, lab) in enumerate(S["stats"]):
        cx = x + i * (cw + 12)
        d.rounded_rectangle([cx, 30, cx + cw, 132], radius=10, fill=C["bg"],
                            outline=C["edge"], width=1)
        d.text((cx + 16, 78), n, font=F(38, "Bold"), fill=C["ink"], anchor="ls")
        d.text((cx + 16, 106), lab, font=F(15, "Medium"), fill=C["dim"], anchor="ls")

    d.text((x, 176), S["title"][0], font=F(19, "Bold"), fill=C["ink"], anchor="ls")
    d.text((x + w, 176), S["title"][1], font=F(15, "Regular"),
           fill=C["dim"], anchor="rs")
    y = 206
    for name, f in zip(S["cols"], (0.0, 0.26, 0.74)):
        d.text((x + int(w * f), y), name, font=F(14, "SemiBold"), fill=C["faint"], anchor="ls")
    y += 12
    d.line([(x, y), (x + w, y)], fill=C["edge"], width=1)
    rows = [(a, b, c, C[k]) for a, b, c, k in S["rows"]]
    rh = (H - 40 - y) // len(rows)
    for i, (plat, hook, st, col) in enumerate(rows):
        ry = y + i * rh
        if i % 2 == 0:
            d.rounded_rectangle([x - 8, ry + 4, x + w + 8, ry + rh - 2], radius=6,
                                fill=(250, 250, 252))
        by = ry + rh // 2 + 7
        d.text((x, by), plat, font=F(17, "SemiBold"), fill=C["ink"], anchor="ls")
        d.text((x + int(w * 0.26), by), hook, font=F(17, "Regular"), fill=C["dim"], anchor="ls")
        cx = x + int(w * 0.74)
        tw = d.textbbox((0, 0), st, font=F(14, "SemiBold"))[2]
        d.rounded_rectangle([cx, by - 20, cx + tw + 22, by + 6], radius=13, fill=C["chip"])
        d.text((cx + 11, by - 7), st, font=F(14, "SemiBold"), fill=col, anchor="lm")
    return im


# ------------------------------------------------------------ drawn marks

def _tile(d, x, y, s, T, r=18):
    d.rounded_rectangle([x, y, x + s, y + s], radius=r, outline=T["rule"], width=2)


def glyph(d, x, y, s, T, kind):
    """A drawn mark in a tile. Five shapes, stroked not filled, all from the same
    3px pen - five filled illustrations would be five objects competing, five
    strokes of one weight is one set.

    EVERY SHAPE IS BUILT AROUND THE TILE'S OWN CENTRE. The first version placed
    each one from fractions of the top-left corner, so none of them agreed on
    where the middle was and the grid mark in particular sat low and right of
    it. cx, cy is the centre; r is the half-size every shape works within."""
    _tile(d, x, y, s, T)
    cx, cy, r, w = x + s / 2, y + s / 2, s * 0.24, 3
    if kind == "grid":                                  # an agency: many accounts
        u, g = r * 0.82, r * 0.30
        for i in (0, 1):
            for j in (0, 1):
                d.rounded_rectangle([cx - u - g / 2 + i * (u + g), cy - u - g / 2 + j * (u + g),
                                     cx - g / 2 + i * (u + g), cy - g / 2 + j * (u + g)],
                                    radius=3, outline=T["ink"], width=w)
    elif kind == "bag":                                 # e-commerce
        d.rounded_rectangle([cx - r * .86, cy - r * .18, cx + r * .86, cy + r * .96],
                            radius=6, outline=T["ink"], width=w)
        d.arc([cx - r * .46, cy - r * .84, cx + r * .46, cy + r * .10], 180, 360,
              fill=T["ink"], width=w)
    elif kind == "play":                                # media
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=T["ink"], width=w)
        d.polygon([(cx - r * .28, cy - r * .44), (cx - r * .28, cy + r * .44),
                   (cx + r * .48, cy)], fill=T["ink"])
    elif kind == "lens":                                # creator
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=T["ink"], width=w)
        d.ellipse([cx - r * .34, cy - r * .34, cx + r * .34, cy + r * .34],
                  outline=T["ink"], width=w)
    elif kind == "doc":                                 # publisher
        d.rounded_rectangle([cx - r * .72, cy - r, cx + r * .72, cy + r],
                            radius=5, outline=T["ink"], width=w)
        for i in (-1, 0, 1):
            d.line([(cx - r * .36, cy + i * r * .40), (cx + r * .36, cy + i * r * .40)],
                   fill=T["ink"], width=2)


def iconrow(d, x, y, w, h, T, items):
    """A mark and a line - THE SAME REGISTER as every other frame, with a glyph
    in the left column where the step number or the tool name would go.

    Its own layout before this had no hairlines and pushed its labels 118px right
    of the left edge the rest of the deck hangs off, so it was the one frame that
    did not line up with the others."""
    return register(d, x, y, w, h, T, [(t, "") for _, t in items],
                    lsz=40, rsz=36, cap=(50, 44), marks=[k for k, _ in items])


def tiers(d, x, y, w, h, T, rows, foot=None, hot=1, rule_top=True, cap=(58, 38)):
    """Prices, as the register. Price on the left, what it buys on the right.

    Two wrong versions came first: three columns, which is a website's pricing
    section dropped into a 9:16 frame, then three full-width cards, which was
    the only frame in the deck built out of boxes. A price list is a list. It
    gets the same rows and the same hairlines as the tool list, and the tier
    worth buying is the one in the accent."""
    y = register(d, x, y, w, h - (110 if foot else 0), T, rows,
                 lsz=46, rsz=32, split=0.26, cap=cap, hot=hot, rule_top=rule_top)
    if foot:
        y += 68
        for ln in wrap(foot, F(30, "SemiBold"), w):
            d.text((x, y), ln, font=F(30, "SemiBold"), fill=T["ink"], anchor="ls")
            y += 40
    return y


def _old_tiers(d, x, y, w, h, T, plans, foot=None, extra=None):
    """Price tiers as FULL WIDTH ROWS, stacked.

    The first version was three columns and it was a website's pricing section
    dropped into a 9:16 frame: 260px columns, 25px features, all of it in the top
    third with the rest of the phone empty. A vertical frame wants vertical
    stacking - one row per tier, each row as wide as the slide, the price big
    enough to read from a scroll.

    One row is reversed out. A price list set flat is a table; with one row solid
    it is an OFFER, and that row is doing the only job a pricing slide has."""
    n = len(plans)
    foot_h = 100 if foot else 0
    extra_h = 190 if extra else 0
    gap = 18
    rh = min(190, (h - foot_h - extra_h - gap * (n - 1)) // n)
    for i, (name, price, feats) in enumerate(plans):
        ry = y + i * (rh + gap)
        hot = i == 1
        d.rounded_rectangle([x, ry, x + w, ry + rh], radius=20,
                            fill=T["ink"] if hot else None,
                            outline=None if hot else T["rule"], width=2)
        ink = (18, 18, 20) if hot else T["ink"]
        d.text((x + 34, ry + rh // 2 - 8), name, font=F(34, "SemiBold"),
               fill=ink, anchor="ls")
        d.text((x + 34, ry + rh // 2 + 54), price, font=F(60, "Bold"),
               fill=ink, anchor="ls")
        fx = x + 300
        for j, ft in enumerate(feats):
            d.text((fx, ry + rh // 2 - 22 + j * 40), ft, font=F(28, "Regular"),
                   fill=ink, anchor="ls")
    y += n * rh + (n - 1) * gap
    if foot:
        y += 62
        for ln in wrap(foot, F(30, "SemiBold"), w):
            d.text((x, y), ln, font=F(30, "SemiBold"), fill=T["ink"], anchor="ls")
            y += 40
    if extra:
        y += 44
        d.rounded_rectangle([x, y, x + w, y + 176], radius=20, outline=T["rule"], width=2)
        d.text((x + 34, y + 58), extra[0], font=F(32, "SemiBold"), fill=T["ink"], anchor="ls")
        ey = y + 108
        for ln in extra[1]:
            d.text((x + 34, ey), ln, font=F(27, "Regular"), fill=T["ink"], anchor="ls")
            ey += 40
        y += 176
    return y


BLOCKS["iconrow"] = iconrow
BLOCKS["tiers"] = tiers


# ------------------------------------------------------------------- diagram

def _stage_art(d, x, y, w, h, T, kind):
    """What a stage PRODUCES, drawn small. Same 3px pen as the glyphs.

    This is the part a list cannot do. `Scraping fires automatically` as a row
    of text tells you a thing happened; the same row with rows-of-data appearing
    beside it tells you what came out, and the next stage's artifact tells you
    what that turned into. The sequence is the content."""
    if kind == "fields":                                    # inputs configured
        for i in range(3):
            fy = y + i * (h / 3)
            d.rounded_rectangle([x, fy, x + w * .82, fy + h / 3 - 12], radius=7,
                                outline=T["rule"], width=2)
            d.rounded_rectangle([x + 14, fy + h / 6 - 5, x + 14 + w * (.2 + .12 * i),
                                 fy + h / 6 + 5], radius=5, fill=T["ink"])
    elif kind == "rows":                                    # scraped records
        for i in range(5):
            fy = y + i * (h / 5)
            d.rounded_rectangle([x, fy, x + w * (.94 - .07 * (i % 3)), fy + h / 5 - 9],
                                radius=5, fill=T["rule"] if i else T["ink"])
    elif kind == "bars":                                    # sentiment
        n, bw = 7, w / 11
        for i, f in enumerate([.34, .62, .48, 1.0, .72, .55, .40]):
            bx = x + i * (bw * 1.45)
            d.rounded_rectangle([bx, y + h - h * f, bx + bw, y + h], radius=4,
                                fill=T["accent"] if i == 3 else T["rule"])
    elif kind == "tiles":                                   # dashboard
        for i in range(4):
            tx = x + (i % 2) * (w / 2)
            ty = y + (i // 2) * (h / 2)
            d.rounded_rectangle([tx, ty, tx + w / 2 - 14, ty + h / 2 - 14], radius=8,
                                outline=T["rule"], width=2)
            d.rounded_rectangle([tx + 12, ty + 14, tx + 12 + w * .12, ty + 22], radius=4,
                                fill=T["rule"])
            d.rounded_rectangle([tx + 12, ty + h / 2 - 40, tx + 12 + w * .18,
                                 ty + h / 2 - 26], radius=4, fill=T["ink"])
    elif kind == "page":                                    # the playbook
        d.rounded_rectangle([x, y, x + w * .62, y + h], radius=8,
                            outline=T["ink"], width=3)
        for i in range(5):
            d.rounded_rectangle([x + 18, y + 20 + i * (h - 40) / 5,
                                 x + 18 + w * (.42 - .06 * (i % 3)),
                                 y + 27 + i * (h - 40) / 5], radius=4, fill=T["rule"])


def flow(d, x, y, w, h, T, stages, sz=40):
    """A SEQUENCE, drawn as one. Not five rows that happen to be numbered.

    A numbered list says `these five things exist and here is their order`. A
    flow says `this one comes OUT of that one`, which is the only claim the
    slide is actually making, and it takes a spine and a marker per stage to
    make it. Each stage also shows what it produced, so the five artifacts read
    left to right as a transformation rather than as five decorations.

    The spine runs BEHIND the markers, from the first to the last, and stops at
    both - a line that overshoots reads as a scrollbar."""
    n = len(stages)
    band = h // n
    sx = x + 26
    aw, ah = w * .32, band * .50
    # The label's measure STOPS where the artifact starts. Without that cap the
    # longest step printed straight through its own picture - three of five did.
    lx = sx + 40
    lw = (x + w - aw) - lx - 40
    while sz > 24 and max(F(sz, "SemiBold").getlength(l) for l, _ in stages) > lw:
        sz -= 1

    first, last = y + band // 2, y + (n - 1) * band + band // 2
    d.line([(sx, first), (sx, last)], fill=T["rule"], width=3)
    for i, (label, kind) in enumerate(stages):
        cy = y + i * band + band // 2
        d.ellipse([sx - 13, cy - 13, sx + 13, cy + 13], fill=T.get("bg", (12, 12, 13)),
                  outline=T["ink"], width=3)
        if i == n - 1:
            d.ellipse([sx - 6, cy - 6, sx + 6, cy + 6], fill=T["ink"])
        d.text((lx, cy + sz * .36), label, font=F(sz, "SemiBold"), fill=T["ink"],
               anchor="ls")
        _stage_art(d, x + w - aw, cy - ah / 2, aw, ah, T, kind)
    return y + h


BLOCKS["flow"] = flow


# ------------------------------------------------------- the light-deck parts

def tool_pair(im, d, x, y, w, T, left, right, tile=132, logos=None):
    """Two marks and a plus, names underneath. The reference's way of saying
    `this is built out of exactly these two things`.

    ultron's mark is an orb on transparency, so it gets a drawn plate - without
    one it floats on the paper while the other tile has an edge, and a pair whose
    halves are different KINDS of object stops being a pair."""
    logos = logos or LOGOS
    gapx = 96
    total = tile * 2 + gapx
    sx = x + (w - total) // 2
    for i, (name, key, dark) in enumerate((left, right)):
        tx = sx + i * (tile + gapx)
        d.rounded_rectangle([tx, y, tx + tile, y + tile], radius=30,
                            fill=(20, 20, 22) if dark else (255, 255, 255),
                            outline=None if dark else T["rule"], width=2)
        p = f"{logos}/{key}.png"
        if os.path.exists(p):
            n = int(tile * 0.56)
            im.alpha_composite(Image.open(p).convert("RGBA").resize((n, n), Image.LANCZOS),
                               (tx + (tile - n) // 2, y + (tile - n) // 2))
        d.text((tx + tile // 2, y + tile + 46), name, font=F(30, "SemiBold"),
               fill=T["ink"], anchor="ms")
    cx, cy, r = sx + tile + gapx // 2, y + tile // 2, 26
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=T["ink"])
    d.line([(cx - 11, cy), (cx + 11, cy)], fill=(255, 255, 255), width=4)
    d.line([(cx, cy - 11), (cx, cy + 11)], fill=(255, 255, 255), width=4)
    return y + tile + 66


def checks(d, x, y, w, h, T, items, cap=76, rule=True, col=None, lead=1.12,
           bold=()):
    """A tick and a line. The tick is filled, not an outline - this list IS a
    list of things you no longer do, so the mark should read as done rather than
    as a bullet.

    THE SIZE IS SOLVED, THE GAP IS NOT. Given a fixed type size the leftover
    height has to go somewhere, and it goes into the gaps, so six short lines end
    up as six islands with 130px of nothing between them. Here the largest size
    that still fits six rows wins and the gap stays locked to it, which fills the
    same height with type instead of air.

    A LABEL MAY WRAP. Some lists are three words a row and some are the
    reference's own full sentences; forcing the long ones onto one line drove the
    whole deck to 31px, which is a footnote at half a second. So `lead` is the
    pitch INSIDE a label and the gap is the space between labels, and the tick
    sits against the label's FIRST line rather than the middle of its block."""
    n = len(items)
    faces = ["Bold" if i in bold else "Medium" for i in range(n)]
    for sz in range(cap, 19, -1):
        line, gap = round(sz * lead), round(sz * 0.66)
        rows = [wrap(t, F(sz, fc), w - sz * 1.65) for t, fc in zip(items, faces)]
        nl = sum(len(r) for r in rows)
        if nl * line + (n - 1) * gap <= h:
            break
    r = sz * 0.40
    y += max(0, (h - (nl * line + (n - 1) * gap))) // 2 + round(sz * .78)
    for i, ls in enumerate(rows):
        cy = y - round(sz * .30)
        d.ellipse([x, cy - r, x + r * 2, cy + r], fill=col or T["accent"])
        d.line([(x + r * .56, cy + r * .02), (x + r * .88, cy + r * .38)],
               fill=(255, 255, 255), width=max(3, round(sz / 12)))
        d.line([(x + r * .84, cy + r * .38), (x + r * 1.44, cy - r * .36)],
               fill=(255, 255, 255), width=max(3, round(sz / 12)))
        for k, t in enumerate(ls):
            d.text((x + r * 2 + sz * .58, y + k * line), t, font=F(sz, faces[i]),
                   fill=T["ink"], anchor="ls")
        y += len(ls) * line
        if rule and i < n - 1:
            ry = y - line + round(gap * .52)
            d.line([(x, ry), (x + w, ry)], fill=T["rule"], width=1)
        y += gap
    return y - gap


def notify(im, d, x, y, w, T, app, line, amount, h=148, logos=None, when="now"):
    """A payment landing. One notification, at the size a phone draws it.

    It is the one element in the deck that shows a RESULT rather than a
    mechanism, so it carries the frame's only other job - it sits under the
    prices and says somebody paid one. The amount is the largest thing on it
    because the amount is the entire point.

    White with a hairline, not the phone's own grey: on paper a grey card
    disappears and the notification stops reading as a separate object that
    arrived."""
    # Everything scales off h, so the same notification can be a footnote under a
    # price list on one deck and the payoff of a whole frame on another.
    tile = int(h * .52)
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(h * .18),
                        fill=(255, 255, 255), outline=T["rule"], width=1)
    tx, ty = x + int(h * .18), y + (h - tile) // 2
    p = f"{logos or LOGOS}/stripe.png"
    if os.path.exists(p):
        im.alpha_composite(Image.open(p).convert("RGBA").resize((tile, tile),
                           Image.LANCZOS), (tx, ty))
    else:
        d.rounded_rectangle([tx, ty, tx + tile, ty + tile], radius=int(tile * .24),
                            fill=(99, 91, 255))
        d.text((tx + tile // 2, ty + tile // 2 + int(tile * .17)), "S",
               font=F(int(tile * .52), "Bold"), fill=(255, 255, 255), anchor="ms")
    tx += tile + int(h * .16)
    if h >= 220:
        # Three rows: app, amount, descriptor. At payoff size the two-row layout
        # had nowhere honest to put the descriptor - beside the amount it ran
        # off the card, beside the app name it read as one run-on line of
        # chrome. A real notification stacks, so this one stacks.
        az = int(h * .145)
        bz = int(h * .27)
        while bz > 24 and F(bz, "Bold").getlength(amount) > x + w - int(h * .18) - tx:
            bz -= 2
        d.text((tx, y + int(h * .27)), app, font=F(az, "SemiBold"),
               fill=T["ink"], anchor="ls")
        d.text((x + w - int(h * .18), y + int(h * .27)), when,
               font=F(int(h * .12), "Regular"), fill=T["meta"], anchor="rs")
        d.text((tx, y + int(h * .60)), amount, font=F(bz, "Bold"),
               fill=T["ink"], anchor="ls")
        d.text((tx, y + int(h * .84)), line, font=F(az, "Regular"),
               fill=T["ink"], anchor="ls")
        return y + h
    az, bz = int(h * .18), int(h * .26)
    d.text((tx, y + int(h * .39)), app, font=F(az, "SemiBold"), fill=T["ink"], anchor="ls")
    d.text((x + w - int(h * .18), y + int(h * .39)), when, font=F(int(h * .17), "Regular"),
           fill=T["meta"], anchor="rs")
    d.text((tx, y + int(h * .72)), amount, font=F(bz, "Bold"), fill=T["ink"], anchor="ls")
    ax = tx + F(bz, "Bold").getlength(amount) + int(h * .10)
    if F(az, "Regular").getlength(line) <= x + w - int(h * .18) - ax:
        d.text((ax, y + int(h * .72)), line, font=F(az, "Regular"),
               fill=T["ink"], anchor="ls")
    return y + h


def report_surface(W=820, H=560, theme=None, name="Client Portal"):
    """A reporting screen: a trend, a breakdown, a total. What `the business can
    trust and act on` looks like, drawn rather than screenshotted.

    Different from app_surface on purpose - that one is the thing you work in,
    this is the thing you show someone. A chart is the difference."""
    C = dict(bg=(255, 255, 255), edge=(228, 229, 233), sub=(248, 249, 251),
             ink=(24, 25, 28), dim=(126, 129, 136), line=(52, 116, 240),
             faint=(214, 222, 240))
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=18, fill=C["bg"])

    # It is the SAME product as app_surface, on its reports tab - so it carries
    # the same name. Two differently-named screens in one deck would read as two
    # different systems, which is the opposite of the claim.
    d.text((34, 56), name, font=F(24, "Bold"), fill=C["ink"], anchor="ls")
    d.rounded_rectangle([W - 168, 34, W - 34, 70], radius=10, fill=C["sub"])
    d.text((W - 101, 58), "Last 30 days", font=F(19, "Medium"), fill=C["dim"], anchor="ms")

    # The chart takes whatever is left after the stat row, so the surface can be
    # given the height the frame has rather than the frame being given the
    # height the surface happens to be.
    cx0, cy0, cw, chh = 34, 96, int(W * .60), H - 312
    d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + chh], radius=14,
                        outline=C["edge"], width=1)
    d.text((cx0 + 26, cy0 + 40), "Calls booked", font=F(19, "SemiBold"),
           fill=C["dim"], anchor="ls")
    pts = [.30, .52, .38, .64, .48, .82, .70]
    px = [cx0 + 26 + i * ((cw - 52) / 6) for i in range(7)]
    py = [cy0 + chh - 40 - v * (chh - 116) for v in pts]
    d.polygon([(px[0], cy0 + chh - 40)] + list(zip(px, py)) + [(px[-1], cy0 + chh - 40)],
              fill=C["faint"])
    d.line(list(zip(px, py)), fill=C["line"], width=4, joint="curve")
    for a, b in zip(px, py):
        d.ellipse([a - 5, b - 5, a + 5, b + 5], fill=C["bg"], outline=C["line"], width=3)
    for i, lab in enumerate(("M", "T", "W", "T", "F", "S", "S")):
        d.text((px[i], cy0 + chh - 14), lab, font=F(17, "Medium"), fill=C["dim"], anchor="ms")

    lx = cx0 + cw + 18
    d.rounded_rectangle([lx, cy0, W - 34, cy0 + chh], radius=14, outline=C["edge"], width=1)
    d.text((lx + 20, cy0 + 40), "Where from", font=F(19, "SemiBold"),
           fill=C["dim"], anchor="ls")
    src = (("Instagram", .82), ("Google", .61), ("Referral", .44), ("Walk-in", .21))
    pitch = (chh - 140) // max(1, len(src) - 1)
    for i, (nm, v) in enumerate(src):
        ry = cy0 + 76 + i * pitch
        d.text((lx + 20, ry + 18), nm, font=F(19, "Medium"), fill=C["ink"], anchor="ls")
        d.rounded_rectangle([lx + 20, ry + 30, lx + 20 + (W - 74 - lx) * v, ry + 40],
                            radius=5, fill=C["line"] if not i else C["faint"])

    by = cy0 + chh + 22
    for i, (lab, val) in enumerate((("Leads handled", "412"), ("Calls booked", "61"),
                                    ("Hours saved", "74"))):
        bw = (W - 68 - 24) // 3
        bx = 34 + i * (bw + 12)
        d.rounded_rectangle([bx, by, bx + bw, H - 34], radius=14, fill=C["sub"])
        d.text((bx + 20, by + 44), lab, font=F(19, "Medium"), fill=C["dim"], anchor="ls")
        d.text((bx + 20, by + 96), val, font=F(40, "Bold"), fill=C["ink"], anchor="ls")
    return im


BLOCKS["checks"] = checks


# --------------------------------------------------------- the sales-deck parts

def tool_cards(d, x, y, w, h, T, items, im=None, logos=None, gap=48):
    """Two tools, each a full-measure card carrying ONE thing: the mark and the
    name, set as a lockup and centred, at the largest size the pair can share.

    That is what the reference's zb / lead magic cards actually are and what the
    first pass missed. It put a 190px mark in the corner with two small lines of
    invented role copy beside it, which left four fifths of each card empty - a
    template waiting for content, on a deck that is supposed to be finished. The
    lockup fills the card or the card has no reason to be that size, and the role
    line goes entirely: the frame's own description already says the job."""
    n = len(items)
    ch = (h - gap * (n - 1)) // n
    mark = int(ch * 0.44)
    nz = int(ch * 0.21)
    while nz > 20 and max(F(nz, "Bold").getlength(nm) for nm, _ in items) \
            + mark + int(ch * .12) > w - int(ch * .30):
        nz -= 2
    for name, key in items:
        d.rounded_rectangle([x, y, x + w, y + ch], radius=30, fill=(255, 255, 255),
                            outline=T["rule"], width=1)
        lock = mark + int(ch * .12) + F(nz, "Bold").getlength(name)
        mx = x + int((w - lock) // 2)
        my = y + (ch - mark) // 2
        p = f"{logos or LOGOS}/{key}.png"
        if im is not None and os.path.exists(p):
            im.alpha_composite(Image.open(p).convert("RGBA").resize((mark, mark),
                               Image.LANCZOS), (mx, my))
        d.text((mx + mark + int(ch * .12), y + ch // 2 + nz * 0.36), name,
               font=F(nz, "Bold"), fill=T["ink"], anchor="ls")
        y += ch + gap
    return y - gap


def dm_card(d, x, y, w, T, who, handle, lines, sz=36):
    """One message, at the size the frame can afford - NOT the size a phone
    draws it. The first pass set the body at 34px under a 62px title and the
    proof of the whole frame read as a footnote. The claim is the sentence, so
    the sentence is body-copy sized.

    The name line carries the name and nothing else. Name plus handle plus
    timestamp is a screenshot's worth of chrome, and chrome is what made it read
    as a pasted tweet instead of as this deck saying something."""
    pad = 44
    lead = round(sz * 1.40)
    body = [l for t in lines for l in wrap(t, F(sz, "Regular"), w - pad * 2)]
    av = 72
    head_h = pad + av + 30
    h = head_h + len(body) * lead + pad - round(sz * .35)
    d.rounded_rectangle([x, y, x + w, y + h], radius=30, fill=(255, 255, 255),
                        outline=T["rule"], width=1)
    d.ellipse([x + pad, y + pad, x + pad + av, y + pad + av], fill=T["ink"])
    d.text((x + pad + av / 2, y + pad + av / 2 + 12), who[0], font=F(34, "Bold"),
           fill=(255, 255, 255), anchor="ms")
    d.text((x + pad + av + 26, y + pad + av / 2 - 6), who, font=F(34, "SemiBold"),
           fill=T["ink"], anchor="ls")
    d.text((x + pad + av + 26, y + pad + av / 2 + 32), handle, font=F(28, "Regular"),
           fill=T["meta"], anchor="ls")
    yy = y + head_h + round(sz * .78)
    for l in body:
        d.text((x + pad, yy), l, font=F(sz, "Regular"), fill=T["ink"], anchor="ls")
        yy += lead
    return y + h


def stat_row(d, x, y, w, h, T, items):
    """Three numbers, the size the frame can afford. Same tile as the app
    surface, drawn at frame scale instead of at interface scale."""
    n = len(items)
    gp = 24
    cw = (w - gp * (n - 1)) // n
    # ONE label size for all three tiles, solved against the longest. Sized per
    # tile, `Calls booked` came out smaller than `Closed` beside it, and three
    # captions at three sizes is not a row, it is three things.
    lz = int(h * .155)
    while lz > 14 and max(F(lz, "Medium").getlength(l) for l, _ in items) > cw - 56:
        lz -= 1
    vz = int(h * .34)
    while vz > 20 and max(F(vz, "Bold").getlength(v) for _, v in items) > cw - 56:
        vz -= 1
    for i, (lab, val) in enumerate(items):
        cx = x + i * (cw + gp)
        d.rounded_rectangle([cx, y, cx + cw, y + h], radius=22, fill=(255, 255, 255),
                            outline=T["rule"], width=1)
        d.text((cx + 30, y + int(h * .34)), lab, font=F(lz, "Medium"),
               fill=T["ink"], anchor="ls")
        d.text((cx + 30, y + int(h * .78)), val, font=F(vz, "Bold"),
               fill=T["ink"], anchor="ls")
    return y + h


BLOCKS["tool_cards"] = tool_cards


# ---------------------------------------------------- artifacts, not brand cards

def list_panel(im, d, x, y, w, h, T, title, note, rows, logos=None, rz=31,
               foot=None):
    """A white panel with a header and rows of REAL records. The generic shape
    behind `emails being checked`, `calls booked today`, `leads that came in` -
    every claim of the form `the system handled these`, shown as the handled
    things instead of as a logo for the tool that did it.

    A row is (icon, left, right, tone): tone `green`/`amber` draws the right as
    a status chip, `strike` draws the row as the one that FAILED the check -
    struck through and dimmed, because a list where everything passes is
    decoration, and the whole reason to show the check is the reject."""
    C = dict(green=(22, 158, 92), amber=(226, 148, 22), chip=(238, 240, 244))
    d.rounded_rectangle([x, y, x + w, y + h], radius=30, fill=(255, 255, 255),
                        outline=T["rule"], width=1)
    pad = 40
    d.text((x + pad, y + pad + 24), title, font=F(32, "Bold"), fill=T["ink"], anchor="ls")
    d.text((x + w - pad, y + pad + 24), note, font=F(28, "Regular"), fill=T["meta"],
           anchor="rs")
    top = y + pad + 52
    fh = 74 if foot else 0
    rh = (h - (top - y) - pad + 10 - fh) // len(rows)
    for i, (icon, left, right, tone) in enumerate(rows):
        ry = top + i * rh
        by = ry + rh // 2 + 11
        tx = x + pad
        if icon:
            # The icon fits INSIDE the row pitch. At 52px in 47px rows the three
            # source marks stacked into one touching column, which is the
            # definition of cramped - the row height owns the icon, not the
            # other way round.
            n = max(28, min(52, rh - 14))
            p = f"{logos or LOGOS}/{icon}.png"
            if os.path.exists(p):
                im.alpha_composite(Image.open(p).convert("RGBA").resize((n, n),
                                   Image.LANCZOS), (tx, ry + (rh - n) // 2))
            tx += n + 28
        struck = tone == "strike"
        lf = F(rz, "SemiBold")
        d.text((tx, by), left, font=lf, fill=T["meta"] if struck else T["ink"],
               anchor="ls")
        if struck:
            lw_ = lf.getlength(left)
            d.line([(tx - 4, by - 11), (tx + lw_ + 4, by - 11)], fill=T["meta"], width=3)
            d.text((x + w - pad, by), right, font=F(rz - 4, "Regular"),
                   fill=T["meta"], anchor="rs")
        elif tone:
            cf = F(rz - 6, "SemiBold")
            cw = cf.getlength(right)
            cx = x + w - pad - cw - 26
            d.rounded_rectangle([cx, by - rz - 5, cx + cw + 26, by + 10],
                                radius=20, fill=C["chip"])
            d.text((cx + 13, by - 3), right, font=cf, fill=C[tone], anchor="ls")
        else:
            d.text((x + w - pad, by), right, font=F(28, "Regular"), fill=T["meta"],
                   anchor="rs")
        if i + 1 < len(rows):
            d.line([(x + pad, top + (i + 1) * rh), (x + w - pad, top + (i + 1) * rh)],
                   fill=(238, 237, 233), width=1)
    if foot:
        fy = top + len(rows) * rh + 12
        d.line([(x + pad, fy), (x + w - pad, fy)], fill=(238, 237, 233), width=1)
        d.text((x + pad, fy + 44), foot[0], font=F(28, "SemiBold"), fill=T["ink"],
               anchor="ls")
        d.text((x + w - pad, fy + 44), foot[1], font=F(26, "Regular"), fill=T["meta"],
               anchor="rs")
    return y + h


def chat(d, x, y, w, T, msgs, sz=34, measure_only=False):
    """A thread, not a paragraph in a card. Sent bubbles in ink on the right,
    the reply in white on the left - the reply is the entire argument, because a
    personalized message is proven by what comes back, not by how it was
    worded."""
    pad, gap = 26, 32
    maxw = int(w * 0.78)
    lead = round(sz * 1.32)
    for side, text in msgs:
        if side == "day":
            # A separator, not a bubble - the thread's own proof that the agent
            # kept at it across a week rather than firing three times a minute.
            if not measure_only:
                df = F(24, "SemiBold")
                tw2 = df.getlength(text)
                cx0 = x + w // 2
                d.text((cx0, y + 30), text, font=df, fill=T["ink"], anchor="ms")
                d.line([(x, y + 22), (cx0 - tw2 / 2 - 24, y + 22)], fill=T["rule"], width=1)
                d.line([(cx0 + tw2 / 2 + 24, y + 22), (x + w, y + 22)], fill=T["rule"], width=1)
            y += 52 + gap
            continue
        lines = wrap(text, F(sz, "Regular"), maxw - pad * 2)
        tw = max(F(sz, "Regular").getlength(l) for l in lines)
        bw = int(tw) + pad * 2
        bh = len(lines) * lead + pad * 2 - round(sz * .30)
        bx = x + w - bw if side == "me" else x
        if not measure_only:
            if side == "me":
                d.rounded_rectangle([bx, y, bx + bw, y + bh], radius=28, fill=T["ink"])
                col = (250, 250, 250)
            else:
                d.rounded_rectangle([bx, y, bx + bw, y + bh], radius=28,
                                    fill=(255, 255, 255), outline=T["rule"], width=1)
                col = T["ink"]
            ty = y + pad + round(sz * .72)
            for l in lines:
                d.text((bx + pad, ty), l, font=F(sz, "Regular"), fill=col, anchor="ls")
                ty += lead
        y += bh + gap
    return y - gap


def seq(im, d, x, y, w, h, T, stops, logos=None, tile=118):
    """A schedule on a spine. Day by day down the frame, each stop a tool tile
    and one line - the outreach system AS the week it runs, not as the logos of
    the two products it runs on."""
    n = len(stops)
    gapv = min(120, (h - n * tile) // max(1, n - 1))
    total = n * tile + (n - 1) * gapv
    y += max(0, (h - total) // 2)
    cx = x + tile // 2
    d.line([(cx, y + tile), (cx, y + total - tile)],
           fill=T.get("spine", T["rule"]), width=3)
    for i, stop in enumerate(stops):
        ty = y + i * (tile + gapv)
        if len(stop) == 5:
            icon, step, detail, meta, hot = stop
        else:
            icon, step, detail, hot = stop[0], f"{stop[1]}  {stop[2]}", None, stop[3]
            meta = None
        logo_tile(im, d, x, ty, tile, icon, T, logos)
        tx = x + tile + 48
        # THE META SITS ON THE TITLE'S BASELINE, not between the two lines.
        # Halfway down it landed on top of the detail text - `on schedule` ran
        # straight through `logged back to base`.
        mw = 0
        if meta:
            mf = F(30, "Regular")
            mw = mf.getlength(meta) + 28
            d.text((x + w, ty + tile // 2 - 8), meta, font=mf, fill=T["ink"],
                   anchor="rs")
        if detail:
            # Two lines a stop: the step bold, what it actually does under it.
            sf = F(44, "Bold")
            # Trim by WORD, never mid-word. Clipping characters produced
            # `Sends the personali` on a shipped frame.
            title = step
            while sf.getlength(title) > x + w - tx - mw and " " in title:
                title = title.rsplit(" ", 1)[0]
            d.text((tx, ty + tile // 2 - 8), title, font=sf,
                   fill=T["accent"] if hot else T["ink"], anchor="ls")
            d.text((tx, ty + tile // 2 + 38), detail, font=F(30, "Regular"),
                   fill=T["ink"], anchor="ls")
        else:
            d.text((tx, ty + tile // 2 + 16), step,
                   font=F(46, "Bold" if hot else "Regular"), fill=T["ink"], anchor="ls")
    return y + total


_plated = {}


def logo_tile(im, d, x, y, sz, key, T, logos=None):
    """A tool mark at tile size, without double-plating it. Some logo files ARE
    an app tile already - apollo.png is a white rounded square with the orbit-A
    inside it - and drawing that inside another white tile shrinks the mark and
    stacks plate on plate. If the file's opaque area covers most of its canvas
    it is treated as its own tile and pasted full-bleed under a rounded mask;
    a bare glyph gets the drawn tile and 62 percent, as before."""
    p = f"{logos or LOGOS}/{key}.png"
    if not os.path.exists(p):
        d.rounded_rectangle([x, y, x + sz, y + sz], radius=int(sz * .22),
                            fill=(255, 255, 255), outline=T["rule"], width=1)
        return
    if key not in _plated:
        src = Image.open(p).convert("RGBA")
        a = src.split()[3]
        cover = sum(1 for v in a.getdata() if v > 30) / (src.width * src.height)
        _plated[key] = cover >= 0.85
    src = Image.open(p).convert("RGBA").resize((sz, sz), Image.LANCZOS)         if _plated[key] else None
    if _plated[key]:
        mask = Image.new("L", (sz, sz), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, sz - 1, sz - 1],
                                               radius=int(sz * .22), fill=255)
        im.paste(src, (x, y), mask)
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).rounded_rectangle([x, y, x + sz, y + sz],
                                             radius=int(sz * .22),
                                             outline=(*T["rule"], 255), width=1)
        im.alpha_composite(ov)
    else:
        d.rounded_rectangle([x, y, x + sz, y + sz], radius=int(sz * .22),
                            fill=(255, 255, 255), outline=T["rule"], width=1)
        n = int(sz * 0.62)
        im.alpha_composite(Image.open(p).convert("RGBA").resize((n, n), Image.LANCZOS),
                           (x + (sz - n) // 2, y + (sz - n) // 2))


# ------------------------------------------------------- the agent-deck parts

def alerts(im, d, x, y, w, T, items, logos=None):
    """A stack of small alert cards - the lockscreen the research agent
    produces. Each one is a REAL change with a category chip, drawn at
    notification size, because `monitors competitors` is proven by what the
    monitor caught."""
    C = dict(green=(22, 158, 92), amber=(226, 148, 22), chip=(238, 240, 244))
    ch, gap, tile = 150, 26, 68
    for kind, text, detail, tag, tone in items:
        d.rounded_rectangle([x, y, x + w, y + ch], radius=24, fill=(255, 255, 255),
                            outline=T["rule"], width=1)
        tx, ty = x + 32, y + (ch - tile) // 2
        if isinstance(kind, tuple):
            _tile(d, tx, ty, tile, T)
            glyph(d, tx + 9, ty + 9, tile - 18, T, kind[1])
        else:
            logo_tile(im, d, tx, ty, tile, kind, T, logos)
        d.text((tx + tile + 26, y + ch // 2 - 8), text, font=F(32, "SemiBold"),
               fill=T["ink"], anchor="ls")
        d.text((tx + tile + 26, y + ch // 2 + 32), detail, font=F(27, "Regular"),
               fill=T["meta"], anchor="ls")
        if tone:
            cf = F(25, "SemiBold")
            cw = cf.getlength(tag)
            cx = x + w - 26 - cw - 26
            d.rounded_rectangle([cx, y + ch // 2 - 24, cx + cw + 26, y + ch // 2 + 16],
                                radius=20, fill=C["chip"])
            d.text((cx + 13, y + ch // 2 + 5), tag, font=cf, fill=C[tone], anchor="ls")
        else:
            d.text((x + w - 26, y + ch // 2 + 9), tag, font=F(27, "Regular"),
                   fill=T["meta"], anchor="rs")
        y += ch + gap
    return y - gap


def brief_card(im, d, x, y, w, T, title, when, rows, logos=None, rh=66,
               icon="telegram"):
    """The 7am message. One card, a Telegram header, then the numbers the owner
    actually reads - the agent AS the message it sends, not an illustration of
    messaging."""
    pad = 40
    tile = 56
    h = pad + tile + 30 + len(rows) * rh + pad - 14
    d.rounded_rectangle([x, y, x + w, y + h], radius=30, fill=(255, 255, 255),
                        outline=T["rule"], width=1)
    tx0 = x + pad
    if icon:
        p = f"{logos or LOGOS}/{icon}.png"
        if os.path.exists(p):
            im.alpha_composite(Image.open(p).convert("RGBA").resize((tile, tile),
                               Image.LANCZOS), (x + pad, y + pad - 6))
        tx0 += tile + 24
    d.text((tx0, y + pad + tile // 2 + 5), title,
           font=F(32, "Bold"), fill=T["ink"], anchor="ls")
    d.text((x + w - pad, y + pad + tile // 2 + 5), when, font=F(28, "Regular"),
           fill=T["meta"], anchor="rs")
    ry = y + pad + tile + 24
    d.line([(x + pad, ry - 6), (x + w - pad, ry - 6)], fill=(238, 237, 233), width=1)
    # The text column clears the WIDEST count - a fixed 58px put `MRR` on top
    # of `$10K`.
    col = max(F(34, "Bold").getlength(n) for n, _ in rows) + 26
    for i, (n, text) in enumerate(rows):
        by = ry + i * rh + rh // 2 + 12
        d.text((x + pad, by), n, font=F(34, "Bold"), fill=T["ink"], anchor="ls")
        d.text((x + pad + col, by), text, font=F(31, "Regular"), fill=T["ink"], anchor="ls")
    return y + h


# ----------------------------------------------------- the ultron-deck parts

# ultron's own OS, drawn: the surfaces its landing page names, running a
# founder's day. Same object as every other app_surface spec.
ULTRON_OS = dict(
    name="ultron",
    nav=["Control center*", "Outreach", "Pipeline", "Ledger", "Console",
         "Techniques", "Settings"],
    foot=("WORKERS", [("Outreach", "blue"), ("Content", "pink"), ("Support", "green")]),
    stats=[("34", "tasks today"), ("12", "in review"), ("9", "shipped"),
           ("3", "waiting")],
    title=("Task feed", "live"),
    cols=("worker", "task", "status"),
    rows=[("Outreach", "40 prospects enriched", "done", "green"),
          ("Content", "3 reels cut, captioned", "done", "green"),
          ("Support", "12 tickets answered", "done", "green"),
          ("Outreach", "Follow-ups drafted", "review", "amber"),
          ("Engineering", "Landing page deployed", "review", "amber"),
          ("Ledger", "Invoices reconciled", "queued", "dim")])


def stack(im, d, x, y, w, h, T, rows, logos=None, tile=88, align="left"):
    """The tool stack as a table with an ALIGNED tile column, not label-left
    icon-right. Right-aligning one or two small marks against a 40px label put
    a canyon of nothing in the middle of every row, which read as a slide that
    forgot its own content. The label column is as wide as the widest label and
    the tiles start together right after it."""
    n = len(rows)
    rh = min(128, h // n)
    y += max(0, (h - rh * n) // 2)
    lw = max(F(42, "Bold").getlength(l) for l, _ in rows) + 64
    for i, (lab, keys) in enumerate(rows):
        by = y + rh // 2
        d.text((x, by + 15), lab, font=F(42, "Bold"), fill=T["ink"], anchor="ls")
        tx = int(x + w - (len(keys) * tile + (len(keys) - 1) * 20)) \
            if align == "right" else int(x + lw)
        for k in keys:
            logo_tile(im, d, tx, int(by - tile // 2), tile, k, T, logos)
            tx += tile + 20
        if i + 1 < n:
            d.line([(x, y + rh), (x + w, y + rh)], fill=T["rule"], width=1)
        y += rh
    return y

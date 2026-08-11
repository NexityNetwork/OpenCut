#!/usr/bin/env python3
"""Six product surfaces, drawn properly.

One per business-model frame, each a DIFFERENT product with its own name,
palette and layout - an agency ops board, a marketing analytics app, a
support CRM on dark chrome, a content pipeline, a software kanban, a
finance/ops overview. The reference's frames each carry a polished stock
dashboard; these are their equals, drawn, so every word on them can be true.

Everything renders at 2x and downscales once, so hairlines, 11px labels and
chart dots stay crisp on the 1080-wide frame.
"""
import os

from PIL import Image, ImageDraw, ImageFont

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
_f = {}


def F(sz, w="Regular"):
    k = (sz, w)
    if k not in _f:
        _f[k] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _f[k]


# ------------------------------------------------------------------ mini kit
# All coordinates are in 2x space. S is the scale everything is drawn at.
S = 2


def new(w, h, fill):
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w * S - 1, h * S - 1], radius=16 * S, fill=fill)
    return im, d


def down(im, w, h):
    return im.resize((w, h), Image.LANCZOS)


def rr(d, x, y, w, h, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=fill,
                        outline=outline, width=width)


def txt(d, x, y, s, sz, w, fill, anchor="ls"):
    d.text((x, y), s, font=F(sz * S, w), fill=fill, anchor=anchor)


def avatar(d, x, y, r, initial, bg, fg=(255, 255, 255)):
    d.ellipse([x - r, y - r, x + r, y + r], fill=bg)
    d.text((x, y + r * 0.42), initial, font=F(int(r * 1.1), "SemiBold"),
           fill=fg, anchor="ms")


def chip(d, x, y, s, fg, bg, sz=11):
    f = F(sz * S, "SemiBold")
    w = f.getlength(s)
    rr(d, x, y, w + 20 * S, 22 * S, 11 * S, fill=bg)
    d.text((x + 10 * S, y + 15.5 * S), s, font=f, fill=fg, anchor="ls")
    return x + w + 20 * S


def dot(d, x, y, r, fill):
    d.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def icon_sq(d, x, y, s, fill, r=None):
    rr(d, x, y, s, s, r if r is not None else int(s * .3), fill=fill)


def line_chart(d, x, y, w, h, pts, col, area=None, grid=None, width=3,
               dots=(), axis=None):
    if grid:
        for i in range(4):
            gy = y + int(h * i / 3)
            d.line([(x, gy), (x + w, gy)], fill=grid, width=1)
    P = [(x + int(w * i / (len(pts) - 1)), y + h - int(h * p))
         for i, p in enumerate(pts)]
    if area:
        d.polygon([(P[0][0], y + h)] + P + [(P[-1][0], y + h)], fill=area)
    d.line(P, fill=col, width=width * S, joint="curve")
    for i in dots:
        px, py = P[i]
        d.ellipse([px - 5 * S, py - 5 * S, px + 5 * S, py + 5 * S],
                  fill=(255, 255, 255), outline=col, width=2 * S)
    if axis:
        labs, acol = axis
        for i, lab in enumerate(labs):
            d.text((x + int(w * i / (len(labs) - 1)), y + h + 16 * S), lab,
                   font=F(9 * S, "Medium"), fill=acol, anchor="ms")
    return P


def bar_chart(d, x, y, w, h, vals, col, mute, hot=-1, bw=None, r=4):
    n = len(vals)
    bw = bw or int(w / (n * 1.8))
    step = w // n
    for i, v in enumerate(vals):
        bx = x + i * step + (step - bw) // 2
        bh = max(6 * S, int(h * v))
        rr(d, bx, y + h - bh, bw, bh, r * S, fill=col if i == hot else mute)


def donut(d, cx, cy, r, frac, col, mute, width=13):
    w = width * S
    d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=mute, width=w)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + int(360 * frac),
          fill=col, width=w)


def progress(d, x, y, w, frac, col, mute, h=6):
    rr(d, x, y, w, h * S, 3 * S, fill=mute)
    rr(d, x, y, max(int(w * frac), 8 * S), h * S, 3 * S, fill=col)


def window_top(d, w, url, C):
    for i, c in enumerate(((236, 106, 94), (243, 190, 78), (97, 197, 84))):
        dot(d, (22 + i * 20) * S, 22 * S, 5 * S, c)
    rr(d, 90 * S, 10 * S, w * S - 180 * S, 24 * S, 12 * S, fill=C)
    d.text((w * S // 2, 27 * S), url, font=F(10 * S, "Regular"),
           fill=(150, 152, 158), anchor="ms")


# ================================================================ 1. Opsline
# Agency ops - indigo. Welcome header, stat tiles with progress, performance
# chart, project timeline, team leaderboard, task table.

def s1_agency(w=764, h=600):
    C = dict(bg=(255, 255, 255), ink=(23, 23, 33), dim=(139, 141, 152),
             faint=(196, 198, 208), edge=(236, 237, 242), soft=(247, 247, 250),
             acc=(99, 91, 245), acc2=(129, 122, 250), tint=(238, 237, 252),
             green=(34, 170, 108), amber=(232, 150, 34))
    im, d = new(w, h, C["bg"])
    W2, H2 = w * S, h * S

    icon_sq(d, 24 * S, 18 * S, 22 * S, C["acc"], r=7 * S)
    txt(d, 56 * S, 34 * S, "Opsline", 15, "Bold", C["ink"])
    nx = 180 * S
    for i, t in enumerate(("Dashboard", "My Tasks", "Reports", "Payroll")):
        txt(d, nx, 33 * S, t, 11.5, "SemiBold" if not i else "Medium",
            C["ink"] if not i else C["dim"])
        if not i:
            d.line([(nx, 44 * S), (nx + F(11.5 * S, "SemiBold").getlength(t), 44 * S)],
                   fill=C["acc"], width=2 * S)
        nx += int(F(11.5 * S, "Medium").getlength(t)) + 34 * S
    rr(d, W2 - 210 * S, 14 * S, 130 * S, 26 * S, 13 * S, fill=C["soft"])
    txt(d, W2 - 196 * S, 31 * S, "Search anything", 10, "Regular", C["faint"])
    avatar(d, W2 - 40 * S, 27 * S, 13 * S, "D", C["acc"])
    d.line([(0, 56 * S), (W2, 56 * S)], fill=C["edge"], width=1)

    txt(d, 24 * S, 92 * S, "Welcome back, Dana", 19, "Bold", C["ink"])
    txt(d, 24 * S, 112 * S, "Monday, 18 August", 10.5, "Regular", C["dim"])
    rr(d, W2 - 148 * S, 74 * S, 124 * S, 30 * S, 15 * S, fill=C["acc"])
    txt(d, W2 - 86 * S, 93 * S, "+  New project", 11, "SemiBold",
        (255, 255, 255), anchor="ms")

    tiles = [("Hourly tasks", "19/25", .75, "75% done", C["acc"]),
             ("Pending", "26/30", .55, "55% ready", C["amber"]),
             ("Overdue", "02/30", .08, "kept low", C["green"]),
             ("Upcoming", "12/20", .6, "on track", C["acc2"])]
    tw = (330 * S - 12 * S) // 2
    for i, (lab, val, fr, note, col) in enumerate(tiles):
        tx = 24 * S + (i % 2) * (tw + 12 * S)
        ty = 128 * S + (i // 2) * (86 * S)
        rr(d, tx, ty, tw, 76 * S, 12 * S, fill=C["soft"])
        txt(d, tx + 14 * S, ty + 24 * S, lab, 10, "Medium", C["dim"])
        txt(d, tx + 14 * S, ty + 48 * S, val, 16, "Bold", C["ink"])
        progress(d, tx + 14 * S, ty + 58 * S, tw - 28 * S, fr, col, C["edge"])
        txt(d, tx + 14 * S, ty + 72 * S + 8, note, 8.5, "Regular", C["faint"])

    rr(d, 24 * S, 310 * S, 330 * S, 130 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, 40 * S, 336 * S, "Performance", 12, "SemiBold", C["ink"])
    txt(d, 40 * S, 362 * S, "16 hr 30 min", 17, "Bold", C["ink"])
    txt(d, 40 * S, 378 * S, "total time worked", 9, "Regular", C["dim"])
    chip(d, 260 * S, 322 * S, "+4.3%", C["green"], (226, 244, 235), sz=10)
    line_chart(d, 40 * S, 388 * S, 296 * S, 40 * S,
               [.2, .45, .3, .6, .5, .85, .7], C["acc"],
               area=(238, 237, 252), width=2)

    rx = 378 * S
    rw = W2 - rx - 24 * S
    rr(d, rx, 74 * S, rw, 170 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, rx + 16 * S, 100 * S, "Timeline - client projects", 12, "SemiBold", C["ink"])
    lanes = [("Northlake site", .04, .5, C["acc"]),
             ("Ardent follow-ups", .3, .42, C["green"]),
             ("Boro intake bot", .18, .6, C["amber"]),
             ("Fernway reports", .55, .4, C["acc2"])]
    for i, (nm, a, ln, col) in enumerate(lanes):
        ly = (118 + i * 30) * S
        txt(d, rx + 16 * S, ly + 13 * S, nm, 9.5, "Medium", C["dim"])
        bx = rx + 150 * S
        bw_ = rw - 170 * S
        rr(d, bx, ly, bw_, 18 * S, 9 * S, fill=C["soft"])
        rr(d, bx + int(bw_ * a), ly, int(bw_ * ln), 18 * S, 9 * S, fill=col)

    rr(d, rx, 258 * S, rw, 182 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, rx + 16 * S, 284 * S, "Leaderboard", 12, "SemiBold", C["ink"])
    txt(d, rx + rw - 16 * S, 284 * S, "this week", 9.5, "Regular", C["dim"], anchor="rs")
    team = [("Mara Holt", .92, C["acc"]), ("Devin Park", .81, C["green"]),
            ("Sofia Almeida", .74, C["amber"]), ("Owen Brandt", .66, C["acc2"])]
    for i, (nm, fr, col) in enumerate(team):
        ly = (300 + i * 34) * S
        avatar(d, rx + 28 * S, ly + 10 * S, 11 * S, nm[0], col)
        txt(d, rx + 48 * S, ly + 14 * S, nm, 10.5, "Medium", C["ink"])
        progress(d, rx + 170 * S, ly + 6 * S, rw - 240 * S, fr, col, C["soft"])
        txt(d, rx + rw - 16 * S, ly + 14 * S, f"{int(fr * 100)}%", 10, "SemiBold",
            C["ink"], anchor="rs")

    ty0 = 456 * S
    txt(d, 24 * S, ty0 + 14 * S, "Recommended tasks", 12, "SemiBold", C["ink"])
    cols = ["Project", "Assignee", "Due", "Status"]
    fx = [24, 300, 480, 600]
    for cx, ct in zip(fx, cols):
        txt(d, cx * S, ty0 + 40 * S, ct, 9, "SemiBold", C["faint"])
    rows = [("Branding, visual identity", "Mara", "29 Aug", "In progress", C["amber"]),
            ("Landing page rebuild", "Devin", "27 Aug", "In progress", C["amber"]),
            ("First web design concept", "Sofia", "30 Aug", "Queued", C["dim"]),
            ("Customer journey map", "Owen", "04 Sep", "Done", C["green"])]
    for i, (p, a, due, st, col) in enumerate(rows):
        ry = ty0 + (56 + i * 26) * S
        if i % 2 == 0:
            rr(d, 16 * S, ry - 15 * S, W2 - 32 * S, 24 * S, 6 * S, fill=(251, 251, 253))
        txt(d, fx[0] * S, ry, p, 10, "Medium", C["ink"])
        txt(d, fx[1] * S, ry, a, 10, "Regular", C["dim"])
        txt(d, fx[2] * S, ry, due, 10, "Regular", C["dim"])
        dot(d, (fx[3] + 5) * S, ry - 4 * S, 4 * S, col)
        txt(d, (fx[3] + 14) * S, ry, st, 9.5, "Medium", C["dim"])
    return down(im, w, h)


# ================================================================= 2. Mtask
# Marketing analytics - blue. Browser chrome, sidebar, KPI strip with deltas,
# big revenue chart with a tooltip, contacts and tasks below.

def s2_marketing(w=764, h=600):
    C = dict(bg=(255, 255, 255), ink=(22, 26, 34), dim=(134, 139, 150),
             faint=(190, 195, 205), edge=(235, 237, 241), soft=(247, 248, 250),
             blue=(59, 130, 246), tint=(232, 240, 254), green=(34, 170, 108),
             red=(226, 88, 88), violet=(139, 92, 246), amber=(232, 150, 34))
    im, d = new(w, h, C["bg"])
    W2, H2 = w * S, h * S
    window_top(d, w, "mtask.co  /  dashboard", C["soft"])
    d.line([(0, 44 * S), (W2, 44 * S)], fill=C["edge"], width=1)

    sw = 150 * S
    d.rectangle([0, 44 * S, sw, H2 - 16 * S], fill=(252, 252, 253))
    d.line([(sw, 44 * S), (sw, H2)], fill=C["edge"], width=1)
    icon_sq(d, 18 * S, 60 * S, 18 * S, C["blue"], r=6 * S)
    txt(d, 44 * S, 74 * S, "Mtask", 13, "Bold", C["ink"])
    nav = [("Dashboard", 1), ("Notifications", 0), ("Tasks", 0), ("Notes", 0),
           ("Email", 0), ("Calendar", 0), ("Contacts", 0)]
    for i, (t, on) in enumerate(nav):
        ny = (96 + i * 34) * S
        if on:
            rr(d, 10 * S, ny - 6 * S, sw - 20 * S, 26 * S, 8 * S, fill=C["tint"])
        icon_sq(d, 20 * S, ny, 12 * S, C["blue"] if on else C["faint"], r=4 * S)
        txt(d, 40 * S, ny + 11 * S, t, 10.5, "SemiBold" if on else "Medium",
            C["ink"] if on else C["dim"])
    txt(d, 18 * S, (96 + 7 * 34 + 24) * S, "Invite team", 10, "Medium", C["dim"])
    txt(d, 18 * S, (96 + 7 * 34 + 46) * S, "Integrations", 10, "Medium", C["dim"])

    x0 = sw + 20 * S
    cw = (W2 - x0 - 20 * S - 36 * S) // 4
    kpis = [("Total sales", "$23,569.00", "+5.5%", C["green"], C["blue"]),
            ("Avg sale value", "$15,843.00", "+6.2%", C["green"], C["violet"]),
            ("Total deals", "594", "+10.5%", C["green"], C["amber"]),
            ("Reply rate", "85.5%", "-4.9%", C["red"], C["green"])]
    for i, (lab, val, dl, dc, ic) in enumerate(kpis):
        kx = x0 + i * (cw + 12 * S)
        rr(d, kx, 62 * S, cw, 74 * S, 10 * S, outline=C["edge"], width=1)
        icon_sq(d, kx + 12 * S, 74 * S, 16 * S, ic, r=5 * S)
        txt(d, kx + 36 * S, 87 * S, lab, 8.5, "Medium", C["dim"])
        txt(d, kx + 12 * S, 116 * S, val, 13.5, "Bold", C["ink"])
        txt(d, kx + cw - 10 * S, 116 * S, dl, 9, "SemiBold", dc, anchor="rs")

    rr(d, x0, 152 * S, W2 - x0 - 20 * S, 250 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, x0 + 18 * S, 180 * S, "Revenue", 12, "SemiBold", C["ink"])
    txt(d, x0 + 18 * S, 210 * S, "$87,397.00", 19, "Bold", C["ink"])
    chip(d, x0 + 150 * S, 194 * S, "+9.6% from last month", C["green"],
         (226, 244, 235), sz=9)
    rr(d, W2 - 20 * S - 170 * S, 166 * S, 150 * S, 26 * S, 8 * S, fill=C["soft"])
    txt(d, W2 - 20 * S - 95 * S, 183 * S, "All products · Monthly", 9, "Medium",
        C["dim"], anchor="ms")
    P = line_chart(d, x0 + 18 * S, 230 * S, W2 - x0 - 60 * S, 130 * S,
                   [.25, .4, .32, .5, .44, .66, .58, .8, .72, .9], C["blue"],
                   area=(232, 240, 254), grid=C["soft"], dots=(6,),
                   axis=(("Jan", "Mar", "May", "Jul", "Sep", "Nov"), C["faint"]))
    tx_, ty_ = P[6]
    rr(d, tx_ - 62 * S, ty_ - 58 * S, 124 * S, 40 * S, 8 * S, fill=C["ink"])
    txt(d, tx_, ty_ - 42 * S, "May 1, 2025", 8, "Medium", (168, 172, 182), anchor="ms")
    txt(d, tx_, ty_ - 26 * S, "$19.2K total", 10, "Bold", (255, 255, 255), anchor="ms")

    by = 418 * S
    bw2 = (W2 - x0 - 20 * S - 14 * S) // 2
    rr(d, x0, by, bw2, 158 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, x0 + 16 * S, by + 24 * S, "Contacts", 11.5, "SemiBold", C["ink"])
    people = [("Rafi Alvarado", "assigned you to Manggo web design", C["blue"]),
              ("Nadira Aurelina", "commented on Logo options task", C["violet"]),
              ("Seyla Cahyaningtyas", "mentioned you in About us", C["amber"])]
    for i, (nm, act, col) in enumerate(people):
        py = by + (44 + i * 34) * S
        avatar(d, x0 + 26 * S, py + 8 * S, 10 * S, nm[0], col)
        txt(d, x0 + 44 * S, py + 6 * S, nm, 10, "SemiBold", C["ink"])
        txt(d, x0 + 44 * S, py + 20 * S, act, 8.5, "Regular", C["dim"])

    tx0 = x0 + bw2 + 14 * S
    rr(d, tx0, by, bw2, 158 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, tx0 + 16 * S, by + 24 * S, "My tasks", 11.5, "SemiBold", C["ink"])
    tasks = [("New social media post", "Marketing", C["blue"], 1),
             ("Upload new deck to workspace", "Internal", C["violet"], 1),
             ("Q3 pipeline review notes", "Sales", C["amber"], 0)]
    for i, (t, tag, col, done) in enumerate(tasks):
        py = by + (44 + i * 34) * S
        rr(d, tx0 + 16 * S, py, 14 * S, 14 * S, 4 * S,
           fill=col if done else None, outline=None if done else C["faint"],
           width=2)
        if done:
            d.line([(tx0 + 19 * S, py + 7 * S), (tx0 + 22 * S, py + 10 * S),
                    (tx0 + 27 * S, py + 3 * S)], fill=(255, 255, 255), width=2 * S)
        txt(d, tx0 + 40 * S, py + 12 * S, t, 10, "Medium", C["ink"])
        chip(d, tx0 + bw2 - 90 * S, py - 2 * S, tag, col, C["soft"], sz=8.5)
    return down(im, w, h)


# ================================================================ 3. BizLink
# Support and sales CRM - dark chrome around a cream board. Left rail with
# projects and members, stat strip, then a four-column deal board.

def s3_support(w=764, h=600):
    C = dict(dark=(28, 27, 24), dark2=(38, 37, 33), cream=(245, 241, 230),
             card=(252, 250, 244), ink=(32, 30, 24), dim=(128, 122, 108),
             faint=(168, 162, 148), edge=(228, 222, 206), amber=(226, 168, 60),
             green=(96, 152, 96), ivory=(236, 228, 203))
    im, d = new(w, h, C["dark"])
    W2, H2 = w * S, h * S

    sw = 168 * S
    icon_sq(d, 20 * S, 20 * S, 20 * S, C["amber"], r=7 * S)
    txt(d, 48 * S, 35 * S, "BizLink", 13, "Bold", C["ivory"])
    nav = [("Dashboard", 0), ("Tasks", 0), ("Activity", 0), ("Customers", 1),
           ("Settings", 0)]
    for i, (t, on) in enumerate(nav):
        ny = (64 + i * 32) * S
        if on:
            rr(d, 10 * S, ny - 7 * S, sw - 20 * S, 27 * S, 8 * S, fill=C["dark2"])
        icon_sq(d, 20 * S, ny, 11 * S, C["amber"] if on else (92, 88, 78), r=4 * S)
        txt(d, 40 * S, ny + 10 * S, t, 10.5, "SemiBold" if on else "Medium",
            C["ivory"] if on else C["faint"])
    txt(d, 20 * S, 250 * S, "PROJECTS", 8, "SemiBold", (110, 105, 92))
    for i, p in enumerate(("BizConnect", "Growth Hub", "Conversion Path")):
        py = (268 + i * 26) * S
        dot(d, 25 * S, py + 3 * S, 3.5 * S, C["amber"] if not i else (92, 88, 78))
        txt(d, 38 * S, py + 8 * S, p, 10, "Medium", C["faint"])
    txt(d, 20 * S, 360 * S, "MEMBERS", 8, "SemiBold", (110, 105, 92))
    for i, nm in enumerate(("Sandra Perry", "Antony Cardenas", "Jamal Connolly")):
        py = (378 + i * 28) * S
        avatar(d, 27 * S, py + 4 * S, 9 * S, nm[0], (92, 88, 78), C["ivory"])
        txt(d, 44 * S, py + 8 * S, nm, 9.5, "Medium", C["faint"])

    bx = sw + 12 * S
    rr(d, bx, 12 * S, W2 - bx - 12 * S, H2 - 24 * S, 14 * S, fill=C["cream"])
    txt(d, bx + 20 * S, 42 * S, "Customers", 14, "Bold", C["ink"])
    rr(d, W2 - 150 * S, 26 * S, 118 * S, 27 * S, 13 * S, fill=C["ink"])
    txt(d, W2 - 91 * S, 44 * S, "+ Add customer", 9.5, "SemiBold",
        C["cream"], anchor="ms")

    st_y = 66 * S
    rr(d, bx + 20 * S, st_y, 190 * S, 74 * S, 10 * S, fill=C["card"],
       outline=C["edge"], width=1)
    txt(d, bx + 34 * S, st_y + 22 * S, "New customers", 9, "Medium", C["dim"])
    txt(d, bx + 34 * S, st_y + 52 * S, "53", 19, "Bold", C["ink"])
    bar_chart(d, bx + 100 * S, st_y + 16 * S, 96 * S, 44 * S,
              [.3, .55, .4, .7, .5, .85], C["amber"], C["edge"], hot=5)
    rr(d, bx + 222 * S, st_y, 170 * S, 74 * S, 10 * S, fill=C["card"],
       outline=C["edge"], width=1)
    txt(d, bx + 236 * S, st_y + 22 * S, "Successful deals", 9, "Medium", C["dim"])
    donut(d, bx + 258 * S, st_y + 46 * S, 18 * S, .68, C["amber"], C["edge"], width=8)
    txt(d, bx + 290 * S, st_y + 52 * S, "68%", 14, "Bold", C["ink"])
    rr(d, bx + 404 * S, st_y, 158 * S, 74 * S, 10 * S, fill=C["card"],
       outline=C["edge"], width=1)
    txt(d, bx + 418 * S, st_y + 22 * S, "Prepayments", 9, "Medium", C["dim"])
    txt(d, bx + 418 * S, st_y + 52 * S, "$15,890", 16, "Bold", C["ink"])
    txt(d, bx + 418 * S, st_y + 66 * S, "from customers", 8, "Regular", C["faint"])

    cols = [("Contacted", [("ByteBridge", "Corporate data protection on a turnkey basis", 0),
                           ("FitLife Nutrition", "Nutritious food schedules for individuals", 0)]),
            ("Negotiation", [("SkillUp Hub", "Platform for professional development", 0),
                             ("Thera Well", "Psychological support and consultations", 0)]),
            ("Offer sent", [("Prime Estate", "Agency-developer of low-rise urban homes", 1),
                            ("LeadBoost", "Lead attraction and automation service", 0)]),
            ("Deal closed", [("CloudSphere", "Cloud services for storage and processing", 0),
                             ("Safebank", "Financial technologies and digital pay", 0)])]
    kx0 = bx + 20 * S
    kw = (W2 - bx - 44 * S - 3 * 12 * S) // 4
    for ci, (cname, cards) in enumerate(cols):
        cx = kx0 + ci * (kw + 12 * S)
        cy = 160 * S
        txt(d, cx + 2 * S, cy + 8 * S, cname, 10.5, "SemiBold", C["ink"])
        txt(d, cx + kw - 4 * S, cy + 8 * S, ("12", "8", "5", "9")[ci], 9,
            "Medium", C["faint"], anchor="rs")
        d.line([(cx, cy + 18 * S), (cx + kw, cy + 18 * S)], fill=C["edge"], width=2)
        yy = cy + 30 * S
        for name, desc, hot in cards:
            chh = 128 * S
            rr(d, cx, yy, kw, chh, 10 * S,
               fill=C["ink"] if hot else C["card"],
               outline=None if hot else C["edge"], width=1)
            fg = C["cream"] if hot else C["ink"]
            sub = (178, 172, 158) if hot else C["dim"]
            txt(d, cx + 12 * S, yy + 24 * S, name, 10.5, "Bold", fg)
            wrapped = []
            line = ""
            for wd in desc.split():
                cand = (line + " " + wd).strip()
                if F(8.5 * S, "Regular").getlength(cand) > kw - 24 * S and line:
                    wrapped.append(line); line = wd
                else:
                    line = cand
            wrapped.append(line)
            for k, ln in enumerate(wrapped[:3]):
                txt(d, cx + 12 * S, yy + (42 + k * 14) * S, ln, 8.5, "Regular", sub)
            rr(d, cx + 12 * S, yy + chh - 34 * S, 62 * S, 20 * S, 10 * S,
               fill=(58, 56, 50) if hot else C["cream"])
            due = ("14 Mar", "18 Mar", "21 Mar", "02 Apr", "09 Apr", "11 Apr",
                   "15 Apr", "22 Apr")[(ci * 2 + (0 if yy < 400 * S else 1)) % 8]
            txt(d, cx + 43 * S, yy + chh - 20 * S, due, 8, "Medium",
                (198, 192, 178) if hot else C["dim"], anchor="ms")
            dot(d, cx + kw - 20 * S, yy + chh - 24 * S, 3 * S,
                C["amber"] if hot else C["green"])
            yy += chh + 12 * S
    return down(im, w, h)


# ================================================================ 4. Compose
# Content pipeline - violet. Sidebar with an upsell card, KPI row, revenue
# forecast with target line, source split, contact table.

def s4_content(w=764, h=600):
    C = dict(bg=(255, 255, 255), ink=(24, 24, 32), dim=(136, 138, 150),
             faint=(192, 195, 206), edge=(236, 237, 242), soft=(248, 248, 251),
             vio=(139, 92, 246), tint=(240, 235, 254), green=(34, 170, 108),
             amber=(232, 150, 34), blue=(59, 130, 246))
    im, d = new(w, h, C["bg"])
    W2, H2 = w * S, h * S

    sw = 148 * S
    d.rectangle([0, 0, sw, H2], fill=(252, 252, 254))
    rr(d, 0, 0, sw + 16 * S, H2, 16 * S, outline=None)
    d.line([(sw, 0), (sw, H2)], fill=C["edge"], width=1)
    avatar(d, 26 * S, 28 * S, 12 * S, "B", C["vio"])
    txt(d, 46 * S, 26 * S, "Bessie Cooper", 10.5, "SemiBold", C["ink"])
    txt(d, 46 * S, 40 * S, "Personal account", 8, "Regular", C["dim"])
    rr(d, 14 * S, 56 * S, sw - 28 * S, 24 * S, 8 * S, fill=C["soft"])
    txt(d, 26 * S, 72 * S, "Search", 9.5, "Regular", C["faint"])
    nav = [("Dashboard", 1), ("Notifications", 0), ("Tasks", 0), ("Deals", 0),
           ("Analytics", 0), ("Companies", 0), ("Contacts", 0)]
    for i, (t, on) in enumerate(nav):
        ny = (98 + i * 30) * S
        if on:
            rr(d, 10 * S, ny - 6 * S, sw - 20 * S, 24 * S, 7 * S, fill=C["tint"])
        icon_sq(d, 20 * S, ny, 11 * S, C["vio"] if on else C["faint"], r=4 * S)
        txt(d, 38 * S, ny + 10 * S, t, 10, "SemiBold" if on else "Medium",
            C["ink"] if on else C["dim"])
    rr(d, 12 * S, H2 - 118 * S, sw - 24 * S, 96 * S, 10 * S, fill=C["vio"])
    txt(d, 26 * S, H2 - 92 * S, "Pro mode", 10.5, "Bold", (255, 255, 255))
    txt(d, 26 * S, H2 - 76 * S, "Unlock every", 8.5, "Regular", (226, 216, 252))
    txt(d, 26 * S, H2 - 64 * S, "content engine", 8.5, "Regular", (226, 216, 252))
    rr(d, 26 * S, H2 - 52 * S, 86 * S, 22 * S, 11 * S, fill=(255, 255, 255))
    txt(d, 69 * S, H2 - 37 * S, "Upgrade", 8.5, "SemiBold", C["vio"], anchor="ms")

    x0 = sw + 20 * S
    txt(d, x0, 34 * S, "Dashboard", 15, "Bold", C["ink"])
    rr(d, W2 - 190 * S, 16 * S, 170 * S, 26 * S, 8 * S, fill=C["soft"])
    txt(d, W2 - 105 * S, 33 * S, "01 Feb 2025 - 01 Mar 2025", 8.5, "Medium",
        C["dim"], anchor="ms")

    kpis = [("Total contacts", "162", "+5.1%", C["vio"]),
            ("Active company", "43", "+1.7%", C["blue"]),
            ("Ongoing tasks", "5", "+1.1%", C["amber"]),
            ("Email sent", "1,251", "+6.7%", C["green"])]
    cw = (W2 - x0 - 20 * S - 36 * S) // 4
    for i, (lab, val, dl, col) in enumerate(kpis):
        kx = x0 + i * (cw + 12 * S)
        rr(d, kx, 54 * S, cw, 64 * S, 10 * S, outline=C["edge"], width=1)
        icon_sq(d, kx + 12 * S, 66 * S, 14 * S, col, r=5 * S)
        txt(d, kx + 34 * S, 78 * S, lab, 8.5, "Medium", C["dim"])
        txt(d, kx + 12 * S, 106 * S, val, 14, "Bold", C["ink"])
        txt(d, kx + cw - 10 * S, 106 * S, dl, 8.5, "SemiBold", C["green"], anchor="rs")

    rw = int((W2 - x0 - 20 * S) * 0.62)
    rr(d, x0, 132 * S, rw, 210 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, x0 + 16 * S, 158 * S, "Revenue forecast", 11.5, "SemiBold", C["ink"])
    txt(d, x0 + 16 * S, 186 * S, "$23,569.00", 17, "Bold", C["ink"])
    chip(d, x0 + 140 * S, 170 * S, "+5.2% vs target", C["green"], (226, 244, 235), sz=8.5)
    pts = [.3, .42, .36, .55, .48, .7, .6, .82]
    line_chart(d, x0 + 16 * S, 200 * S, rw - 46 * S, 108 * S, pts, C["vio"],
               area=(240, 235, 254), grid=C["soft"], dots=(5,),
               axis=(("Jan", "Mar", "May", "Jul", "Sep"), C["faint"]))
    tgt = [.4, .46, .5, .56, .6, .66, .7, .76]
    P = [(x0 + 16 * S + int((rw - 46 * S) * i / 7), 200 * S + 108 * S - int(108 * S * p))
         for i, p in enumerate(tgt)]
    for a, b in zip(P, P[1:]):
        d.line([a, b], fill=C["faint"], width=2)

    sx = x0 + rw + 14 * S
    sw2 = W2 - sx - 20 * S
    rr(d, sx, 132 * S, sw2, 210 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, sx + 16 * S, 158 * S, "Source", 11.5, "SemiBold", C["ink"])
    txt(d, sx + 16 * S, 186 * S, "12,569", 16, "Bold", C["ink"])
    txt(d, sx + 100 * S, 186 * S, "+5.5%", 9, "SemiBold", C["green"])
    segs = [(.52, C["vio"]), (.3, C["blue"]), (.18, C["amber"])]
    bx = sx + 16 * S
    bw_total = sw2 - 32 * S
    for fr, col in segs:
        seg = int(bw_total * fr)
        rr(d, bx, 200 * S, seg - 4 * S, 14 * S, 6 * S, fill=col)
        bx += seg
    for i, (nm, val, col) in enumerate((("Website", "52%", C["vio"]),
                                        ("Email", "30%", C["blue"]),
                                        ("Social", "18%", C["amber"]))):
        ly = (232 + i * 26) * S
        dot(d, sx + 22 * S, ly, 4 * S, col)
        txt(d, sx + 34 * S, ly + 5 * S, nm, 9.5, "Medium", C["dim"])
        txt(d, sx + sw2 - 16 * S, ly + 5 * S, val, 9.5, "SemiBold", C["ink"],
            anchor="rs")

    ty0 = 358 * S
    txt(d, x0, ty0 + 8 * S, "Contacts", 11.5, "SemiBold", C["ink"])
    rr(d, W2 - 110 * S, ty0 - 8 * S, 90 * S, 24 * S, 8 * S, fill=C["soft"])
    txt(d, W2 - 65 * S, ty0 + 8 * S, "Filter", 9, "Medium", C["dim"], anchor="ms")
    heads = [("Name", 0), ("Email", 170), ("Phone", 360), ("Status", 500)]
    for htxt, hx in heads:
        txt(d, x0 + hx * S, ty0 + 34 * S, htxt, 8.5, "SemiBold", C["faint"])
    people = [("Jean Cooper", "hello@jeanc.com", "(405) 555-0128", "Customer", C["green"]),
              ("Wade Warren", "wade@stackline.io", "(480) 555-0103", "Warm lead", C["amber"]),
              ("Esther Howard", "esther@relayer.co", "(603) 555-0123", "New", C["vio"])]
    for i, (nm, em, ph, st, col) in enumerate(people):
        ry = ty0 + (56 + i * 30) * S
        if i % 2 == 0:
            rr(d, x0 - 8 * S, ry - 16 * S, W2 - x0 - 8 * S, 27 * S, 6 * S,
               fill=(251, 251, 253))
        avatar(d, x0 + 9 * S, ry - 3 * S, 9 * S, nm[0], col)
        txt(d, x0 + 26 * S, ry, nm, 9.5, "SemiBold", C["ink"])
        txt(d, x0 + 170 * S, ry, em, 9, "Regular", C["dim"])
        txt(d, x0 + 360 * S, ry, ph, 9, "Regular", C["dim"])
        chip(d, x0 + 500 * S, ry - 15 * S, st, col, C["soft"], sz=8.5)
    return down(im, w, h)


# ================================================================ 5. Taskora
# Software company - emerald kanban. Board tabs, three task columns with
# tag chips, due dates, avatars and counts.

def s5_software(w=764, h=600):
    C = dict(bg=(255, 255, 255), ink=(22, 27, 26), dim=(132, 140, 138),
             faint=(190, 198, 196), edge=(234, 238, 237), soft=(246, 249, 248),
             em=(16, 150, 110), tint=(226, 244, 238), amber=(232, 150, 34),
             red=(226, 88, 88), blue=(59, 130, 246))
    im, d = new(w, h, C["bg"])
    W2, H2 = w * S, h * S

    sw = 148 * S
    d.rectangle([0, 0, sw, H2], fill=(251, 253, 252))
    d.line([(sw, 0), (sw, H2)], fill=C["edge"], width=1)
    icon_sq(d, 18 * S, 20 * S, 18 * S, C["em"], r=6 * S)
    txt(d, 44 * S, 34 * S, "Taskora", 13, "Bold", C["ink"])
    nav = [("Dashboard", 0), ("Tasks", 1), ("Roadmap", 0), ("Releases", 0),
           ("Analytics", 0), ("Customers", 0), ("Settings", 0)]
    for i, (t, on) in enumerate(nav):
        ny = (66 + i * 30) * S
        if on:
            rr(d, 10 * S, ny - 6 * S, sw - 20 * S, 24 * S, 7 * S, fill=C["tint"])
        icon_sq(d, 18 * S, ny, 11 * S, C["em"] if on else C["faint"], r=4 * S)
        txt(d, 36 * S, ny + 10 * S, t, 10, "SemiBold" if on else "Medium",
            C["ink"] if on else C["dim"])
    rr(d, 12 * S, H2 - 96 * S, sw - 24 * S, 74 * S, 10 * S, fill=C["soft"])
    txt(d, 24 * S, H2 - 72 * S, "v2.4 shipping", 9.5, "SemiBold", C["ink"])
    progress(d, 24 * S, H2 - 58 * S, sw - 48 * S, .72, C["em"], C["edge"])
    txt(d, 24 * S, H2 - 38 * S, "72% of scope done", 8, "Regular", C["dim"])

    x0 = sw + 20 * S
    txt(d, x0, 34 * S, "Tasks", 15, "Bold", C["ink"])
    tabs = ["Kanban", "List", "Table"]
    tx = x0 + 90 * S
    for i, t in enumerate(tabs):
        f = F(10 * S, "SemiBold" if not i else "Medium")
        tw = f.getlength(t)
        if not i:
            rr(d, tx - 10 * S, 18 * S, tw + 20 * S, 24 * S, 8 * S, fill=C["tint"])
        d.text((tx, 35 * S), t, font=f, fill=C["ink"] if not i else C["dim"],
               anchor="ls")
        tx += tw + 30 * S
    rr(d, W2 - 130 * S, 16 * S, 108 * S, 27 * S, 13 * S, fill=C["em"])
    txt(d, W2 - 76 * S, 34 * S, "+ Add task", 9.5, "SemiBold", (255, 255, 255),
        anchor="ms")

    cols = [("To do", "4", [
                ("Q3 evaluation", "Team and product review", "Internal", C["blue"], 0),
                ("Monthly report", "Team and individual reports", "Urgent", C["red"], 0),
                ("Factory visit", "Jakarta factory audit", "Field", C["amber"], 0)]),
            ("Doing", "2", [
                ("Prep of Q2 report", "Making monthly reports", "Internal", C["blue"], 1),
                ("March exhibition", "Product exhibition prep", "Event", C["amber"], 0)]),
            ("Done", "3", [
                ("Digital marketing", "Campaign for March", "Marketing", C["em"], 0),
                ("Event 3.3", "Prep for event 3.3", "Event", C["amber"], 0),
                ("New product dev", "Launch Q2 preparation", "Product", C["blue"], 0)])]
    kx0 = x0
    kw = (W2 - x0 - 20 * S - 24 * S) // 3
    for ci, (cname, count, cards) in enumerate(cols):
        cx = kx0 + ci * (kw + 12 * S)
        cy = 66 * S
        dot(d, cx + 5 * S, cy + 5 * S, 4 * S,
            (C["dim"], C["amber"], C["em"])[ci])
        txt(d, cx + 16 * S, cy + 10 * S, cname, 11, "SemiBold", C["ink"])
        txt(d, cx + 16 * S + F(11 * S, "SemiBold").getlength(cname) + 8 * S,
            cy + 10 * S, count, 9.5, "Medium", C["faint"])
        txt(d, cx + kw - 6 * S, cy + 10 * S, "+", 12, "Medium", C["faint"], anchor="rs")
        yy = cy + 28 * S
        for title, desc, tag, col, hot in cards:
            chh = 118 * S
            rr(d, cx, yy, kw, chh, 10 * S, fill=C["soft"] if hot else C["bg"],
               outline=C["em"] if hot else C["edge"], width=2 if hot else 1)
            chip(d, cx + 12 * S, yy + 12 * S, tag, col, C["soft"] if not hot
                 else (255, 255, 255), sz=8)
            txt(d, cx + 12 * S, yy + 52 * S, title, 10.5, "Bold", C["ink"])
            txt(d, cx + 12 * S, yy + 68 * S, desc, 8.5, "Regular", C["dim"])
            txt(d, cx + 12 * S, yy + 96 * S,
                ("Due 11 Jan", "Due 14 Jan", "Due 18 Jan")[(yy // (130 * S)) % 3],
                8, "Medium", C["faint"])
            avatar(d, cx + kw - 40 * S, yy + 92 * S, 8 * S, "A", C["em"])
            avatar(d, cx + kw - 24 * S, yy + 92 * S, 8 * S, "M", C["amber"])
            yy += chh + 12 * S
    return down(im, w, h)


# ================================================================== 6. Ledge
# Operations and finance overview - navy and orange. Big number, growth bars,
# donut, tax timeline, transactions.

def s6_ops(w=764, h=600):
    C = dict(bg=(255, 255, 255), ink=(22, 26, 40), dim=(128, 134, 152),
             faint=(184, 190, 206), edge=(234, 236, 243), soft=(246, 247, 251),
             navy=(38, 52, 96), orange=(238, 122, 58), tint=(240, 236, 250),
             green=(34, 170, 108), red=(226, 88, 88), vio=(120, 108, 240))
    im, d = new(w, h, C["bg"])
    W2, H2 = w * S, h * S

    icon_sq(d, 24 * S, 18 * S, 20 * S, C["navy"], r=7 * S)
    txt(d, 52 * S, 33 * S, "ledge", 14, "Bold", C["ink"])
    txt(d, 120 * S, 33 * S, "Dashboard overview", 10.5, "Medium", C["dim"])
    rr(d, W2 - 208 * S, 14 * S, 108 * S, 26 * S, 13 * S, fill=C["soft"])
    txt(d, W2 - 154 * S, 31 * S, "Monthly", 9.5, "Medium", C["dim"], anchor="ms")
    rr(d, W2 - 90 * S, 14 * S, 66 * S, 26 * S, 13 * S, fill=C["orange"])
    txt(d, W2 - 57 * S, 31 * S, "Export", 9.5, "SemiBold", (255, 255, 255),
        anchor="ms")
    d.line([(0, 54 * S), (W2, 54 * S)], fill=C["edge"], width=1)

    lw = 300 * S
    rr(d, 24 * S, 70 * S, lw, 190 * S, 12 * S, fill=C["navy"])
    txt(d, 44 * S, 100 * S, "Operating balance", 10, "Medium", (170, 180, 208))
    txt(d, 44 * S, 134 * S, "$130,709", 24, "Bold", (255, 255, 255))
    chip(d, 44 * S, 148 * S, "+8.4% this month", (255, 255, 255), (56, 72, 122), sz=8.5)
    bar_chart(d, 44 * S, 186 * S, lw - 60 * S, 56 * S,
              [.35, .5, .42, .62, .5, .74, .6, .85, .68, .92, .78, 1.0],
              C["orange"], (66, 82, 132), hot=11)

    rr(d, 24 * S, 274 * S, lw, 132 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, 40 * S, 300 * S, "Load by product", 11, "SemiBold", C["ink"])
    donut(d, 84 * S, 356 * S, 30 * S, .65, C["orange"], C["edge"], width=11)
    txt(d, 84 * S, 361 * S, "65%", 10, "Bold", C["ink"], anchor="ms")
    legend = [("Inbox agents", "65%", C["orange"]), ("Content", "22%", C["navy"]),
              ("Ledger", "13%", C["vio"])]
    for i, (nm, v, col) in enumerate(legend):
        ly = (322 + i * 24) * S
        dot(d, 150 * S, ly, 4 * S, col)
        txt(d, 162 * S, ly + 5 * S, nm, 9.5, "Medium", C["dim"])
        txt(d, 24 * S + lw - 16 * S, ly + 5 * S, v, 9.5, "SemiBold", C["ink"],
            anchor="rs")

    rx = 348 * S
    rw = W2 - rx - 24 * S
    rr(d, rx, 70 * S, rw, 150 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, rx + 16 * S, 96 * S, "Important dates", 11, "SemiBold", C["ink"])
    txt(d, rx + rw - 16 * S, 96 * S, "14hr 20min saved", 9, "SemiBold",
        C["green"], anchor="rs")
    dates = [("Payroll run", "Aug 15", 1), ("VAT filing", "Aug 20", 0),
             ("Retainer invoices", "Sep 01", 0)]
    for i, (nm, dt, done) in enumerate(dates):
        ly = (114 + i * 32) * S
        d.ellipse([rx + 16 * S, ly, rx + 16 * S + 14 * S, ly + 14 * S],
                  fill=C["green"] if done else None,
                  outline=None if done else C["faint"], width=2)
        if done:
            d.line([(rx + 19 * S, ly + 7 * S), (rx + 22 * S, ly + 10 * S),
                    (rx + 27 * S, ly + 3 * S)], fill=(255, 255, 255), width=2 * S)
        txt(d, rx + 40 * S, ly + 11 * S, nm, 10, "Medium", C["ink"])
        txt(d, rx + rw - 16 * S, ly + 11 * S, dt, 9.5, "Medium", C["dim"],
            anchor="rs")
        if i < 2:
            d.line([(rx + 16 * S, ly + 24 * S), (rx + rw - 16 * S, ly + 24 * S)],
                   fill=C["soft"], width=2)

    rr(d, rx, 234 * S, rw, 172 * S, 12 * S, outline=C["edge"], width=1)
    txt(d, rx + 16 * S, 260 * S, "Transactions", 11, "SemiBold", C["ink"])
    txt(d, rx + rw - 16 * S, 260 * S, "View all", 9, "Medium", C["orange"],
        anchor="rs")
    tx_rows = [("Stripe payout", "Revenue", "+$4,820.00", C["green"]),
               ("Claude API", "Tooling", "-$212.40", C["ink"]),
               ("Apify", "Tooling", "-$49.00", C["ink"]),
               ("Retainer - Northlake", "Revenue", "+$1,500.00", C["green"])]
    for i, (nm, cat, amt, col) in enumerate(tx_rows):
        ly = (278 + i * 30) * S
        icon_sq(d, rx + 16 * S, ly, 16 * S, C["soft"], r=6 * S)
        txt(d, rx + 42 * S, ly + 13 * S, nm, 9.5, "SemiBold", C["ink"])
        txt(d, rx + 200 * S, ly + 13 * S, cat, 9, "Regular", C["dim"])
        txt(d, rx + rw - 16 * S, ly + 13 * S, amt, 9.5, "Bold", col, anchor="rs")

    by = 422 * S
    rr(d, 24 * S, by, W2 - 48 * S, H2 - by - 22 * S, 12 * S,
       outline=C["edge"], width=1)
    txt(d, 40 * S, by + 26 * S, "Automation health", 11, "SemiBold", C["ink"])
    txt(d, W2 - 40 * S, by + 26 * S, "96 automations · 2 flagged", 9, "Medium",
        C["dim"], anchor="rs")
    checks_ = [("Reply router", 1, "healthy"), ("Publish queue", 1, "healthy"),
               ("Invoice chase", 0, "slow - retrying"), ("Budget sync", 1, "healthy")]
    cw2 = (W2 - 48 * S - 32 * S - 36 * S) // 4
    for i, (nm, ok, st) in enumerate(checks_):
        cx = 40 * S + i * (cw2 + 12 * S)
        cy = by + 42 * S
        rr(d, cx, cy, cw2, 62 * S, 10 * S, fill=C["soft"])
        dot(d, cx + 16 * S, cy + 20 * S, 5 * S, C["green"] if ok else C["orange"])
        txt(d, cx + 30 * S, cy + 25 * S, nm, 9.5, "SemiBold", C["ink"])
        txt(d, cx + 16 * S, cy + 48 * S, st, 8.5, "Regular", C["dim"])
    return down(im, w, h)


SURFACES = [s1_agency, s2_marketing, s3_support, s4_content, s5_software, s6_ops]
PADS = [(232, 231, 246), (236, 239, 244), (33, 32, 29),
        (238, 233, 250), (228, 241, 236), (235, 238, 246)]

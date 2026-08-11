#!/usr/bin/env python3
"""The Agent Offers deck - 1080x1920 carousel frames on paper.

Twelfth family. Six agents you can sell, each with what to charge, then the
close.

WE CALL THESE CAROUSELS. THEY RENDER AT 1080x1920 ON THE REEL SAFE BOX, because
they get assembled into reels - 0.5 to 0.8 seconds a frame. A reel is never
cropped; the UI is drawn ON TOP, and the RIGHT RAIL covers x > 950, so the block
sits at 130..950 - equal margins, centred on the frame at 540.

THE COPY IS THE REFERENCE'S - it is decent and it is transcribed. THE PICTURES
ARE NOT. The reference hangs a glossy gradient render off every frame - an orb,
a glowing tick, a lava-lamp phone - none of which shows the agent doing
anything. Per the standing direction each frame gets its mechanism DRAWN: the
SDR as a spine that ends in a booked meeting, the content agent as today's
posting queue, the research agent as the alerts it caught, the pipeline manager
as flagged deals plus the follow-up it drafted, the nurture agent as the thread
that finally gets the reply, the morning brief as the 7am Telegram message.

THE CHARGE LINE IS A PINNED FOOTER. The reference repeats `Charge: $5,000 setup
+ retainer` as the last text line of every frame; identical copy in an identical
place is a fixture, so here it is drawn as one - a hairline and a row at the
same y on all six frames, price set bold and right.

NO CTA ON BODY FRAMES. The close asks for the comment.
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
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT

BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))

TITLE_SZ, TITLE_TRACK = 62, -0.028
SUB_SZ, SUB_LEAD = 36, 1.42
GAP, PARA = 64, 40
FOOT_H = 96

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def head(d, title):
    y = SAFE_TOP + int(TITLE_SZ * .727)
    draw_tracked(d, (LEFT, y), title, F(TITLE_SZ, "Bold"), T["ink"],
                 TITLE_TRACK * TITLE_SZ)
    ry = y + int(TITLE_SZ * .24) + 24
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    return ry + GAP


def foot(d):
    ry = SAFE_BOT - FOOT_H
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)
    by = SAFE_BOT - 26
    d.text((LEFT, by), "Charge", font=F(34, "Regular"), fill=T["ink"], anchor="ls")
    d.text((RIGHT, by), "$5,000 setup + retainer", font=F(38, "Bold"),
           fill=T["ink"], anchor="rs")
    return ry


def paras(d, y, parts):
    for i, p in enumerate(parts):
        for ln in SB.rich_lines(p, SUB_SZ, MEASURE):
            SB.draw_line(d, LEFT, y, ln, SUB_SZ, T["ink"], T["ink"])
            y += round(SUB_SZ * SUB_LEAD)
        if i + 1 < len(parts):
            y += PARA
    return y


def build(s):
    im = ground()
    d = ImageDraw.Draw(im)
    y = head(d, s["title"])
    y = paras(d, y, s["copy"])
    bot = foot(d) - GAP
    band = bot - (y + GAP)
    top = y + GAP

    kind = s["kind"]
    if kind == "seq":
        yy = BL.seq(im, d, LEFT, top, MEASURE, band, T, s["stops"], logos=LOGOS)
    elif kind == "panel":
        # The panel and its drafted bubble are ONE stack - centring the panel
        # alone ran the bubble across the footer rule.
        ph = s["panel_h"]
        stack = ph
        if s.get("bubble"):
            stack += (GAP - 16) + BL.chat(d, LEFT, 0, MEASURE, T, s["bubble"],
                                          measure_only=True)
        yy = top + max(0, (band - stack) // 2)
        yy = BL.list_panel(im, d, LEFT, yy, MEASURE, ph, T, *s["panel"],
                           logos=LOGOS, rz=s.get("panel_rz", 33))
        if s.get("bubble"):
            yy = BL.chat(d, LEFT, yy + GAP - 16, MEASURE, T, s["bubble"])
    elif kind == "alerts":
        ah = len(s["alerts"]) * 116 + (len(s["alerts"]) - 1) * 26
        yy = top + max(0, (band - ah) // 2)
        yy = BL.alerts(im, d, LEFT, yy, MEASURE, T, s["alerts"], logos=LOGOS)
    elif kind == "chat":
        ch = BL.chat(d, LEFT, 0, MEASURE, T, s["chat"], measure_only=True)
        yy = top + max(0, (band - ch) // 2)
        yy = BL.chat(d, LEFT, yy, MEASURE, T, s["chat"])
    else:
        yy = top + max(0, (band - s["brief_h"]) // 2)
        yy = BL.brief_card(im, d, LEFT, yy, MEASURE, T, *s["brief"], logos=LOGOS)
    return im, dict(bottom=yy)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


# ---------------------------------------------------------------------- copy
# Transcribed from the reference. The pictures are not.

SLIDES = [
    dict(title="AI SDR Agent", kind="seq",
         copy=["Finds leads, researches them, and sends personalized "
               "cold emails autonomously.",
               "**Your client wakes up to booked meetings.** No SDR salary. "
               "No hiring. No management."],
         stops=[("apollo", "Finds leads", "", False),
                ("gmail", "Sends the email", "", False),
                ("calendly", "Meeting booked", "", True)]),

    dict(title="Content Agent", kind="panel",
         copy=["**Scrapes viral content** in their niche, learns their "
               "voice, and posts daily across every platform.",
               "Their brand grows while they sleep."],
         panel_h=420,
         panel=("Posting today", "every platform", [
             ("tiktok", "Desk setup teardown", "posted", "green"),
             ("instagram", "One idea, ten posts", "posted", "green"),
             ("youtube", "The boring agent", "12:00", None),
             ("linkedin", "What nobody posts", "queued", "amber")])),

    dict(title="Research Agent", kind="alerts",
         copy=["Monitors competitors daily. Tracks pricing changes, "
               "new features, hiring signals.",
               "**Your client always knows what is coming before it "
               "hits them.**"],
         alerts=[(("g", "doc"), "Acme cut Pro pricing to $59", "pricing", "amber"),
                 (("g", "grid"), "Northstar shipped a public API", "feature", "green"),
                 (("g", "lens"), "Rival is hiring 3 SDRs", "hiring", None)]),

    dict(title="Pipeline Manager", kind="panel",
         copy=["Monitors every open deal. Flags anything going stale.",
               "**Drafts follow-ups before deals go cold.** A full-time "
               "account manager for the cost of a software subscription."],
         panel_h=330,
         panel=("Open deals", "checked hourly", [
             (None, "Northlake  $4,500", "warm", "green"),
             (None, "Ardent  $8,000", "stale", "amber"),
             (None, "Boro  $12,000", "stale", "amber")]),
         bubble=[("me", "Still want the March start? Price holds till Friday.")]),

    dict(title="Lead Nurture Agent", kind="chat",
         copy=["Follows up with every cold lead automatically. No reply "
               "goes ignored. No deal goes cold.",
               "**Most businesses lose 60%** of deals to bad follow-up. "
               "This fixes it."],
         chat=[("me", "Following up - still worth a chat?"),
               ("me", "Bumping this with new numbers."),
               ("them", "Good timing. Tuesday?")]),

    dict(title="Morning Brief Agent", kind="brief",
         copy=["**Every morning at 7am** your client gets: new leads found "
               "overnight, content going out today, deals that need "
               "attention, competitor alerts.",
               "**They run their entire business** from one Telegram message."],
         brief_h=420,
         brief=("Morning brief", "7:00", [
             ("3", "new leads found overnight"),
             ("2", "posts going out today"),
             ("1", "deal needs attention"),
             ("1", "competitor changed pricing")])),
]

# THE CTA IS ALWAYS COMMENT.
CLOSER = [("comment", "Medium", 0.42),
          ("“AGENT”", "ExtraBold", 1.00),
          ("for all six", "Medium", 0.40),
          ("BUILDS", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/offers"
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
        print(f"  {i:02d}  {name:22} ends {m['bottom']:4d}"
              f"{'   PAST THE SAFE LINE' if m['bottom'] > SAFE_BOT else ''}")
    TWd = 250
    th = int(TWd * H / W)
    sheet = Image.new("RGB", (len(made) * (TWd + 10), th), (228, 227, 223))
    for i, p in enumerate(made):
        sheet.paste(Image.open(p).resize((TWd, th), Image.LANCZOS), (i * (TWd + 10), 0))
    sheet.save(f"{out}/_sheet.png")
    print(f"\n-> {out}/  and {out}/_sheet.png")

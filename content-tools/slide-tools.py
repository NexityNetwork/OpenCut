#!/usr/bin/env python3
"""The Tool Stack deck - 1080x1920 carousel frames on paper.

Twenty-fourth family. Six tools, one frame each: the mark large, the main
value at display size, three uses, and the cost pinned at the foot.

TWO SWAPS PER INSTRUCTION: Make becomes n8n, Loveable becomes ultron. The
reference's `free thanks to HubSpot for Startups` affiliate line is replaced
with each tool's real starting cost.
"""
import glob, importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw


def _load(n):
    s = importlib.util.spec_from_file_location(
        n.replace("-", "_"), os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{n}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


SB, BL = _load("slide-body"), _load("blocks")
F, adv, draw_tracked = SB.F, SB.adv, SB.draw_tracked

W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 250, 1440
LEFT, RIGHT = 130, 950
MEASURE = RIGHT - LEFT
BG = (243, 242, 238)
T = dict(ink=(18, 18, 20), dim=(18, 18, 20), meta=(128, 130, 138),
         rule=(212, 210, 203), accent=(52, 116, 240))
LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
FOOT_H = 118


def ground():
    a = np.full((H, W, 3), BG, np.float32)
    a += np.random.default_rng(3).normal(0, 1.1, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def build(i, s):
    im = ground(); d = ImageDraw.Draw(im)
    tile = 132
    BL.logo_tile(im, d, RIGHT - tile, SAFE_TOP - 6, tile, s["key"], T, LOGOS)

    y = SAFE_TOP + 46
    d.text((LEFT, y), f"{i:02d}", font=F(38, "Bold"), fill=T["accent"], anchor="ls")
    d.text((LEFT, y + 74), s["name"], font=F(66, "Bold"), fill=T["ink"], anchor="ls")
    d.text((LEFT, y + 122), s["what"], font=F(30, "Regular"), fill=T["meta"], anchor="ls")
    ry = y + 168
    d.line([(LEFT, ry), (RIGHT, ry)], fill=T["rule"], width=1)

    # THE BLOCK IS SOLVED AGAINST THE FOOTER, not centred and hoped for.
    # The first version left the type's 72px ascent out of the sum, so a
    # three-line value pushed the artifact straight through the Cost rule.
    # The value size drops until value + uses + artifact genuinely fit.
    fy = SAFE_BOT - FOOT_H
    avail = fy - ry - 96
    ch = len(s["uses"]) * 86
    for vsz in range(76, 43, -2):
        lines = BL.wrap(s["value"], F(vsz, "Bold"), MEASURE)
        vh = len(lines) * round(vsz * 1.26)
        ah = avail - vh - 56 - ch - 60
        if 250 <= ah <= 320:
            break
    ah = max(250, min(ah, 320))
    top_y = ry + max(48, (fy - ry - (vh + 56 + ch + 60 + ah)) // 2)
    vy = top_y + int(vsz * .84)
    for ln in lines:
        d.text((LEFT, vy), ln, font=F(vsz, "Bold"), fill=T["ink"], anchor="ls")
        vy += round(vsz * 1.26)
    cy = top_y + vh + 56
    BL.checks(d, LEFT, cy, MEASURE, ch, T, s["uses"], cap=46, lead=1.28,
              col=T["ink"])
    ay = cy + ch + 60
    assert ay + ah <= fy - 8, f"artifact crosses the footer on {s['name']}"
    if s.get("notify"):
        BL.notify(im, d, LEFT, ay + (ah - 240) // 2, MEASURE, T, *s["notify"],
                  h=240, logos=LOGOS)
    else:
        BL.list_panel(im, d, LEFT, ay, MEASURE, ah, T, *s["panel"],
                      logos=LOGOS, rz=30)
    d.line([(LEFT, fy), (RIGHT, fy)], fill=T["rule"], width=1)
    d.text((LEFT, fy + 74), "Cost", font=F(32, "Regular"), fill=T["ink"], anchor="ls")
    d.text((RIGHT, fy + 74), s["cost"], font=F(32, "Bold"), fill=T["ink"], anchor="rs")
    return im, dict(bottom=SAFE_BOT)


def build_closer(c):
    im = ground()
    y = SB.draw_closer(ImageDraw.Draw(im), c, MEASURE, SAFE_TOP, SAFE_BOT,
                       T["ink"], T["ink"])
    return im, dict(bottom=y)


SLIDES = [
    dict(name="n8n", key="n8n", what="workflow automation engine",
         value="Your business runs without you.",
         uses=["Lead handoffs", "Client onboarding", "Internal notifications"],
         cost="Free self-hosted · $24/mo cloud",
         panel=("Ran today", "24 workflows", [
             (None, "Lead handoff to CRM", "done", "green"),
             (None, "Onboarding sequence", "done", "green"),
             (None, "Invoice reminder", "queued", "amber")])),

    dict(name="Claude", key="claude", what="writing and thinking assistant",
         value="Turns hours of thinking into minutes of output.",
         uses=["Draft proposals and follow-ups", "Summarize calls and notes",
               "Create SOPs and internal docs"],
         cost="Free tier · $20/mo Pro",
         panel=("Drafted this morning", "in your voice", [
             (None, "Proposal - Northlake", "sent", "green"),
             (None, "Call notes to summary", "done", "green"),
             (None, "Onboarding SOP v2", "review", "amber")])),

    dict(name="Notion", key="notion", what="all-in-one workspace",
         value="One source of truth for you and the whole team.",
         uses=["Client delivery checklists", "Playbooks and processes",
               "Team documentation"],
         cost="Free for one person · $10/mo",
         panel=("Client workspace", "3 active", [
             (None, "Delivery checklist", "8 of 9", "green"),
             (None, "Outreach playbook", "current", "green"),
             (None, "Handover doc", "drafting", "amber")])),

    dict(name="Apify", key="apify", what="scraping and data platform",
         value="Every list you need, without buying data.",
         uses=["Scrape prospect lists", "Enrich company records",
               "Monitor competitors"],
         cost="Free credits · pay per run",
         panel=("Last run", "412 rows", [
             (None, "Northlake Kitchens", "verified", "green"),
             (None, "Ardent Fitness", "verified", "green"),
             (None, "Closed - no site", "dropped", "strike")])),

    dict(name="Stripe", key="stripe", what="payments and billing",
         value="Money lands the moment demand shows up.",
         uses=["Setup fees and retainers", "Subscriptions and upgrades",
               "Invoices that chase themselves"],
         cost="No monthly fee · per transaction",
         notify=("Stripe", "setup fee, first client", "$2,500.00")),

    dict(name="ultron", key="ultron", what="AI workforce and app builder",
         value="Build working software without engineers.",
         uses=["Simple tools and MVPs", "Internal utilities", "Test ideas fast"],
         cost="Free to start",
         panel=("Shipped this week", "no engineers", [
             (None, "Client intake form", "live", "green"),
             (None, "Quote calculator", "live", "green"),
             (None, "Reporting portal", "building", "amber")])),
]

CLOSER = [("comment", "Medium", 0.42), ("“STACK”", "ExtraBold", 1.00),
          ("for the full", "Medium", 0.40), ("SETUP", "ExtraBold", 0.62),
          ("100% FREE", "ExtraBold", 0.46)]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "brand/tools"
    os.makedirs(out, exist_ok=True)
    for p in glob.glob(f"{out}/*.png"): os.remove(p)
    for i, s in enumerate(SLIDES + [CLOSER], 1):
        im, m = build_closer(s) if isinstance(s, list) else build(i, s)
        im.convert("RGB").save(f"{out}/{i:02d}.png")
        nm = s["name"] if isinstance(s, dict) else "closer"
        print(f"  {i:02d}  {nm:14} ends {m['bottom']:4d}"
              f"{'  PAST' if m['bottom'] > SAFE_BOT else ''}")

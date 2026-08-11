#!/usr/bin/env python3
"""The One Person Company deck - 1080x1920 carousel frames on paper.

Third family off a monolith reference. Nine tools, each one a job on a team of
one, with ultron as the operator, then the close. The composition is appdeck.py
on its ROLED layout; this file is the roster.

THE FRAME IS A PAYROLL, NOT A LIST. `My second brain`, `My cashier`, `My chief
of staff` - his own line under every name, and it is the whole reason the deck
works. Nobody scrolls past a stack of tools; everybody stops on a company that
has one employee. So the role goes under the name where a subtitle goes, at one
size for the set, and the `Best for` footer comes off - in this deck the role IS
the `best for` and printing both is the same thought twice.

THIS IS THE STRONGEST FRAME WE HAVE FOR ULTRON. It is not a list of good tools
where ours has to justify being on it; it is a list of JOBS, and ultron is
holding one - the operator. Its own words for itself are `an agentic operator
for founders`, so the role line is not a stretch, it is the product's own
description of what it is.

IT TAKES HIS OWN SLOT AGAIN. His third frame is his own product and his fourth
is the comment ask for it. Ours is the same move at the end of the roster.

THE COPY IS FIRST PERSON because his is. This is somebody listing the tools that
run their company, and `I check the dashboard, the money is there` is the line
that sells Stripe. Written in third person it becomes a review.

TWO OF HIS FRAMES ARE NOT IN HERE. Instagram plus Manychat is three tilted
screens floating with no card under them, and the deck's whole discipline is one
capture footprint on every frame - his own frames are 714px wide up to 822 and
they already fight each other. Stanley is his product and ultron takes that
slot.

STRIPE IS HIS CAPTURE AND NOT OURS. We hold a real 3000x2100 grab of
stripe.com, which is the better source right up until you look at it: it caught
the page with a panel open over it, the copy behind greyed out and a close
button in the corner. A screenshot of a product mid-interaction reads as broken,
so his clean crop of the same page wins.
"""
import importlib.util
import os
import sys

from PIL import Image


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


AD = _load("appdeck")

LOGOS = os.environ.get("TOOL_LOGOS", "../apps/web/public/tools")
SHOTS = os.environ.get("ULTRON_SHOTS", "ultron-shots")
GROUND = (23, 20, 18)          # ultron's own ground, sampled off the product
Z = 256

# key -> (logo file, capture file). Only ours; everything else is his crop.
OURS = {"ultron": ("ultron.png", "win-pipeline.png")}


class Assets(AD.Dir):
    """His eight off disk, ours minted. The orb ships bare on transparency, so
    it gets plated on ultron's own ground at the size his tiles sit at -
    anything else and the last tile reads as a sticker on the row."""

    def icon(self, key):
        if key not in OURS:
            return super().icon(key)
        mark = Image.open(f"{LOGOS}/{OURS[key][0]}").convert("RGBA")
        s = int(Z * .76)
        tile = Image.new("RGBA", (Z, Z), GROUND + (255,))
        tile.alpha_composite(mark.resize((s, s), Image.LANCZOS),
                             ((Z - s) // 2, (Z - s) // 2))
        tile.putalpha(AD.mask(Z, Z, int(Z * .226)))
        return tile

    def shot(self, key):
        if key not in OURS:
            return super().shot(key)
        return Image.open(f"{SHOTS}/{OURS[key][1]}").convert("RGB")


# ---------------------------------------------------------------------- copy
# His roles verbatim where he gave one, his descriptions cut to two lines with
# the payload in SemiBold. Higgsfield's `One of my favs!` is not a job, so it
# gets the one it is doing.

SLIDES = [
    dict(key="notion", name="Notion", role="My second brain",
         desc="Every client and transcript lives here, | "
              "**so I never re-explain myself.**"),

    dict(key="gptimage", name="GPT Image", role="My designer",
         desc="I describe a thumbnail and it makes it. | "
              "**No stock, no waiting on anyone.**"),

    dict(key="claude", name="Claude", role="My chief of staff",
         desc="The thinking happens here, then | "
              "**Claude Code builds the tools.**"),

    dict(key="figma", name="Figma", role="My studio",
         desc="My whole design system lives here, | "
              "**so a new post is swapping copy.**"),

    dict(key="wisprflow", name="Wisprflow", role="My transcriber",
         desc="I stopped typing. I talk it out | "
              "**and it writes the whole thing for me.**"),

    dict(key="stripe", name="Stripe", role="My cashier",
         desc="Every template and upsell runs | "
              "**through it. The money is just there.**"),

    dict(key="higgsfield", name="Higgsfield", role="My motion studio",
         desc="I feed it a still and it turns it into motion. | "
              "**Reels that used to need a crew.**"),

    dict(key="notebooklm", name="Notebook LM", role="My researcher",
         desc="I dump transcripts and a backlog into it | "
              "**and it hands the brief back to me.**"),

    dict(key="ultron", name="ultron", role="My operator",
         desc="It runs the research, the outreach, the | "
              "**pipeline. I just say what I want.**"),
]

# THE CTA IS ALWAYS COMMENT. A different keyword from the other decks, because
# two live posts asking for the same word collect into the same pile.
CLOSER = [("comment", "Medium", 0.40),
          ("“STACK”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("ALL NINE", "ExtraBold", 0.62)]


if __name__ == "__main__":
    AD.render(sys.argv[1] if len(sys.argv) > 1 else "brand/stack",
              SLIDES, CLOSER, Assets(os.environ.get("ATOOLS", "atools")),
              shot_r=40, lay=AD.ROLED)

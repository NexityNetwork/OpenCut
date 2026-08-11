#!/usr/bin/env python3
"""The Unheard-Of Apps deck - 1080x1920 carousel frames on paper.

Second family off a monolith reference. Six apps nobody has heard of, ultron as
the seventh, then the close. The composition is appdeck.py; this file is the
list.

THIS IS THE LIST ULTRON BELONGS IN. The standing direction is to put ourselves
into these reference lists, and every other list makes that a stretch - drop an
unknown product beside seven famous ones and it reads as the ad it is. Here
being unknown is the entry requirement. Ultron goes in described exactly like
the other six, in the same voice, at the same size, and nothing on the frame
says it is ours. That is the whole trick and it only works in this deck.

IT TAKES HIS OWN SLOT. His seventh app is his own, and his last frame asks for a
comment to get the link to it - six strangers, then the thing he is selling.
Ours is the same shape with our name in it, which is why ultron is seventh and
not sprinkled into the middle.

THE OTHER SIX ARE HIS, COPY AND CAPTURE. The descriptions are transcribed and
compressed, not invented - we do not know anything about these products that he
did not say. The captures come out of his frames via extract-appref.py.

ULTRON'S FRAME IS A REAL CAPTURE, not a drawing. Control Center, because it is
the one screen that shows the thing actually running - four jobs in flight with
their own progress, a queue that needs you, and 52 automations armed underneath.

THE CORNER RADIUS IS 58, NOT 26. This reference rounds its cards at 60px against
the Google reference's 16, and a mask tighter than the card leaves white
quarter-circles in all four corners.
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


class Assets(AD.Dir):
    """His six off disk, ours minted. The orb ships as a bare mark on
    transparency, so it gets plated on ultron's own ground at the size the other
    six marks sit at - anything else and the seventh tile reads as a sticker
    somebody dropped on the row."""

    def icon(self, key):
        if key != "ultron":
            return super().icon(key)
        orb = Image.open(f"{LOGOS}/ultron.png").convert("RGBA")
        s = int(Z * .76)
        tile = Image.new("RGBA", (Z, Z), GROUND + (255,))
        tile.alpha_composite(orb.resize((s, s), Image.LANCZOS),
                             ((Z - s) // 2, (Z - s) // 2))
        tile.putalpha(AD.mask(Z, Z, int(Z * .226)))
        return tile

    def shot(self, key):
        if key != "ultron":
            return super().shot(key)
        return Image.open(f"{SHOTS}/win-control-center.png").convert("RGB")


# ---------------------------------------------------------------------- copy
# Six transcribed and cut to two lines, the payload in SemiBold. Ours is written
# the same way and says no more about itself than his say about theirs.

SLIDES = [
    dict(key="draftboard", name="Draftboard",
         desc="It finds who can introduce you, | "
              "**then writes the intro for you.**",
         best="Warm intros, not cold DMs"),

    dict(key="nume", name="Nume",
         desc="Connect your bank and it watches | "
              "**your money like an accountant.**",
         best="Catching problems early"),

    dict(key="doomshield", name="DoomShield",
         desc="It locks your apps until you do | "
              "**push ups. Counted by your camera.**",
         best="Actually breaking the scroll"),

    dict(key="traxy", name="traxy.ai",
         desc="It sees who engages with your rivals, | "
              "**then hands you their names.**",
         best="Leads already paying attention"),

    dict(key="trove", name="Trove",
         desc="A tiny daily game that figures you out | "
              "**from the choices you make.**",
         best="Knowing yourself without a quiz"),

    dict(key="amistly", name="Amistly",
         desc="Answer a few questions and it builds | "
              "**the plan, then runs it for you.**",
         best="Marketing that ships itself"),

    dict(key="ultron", name="ultron",
         desc="One chat that runs the whole company. | "
              "**You type a line, it goes and does it.**",
         best="Running it all from one chat"),
]

# THE CTA IS ALWAYS COMMENT. His last frame asks for one to get his app; this
# asks for one to get ours, which is the same frame with the name swapped.
CLOSER = [("comment", "Medium", 0.40),
          ("“ULTRON”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("THE LINK", "ExtraBold", 0.62)]


if __name__ == "__main__":
    AD.render(sys.argv[1] if len(sys.argv) > 1 else "brand/apps",
              SLIDES, CLOSER, Assets(os.environ.get("BTOOLS", "btools")),
              shot_r=58)

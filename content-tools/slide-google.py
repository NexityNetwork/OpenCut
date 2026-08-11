#!/usr/bin/env python3
"""The Google AI Tools deck - 1080x1920 carousel frames on paper.

First family off a monolith reference instead of Figma. Seven tools Google
shipped, then the close. The composition is appdeck.py; this file is the list.

THE LIST STAYS GOOGLE'S. Every other deck off these references swaps a tool for
ours. This one does not - it is a list of what Google shipped, and putting our
name in it would be the one lie the reader can check.

THE CAPTURES ARE HIS, CROPPED BY extract-appref.py. Seven real product pages at
seven different widths, scaled to one measure and cut off at the same line. A
screenshot that ends where the next one ends is the only way seven captures read
as one deck.

THE DESCRIPTIONS ARE COMPRESSED. His run three and four lines; at 0.6 seconds a
frame nobody finishes four lines, so each is cut to two with the payload set in
SemiBold - the phrase that would make you stop scrolling, and nothing else.
"""
import importlib.util
import os
import sys


def _load(name):
    s = importlib.util.spec_from_file_location(
        name.replace("-", "_"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


AD = _load("appdeck")

# ---------------------------------------------------------------------- copy
# His descriptions, cut to two lines each with the payload in SemiBold. The
# `Best for` line is not his - it is the answer to the only question a reel
# viewer actually has, which is whether this one is for them.

SLIDES = [
    dict(key="notebooklm", name="Notebook LM",
         desc="Feed it your docs and transcripts. | "
              "It answers **only from your sources.**",
         best="Research you can trust"),

    dict(key="aistudio", name="AI Studio",
         desc="Every Gemini model in one free place. | "
              "**Test anything before you build.**",
         best="Trying everything free"),

    dict(key="flow", name="Flow",
         desc="Type a scene, get clips **with sound.** | "
              "Then extend the shot until it works.",
         best="Filmmaking with no crew"),

    dict(key="stitch", name="Stitch",
         desc="Describe a screen. It designs the UI | "
              "**and writes the frontend code.**",
         best="Ideas into real mockups"),

    dict(key="opal", name="Opal",
         desc="Chain prompts into a mini app, | "
              "**share the link,** anyone can run it.",
         best="Tools you can hand over"),

    dict(key="lyria", name="Lyria",
         desc="Describe a mood. It composes | "
              "**original tracks** you can actually use.",
         best="Soundtracks you own"),

    dict(key="pomelli", name="Pomelli",
         desc="It scans your site and learns the brand, | "
              "then makes **on-brand assets.**",
         best="Staying on brand at volume"),
]

# THE CTA IS ALWAYS COMMENT. His outro sells a newsletter; ours asks for the
# comment, which is the only thing the account is here to collect.
CLOSER = [("comment", "Medium", 0.40),
          ("“GOOGLE”", "ExtraBold", 1.00),
          ("and I will send you", "Medium", 0.38),
          ("ALL SEVEN LINKS", "ExtraBold", 0.52)]


if __name__ == "__main__":
    AD.render(sys.argv[1] if len(sys.argv) > 1 else "brand/google",
              SLIDES, CLOSER, AD.Dir(os.environ.get("GTOOLS", "gtools")))

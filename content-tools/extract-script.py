#!/usr/bin/env python3
"""Read a reference's overlay script off the pixels.

Reading these off contact sheets by eye does not scale and it produced a batch of
reels that all shared one hook, because that was the only hook that had been read
properly. Every reference has its own, and the hook is the part doing the work.

What comes out, per video: each overlay state with its lines, in order, with the
colour of every line preserved - these use red, green and blue for emphasis and
which word is coloured IS the copy decision.

Three things that matter for getting clean text out:

  The canvas has to be masked. An n8n screenshot is hundreds of tiny labels, and
  OCR will happily read all of them. The green-bordered box is located and cut out
  before anything else happens.

  The text is white on a moving photograph, so a plain threshold picks up every
  highlight in the room. These overlays all carry a dark shadow, which means real
  text is bright AND sits on something dark - testing for both kills most of the
  background.

  State boundaries come from the TEXT area only. Using the whole frame makes every
  camera move look like a state change.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image

import imageio_ffmpeg
import pytesseract

FF = imageio_ffmpeg.get_ffmpeg_exe()

# emphasis colours, sampled off the references
PALETTE = {
    "red":   (250, 0, 70),
    "green": (52, 199, 89),
    "blue":  (60, 160, 255),
    "white": (250, 250, 250),
}


def duration(path):
    err = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    h, m, s = err.split("Duration: ")[1].split(",")[0].split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def frame(path, t, w=1080):
    png = subprocess.run([FF, "-v", "error", "-ss", f"{t:.3f}", "-i", path,
                          "-frames:v", "1", "-vf", f"scale={w}:-2",
                          "-f", "image2pipe", "-vcodec", "png", "-"],
                         capture_output=True).stdout
    return Image.open(__import__("io").BytesIO(png)).convert("RGB") if png else None


def green_box(im):
    a = np.asarray(im, dtype=int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gdom = (G > R + 10) & (G > B + 10) & (G > 40)
    h, w = gdom.shape
    rows = [y for y in range(h) if gdom[y].mean() > 0.45]
    cols = [x for x in range(w) if gdom[:, x].mean() > 0.15]
    if len(rows) < 2 or len(cols) < 2:
        return None
    box = (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)
    return box if box[2] - box[0] > 0.40 * w and box[3] - box[1] > 0.08 * h else None


def text_mask(im, exclude=None):
    """Bright AND sitting on something dark. The overlays all carry a shadow, so
    real copy has a dark halo; a lamp or a monitor highlight does not."""
    g = np.asarray(im.convert("L"), dtype=np.int16)
    bright = g > 205
    k = 9
    pad = np.pad(g, k, mode="edge")
    local_min = np.min(np.stack([pad[i:i + g.shape[0], j:j + g.shape[1]]
                                 for i in (0, k, 2 * k) for j in (0, k, 2 * k)]), axis=0)
    mask = bright & (local_min < 110)
    if exclude:
        x0, y0, x1, y1 = exclude
        mask[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6] = False
    return mask


def ocr(im, mask):
    """Black text on white, upscaled. Tesseract is much happier with that than
    with white-on-photograph."""
    binary = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8))
    k = 3                                   # 3x beats 2x noticeably on this type
    big = binary.resize((binary.width * k, binary.height * k), Image.LANCZOS)
    data = pytesseract.image_to_data(big, config="--psm 6",
                                     output_type=pytesseract.Output.DICT)
    words = []
    for i, txt in enumerate(data["text"]):
        t = txt.strip()
        # The drawn tick reads as V, Vv, 7 or Y depending on the frame. It is a
        # bullet, not a word, and leaving it in corrupts the line it starts.
        if t in ("V", "Vv", "v", "7", "Y", "¥", "|", "/", "\\", "W"):
            continue
        if not t or int(data["conf"][i]) < 40:
            continue
        words.append(dict(text=t, x=data["left"][i] // k, y=data["top"][i] // k,
                          w=data["width"][i] // k, h=data["height"][i] // k))
    return words


def colour_of(im, word):
    """Which palette colour this word is drawn in. Sampled from the brightest
    pixels inside its box, because the box also contains background."""
    a = np.asarray(im.crop((word["x"], word["y"], word["x"] + word["w"],
                            word["y"] + word["h"])), dtype=float).reshape(-1, 3)
    if not len(a):
        return "white"
    lum = a.sum(axis=1)
    ink = a[lum >= np.percentile(lum, 88)]
    med = ink.mean(axis=0)
    return min(PALETTE, key=lambda k: float(np.abs(np.array(PALETTE[k]) - med).sum()))


def lines_of(im, words, gap=18):
    """Group words into lines by baseline, then mark each line's colour runs."""
    words = sorted(words, key=lambda w: (w["y"], w["x"]))
    lines, cur = [], []
    for w in words:
        if cur and abs(w["y"] - cur[-1]["y"]) > gap:
            lines.append(cur)
            cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    out = []
    for ln in lines:
        ln = sorted(ln, key=lambda w: w["x"])
        parts, run, run_c = [], [], None
        for w in ln:
            c = colour_of(im, w)
            if run and c != run_c:
                parts.append((run_c, " ".join(run)))
                run = []
            run_c = c
            run.append(w["text"])
        if run:
            parts.append((run_c, " ".join(run)))
        text = " ".join(p[1] for p in parts)
        out.append(dict(y=min(w["y"] for w in ln), text=text,
                        parts=[{"colour": c, "text": t} for c, t in parts]))
    return out


def state_times(path, dur, fps=5):
    """Overlay state changes, measured on the TEXT ONLY.

    Diffing whole frames reads every camera move as a state change - these clips
    are handheld and never stop moving. Masking to text first leaves only the
    thing that actually changes when the script advances."""
    times = [i / fps for i in range(int(dur * fps))]
    prev, changes = None, [0.0]
    for t in times:
        im = frame(path, t, w=360)
        if im is None:
            continue
        m = text_mask(im, green_box(im))
        if prev is not None:
            d = np.logical_xor(m, prev).mean()
            # Claims arrive one line at a time, so a state change can be a small
            # fraction of the text area. 0.012 only caught whole-screen swaps and
            # collapsed a five state video into two.
            if d > 0.0035 and t - changes[-1] > 0.6:
                changes.append(round(t, 2))
        prev = m
    return changes


def extract_script(path):
    dur = duration(path)
    name = os.path.basename(path).rsplit(".", 1)[0]
    times = state_times(path, dur)
    bounds = times + [dur]
    states = []
    for i, t0 in enumerate(times):
        mid = min(t0 + (bounds[i + 1] - t0) * 0.6, dur - 0.1)
        im = frame(path, mid)
        if im is None:
            continue
        box = green_box(im)
        words = ocr(im, text_mask(im, box))
        ls = lines_of(im, words)
        states.append(dict(at=round(t0, 2), dur=round(bounds[i + 1] - t0, 2),
                           canvas=bool(box), lines=ls))
    return dict(file=name, duration=round(dur, 2), states=states)


def report(s):
    print(f"\n{s['file']}  {s['duration']}s  {len(s['states'])} states")
    for st in s["states"]:
        print(f"  {st['at']:5.2f}s +{st['dur']:4.2f}s{'  [canvas]' if st['canvas'] else ''}")
        for ln in st["lines"]:
            marked = "".join(p["text"] if p["colour"] == "white"
                             else f"<{p['colour']}>{p['text']}</{p['colour']}>"
                             for p in ln["parts"]).strip()
            print(f"        {marked}")


if __name__ == "__main__":
    out = []
    for p in sys.argv[1:]:
        if p.startswith("--"):
            continue
        s = extract_script(p)
        report(s)
        out.append(s)
    if "--json" in sys.argv:
        json.dump(out, open("refs/scripts.json", "w"), indent=1)
        print("\n-> refs/scripts.json")

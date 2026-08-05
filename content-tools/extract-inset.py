#!/usr/bin/env python3
"""Pull the workflow screenshot and the overlay text out of a reference.

These references are all the same build: one continuous desk B-roll, a green
bordered screenshot of an n8n canvas filling the middle, and big white text above
and below it. The screenshot is the substance - it is what the whole frame is a
caption for - so it comes out at native resolution, from the sharpest frame
available rather than an arbitrary one.

Two things make this less trivial than a fixed crop:

  The box moves. Every reference frames its canvas slightly differently, so the
  green border is FOUND rather than assumed. A border is a long straight run of
  green-dominant pixels; the emoji ticks elsewhere in the frame are green too but
  they are blobs, so the test is on run length across the width, not on colour.

  Frames differ in sharpness. The source is a phone filming a monitor, so most
  frames carry motion blur. Variance of a Laplacian over the box picks the one
  that is actually in focus, which on a 707x428 native crop is the difference
  between readable node labels and mush.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
LAP = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=float)


def frames(path, times, scale=None):
    out = []
    for t in times:
        vf = f"scale={scale}" if scale else "null"
        png = subprocess.run([FF, "-v", "error", "-ss", f"{t:.3f}", "-i", path,
                              "-frames:v", "1", "-vf", vf, "-f", "image2pipe",
                              "-vcodec", "png", "-"], capture_output=True).stdout
        if png:
            out.append((t, Image.open(__import__("io").BytesIO(png)).convert("RGB")))
    return out


def longest_run(frac, thresh):
    """Longest contiguous stretch of indices whose value clears thresh."""
    best = cur = None
    out = (0, 0)
    for i, v in enumerate(list(frac) + [-1.0]):
        if v > thresh:
            cur = i if cur is None else cur
        elif cur is not None:
            if i - cur > out[1] - out[0]:
                out = (cur, i)
            cur = None
    return out


def find_box(ims, still=3.0, dense=0.85):
    """Find the inset by STILLNESS, not by colour.

    Colour was the obvious signal and it is the wrong one: half these references
    frame the canvas with a green border and half do not, so a colour test found
    four of twelve. What every one of them shares is that the screenshot is a
    still image pasted onto handheld footage. Its pixels do not move. The B-roll's
    do, constantly.

    Text is static too, but text is sparse - the footage keeps moving between the
    letters - so a text band is maybe a third still per row while the canvas is
    effectively all of it. Hence the density threshold rather than a plain mask."""
    g = np.stack([np.asarray(im.convert("L"), dtype=np.float32) for im in ims])
    static = g.std(axis=0) < still
    h, w = static.shape
    y0, y1 = longest_run(static.mean(axis=1), dense)
    if y1 - y0 < 0.12 * h:
        return None
    x0, x1 = longest_run(static[y0:y1].mean(axis=0), dense)
    if x1 - x0 < 0.40 * w:
        return None
    return (x0, y0, x1, y1)


def green_box(im, row_frac=0.45, col_frac=0.15):
    """The bright green rule most of these draw around the canvas. Thin, so the
    thresholds are looser than they look; the emoji ticks are green too but they
    are blobs, and a blob never spans 45 percent of a row."""
    a = np.asarray(im, dtype=int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gdom = (G > R + 10) & (G > B + 10) & (G > 40)
    h, w = gdom.shape
    rows = [y for y in range(h) if gdom[y].mean() > row_frac]
    cols = [x for x in range(w) if gdom[:, x].mean() > col_frac]
    if len(rows) < 2 or len(cols) < 2:
        return None
    box = (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)
    if box[2] - box[0] < 0.40 * w or box[3] - box[1] < 0.08 * h:
        return None
    return box


def sharpness(im, box):
    g = np.asarray(im.convert("L").crop(box), dtype=float)
    if g.size < 100:
        return 0.0
    # a plain 2D convolution, no scipy needed
    lap = (g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4 * g[1:-1, 1:-1])
    return float(lap.var())


def duration(path):
    err = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    h, m, s = err.split("Duration: ")[1].split(",")[0].split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def extract(path, outdir, windows=5, per=8, span=0.9):
    """Several short windows across the back half. Stillness has to be measured
    WITHIN one overlay state - across a state change the text moves too, and the
    canvas can be swapped, so a window that straddles a boundary finds nothing."""
    os.makedirs(outdir, exist_ok=True)
    name = os.path.basename(path).rsplit(".", 1)[0]
    dur = duration(path)

    best = None
    for k in range(windows):
        t0 = dur * (0.30 + 0.62 * k / max(1, windows - 1))
        got = frames(path, [t0 + span * i / (per - 1) for i in range(per)])
        if len(got) < per // 2:
            continue
        ims = [im for _, im in got]
        box = find_box(ims)
        if not box:
            continue
        w, h = ims[0].size
        # Stillness alone returns the WHOLE FRAME whenever the B-roll happens to
        # be a static shot, which several of these are. The green border is the
        # precise signal where it exists, so prefer it and keep stillness as the
        # fallback for the borderless ones.
        for _, im in got:
            g = green_box(im)
            if g and (g[2] - g[0]) * (g[3] - g[1]) < 0.92 * w * h:
                box = g
                break
        else:
            if (box[2] - box[0]) * (box[3] - box[1]) > 0.92 * w * h:
                print(f"  {name}: inset fills the frame - static B-roll, "
                      f"no border to separate it. skipped")
                return None
        inner = (box[0] + 3, box[1] + 3, box[2] - 3, box[3] - 3)
        if inner[2] - inner[0] < 20 or inner[3] - inner[1] < 20:
            continue
        # pick the sharpest frame in the window - the source is a phone filming a
        # monitor, so most frames carry motion blur even where the overlay is still
        for t, im in got:
            sc = sharpness(im, inner)
            if best is None or sc > best[0]:
                best = (sc, t, im, inner)

    if not best:
        print(f"  {name}: no still inset found")
        return None
    sc, t, im, box = best
    crop = im.crop(box)
    out = f"{outdir}/{name}_workflow.png"
    crop.save(out)
    print(f"  {name}: {crop.width}x{crop.height} at t={t:.2f}s  sharpness {sc:.0f}  -> {out}")
    return out


if __name__ == "__main__":
    outdir = "refs/workflows"
    for p in sys.argv[1:]:
        extract(p, outdir)

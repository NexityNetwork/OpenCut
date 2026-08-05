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


def signature(im, box, n=64):
    """Contrast-normalised thumbnail, for telling two canvases apart.

    A raw pixel difference does not work here: every canvas is a near-black n8n
    screen, so two completely different workflows differ by single digits of mean
    brightness and a plain threshold calls them the same image. Normalising by the
    crop's own spread compares STRUCTURE instead of level, which is the thing that
    actually differs."""
    g = np.asarray(im.crop(box).resize((n, n), Image.LANCZOS).convert("L"), dtype=np.float32)
    return (g - g.mean()) / (g.std() + 1e-6)


def extract_all(path, outdir, fps=2.5, distinct=0.42):
    """Every distinct canvas in the video, not just one.

    A single reference is often a listicle - one of these holds six different
    workflows behind one hook - so pulling one frame threw away five sixths of it.
    Decode the whole clip at a low frame rate in one pass, find every bordered
    canvas, group them by signature, then go back and re-extract the sharpest
    frame of each group at full resolution."""
    os.makedirs(outdir, exist_ok=True)
    name = os.path.basename(path).rsplit(".", 1)[0]
    dur = duration(path)
    w, h = 720, 1280

    raw = subprocess.run([FF, "-v", "error", "-i", path, "-r", str(fps),
                          "-vf", f"scale={w}:{h}", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    n = len(raw) // (w * h * 3)
    if not n:
        return []
    arr = np.frombuffer(raw[:n * w * h * 3], dtype=np.uint8).reshape(n, h, w, 3)

    groups = []                       # [{sig, best:(sharp, t, box)}]
    for i in range(n):
        im = Image.fromarray(arr[i])
        box = green_box(im)
        if not box:
            continue
        inner = (box[0] + 3, box[1] + 3, box[2] - 3, box[3] - 3)
        if inner[2] - inner[0] < 60 or inner[3] - inner[1] < 40:
            continue
        sig = signature(im, inner)
        t = i / fps
        sc = sharpness(im, inner)
        for g in groups:
            if np.abs(g["sig"] - sig).mean() < distinct:
                if sc > g["best"][0]:
                    g["best"] = (sc, t, inner)
                break
        else:
            groups.append({"sig": sig, "best": (sc, t, inner)})

    out = []
    for k, g in enumerate(groups):
        _, t, box = g["best"]
        # the low-rate pass is only for FINDING them; the pixels come from a
        # full-resolution seek, and from the sharpest moment rather than any moment
        got = frames(path, [max(0, t - 0.2 + 0.1 * j) for j in range(5)])
        best = max(((sharpness(im, box), im) for _, im in got), key=lambda x: x[0],
                   default=(0, None))
        if best[1] is None:
            continue
        crop = best[1].crop(box)
        p = f"{outdir}/{name}_{k + 1}.png"
        crop.save(p)
        out.append(p)
        print(f"    {crop.width}x{crop.height} at {t:5.1f}s  -> {os.path.basename(p)}")
    print(f"  {name}: {len(out)} distinct canvas(es) in {dur:.1f}s")
    return out


if __name__ == "__main__":
    outdir = "refs/workflows"
    single = "--one" in sys.argv
    for p in [a for a in sys.argv[1:] if not a.startswith("--")]:
        (extract if single else extract_all)(p, outdir)

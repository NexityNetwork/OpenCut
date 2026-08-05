#!/usr/bin/env python3
"""Break a reference video down into the things we can actually reuse.

This is a rebuild. The original toolkit only ever existed in a scratch directory
and went with the container, so everything worth knowing is written down here
rather than living in a session that gets compacted away.

What it reports, and why each one is here:

  DROP        Where the track actually lands, which is not the first beat. On one
              reference librosa's beat_track returned 1.78s when the drop was at
              4.13s, because it locked onto the first beat of a quiet intro. The
              detector here is energy based and tests the 10th PERCENTILE FLOOR
              over a window, not the mean. Before a drop the signal dips to near
              silence between hits; after it, it never dips. A mean-based test
              gets fooled by one loud isolated kick in the intro and fires at
              0.00s, which is exactly what happened once (real answer: 4.57s).

  GRID        Period and phase fitted against the onset envelope, searched over
              0.90 to 1.85s and a phase window starting just before the drop.
              Score is the mean of the normalised onset envelope sampled at the
              grid points. Below about 0.45 the reference has no usable pulse and
              should not be used as a cut template.

  SHOTS       Cut boundaries from frame differencing, then each cut measured
              against the fitted grid. This is the part that says whether a
              reference is really cutting on the beat or just feels like it.

  HOOK        Start to first cut. The segment to reuse as footage - and the one
              piece of content that must be replaced rather than kept, because
              keeping it means shipping their hook.

Anchoring rule for anything built from this: sync on the DROP, not on the fitted
phase. Phase can sit up to 0.3s after the drop and anchoring on it cost 185ms of
drift once. Trim the audio intro with astart = max(0, drop - hook_duration).

Usage:
    python3 refbreak.py REF.mp4 [--json out.json] [--sheet out.png]
"""
import json
import subprocess
import sys

import numpy as np

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 22050
HOP = 512
WIN = 1024


def probe(path):
    err = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    out = {"path": path, "audio": "Audio:" in err}
    if "Duration: " in err:
        h, m, s = err.split("Duration: ")[1].split(",")[0].split(":")
        out["duration"] = int(h) * 3600 + int(m) * 60 + float(s)
    for tok in err.split("Video: ")[1].split("\n")[0].split(", ") if "Video: " in err else []:
        if "x" in tok and tok.split(" ")[0].replace("x", "").isdigit():
            out["size"] = tok.split(" ")[0]
        if tok.endswith("fps"):
            out["fps"] = float(tok[:-4])
    return out


# ---------------------------------------------------------------- audio ------
def pcm(path):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def spectra(x):
    """One STFT, reused for everything below. Returns (times, magnitudes)."""
    n = 1 + max(0, (len(x) - WIN) // HOP)
    idx = np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]
    frames = x[idx] * np.hanning(WIN)[None, :]
    mag = np.abs(np.fft.rfft(frames, axis=1))
    return np.arange(n) * HOP / SR, mag


def onset_envelope(mag):
    """Spectral flux: positive change in magnitude, summed across bins."""
    flux = np.diff(mag, axis=0, prepend=mag[:1])
    env = np.clip(flux, 0, None).sum(axis=1)
    env = np.convolve(env, np.ones(3) / 3, mode="same")      # a touch of smoothing
    return env / (env.max() + 1e-9)


def find_drop(t, mag, x):
    """The moment the floor comes up and stays up.

    Deliberately NOT a peak finder and NOT a mean. The signature of a drop is
    that the QUIET parts stop being quiet. So: take the 10th percentile of the
    energy over a window ahead of each candidate, compare it to the 10th
    percentile behind, and take the largest step up."""
    rms = np.sqrt((mag ** 2).mean(axis=1))
    rms /= rms.max() + 1e-9
    hop_s = HOP / SR
    back, fwd = int(1.5 / hop_s), int(1.5 / hop_s)
    if len(rms) < back + fwd + 4:
        return 0.0, 0.0

    def floor(a, b):
        seg = rms[max(0, a):b]
        return np.percentile(seg, 10) if len(seg) else 0.0

    step = np.zeros(len(rms))
    for i in range(back, len(rms) - fwd):
        after = floor(i, i + fwd)
        # a step only counts if the loud side is actually loud, otherwise a rise
        # from silence to quiet scores the same as a rise from quiet to a drop
        step[i] = (after - floor(i - back, i)) if after > 0.18 else 0.0
    i = int(step.argmax())
    return float(t[i]), float(step[i])


def fit_grid(env, t, drop, lo=0.90, hi=1.85):
    """Search period and phase against the onset envelope.

    Phase starts slightly BEFORE the drop and runs a little after it, because the
    first grid point is usually the drop itself but detectors land a few frames
    early or late."""
    dur = t[-1] if len(t) else 0.0
    best = {"score": 0.0, "period": 0.0, "phase": 0.0}
    for period in np.arange(lo, hi + 1e-9, 0.005):
        for phase in np.arange(drop - 0.06, drop + 0.30, 0.005):
            pts = np.arange(phase, dur, period)
            if len(pts) < 3:
                continue
            score = float(np.interp(pts, t, env).mean())
            if score > best["score"]:
                best = {"score": score, "period": float(period), "phase": float(phase)}
    # The raw mean alone is fooled by a FLAT envelope. Ambient room noise has no
    # peaks, so every grid lands on roughly the average and scores 0.89 - higher
    # than real music, where the mean is low and only the hits are high. Contrast
    # against the overall mean is what separates a pulse from a hiss.
    base = float(env.mean()) + 1e-9
    best["contrast"] = round(best["score"] / base, 2)
    return best


# ---------------------------------------------------------------- video ------
def shots(path, dur, w=160, min_gap=0.25):
    """Cut list from frame differencing on a downscaled greyscale decode.

    A phone filming a screen is noisy, so the threshold is median + k*MAD rather
    than a fixed number - it adapts to how jittery the source is."""
    h = 2 * round(w * 16 / 9 / 2)
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-vf",
                          f"scale={w}:{h},format=gray", "-r", "15",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(raw) // (w * h)
    if n < 3:
        return [], np.array([])
    fr = np.frombuffer(raw[:n * w * h], dtype=np.uint8).reshape(n, h, w).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    med = np.median(d)
    mad = np.median(np.abs(d - med)) + 1e-6
    thr = med + 6 * mad
    fps = n / dur if dur else 15.0

    # A threshold alone reads handheld camera motion as cuts - a phone clip with
    # no edits in it came back with seven. A real cut is a SPIKE: a local maximum
    # that towers over the second or two around it. Both tests, not either.
    half = max(2, int(fps))
    cuts, last = [], -99.0
    for i, v in enumerate(d):
        tsec = (i + 1) / fps
        if v <= thr or tsec - last < min_gap:
            continue
        lo, hi = max(0, i - half), min(len(d), i + half + 1)
        if v < d[lo:hi].max():                       # not the local peak
            continue
        neighbourhood = np.median(np.delete(d[lo:hi], i - lo))
        if v < 2.5 * (neighbourhood + 1e-6):         # not prominent enough
            continue
        cuts.append(round(tsec, 3))
        last = tsec
    return cuts, d


def sheet(path, bounds, out, w=200):
    """First frame of every shot, side by side. The fastest way to see whether a
    reference is one idea repeated or four different ones."""
    from PIL import Image
    import io
    ims = []
    for tsec in bounds:
        png = subprocess.run([FF, "-v", "error", "-ss", str(max(0, tsec + 0.05)), "-i", path,
                              "-frames:v", "1", "-vf", f"scale={w}:-2",
                              "-f", "image2pipe", "-vcodec", "png", "-"],
                             capture_output=True).stdout
        if png:
            ims.append(Image.open(io.BytesIO(png)).convert("RGB"))
    if not ims:
        return None
    hh = max(i.height for i in ims)
    s = Image.new("RGB", (len(ims) * (w + 6), hh), (14, 14, 13))
    for i, im in enumerate(ims):
        s.paste(im, (i * (w + 6), 0))
    s.save(out)
    return out


def breakdown(path):
    info = probe(path)
    dur = info.get("duration", 0.0)
    r = {"file": path, **info}

    if info.get("audio"):
        x = pcm(path)
        t, mag = spectra(x)
        env = onset_envelope(mag)
        drop, strength = find_drop(t, mag, x)
        grid = fit_grid(env, t, drop)
        r["drop"] = round(drop, 3)
        r["drop_strength"] = round(strength, 3)
        r["grid"] = {k: round(v, 3) for k, v in grid.items()}
        # the search range is bar-length, so this is the CUT interval. Reporting
        # it as bpm invites reading 1.59s as a 38bpm track rather than a 151bpm
        # one cut every four beats.
        r["cut_every"] = round(grid["period"], 3)
        r["implied_bpm"] = [round(60 / grid["period"] * m, 1) for m in (1, 2, 4)] \
            if grid["period"] else None
        # both tests: enough energy on the grid, and enough difference between
        # the grid and everything else
        r["usable_as_template"] = grid["score"] >= 0.45 and grid["contrast"] >= 1.25
    else:
        r["drop"] = None
        r["grid"] = None

    cuts, _ = shots(path, dur)
    r["cuts"] = cuts
    r["hook_duration"] = round(cuts[0], 3) if cuts else round(dur, 3)
    bounds = [0.0] + cuts
    r["shots"] = [{"start": round(a, 3), "duration": round(b - a, 3)}
                  for a, b in zip(bounds, cuts + [dur])]

    # the point of the whole exercise: are the cuts on the grid or not
    if r.get("grid") and r["grid"]["period"]:
        p, ph = r["grid"]["period"], r["grid"]["phase"]
        for c in r["shots"][1:]:
            k = round((c["start"] - ph) / p)
            c["beat"] = k
            c["off_ms"] = int(round((c["start"] - (ph + k * p)) * 1000))
        offs = [abs(c["off_ms"]) for c in r["shots"][1:] if "off_ms" in c]
        r["cuts_on_grid"] = sum(o <= 80 for o in offs)
        r["median_off_ms"] = int(np.median(offs)) if offs else None
    return r


def report(r):
    print(f"\n{r['file']}")
    print(f"  {r.get('size','?')}  {r.get('fps','?')}fps  {r.get('duration',0):.2f}s"
          f"  audio {'yes' if r.get('audio') else 'NO'}")
    if r.get("grid"):
        g = r["grid"]
        print(f"  drop      {r['drop']:.2f}s   (step {r['drop_strength']:.2f})")
        bpm = "/".join(str(b) for b in r["implied_bpm"])
        print(f"  grid      cut every {g['period']:.3f}s   phase {g['phase']:.3f}s   "
              f"score {g['score']:.2f}  contrast {g['contrast']:.2f}x   "
              f"{'USABLE as a cut template' if r['usable_as_template'] else 'NO USABLE PULSE'}")
        print(f"            track is {bpm} bpm depending on whether that is a "
              f"beat, half bar or bar")
    print(f"  hook      0 -> {r['hook_duration']:.2f}s   "
          f"(reuse the footage, replace the content)")
    print(f"  {len(r['shots'])} shots")
    for i, s in enumerate(r["shots"]):
        off = ""
        if "off_ms" in s:
            off = f"   beat {s['beat']:>2}   {s['off_ms']:+5d}ms " + \
                  ("on grid" if abs(s["off_ms"]) <= 80 else "OFF")
        print(f"    {i:>2}  {s['start']:6.2f}s  for {s['duration']:5.2f}s{off}")
    if r.get("median_off_ms") is not None:
        print(f"  {r['cuts_on_grid']}/{len(r['shots'])-1} cuts land on the grid, "
              f"median miss {r['median_off_ms']}ms")


if __name__ == "__main__":
    argv, args, out = sys.argv[1:], [], {}
    i = 0
    while i < len(argv):
        if argv[i] in ("--json", "--sheet"):
            out[argv[i]] = argv[i + 1]
            i += 2
            continue
        if not argv[i].startswith("--"):
            args.append(argv[i])
        i += 1
    results = []
    for p in args:
        r = breakdown(p)
        report(r)
        if "--sheet" in out:
            s = out["--sheet"] if len(args) == 1 else out["--sheet"].replace(
                ".png", f"_{p.rsplit('/', 1)[-1].rsplit('.', 1)[0]}.png")
            r["sheet"] = sheet(p, [x["start"] for x in r["shots"]], s)
            print(f"  -> {s}")
        results.append(r)
    if "--json" in out:
        json.dump(results if len(results) > 1 else results[0],
                  open(out["--json"], "w"), indent=1)
        print(f"\n-> {out['--json']}")

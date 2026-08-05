#!/usr/bin/env python3
"""The state-overlay format, rebuilt from a reference that got traction.

The reference is 13.19s and has NO CUTS. One continuous desk B-roll with five
overlay states on top of it, and the state changes do not land on the beat -
0 of 5 within 80ms, median 349ms off. It is timed to the script, not the music.
So this builds a sequence of overlay states over one clip; it does not beat-sync.

Its content, for the record, since this is what we are working from:

    0.00  1.20s   The one AI Agent / You NEED to start / Your agency   (NEED red)
    1.20  2.00s   + a pill: use this workflow! (arrow emoji)
    3.20  2.93s   AI Voice Receptionist  + a full-bleed n8n workflow screenshot
    6.13  3.00s   + tick emoji, Checks your google Calendar for availability
                    And books appointments For you
    9.13  4.00s   + tick emoji, Logs every call transcript And recording to
                    Airtable automatically
                  + Comment "Call"   (Call in green)

Dropped on purpose: the emoji (a drawn tick is the same idea without the
apologetic look of a system glyph), and the workflow screenshot.

One deliberate departure. The reference ends on Comment "Call". Our rule is that
the frame says read caption and never asks for a comment - the caption is where
the keyword lives. So the CTA here is read caption.

Measured off the reference at 1080x1920:

    title        ~86px ExtraBold, glyph band y 276..361, frame-centred
    claims       ~78px ExtraBold, line pitch 83, centred, one tick on line 1
    hook         3 lines, pitch 91, one word in red #FA0046
    inset        x 9..1070, y 363..1005 - full bleed, 9px margins, 2px green

The type is 76-86px. That is 2.4x the stack-note format, and it works for the
same reason: three or four short lines with nothing competing. It is the amount
of text that sets the size, not taste.

The reference lets its widest line run to x=985. Safe is 950, so on TikTok that
clips behind the rail. Not copied.
"""
import io
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 60, 950, 250, 1440
MAXW = SAFE_R - SAFE_L
CX = W // 2                       # the reference centres on the FRAME, not the safe box

RED = (250, 0, 70)                # sampled off the reference hooks
GREEN = (52, 199, 89)
BLUE = (33, 150, 243)
WHITE = (254, 254, 254)
# The references emphasise in three colours, not one, and which word is coloured
# is a copy decision rather than decoration. Markup is {r|...} {g|...} {b|...}.
INK = {"r": RED, "g": GREEN, "b": BLUE, "w": WHITE}
TAG = re.compile(r"\{([rgbw])\|([^}]*)\}")

TITLE_SZ, CLAIM_SZ, HOOK_SZ = 86, 78, 80
CLAIM_PITCH, HOOK_PITCH = 83, 91
# Measured anchors, all off the reference. These are absolute positions rather
# than a running cursor, because the inset sits at a FIXED y and the title has to
# clear it - deriving one from the other put the canvas through the title.
INSET_L, INSET_T, INSET_R, INSET_B = 9, 363, 1070, 1005
HOOK_BASE = 410           # first hook line baseline (reference band 341..604)
TITLE_BASE = 345          # title baseline    (reference band 276..361)
CLAIM_GAP = 115           # inset bottom -> first claim baseline

FD = os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
_fc = {}


def F(sz, w="ExtraBold"):
    if (sz, w) not in _fc:
        _fc[(sz, w)] = ImageFont.truetype(f"{FD}/Inter-{w}.ttf", int(sz))
    return _fc[(sz, w)]


_D = ImageDraw.Draw(Image.new("RGB", (1, 1)))
def tw(s, f): return _D.textbbox((0, 0), s, font=f)[2]


def runs(text):
    """`You {r|NEED} to start` -> [(white,'You '), (red,'NEED'), (white,' to start')]"""
    out, pos = [], 0
    for m in TAG.finditer(text):
        if m.start() > pos:
            out.append((WHITE, text[pos:m.start()]))
        out.append((INK[m.group(1)], m.group(2)))
        pos = m.end()
    if pos < len(text):
        out.append((WHITE, text[pos:]))
    return [(c, t) for c, t in out if t]


def measure(text, sz, weight="ExtraBold"):
    return sum(tw(t, F(sz, weight)) for _, t in runs(text))


def fit(lines, sz, weight="ExtraBold", floor=54):
    """Shrink until the longest line clears the safe box. The reference did not
    bother and its widest line runs under the TikTok rail."""
    while sz > floor and max(measure(l, sz, weight) for l in lines) > MAXW:
        sz -= 2
    return sz


def wrap(text, sz, weight="ExtraBold", indent=0):
    """Greedy wrap on the plain text, preserving ** spans across the break."""
    words, lines, cur = text.split(" "), [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if measure(trial, sz, weight) + (indent if not lines else 0) > MAXW and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def draw_line(d, cx, y, text, sz, weight="ExtraBold", em_colour=None, base=None, x0=None):
    """Centred, each span in its own colour. `base` overrides everything, which is
    how the shadow pass reuses this without inheriting the palette."""
    total = measure(text, sz, weight)
    x = (cx - total // 2) if x0 is None else x0
    left = x
    for colour, t in runs(text):
        f = F(sz, weight)
        d.text((x, y), t, font=f, fill=base if base is not None else colour, anchor="ls")
        x += tw(t, f)
    return left, x


def tick(d, x, y, size, colour=GREEN, weight=None):
    """A drawn tick. The reference uses the system emoji, which renders as a
    different shape on every platform and reads as a text message rather than a
    designed frame."""
    x, y, size = int(x), int(y), int(size)
    w = weight or max(6, size // 7)
    d.line([(x + int(size * 0.10), y + int(size * 0.55)),
            (x + int(size * 0.40), y + int(size * 0.84))], fill=colour, width=w)
    d.line([(x + int(size * 0.38), y + int(size * 0.84)),
            (x + int(size * 0.92), y + int(size * 0.16))], fill=colour, width=w)


def render(state):
    """One overlay state -> a transparent RGBA frame."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d, sd = ImageDraw.Draw(im), ImageDraw.Draw(sh)

    def block(lines, sz, pitch, top, weight="ExtraBold", lead_tick=False):
        """Shadow pass then ink pass, same geometry, so they cannot drift."""
        ind = int(sz * 1.15) if lead_tick else 0
        for pas, (target, base, em) in enumerate(
                ((sd, (0, 0, 0, 215), None), (d, None, None))):
            y = top
            for i, ln in enumerate(lines):
                off = ind if (lead_tick and i == 0) else 0
                total = measure(ln, sz, weight)
                left = CX - (total + off) // 2
                if lead_tick and i == 0:
                    tick(target, left, int(y - sz * 0.84), int(sz * 0.85),
                         colour=(0, 0, 0, 215) if pas == 0 else GREEN)
                draw_line(target, CX, y, ln, sz, weight,
                          em_colour=em, base=base, x0=left + off)
                y += pitch
            if pas == 0:
                continue
        return top + pitch * (len(lines) - 1)      # the LAST baseline, not past it

    # Vertical rhythm is stated as baseline-to-baseline gaps. Advancing by a full
    # pitch after the last line and then adding a font size for the next one puts
    # a 202px hole between the title and the claim - which in the reference is
    # where the workflow screenshot sat. Without an inset it is just a hole.
    if state.get("mode") == "list":
        sz = fit(state["hook"], L_HOOK_SZ)
        block(state["hook"], sz, L_HOOK_PITCH, L_HOOK_TOP)
        if state.get("title"):
            block([state["title"]], fit([state["title"]], L_TITLE_SZ),
                  L_TITLE_SZ, L_TITLE_BASE)
        if state.get("inset"):
            src = Image.open(state["inset"]).convert("RGBA")
            x0, y0, x1, y1 = L_BOX
            bw = x1 - x0
            bh = min(y1 - y0, int(bw * src.height / src.width))
            im.alpha_composite(src.resize((bw, bh), Image.LANCZOS), (x0, y0))
            d.rounded_rectangle([x0 - 2, y0 - 2, x0 + bw + 1, y0 + bh + 1],
                                radius=6, outline=GREEN, width=3)
        if state.get("label"):
            block([state["label"]], fit([state["label"]], L_LABEL_SZ),
                  L_LABEL_SZ, L_LABEL_BASE)
        if state.get("cta"):
            for target, base in ((sd, (0, 0, 0, 215)), (d, None)):
                draw_line(target, CX, L_CTA_BASE, state["cta"], L_CTA_SZ, "Bold", base=base)
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(11)))
        out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)))
        out.alpha_composite(im)
        return out

    y = HOOK_BASE

    if state.get("hook"):
        sz = fit(state["hook"], HOOK_SZ)
        y = block(state["hook"], sz, HOOK_PITCH, y)

    if state.get("title"):
        sz = fit([state["title"]], TITLE_SZ)
        block([state["title"]], sz, int(sz * 1.05), TITLE_BASE)
        y = TITLE_BASE + int(CLAIM_SZ * 1.45)

    if state.get("inset"):
        # The screenshot IS the substance. Everything else on the frame is a
        # caption for it, which is why it gets the full width and the middle
        # third. Measured off the reference: x 9..1070, y 363..1005.
        src = Image.open(state["inset"]).convert("RGBA")
        bw = INSET_R - INSET_L
        bh = min(INSET_B - INSET_T, int(bw * src.height / src.width))
        scaled = src.resize((bw, bh), Image.LANCZOS)
        top_y = state.get("inset_top", INSET_T)
        im.alpha_composite(scaled, (INSET_L, top_y))
        d.rounded_rectangle([INSET_L - 2, top_y - 2, INSET_L + bw + 1, top_y + bh + 1],
                            radius=6, outline=GREEN, width=3)
        # short canvases leave the claims higher up the frame, same as the
        # references do - the claims hang off the inset, not off a fixed line
        y = top_y + bh + CLAIM_GAP

    if state.get("claim"):
        # A claim may arrive as explicit lines. The references break their lines
        # by hand and the breaks carry meaning, so a wrapper is only used when
        # one string turns up instead of a list.
        raw = state["claim"]
        given = raw if isinstance(raw, list) else None
        sz = fit(given or wrap(raw, CLAIM_SZ), CLAIM_SZ)
        lines = given or wrap(raw, sz, indent=int(sz * 1.15))
        y = block(lines, sz, CLAIM_PITCH, y, lead_tick=True)

    if state.get("cta"):
        sz = 52
        cy = SAFE_B - 40
        for target, base in ((sd, (0, 0, 0, 215)), (d, None)):
            draw_line(target, CX, cy, state["cta"], sz, "Bold", base=base)

    # shadow FIRST, ink over it. Compositing the blur onto the ink layer puts the
    # smear on top of the letterforms and quietly greys everything out.
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(11)))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)))
    out.alpha_composite(im)
    return out


def _refbreak():
    import importlib.util
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "refbreak.py")
    spec = importlib.util.spec_from_file_location("refbreak", p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def motion(clip, w=120, fps=30):
    """The clip's own movement over time. This is the metronome."""
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    h = 2 * round(w * 16 / 9 / 2)
    raw = subprocess.run([ff, "-v", "error", "-i", clip, "-vf",
                          f"scale={w}:{h},format=gray", "-r", str(fps),
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(raw) // (w * h)
    fr = np.frombuffer(raw[:n * w * h], dtype=np.uint8).reshape(n, h, w).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    d = np.convolve(d, np.ones(3) / 3, mode="same")
    return np.arange(len(d)) / fps, d / (d.max() + 1e-9)


def clip_rhythm(clip, lo=0.6, hi=2.6):
    """Fit a grid to the FOOTAGE.

    This is the step whose absence made the last cut a soup. Our B-rolls are
    handheld and they move on their own pulse - one of them moves at 1.27, 2.77
    and 4.27s, a dead even 1.50s. Dropping an unrelated track over that and then
    cutting to the track gives three rhythms at once: the camera's, the song's,
    and the script's.

    So the footage is the metronome. Everything else gets matched to it."""
    t, m = motion(clip)
    dur = t[-1] if len(t) else 0.0
    base = float(m.mean()) + 1e-9
    best = {"score": 0.0, "period": 0.0, "phase": 0.0}
    for period in np.arange(lo, hi, 0.01):
        for phase in np.arange(0.2, min(period + 0.2, dur), 0.02):
            pts = np.arange(phase, dur - 0.05, period)
            if len(pts) < 3:
                continue
            sc = float(np.interp(pts, t, m).mean()) / base
            if sc > best["score"]:
                best = {"score": sc, "period": float(period), "phase": float(phase)}
    best["duration"] = float(dur)
    return best


# ---- listicle format ---------------------------------------------------------
# A second structure, and the one holding 18 of the 23 extracted canvases: the
# hook is PINNED for the whole video and the middle cycles through numbered
# agents. Measured off ig-0e69bc15 at 1080x1920:
#
#   hook    3 lines, band starts y 206, ~86px, lines 2-3 in blue
#   title   band y 672..754, above the canvas
#   canvas  x 31..1059, y 763..1245     (past the safe box on both sides)
#   label   band y 1310..1414 - BIGGER than the title, and the numbered item
#   cta     two lines, y 1484..1576     (below the safe bottom entirely)
#
# Their canvas runs to x 1059 and their CTA sits at y 1576, both of which the
# platform covers. Ours are pulled inside 60..950 and 250..1440, which costs
# canvas width and is the right trade.
L_HOOK_SZ, L_HOOK_PITCH, L_HOOK_TOP = 78, 92, 330
L_TITLE_SZ, L_TITLE_BASE = 66, 618
L_BOX = (60, 650, 950, 1075)
L_LABEL_SZ, L_LABEL_BASE = 74, 1165
L_CTA_SZ, L_CTA_BASE = 46, 1350


def clip_rhythm_candidates(clip, lo=0.6, hi=2.6, n=6):
    """Every grid the footage supports, not just the best one.

    A handheld clip does not have one rhythm, it has a strongest one and several
    honest alternatives - it moves every 1.55s, and it also moves every 2.07s and
    every 3.10s, because those are the same moves counted differently. Committing
    to the single best fit and then stretching whatever track we have onto it cost
    up to 48 percent of tempo on one reference. Offering the alternatives lets the
    music keep its own speed.
    """
    t, m = motion(clip)
    dur = t[-1] if len(t) else 0.0
    base = float(m.mean()) + 1e-9
    grid = []
    for period in np.arange(lo, hi, 0.01):
        best = (0.0, 0.0)
        for phase in np.arange(0.2, min(period + 0.2, dur), 0.02):
            pts = np.arange(phase, dur - 0.05, period)
            if len(pts) < 3:
                continue
            sc = float(np.interp(pts, t, m).mean()) / base
            if sc > best[0]:
                best = (sc, float(phase))
        grid.append((float(period), best[0], best[1]))
    # local maxima only, so the list is distinct rhythms rather than 200 neighbours
    peaks = [g for i, g in enumerate(grid)
             if (i == 0 or g[1] >= grid[i - 1][1]) and (i == len(grid) - 1 or g[1] >= grid[i + 1][1])]
    peaks.sort(key=lambda g: -g[1])
    return [dict(period=p_, score=sc, phase=ph, duration=float(dur))
            for p_, sc, ph in peaks[:n]]


def fit_audio_to_clip(cands, bar, floor=0.75):
    """Pick the clip grid that needs the least stretch, among grids worth using.

    Ranked by how far the track has to move, but only over candidates scoring at
    least `floor` of the strongest - a grid the footage barely supports is not
    worth a perfect tempo match. At 0.6 it took a 6.2x grid over a 10x one to save
    nine points of stretch, and the reel then changed state twice instead of five
    times, on moves the camera was barely making. The pulse is the point; the
    stretch is the thing to trade away."""
    if not cands:
        return None, 1.0

    def pick(f):
        cut = cands[0]["score"] * f
        best, best_det = None, 9.9
        for c in cands:
            if c["score"] < cut:
                continue
            octaves = np.log2(max(c["period"] / bar, 1e-6))
            det = abs(octaves - round(octaves))
            if det < best_det:
                best, best_det = c, det
        b = best or cands[0]
        mult = 2.0 ** round(np.log2(max(b["period"] / bar, 1e-6)))
        return b, (bar * mult) / b["period"]

    # atempo is inaudible at a few percent and obvious past about fifteen, so a
    # grid the footage supports less strongly is the cheaper concession once the
    # tempo cost gets that high. Relax in steps and stop at the first option that
    # keeps the stretch reasonable.
    out = pick(floor)
    for relaxed in (0.62, 0.5):
        if abs(1 - out[1]) <= 0.15:
            break
        alt = pick(relaxed)
        if abs(1 - alt[1]) < abs(1 - out[1]):
            out = alt
    return out


def match_track(clip_period, tracks):
    """Pick the song whose pulse is the clip's pulse, at some power of two.

    Not "a song we have". A track whose bar is 1.8s laid over footage that moves
    every 1.5s fights it for the whole reel, and no amount of cutting on the beat
    fixes that, because there are two beats."""
    rb = _refbreak()
    scored = []
    for path in tracks:
        full = rb.pcm(path)
        for head in (30, 45, 60, 90):
            x = full[:rb.SR * head]
            t, mag = rb.spectra(x)
            env = rb.onset_envelope(mag)
            drop, strength = rb.find_drop(t, mag, x)
            if drop >= 2.0 and strength >= 0.15:
                break
        g = rb.fit_grid(env, t, drop)
        if not g["period"]:
            continue
        ratio = clip_period / g["period"]
        octaves = np.log2(max(ratio, 1e-6))
        detune = abs(octaves - round(octaves))          # 0 = same pulse or a multiple
        scored.append(dict(path=path, drop=drop, strength=strength, period=g["period"],
                           phase=g["phase"], score=g["score"], contrast=g["contrast"],
                           detune=detune, mult=2.0 ** round(octaves)))
    scored.sort(key=lambda r: (r["detune"], -r["contrast"]))
    return scored


def beat_phase(audio, period, t0, t1):
    """Where the beats actually are, over the stretch of track we will use.

    fit_grid searches phase only in a narrow window around the drop, because its
    job is to describe the drop. Reusing that phase to align beats is circular -
    it is the drop again under another name, which is why aligning to it moved
    nothing. This searches a FULL period and scores against the segment that ends
    up in the reel, so the answer is about beats rather than about the drop."""
    rb = _refbreak()
    x = rb.pcm(audio)[:int((t1 + 2) * rb.SR)]
    t, mag = rb.spectra(x)
    env = rb.onset_envelope(mag)
    best = (0.0, t0)
    for ph in np.arange(t0, t0 + period, 0.005):
        pts = np.arange(ph, t1, period)
        if len(pts) < 3:
            continue
        sc = float(np.interp(pts, t, env).mean())
        if sc > best[0]:
            best = (sc, float(ph))
    return best[1], best[0] / (float(env.mean()) + 1e-9)


def clip_schedule(states, rhythm):
    """State boundaries ON the clip's own moves, inside the clip's own length.

    No stretching, no ping-pong, no fitting a 13s script into a 7s clip. The clip
    decides how many states there is room for; anything past that is cut from the
    script rather than squeezed into the footage."""
    p, ph, dur = rhythm["period"], rhythm["phase"], rhythm["duration"]
    bounds = [0.0] + [ph + k * p for k in range(int((dur - ph) / p) + 1) if ph + k * p < dur - 0.25]
    bounds.append(dur)

    # Runt slots. A clip whose first move is at 0.62s would open on a 0.62s hook,
    # which nobody reads, and one whose last move is 0.5s from the end flashes a
    # claim and cuts. Both get merged into their neighbour, so a state always
    # starts on a move even when it spans two of them.
    MIN = 0.9
    while len(bounds) > 2 and bounds[1] - bounds[0] < MIN:
        del bounds[1]
    while len(bounds) > 2 and bounds[-1] - bounds[-2] < MIN:
        del bounds[-2]
    slots = len(bounds) - 1
    used = [dict(x) for x in states[:slots]]
    # Truncating the script must not truncate the CALL TO ACTION. It lives on the
    # original last state, so it moves to whichever state ends up last.
    cta = next((x.get("cta") for x in reversed(states) if x.get("cta")), None)
    if cta and used and used[0].get("mode") != "list":
        for x in used:
            x.pop("cta", None)
        used[-1]["cta"] = cta
    out = []
    for i, st in enumerate(used):
        # the last kept state runs to the end of the clip rather than stopping short
        end = bounds[i + 1] if i < len(used) - 1 else dur
        out.append(dict(st, dur=end - bounds[i]))
    return out, slots, len(states)


def beat_schedule(states, audio):
    """Put the state changes on the beat, and the first one ON THE DROP.

    The reference is not beat-synced and it does not need to be - it is a talking
    head's script. Ours is a silent overlay sequence, so the music is the only
    thing giving it a pulse, and a change that lands 300ms off the beat reads as a
    mistake rather than a choice.

    The rules, all of which cost something to learn:

      Find the DROP, not the first beat. librosa's beat_track returns the first
      beat of a quiet intro; on one track that was 1.78s against a real drop at
      4.13s.

      Anchor on the drop, NOT the fitted grid phase. Phase can sit up to 0.3s
      after the drop, and anchoring on it cost 185ms of drift once.

      Trim the intro rather than delaying the video: astart = drop - hook, so the
      drop arrives exactly as the hook leaves. The reel opens on the build-up and
      the first content lands on the hit.

      Every later boundary is a whole number of grid periods from the drop, chosen
      as the nearest count to the duration the script wanted - so reading time is
      approximately preserved and the cut is exactly on the grid.
    """
    rb = _refbreak()
    # Only the HEAD of the track matters, and how much head changes the answer
    # completely. A full song has several drops and the biggest is usually deep in
    # the arrangement; on one track the whole-file answer was 58.7s, which a 15s
    # reel never reaches. Measured across five tracks, 30s is where the first real
    # drop reliably sits. It is a heuristic, so it widens rather than trusting
    # itself: a result at 0.00s or a limp step means the intro is longer than the
    # window and the search grows.
    full = rb.pcm(audio)
    for head in (30, 45, 60, 90):
        x = full[:rb.SR * head]
        t, mag = rb.spectra(x)
        env = rb.onset_envelope(mag)
        drop, strength = rb.find_drop(t, mag, x)
        if drop >= 2.0 and strength >= 0.15:
            break
    grid = rb.fit_grid(env, t, drop)
    period = grid["period"] or 1.0

    hook = states[0]["dur"]
    out = [dict(states[0], dur=hook)]
    for s in states[1:]:
        n = max(1, round(s["dur"] / period))
        out.append(dict(s, dur=n * period))
    astart = max(0.0, drop - hook)
    info = dict(drop=round(drop, 3), strength=round(strength, 3), astart=round(astart, 3),
                period=round(period, 3), score=round(grid["score"], 2),
                contrast=grid["contrast"], hook=round(hook, 3))
    return out, astart, info


def _duration(path, ff):
    err = subprocess.run([ff, "-i", path], capture_output=True, text=True).stderr
    h, m, sec = err.split("Duration: ")[1].split(",")[0].split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)


def assemble(clip, states, out, ff=None, audio=None, astart=0.0, tempo=1.0):
    """Overlay each state for its own slice of the timeline. No cuts, because the
    reference has none - the background is one continuous take throughout."""
    import imageio_ffmpeg
    ff = ff or imageio_ffmpeg.get_ffmpeg_exe()
    pngs, t = [], 0.0
    for i, s in enumerate(states):
        p = f"/tmp/_state{i}.png"
        render(s).save(p)
        pngs.append((p, t, t + s["dur"]))
        t += s["dur"]

    cmd = [ff, "-y", "-hide_banner", "-loglevel", "error", "-i", clip]
    for p, _, _ in pngs:
        cmd += ["-i", p]
    if audio:
        # No -ss. Seeking an mp3 lands on a frame boundary, about 26ms of grain,
        # and that showed up as a 46ms error on a render whose whole point is that
        # the beat is where it was put. atrim inside the graph is sample accurate.
        cmd += ["-i", audio]
    # A B-roll shorter than the script gets PING-PONGED: played forward, then in
    # reverse. The reverse begins on the exact frame the forward pass ended on, so
    # there is no seam to see - unlike a plain loop, which jump-cuts back to frame
    # one. On ambient handheld footage it is invisible. Slowing the clip down was
    # the other option and it reads as slow motion, which is a look we did not ask
    # for. Audio is padded with silence rather than reversed.
    src_dur = _duration(clip, ff)
    if src_dur < t - 0.05:
        reps = int(t // (2 * src_dur)) + 1
        chain = (f"[0:v]scale={W}:{H}:flags=lanczos,split[f][b];[b]reverse[r];"
                 f"[f][r]concat=n=2:v=1:a=0,loop=loop={reps}:size=32767:start=0,"
                 f"trim=0:{t:.3f},setpts=PTS-STARTPTS[v0]")
    else:
        chain = f"[0:v]scale={W}:{H}:flags=lanczos,trim=0:{t:.3f},setpts=PTS-STARTPTS[v0]"
    for i, (_, a, b) in enumerate(pngs):
        chain += (f";[v{i}][{i+1}:v]overlay=0:0:format=auto:"
                  f"enable='between(t,{a:.3f},{b:.3f})'[v{i+1}]")
    amap = f"{len(pngs) + 1}:a" if audio else "0:a?"
    # atempo preserves pitch, so a couple of percent to lock the track's bar onto
    # the footage's pulse is inaudible - and it is the difference between the beat
    # drifting off the camera move by the end of the reel and it not.
    # atempo carries a small latency of its own, which showed up as a consistent
    # 41ms placement error on the one track that barely needed stretching. Under
    # half a percent the correction is worth less than the delay it introduces.
    af = (f"atempo={tempo:.5f}," if abs(tempo - 1.0) > 0.005 else "")
    if audio:
        chain += (f";[{len(pngs) + 1}:a]atrim=start={astart:.4f},asetpts=PTS-STARTPTS,"
                  f"{af}apad,afade=t=out:st={max(0, t - 0.4):.3f}:d=0.4[a]")
        amap = "[a]"
    cmd += ["-filter_complex", chain, "-map", f"[v{len(pngs)}]", "-map", amap]
    if not audio:
        cmd += ["-af", f"apad,afade=t=out:st={max(0, t - 0.4):.3f}:d=0.4"]
    cmd += [
            "-t", f"{t:.3f}", "-c:v", "libx264", "-preset", "slow",
            "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
            "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out, t


# n8n is the trojan horse: the topic that travels, carrying the thing we sell.
# So the workflow is real and the claims are true, and what it sets up is that
# somebody has to keep it running.
WF = "refs/workflows"

# The references' own words and their own canvases. n8n is the trojan horse, so
# the carrier ships as it is - the only edits are the emoji ticks (drawn now) and
# the Comment CTA (the frame says read caption; the keyword lives in the caption).
SCRIPTS = {
    # Every hook read off its own video with extract-script.py. They are all
    # different, and the hook is the part doing the work - shipping one hook
    # across a batch throws away the only line most people read.
    "receptionist": dict(
        source="ig-5d66dbe8a194fad5",
        audio=f"refs/audio/ig-5d66dbe8a194fad5.mp3",
        inset=f"{WF}/ig-5d66dbe8a194fad5_1.png",
        hook=["The one AI Agent", "You {r|NEED} to start", "Your agency"],
        title="AI Voice Receptionist",
        # Their claims run three and four lines because their slots are 3 to 4
        # seconds. Ours are the clip's own pulse, so the same content in two.
        claims=[["Answers every call", "24 hours a day"],
                ["Checks your calendar", "and books the appointment"],
                ["Logs every transcript", "straight to Airtable"]]),

    "leadscraper": dict(
        source="ig-11ed3628ef2a4834",
        audio=f"refs/audio/ig-11ed3628ef2a4834.mp3",
        inset=f"{WF}/ig-11ed3628ef2a4834_1.png",
        hook=["How I scrape 100s", "Of leads in just", "{r|10 Minutes}"],
        title="Google Maps Lead Scraper",
        claims=[["Scrapes all businesses", "In your specific niche"],
                ["Gets the phone number", "and the email"],
                ["Writes it all", "to a google sheet"]]),

    # Same canvas, different hook - these two are the same workflow sold two ways,
    # which is worth keeping as two reels rather than collapsing to one.
    "leadscraper40k": dict(
        source="ig-928c0c6efcbf4a91",
        audio=f"refs/audio/ig-928c0c6efcbf4a91.mp3",
        inset=f"{WF}/ig-928c0c6efcbf4a91_1.png",
        hook=["I scrape {g|40,000}", "Leads a month from", "Google Maps"],
        title="Google Maps Lead Scraper",
        claims=[["Scrapes all businesses", "In your specific niche"],
                ["Gets the phone number", "and the email"],
                ["Writes it all", "to a google sheet"]]),

    "admaker": dict(
        source="ig-21b2ab35383a1822",
        audio=f"refs/audio/ig-21b2ab35383a1822.mp3",
        inset=f"{WF}/ig-21b2ab35383a1822_1.png",
        hook=["How I post {g|daily}", "{g|Video ads & photo ads}",
              "To TikTok and instagram", "For any client {g|automatically}"],
        title="AI Video & Carousel Generator",
        claims=[["Generates video", "and photo ads"],
                ["Posts them to", "TikTok and Instagram"],
                ["Works for your brand", "or any you sell it to"]]),

    "contentteam": dict(
        source="ig-eceb7cf800b5455b",
        audio=f"refs/audio/ig-eceb7cf800b5455b.mp3",
        inset=f"{WF}/ig-eceb7cf800b5455b_1.png",
        hook=["How I {r|replaced my entire}", "{r|Content team} with this",
              "One {b|agentic workflow...}"],
        title="AI Video & Carousel Generator",
        claims=[["Generates video", "and photo ads"],
                ["Posts them to", "TikTok and Instagram"],
                ["Works for your brand", "or any you sell it to"]]),
}


WFL = "refs/workflows/ig-0e69bc15beb637ed"

LISTICLES = {
    "sixagents": dict(
        source="ig-0e69bc15beb637ed",
        audio="refs/audio/ig-0e69bc15beb637ed.mp3",
        hook=["{n} Agents every", "{b|Automation agency}", "{b|Needs}"],
        cta="read caption",
        items=[("Google Maps Lead Scraper", "1. Lead-Gen Agent", f"{WFL}_1.png"),
               ("AI Video & Carousel Generator", "2. Marketing Agent", f"{WFL}_2.png"),
               ("AI Voice Receptionist", "3. Voice Agent", f"{WFL}_3.png"),
               ("Gmail Campaign Sender", "4. Follow-up Agent", f"{WFL}_4.png"),
               ("Company News Scraper", "5. Research Agent", f"{WFL}_5.png"),
               ("Review Generation System", "6. Reputation Agent", f"{WFL}_6.png")]),
}


def listicle_states(key, n_items=None):
    """Hook alone, then one agent per slot. The hook and the CTA never leave.

    The COUNT IN THE HOOK follows how many actually fit. A reel that promises six
    agents and shows three is not a shortened reel, it is a broken one, and the
    reference's number is the reference's number - it had 14.9s to spend."""
    L = LISTICLES[key]
    items = L["items"][:n_items] if n_items else L["items"]
    hook = [ln.replace("{n}", str(len(items))) for ln in L["hook"]]
    out = [dict(dur=1.2, mode="list", hook=hook, cta=L["cta"])]
    for title, label, inset in items:
        out.append(dict(dur=2.2, mode="list", hook=hook, cta=L["cta"],
                        title=title, label=label, inset=inset))
    return out


def script_states(key):
    """The reference's own durations, not a compressed version of them.

    It runs 13.07s on 1.2 / 2.0 / 2.9 / 3.0 / 4.0 - they GROW, so the hook lands
    fast and each claim buys more read time. Squeezing that into an 8s B-roll put
    the hook at 0.65s, which is not a hook, it is a flash. Reading time is the
    thing the format is spending its length on, so the footage gets stretched to
    the script rather than the script cut to the footage. See ping_pong."""
    s = SCRIPTS[key]
    weights = [1.2, 2.9] + [3.0 + 0.5 * i for i in range(len(s["claims"]))]
    k = 1.0
    out = [dict(dur=weights[0] * k, hook=s["hook"]),
           dict(dur=weights[1] * k, title=s["title"], inset=s["inset"])]
    for i, c in enumerate(s["claims"]):
        out.append(dict(dur=weights[2 + i] * k, title=s["title"], inset=s["inset"],
                        claim=c, **({"cta": "read caption"} if i == len(s["claims"]) - 1 else {})))
    return out


STATES = script_states("receptionist")


def verify(path, audio, astart, expect_at, tempo=1.0):
    """Check the RENDER, by cross-correlation rather than by re-detecting.

    Re-running the drop detector on the output does not work and the way it fails
    is instructive: its answer depends on how much audio sits either side, and the
    render only has `hook` seconds before the drop. With a narrower window forced
    on it, it reported a 170ms error that was not there.

    The question is really "did ffmpeg put the audio where I asked", so ask that
    directly: correlate the render's energy envelope against the source's from
    astart. Zero lag means the placement is exact, and the drop is then at
    drop - astart by construction. This is also the check that would have caught
    the 185ms grid-phase drift last time.
    """
    rb = _refbreak()

    def envelope(sig):
        n = 1 + max(0, (len(sig) - rb.WIN) // rb.HOP)
        idx = np.arange(rb.WIN)[None, :] + rb.HOP * np.arange(n)[:, None]
        e = np.sqrt((sig[idx] ** 2).mean(axis=1))
        return (e - e.mean()) / (e.std() + 1e-9)

    span = rb.SR * 8
    a = envelope(rb.pcm(path)[:span])
    src = rb.pcm(audio)
    # The render is time-stretched, so correlating it against the raw source
    # measures the STRETCH, not the placement: 1.94 percent over 8s is 155ms of
    # drift and the correlator splits the difference at about -70ms. Resample the
    # source onto the render's own time base first, then the only thing left to
    # measure is where ffmpeg actually put it.
    b_raw = envelope(src[int(astart * rb.SR):int(astart * rb.SR) + int(span * tempo) + rb.WIN])
    hop_s = rb.HOP / rb.SR
    n = min(len(a), int(len(b_raw) / tempo))
    b = np.interp(np.arange(n) * hop_s * tempo, np.arange(len(b_raw)) * hop_s, b_raw)
    a = a[:n]
    xc = np.correlate(a, b, mode="full")
    i = int(xc.argmax())
    # Sub-hop refinement. The envelope steps every 23ms, so a raw argmax can only
    # ever report multiples of that and a 46ms reading is two bins, not evidence.
    # A parabola through the peak and its neighbours resolves inside a bin.
    if 0 < i < len(xc) - 1:
        y0, y1, y2 = xc[i - 1], xc[i], xc[i + 1]
        denom = (y0 - 2 * y1 + y2)
        i = i + (0.5 * (y0 - y2) / denom if abs(denom) > 1e-9 else 0.0)
    lag = (i - (n - 1)) * rb.HOP / rb.SR
    print(f"  VERIFY  audio placement off by {lag * 1000:+.0f}ms "
          f"({'OK' if abs(lag) < 0.03 else 'MISPLACED'})")
    return lag


def alignment(path, cuts):
    """Measure the finished file: is there a camera move AND a beat at every change?

    Worth doing every render rather than by hand, because it is the check that
    caught two silent failures. The first: every change landed on a camera move
    and none on a beat, because the anchor was the drop and the drop is not the
    grid phase. The second: aligning to fit_grid's phase changed nothing, because
    that phase is searched in a window around the drop - it was the drop again
    wearing a different name.

    Numbers are multiples of each signal's own mean, so 1.0x is what a randomly
    placed cut would score and anything near it means no alignment at all."""
    rb = _refbreak()
    mt, mm = motion(path)
    x = rb.pcm(path)
    at, mag = rb.spectra(x)
    ae = rb.onset_envelope(mag)
    print(f"  {'change':>9}  {'camera':>8}  {'audio':>8}")
    rows = []
    for c in cuts:
        mo = float(np.interp(c, mt, mm)) / (mm.mean() + 1e-9)
        au = float(np.interp(c, at, ae)) / (ae.mean() + 1e-9)
        rows.append((mo, au))
        tag = ("BOTH" if mo > 1.3 and au > 1.3 else
               "camera only" if mo > 1.3 else "audio only" if au > 1.3 else "NEITHER")
        print(f"  {c:8.2f}s  {mo:7.2f}x  {au:7.2f}x  {tag}")
    print(f"            mean {np.mean([a for a, _ in rows]):5.2f}x  "
          f"{np.mean([b for _, b in rows]):5.2f}x   (random placement is 1.0x)")
    return rows


if __name__ == "__main__":
    import glob
    # IMG_2398 is THE clip. It was handed over for this work, and it is also the
    # only B-roll with five slots in it - a 1.55s pulse ten times its own average.
    # Swapping to a shorter one lost two of three claims and then got blamed on
    # B-roll length, which was wrong: the clip given was always long enough.
    clip = sys.argv[1] if len(sys.argv) > 1 else "brolls/IMG_2398.mp4"
    out = sys.argv[2] if len(sys.argv) > 2 else "brand/STATE_n8n.mp4"
    key = sys.argv[3] if len(sys.argv) > 3 else "receptionist"
    pool = sorted(glob.glob(sys.argv[4])) if len(sys.argv) > 4 else sorted(glob.glob("audio/*.mp3"))
    STATES = (listicle_states(key) if key in LISTICLES else script_states(key))
    IS_LIST = key in LISTICLES

    # 1. the FOOTAGE offers its grids
    cands = clip_rhythm_candidates(clip, n=10)
    print(f"  clip    {cands[0]['duration']:.2f}s, strongest pulse every "
          f"{cands[0]['period']:.2f}s ({cands[0]['score']:.1f}x), "
          f"{len(cands)} usable grids")

    # 2. the REFERENCE'S OWN track, not one off the shelf. The song is part of
    #    what made the reference work, the same way the hook is - reusing one
    #    track across a batch is the same mistake as reusing one hook.
    rb = _refbreak()
    audio = (LISTICLES if key in LISTICLES else SCRIPTS)[key].get("audio")
    ax = rb.pcm(audio)
    at, amag = rb.spectra(ax)
    aenv = rb.onset_envelope(amag)
    adrop, astrength = rb.find_drop(at, amag, ax, win=0.8)
    ag = rb.fit_grid(aenv, at, max(adrop, 0.5), lo=0.6, hi=2.2)

    # 3. pick the clip grid that asks the least of the track
    r, tempo = fit_audio_to_clip(cands, ag["period"])
    stretch = abs(1 - tempo) * 100
    print(f"  track   {os.path.basename(audio)}  bar {ag['period']:.2f}s  ->  clip grid "
          f"{r['period']:.2f}s from {r['phase']:.2f}s ({r['score']:.1f}x)")
    print(f"          atempo {tempo:.4f} = {stretch:.0f}% stretch"
          + ("   HIGH - the track and the clip disagree on tempo" if stretch > 12 else ""))

    cand = dict(path=audio, drop=adrop, period=ag["period"], phase=ag["phase"],
                mult=1.0, contrast=ag["contrast"])

    # 4. the script is cut to the slots the clip has room for. A listicle is
    #    REBUILT at that size rather than truncated, so its headline count is true.
    if IS_LIST:
        _, slots, _ = clip_schedule(STATES, r)
        STATES = listicle_states(key, n_items=max(1, slots - 1))
        print(f"  listicle {slots - 1} of {len(LISTICLES[key]['items'])} agents fit; "
              f"the hook counts what is shown")
    states, slots, wanted = clip_schedule(STATES, r)
    if wanted > slots:
        print(f"  script  {wanted} states wanted, {slots} fit in {r['duration']:.2f}s "
              f"- dropped {wanted - slots}. The clip is the length, not the script.")

    ap = ag["period"]
    span0 = max(0.0, adrop - 1.0)
    aph, beat_strength = beat_phase(audio, ap, span0, min(span0 + r["duration"] * tempo + 2,
                                                          len(ax) / rb.SR - 0.2))
    print(f"  beats   phase {aph:.2f}s + n x {ap:.2f}s  ({beat_strength:.2f}x onset)")
    k = round((adrop - aph) / ap)
    astart = aph + k * ap - tempo * r["phase"]
    while astart < 0:
        k += 1
        astart = aph + k * ap - tempo * r["phase"]
    print(f"  sync    trimming {astart:.2f}s so a BEAT lands on the camera move at "
          f"{r['phase']:.2f}s")

    for i, st in enumerate(states):
        render(st).save(f"brand/STATE_{i}.png")
        print(f"  state {i}  {st['dur']:.2f}s  " +
              " | ".join(k for k in ("hook", "title", "claim", "cta") if st.get(k)))
    path, total = assemble(clip, states, out, audio=cand["path"], astart=astart, tempo=tempo)
    print(f"-> {path}  {total:.2f}s over {os.path.basename(clip)}")
    verify(path, cand["path"], astart, r["phase"], tempo=tempo)
    # Actual boundaries, not the theoretical grid. Runt slots get merged, so the
    # two drift apart - and the table was scoring a change at 0.24s that the
    # render does not contain.
    acc, bounds = 0.0, []
    for st in states[:-1]:
        acc += st["dur"]
        bounds.append(acc)
    alignment(path, bounds)

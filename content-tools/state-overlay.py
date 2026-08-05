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
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 60, 950, 250, 1440
MAXW = SAFE_R - SAFE_L
CX = W // 2                       # the reference centres on the FRAME, not the safe box

RED = (250, 0, 70)                # sampled off the reference hook
GREEN = (52, 199, 89)
WHITE = (254, 254, 254)

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
    """`that runs your **FOLLOW-UP**` -> alternating (emphasised, text) pairs."""
    out, em = [], False
    for part in text.split("**"):
        if part:
            out.append((em, part))
        em = not em
    return out


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


def draw_line(d, cx, y, text, sz, weight="ExtraBold", em_colour=RED, base=WHITE, x0=None):
    """Centred, with emphasised spans in a second colour. Returns (left, right)."""
    total = measure(text, sz, weight)
    x = (cx - total // 2) if x0 is None else x0
    left = x
    for em, t in runs(text):
        f = F(sz, weight)
        d.text((x, y), t, font=f, fill=em_colour if em else base, anchor="ls")
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
                ((sd, (0, 0, 0, 215), (0, 0, 0, 215)), (d, WHITE, RED))):
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
        for target, base, em in ((sd, (0, 0, 0, 215), (0, 0, 0, 215)), (d, WHITE, GREEN)):
            draw_line(target, CX, cy, state["cta"], sz, "Bold", em_colour=em, base=base)

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
    if cta and used:
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
        # seek BEFORE -i so the decoder starts there; seeking after would decode
        # and discard the intro and the drop would land late by whatever that cost
        cmd += ["-ss", f"{astart:.3f}", "-i", audio]
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
    af = (f"atempo={tempo:.5f}," if abs(tempo - 1.0) > 1e-4 else "")
    cmd += ["-filter_complex", chain, "-map", f"[v{len(pngs)}]", "-map", amap,
            "-af", f"{af}apad,afade=t=out:st={max(0, t - 0.4):.3f}:d=0.4",
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
    "receptionist": dict(
        inset=f"{WF}/ig-5d66dbe8a194fad5_1.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="AI Voice Receptionist",
        # Their claims run three and four lines because their slots are 3 to 4
        # seconds. Ours are 1.55s - the clip's own pulse - so the same content
        # gets said in two lines. This is the rebuild: their substance, our pace.
        claims=[["Answers every call", "24 hours a day"],
                ["Checks your calendar", "and books the appointment"],
                ["Logs every transcript", "straight to Airtable"]]),
    "leadscraper": dict(
        inset=f"{WF}/ig-11ed3628ef2a4834_1.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="Google Maps Lead Scraper",
        claims=[["Scrapes all businesses", "In your specific niche"],
                ["Gets all the businesses data", "Phone number, email etc."],
                ["Puts all the data", "In a google sheet for you"]]),
    "admaker": dict(
        inset=f"{WF}/ig-21b2ab35383a1822_1.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="AI Video & Carousel Generator",
        claims=[["Generates Video And", "Photo ads Using Blotato"],
                ["Automatically Posts them", "To TikTok & Instagram"],
                ["Works For Your Brand", "Or Any You Sell It To"]]),
    "gmail": dict(
        inset=f"{WF}/ig-1c1da0539733d3eb_1.png",
        hook=["Top **6** AI Agents", "To sell"],
        title="Gmail Campaign Sender",
        claims=[["Writes and sends the", "whole campaign for you"],
                ["Follows up until", "they reply"]]),
    "reviews": dict(
        inset=f"{WF}/ig-0e69bc15beb637ed_1.png",
        hook=["6 Agents every", "**Automation agency**", "Needs"],
        title="Review Generation System",
        claims=[["Asks every happy customer", "at the right moment"],
                ["Sends the good ones", "straight to Google"]]),
}


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
    lag = (int(xc.argmax()) - (n - 1)) * rb.HOP / rb.SR
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
    STATES = script_states(key)

    # 1. the FOOTAGE sets the grid
    r = clip_rhythm(clip)
    print(f"  clip    {r['duration']:.2f}s, moves every {r['period']:.2f}s from "
          f"{r['phase']:.2f}s  (pulse {r['score']:.1f}x)")

    # 2. the music is chosen to match that grid, then nudged onto it exactly
    cand = match_track(r["period"], pool)[0]
    tempo = (cand["period"] * cand["mult"]) / r["period"]
    print(f"  track   {os.path.basename(cand['path'])}  bar {cand['period']:.2f}s "
          f"x{cand['mult']:.0f}  ->  atempo {tempo:.4f} to sit on {r['period']:.2f}s")

    # 3. the script is cut to the slots the clip has room for
    states, slots, wanted = clip_schedule(STATES, r)
    if wanted > slots:
        print(f"  script  {wanted} states wanted, {slots} fit in {r['duration']:.2f}s "
              f"- dropped {wanted - slots}. The clip is the length, not the script.")

    # Align the BEATS to the camera moves, not the drop.
    #
    # Anchoring on the drop alone put every change on a camera move and none of
    # them on a beat: measured 0.53x, 1.44x, 0.91x, 1.18x against the audio's own
    # onset envelope, where random placement scores 1.06x. The drop is not the
    # grid phase - it can sit up to a third of a bar off it - so landing the drop
    # on a move says nothing about where the following beats fall.
    #
    # Output time maps to source time as src = astart + out * tempo. Requiring a
    # beat at the first camera move gives a congruence on astart; solve it, then
    # pick the solution nearest the drop so the reel still opens on the hit.
    ap = cand["period"] * cand["mult"]
    span0 = max(0.0, cand["drop"] - 1.0)
    aph, beat_strength = beat_phase(cand["path"], ap, span0, span0 + r["duration"] * tempo + 2)
    print(f"  beats   true phase {aph:.2f}s + n x {ap:.2f}s  ({beat_strength:.2f}x onset)")
    # Solve  astart + tempo * cam_phase  ==  aph + k * ap  for integer k, picking
    # the k nearest the drop so the reel still opens on the hit.
    #   src = astart + out * tempo, so a beat at source aph + k*ap appears at
    #   output (aph + k*ap - astart) / tempo, and we want that to be cam_phase.
    k = round((cand["drop"] - aph) / ap)
    astart = aph + k * ap - tempo * r["phase"]
    while astart < 0:
        k += 1
        astart = aph + k * ap - tempo * r["phase"]
    print(f"  sync    beat grid {aph:.2f}s + n x {ap:.2f}s; trimming {astart:.2f}s so a "
          f"BEAT lands on the camera move at {r['phase']:.2f}s "
          f"(drop {cand['drop']:.2f}s, opening "
          f"{abs(astart + tempo * r['phase'] - cand['drop']):.2f}s from it)")

    for i, st in enumerate(states):
        render(st).save(f"brand/STATE_{i}.png")
        print(f"  state {i}  {st['dur']:.2f}s  " +
              " | ".join(k for k in ("hook", "title", "claim", "cta") if st.get(k)))
    path, total = assemble(clip, states, out, audio=cand["path"], astart=astart, tempo=tempo)
    print(f"-> {path}  {total:.2f}s over {os.path.basename(clip)}")
    verify(path, cand["path"], astart, r["phase"], tempo=tempo)
    alignment(path, [r["phase"] + k * r["period"]
                     for k in range(len(states) - 1)])

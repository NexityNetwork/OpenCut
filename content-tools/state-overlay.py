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


def _duration(path, ff):
    err = subprocess.run([ff, "-i", path], capture_output=True, text=True).stderr
    h, m, sec = err.split("Duration: ")[1].split(",")[0].split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)


def assemble(clip, states, out, ff=None):
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
    cmd += ["-filter_complex", chain, "-map", f"[v{len(pngs)}]", "-map", "0:a?",
            "-af", "apad", "-t", f"{t:.3f}", "-c:v", "libx264", "-preset", "slow",
            "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac",
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
        inset=f"{WF}/ig-5d66dbe8a194fad5_workflow.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="AI Voice Receptionist",
        claims=[["Automatically answers", "Every call to your business", "24 hours a day"],
                ["Checks your google", "Calendar for availability",
                 "And books appointments", "For you"],
                ["Logs every call transcript", "And recording to Airtable",
                 "automatically"]]),
    "leadscraper": dict(
        inset=f"{WF}/ig-11ed3628ef2a4834_workflow.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="Google Maps Lead Scraper",
        claims=[["Scrapes all businesses", "In your specific niche"],
                ["Gets all the businesses data", "Phone number, email etc."],
                ["Puts all the data", "In a google sheet for you"]]),
    "admaker": dict(
        inset=f"{WF}/ig-21b2ab35383a1822_workflow.png",
        hook=["The one AI Agent", "You **NEED** to start", "Your agency"],
        title="AI Video & Carousel Generator",
        claims=[["Generates Video And", "Photo ads Using Blotato"],
                ["Automatically Posts them", "To TikTok & Instagram"],
                ["Works For Your Brand", "Or Any You Sell It To"]]),
    "gmail": dict(
        inset=f"{WF}/ig-1c1da0539733d3eb_workflow.png",
        hook=["Top **6** AI Agents", "To sell"],
        title="Gmail Campaign Sender",
        claims=[["Writes and sends the", "whole campaign for you"],
                ["Follows up until", "they reply"]]),
    "reviews": dict(
        inset=f"{WF}/ig-0e69bc15beb637ed_workflow.png",
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


if __name__ == "__main__":
    clip = sys.argv[1] if len(sys.argv) > 1 else "brolls/IMG_2393.mp4"
    out = sys.argv[2] if len(sys.argv) > 2 else "brand/STATE_n8n.mp4"
    for i, s in enumerate(STATES):
        render(s).save(f"brand/STATE_{i}.png")
        print(f"  state {i}  {s['dur']}s  " +
              " | ".join(k for k in ("hook", "title", "claim", "cta") if s.get(k)))
    path, total = assemble(clip, STATES, out)
    print(f"-> {path}  {total:.2f}s over {clip}")

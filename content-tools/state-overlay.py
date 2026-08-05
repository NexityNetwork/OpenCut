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
    y = state.get("top", SAFE_T + 50) + HOOK_SZ

    if state.get("hook"):
        sz = fit(state["hook"], HOOK_SZ)
        y = block(state["hook"], sz, HOOK_PITCH, y)

    if state.get("title"):
        sz = fit([state["title"]], TITLE_SZ)
        y = block([state["title"]], sz, int(sz * 1.05), y)
        y += int(CLAIM_SZ * 1.45)                  # one clear paragraph gap

    if state.get("claim"):
        sz = fit(wrap(state["claim"], CLAIM_SZ), CLAIM_SZ)
        lines = wrap(state["claim"], sz, indent=int(sz * 1.15))
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
    chain = f"[0:v]scale={W}:{H}:flags=lanczos,trim=0:{t:.3f},setpts=PTS-STARTPTS[v0]"
    for i, (_, a, b) in enumerate(pngs):
        chain += (f";[v{i}][{i+1}:v]overlay=0:0:format=auto:"
                  f"enable='between(t,{a:.3f},{b:.3f})'[v{i+1}]")
    cmd += ["-filter_complex", chain, "-map", f"[v{len(pngs)}]", "-map", "0:a?",
            "-t", f"{t:.3f}", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out, t


# n8n is the trojan horse: the topic that travels, carrying the thing we sell.
# So the workflow is real and the claims are true, and what it sets up is that
# somebody has to keep it running.
STATES = [
    dict(dur=2.4, hook=["The n8n workflow", "that runs your", "**FOLLOW-UP**"]),
    dict(dur=2.7, title="Reply-triggered follow-up",
         claim="Fires when they reply, not on a timer"),
    dict(dur=2.8, title="Reply-triggered follow-up",
         claim="Stops itself the moment they book", cta="read caption"),
]


if __name__ == "__main__":
    clip = sys.argv[1] if len(sys.argv) > 1 else "brolls/IMG_2393.mp4"
    out = sys.argv[2] if len(sys.argv) > 2 else "brand/STATE_n8n.mp4"
    for i, s in enumerate(STATES):
        render(s).save(f"brand/STATE_{i}.png")
        print(f"  state {i}  {s['dur']}s  " +
              " | ".join(k for k in ("hook", "title", "claim", "cta") if s.get(k)))
    path, total = assemble(clip, STATES, out)
    print(f"-> {path}  {total:.2f}s over {clip}")

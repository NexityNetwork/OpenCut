#!/usr/bin/env python3
"""Draw what each platform eats, over a finished frame.

Written because "will the sides get clipped" is not answerable by looking at a
frame - it depends entirely on which surface it lands on, and the surfaces
disagree. This overlays all of them at once so the answer is visible instead of
argued.

    python3 danger-zones.py frame.png [more.png ...] -> *_zones.png

What each one takes, on a 1080-wide image:

  FEED CAROUSEL   Instagram accepts 4:5 at most. A 9:16 upload is CENTRE
                  CROPPED to 1080x1350, so a 1920-tall frame loses 285px off
                  the top and 285px off the bottom. This is the one that
                  actually bites, and it is invisible until you post.
  PROFILE GRID    The grid thumbnail is 1:1, centre cropped. Anything outside a
                  1080x1080 band around the middle is gone from the grid, which
                  is where a lot of people decide whether to open the post.
  REEL            No crop at 9:16, but the UI is drawn ON TOP: roughly 250px of
                  status and header, 480px of caption, username and audio strip,
                  and a 130px right rail of buttons.

The reel rail is the one people expect and the 4:5 crop is the one that ruins
posts, because a reel only covers your artwork while a crop deletes it.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

RED = (255, 62, 62)
BLUE = (54, 140, 255)
AMBER = (255, 176, 32)


def label(d, x, y, text, colour, font):
    w = d.textbbox((0, 0), text, font=font)[2]
    d.rectangle([x, y, x + w + 20, y + 40], fill=colour)
    d.text((x + 10, y + 20), text, font=font, fill=(255, 255, 255), anchor="lm")


def zones(path, out=None):
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    try:
        f = ImageFont.truetype(os.environ.get("FONT_DIR", "brand/fonts/extras/ttf")
                               + "/Inter-SemiBold.ttf", 22)
    except OSError:
        f = ImageFont.load_default()

    # 4:5 centre crop - what a feed carousel keeps
    keep = int(W * 5 / 4)
    if keep < H:
        cut = (H - keep) // 2
        d.rectangle([0, 0, W, cut], fill=(*RED, 90))
        d.rectangle([0, H - cut, W, H], fill=(*RED, 90))
        d.line([(0, cut), (W, cut)], fill=RED, width=4)
        d.line([(0, H - cut), (W, H - cut)], fill=RED, width=4)
        label(d, 24, cut - 48, f"feed carousel crops here  (loses {cut}px)", RED, f)

    # 1:1 centre crop - the profile grid thumbnail
    gcut = (H - W) // 2
    if gcut > 0:
        for y in (gcut, H - gcut):
            d.line([(0, y), (W, y)], fill=BLUE, width=3)
        label(d, 24, gcut + 8, "profile grid crops here", BLUE, f)

    # reel chrome - drawn over, not cropped out
    for box in ([0, 0, W, 250], [0, H - 480, W, H], [W - 130, 250, W, H - 480]):
        d.rectangle(box, fill=(*AMBER, 60))
    d.line([(W - 130, 250), (W - 130, H - 480)], fill=AMBER, width=3)
    label(d, 24, H - 480 + 8, "reel UI covers this", AMBER, f)

    out = out or path.rsplit(".", 1)[0] + "_zones.png"
    Image.alpha_composite(im, ov).convert("RGB").save(out)
    print(f"  {os.path.basename(path)} {W}x{H} -> {os.path.basename(out)}")
    return out


if __name__ == "__main__":
    for p in sys.argv[1:]:
        zones(p)

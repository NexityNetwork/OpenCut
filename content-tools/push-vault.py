#!/usr/bin/env python3
# Push finished assets into the Monolith library.
#
# Two halves: the bytes go to R2 under imports/ (the media route refuses to serve
# anything else), the row goes to vault_items. Keys are readable rather than
# up-<uuid> on purpose - when the index was lost the only thing that survived was
# what the key itself said, so the key carries the name now.
#
# thumb_url is an inline base64 JPEG, matching how the uploader writes it. A
# transparent PNG gets flattened onto charcoal first, otherwise the thumb is a
# black rectangle.
import base64, io, json, os, subprocess, sys, urllib.request, uuid
from PIL import Image

ACC, DB = os.environ["ACC"], os.environ["DB"]
OWNER = "E6OxEK7KHZ4ZwiyXQnEoiMH8ElCpFk5B"
H = {"X-Auth-Email": os.environ["CFE"], "X-Auth-Key": os.environ["CFK"]}
BUCKET = "ultron-reels"
B = "brand"


def api(path, data=None, method="GET", ctype="application/json", raw=False):
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACC}{path}",
        data=data if raw else (json.dumps(data).encode() if data else None),
        headers={**H, "Content-Type": ctype}, method=method)
    try:
        return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"success": False, "errors": [{"message": f"HTTP {e.code}"}]}


def put(key, path, ctype):
    with open(path, "rb") as f:
        body = f.read()
    r = api(f"/r2/buckets/{BUCKET}/objects/{key}", body, "PUT", ctype, raw=True)
    print(f"  {'ok ' if r.get('success') else 'ERR'} {key}  {len(body)/1e6:.2f} MB"
          + ("" if r.get("success") else f"  {json.dumps(r.get('errors'))[:160]}"))
    return r.get("success")


def thumb(img, w=360):
    """Inline base64 JPEG, same as the browser uploader produces."""
    im = img.convert("RGBA")
    flat = Image.new("RGB", im.size, (18, 17, 16))
    flat.paste(im, mask=im.getchannel("A"))
    flat = flat.resize((w, int(w * im.height / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    flat.save(buf, "JPEG", quality=72)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def frame(mp4, t=2.0):
    import imageio_ffmpeg
    out = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-ss", str(t),
                          "-i", mp4, "-frames:v", "1", "-f", "image2pipe",
                          "-vcodec", "png", "-"], capture_output=True).stdout
    return Image.open(io.BytesIO(out))


REEL_CAPTION = """Comment STACK to get the links and the full setup.

Everyone argues about which AI tool is best. That is the wrong question. Writing goes to Claude. Research goes to Perplexity. Code goes to Claude Code. Outreach goes to HubSpot. Each one is the right answer to a different question, and swapping the winner for the runner up changes almost nothing about your output.

Here is the part nobody posts about. Once you have five right tools you also have five tabs, five logins and five places where the work stops until you go and move it yourself. The bottleneck quietly stops being the tool and starts being you, carrying things between them.

That last row is the one that matters. Running it is a task too. It is the only one on the list without an obvious brand attached, so most people never assign it and end up doing it by hand forever.

That is what ultron is for. It sits above the stack instead of competing with anything in it. Your tools stay yours. The handoffs stop being manual.

Pick the right tool for the right task. Then hand the running of it to something that does not get tired.

Comment STACK and I will send the tools and how they connect."""

OVERLAY_CAPTION = """Comment OVERLAY to get the template and the safe zone numbers.

This is the transparent version of the comparison card. No background, so it drops straight onto any vertical clip and the footage keeps showing through instead of getting covered up.

Two things make an overlay work and both of them are boring. First, safe zones. On a 1080 by 1920 frame, Instagram and TikTok between them cover about 250 pixels off the top, 480 off the bottom and 130 down the right for the button rail. Anything you place outside that gets sat on by an interface you do not control. Every element here lives inside 90 to 950 across and 456 to 1233 down, which is the widest a block can be and still clear the rail.

Second, contrast. Dark type on a dark clip disappears and a white card punches a hole in your video. The panels here sit at 88 percent opacity over charcoal, so the clip still reads underneath while the type survives the moment the shot brightens.

The block takes 65 percent of the safe height on purpose. Filling the frame is what makes an overlay feel like a poster someone pasted over a video instead of part of it.

Comment OVERLAY and I will send the file and the measurements."""

CARD_CAPTION = """Comment CARD to get the layout.

Same content on a surface instead of a clip. This is the version for a carousel or a static post, and it is worth keeping both because they are not interchangeable.

On paper you can use white panels, hairline rules and near black type, and the eye does the separating for you. On video none of that survives. The card has to carry its own contrast, because the background is moving and you do not control what sits behind any given frame.

The structure is the same either way. Two columns side by side are just two lists. What turns them into an argument is the spine down the middle. One chip per task, arrows showing direction, and two routing lines that leave one card, run the length of the spine and turn back into the other. Now the reader sees one question being answered twice instead of two unrelated inventories.

Five rows, not seven. Past the fourth row the reader is only confirming a pattern they already understood, and every extra row costs height that the layout needs back.

Comment CARD and I will send the layout.""".rstrip()


ITEMS = [
    dict(file=f"{B}/OVER2_2393.mp4", key="imports/ultron-which-tool-reel-2393.mp4",
         ctype="video/mp4", kind="video", ext="mp4", tags=["Reels"],
         name="Which tool should you use - reel", caption=REEL_CAPTION),
    dict(file=f"{B}/OVERLAY2.png", key="imports/ultron-which-tool-overlay.png",
         ctype="image/png", kind="image", ext="png", tags=["Overlays"],
         name="Which tool should you use - overlay", caption=OVERLAY_CAPTION),
    dict(file=f"{B}/COMPARE2.png", key="imports/ultron-which-tool-card.png",
         ctype="image/png", kind="image", ext="png", tags=["Cards"],
         name="Which tool should you use - card", caption=CARD_CAPTION),
]

BANNED = {"#": "hashtag", "—": "em dash", "–": "en dash",
          "“": "smart quote", "”": "smart quote", '"': "quote", "$": "dollar"}


def opener(cap):
    """The caption minus its down arrow. The arrow belongs to the frame, not the
    sentence, and every caption in the book opens with one."""
    return cap.lstrip("\u2193").lstrip()


def keyword(cap):
    return opener(cap).split()[1]


def check(cap, kw):
    bad = [n for ch, n in BANNED.items() if ch in cap]
    if not opener(cap).startswith(f"Comment {kw} "):
        bad.append("does not open with the keyword")
    # U+2190..U+21FF is the arrows block. The down arrow that opens a caption and
    # the right arrow that marks a list row live there, and they are typography,
    # not emoji - the old threshold called both of them emoji and failed 55 of 61
    # perfectly good captions.
    if any(ord(c) > 0x2100 and not 0x2190 <= ord(c) <= 0x21FF for c in cap):
        bad.append("emoji")
    return bad


if __name__ == "__main__":
    go = "--go" in sys.argv
    # A batch is data, not code. `--items batch.json` so shipping the next thing
    # is a manifest rather than an edit to this file.
    if "--items" in sys.argv:
        spec = json.load(open(sys.argv[sys.argv.index("--items") + 1]))
        ITEMS = [{**it, "caption": open(it["caption_file"]).read().strip()} for it in spec]
    rows = []
    for it in ITEMS:
        kw = keyword(it["caption"])
        bad = check(it["caption"], kw)
        print(f"{it['name']}\n  keyword {kw}  {len(it['caption'])} chars  "
              f"{'CLEAN' if not bad else 'FAILS: ' + ', '.join(bad)}")
        if bad:
            sys.exit(1)

        img = frame(it["file"]) if it["kind"] == "video" else Image.open(it["file"])
        dur = None
        if it["kind"] == "video":
            import imageio_ffmpeg
            probe = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", it["file"]],
                                   capture_output=True, text=True).stderr
            hms = probe.split("Duration: ")[1].split(",")[0]
            h, m, s = hms.split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
        rows.append((str(uuid.uuid4()), OWNER, it["kind"], it["name"], "upload", dur,
                     None, thumb(img),
                     json.dumps([{"key": it["key"], "type": it["kind"], "ext": it["ext"],
                                  "contentType": it["ctype"]}]),
                     json.dumps(it["tags"]), it["caption"], None))

    if not go:
        print("\nDRY RUN. add --go to upload and insert.")
        sys.exit(0)

    print("\nR2:")
    for it in ITEMS:
        if not put(it["key"], it["file"], it["ctype"]):
            sys.exit(1)

    print("\nD1:")
    now = int(subprocess.run(["date", "+%s%3N"], capture_output=True, text=True).stdout.strip())
    rows = [r[:-1] + (now,) for r in rows]
    cols = ("id,owner,kind,name,source,duration_sec,thumb_key,thumb_url,"
            "media,tags,caption,created_at")
    vals = ",".join(["(" + ",".join(["?"] * 12) + ")"] * len(rows))   # 36 params, under 100
    r = api(f"/d1/database/{DB}/query",
            {"sql": f"INSERT INTO vault_items ({cols}) VALUES {vals}",
             "params": [v for row in rows for v in row]}, "POST")
    print("  ok" if r.get("success") else f"  ERR {json.dumps(r.get('errors'))[:300]}")

#!/usr/bin/env python3
"""Push into the Monolith library THROUGH THE WORKER, not the Cloudflare API.

push-vault.py talks to api.cloudflare.com and needs CFE/CFK/ACC/DB. This does
the same job with no credentials at all, because the two routes it needs are
already public on the worker and are the same ones the browser uploader uses:

    POST /api/import-from-url/upload?ext=png   bytes  -> {key}
    POST /api/vault                            row    -> {ok, id}

Use this when the Cloudflare key is not to hand. The one thing lost is the
readable R2 key: the upload route mints `imports/up-<uuid>.<ext>` itself, where
push-vault.py writes a key that says what the file is. That mattered once, when
the index was lost and the key was the only surviving description, so prefer
push-vault.py when the credentials exist.

A CAROUSEL IS ONE ROW, NOT SIX. `media` is an array and `kind` has a `carousel`
value that the vault UI already renders; six rows would be six posts in the
library and six captions to keep in sync.

    python3 push-worker.py --items batch.json          # dry run, checks captions
    python3 push-worker.py --items batch.json --go
"""
import base64
import io
import json
import mimetypes
import sys
import urllib.request
import uuid

from PIL import Image

BASE = "https://edits.51ultron.com"
OWNER = "E6OxEK7KHZ4ZwiyXQnEoiMH8ElCpFk5B"

# Same list as push-vault.py. The rules are in MONOLITH-RUNBOOK.md; the reason
# they are enforced here rather than trusted is that a caption is the only part
# of a post that cannot be fixed by re-rendering.
BANNED = {"#": "hashtag", "—": "em dash", "–": "en dash",
          "“": "smart quote", "”": "smart quote", '"': "quote", "$": "dollar"}


def check(cap, kw):
    bad = [n for ch, n in BANNED.items() if ch in cap]
    if not cap.startswith(f"Comment {kw} "):
        bad.append("does not open with the keyword")
    if any(ord(c) > 0x2100 for c in cap):
        bad.append("emoji")
    if len(cap) > 2200:
        bad.append(f"over the Instagram limit by {len(cap) - 2200}")
    return bad


# Cloudflare's bot rules reject `Python-urllib/3.x` on this zone with a 403 and
# error code 1010 - a signature ban, not an auth failure, so it looks exactly
# like a permissions problem and is not one. curl gets through with no header at
# all; urllib does not, because it sends one and it is the wrong one.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def post(path, body, ctype="application/json"):
    req = urllib.request.Request(BASE + path, data=body, method="POST",
                                 headers={"Content-Type": ctype, "User-Agent": UA})
    try:
        return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code} {e.read()[:200].decode(errors='replace')}"}


def thumb(path, w=360):
    """Inline base64 JPEG, same as the browser uploader produces. Flattened onto
    charcoal first, or a transparent PNG thumbs as a black rectangle."""
    im = Image.open(path).convert("RGBA")
    flat = Image.new("RGB", im.size, (18, 17, 16))
    flat.paste(im, mask=im.getchannel("A"))
    flat = flat.resize((w, int(w * im.height / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    flat.save(buf, "JPEG", quality=72)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


if __name__ == "__main__":
    spec = json.load(open(sys.argv[sys.argv.index("--items") + 1]))
    go = "--go" in sys.argv

    for it in spec:
        it["caption"] = open(it["caption_file"]).read().strip()
        kw = it["caption"].split()[1]
        bad = check(it["caption"], kw)
        print(f"{it['name']}\n  keyword {kw}  {len(it['caption'])} chars  "
              f"{len(it['files'])} frame(s)  "
              f"{'CLEAN' if not bad else 'FAILS: ' + ', '.join(bad)}")
        if bad:
            sys.exit(1)

    if not go:
        print("\nDRY RUN. add --go to upload and insert.")
        sys.exit(0)

    for it in spec:
        print(f"\n{it['name']}")
        media = []
        for f in it["files"]:
            ext = f.rsplit(".", 1)[-1]
            ctype = mimetypes.guess_type(f)[0] or "application/octet-stream"
            with open(f, "rb") as fh:
                body = fh.read()
            r = post(f"/api/import-from-url/upload?ext={ext}", body, ctype)
            if not r.get("key"):
                print(f"  ERR {f}  {r}")
                sys.exit(1)
            print(f"  ok  {len(body)/1e6:5.2f} MB  {r['key']}")
            media.append({"key": r["key"], "type": it["kind"] if it["kind"] != "carousel"
                          else "image", "ext": ext, "contentType": ctype})

        r = post("/api/vault", json.dumps({
            "id": str(uuid.uuid4()), "owner": OWNER, "kind": it["kind"],
            "name": it["name"], "source": "upload", "media": media,
            "tags": it["tags"], "caption": it["caption"],
            "thumbUrl": thumb(it["files"][0]),
        }).encode())
        print(f"  {'row ' + r['id'] if r.get('ok') else 'ERR ' + str(r)}")
        if r.get("ok"):
            print(f"  {BASE}/api/import-from-url/file?key={media[0]['key']}")

#!/usr/bin/env python3
"""Push the hook frames into the Library as their own Browse category.

    python3 slide-hook.py brand/hooks --all
    python3 push-hooks.py            # dry run, prints what it would do
    python3 push-hooks.py --go

ONE ITEM PER HOOK. Not a carousel. `kind='image'` with a single-entry media
array, so the Library renders each PNG on its own and each one can be scheduled,
captioned and posted separately. A 43-image carousel would be one post.

A CATEGORY IS A TAG. The Browse sidebar is the distinct values of
`vault_items.tags`, so `tags=['Hooks']` IS the new category - there is nothing
else to create and no deploy involved.

CAPTIONS ARE DELIBERATELY EMPTY. A hook frame is the opening slide; its body
lives in the caption book and gets attached when the post is assembled. Writing
a placeholder caption here would put 43 rows into the Library that all look
finished and none of which are.

Needs CFE / CFK / ACC / DB in the environment. Reuses push-vault's R2 PUT and
thumbnail, because the Library expects both to look exactly like the browser
uploader's output.
"""
import json
import os
import re
import sys
import urllib.request
import uuid

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
_pv = __import__("importlib").import_module("importlib.util")
spec = _pv.spec_from_file_location("pv", os.path.join(HERE, "push-vault.py"))
PV = _pv.module_from_spec(spec)
_src = open(os.path.join(HERE, "push-vault.py")).read().split('if __name__ ==')[0]
exec(compile(_src, "push-vault.py", "exec"), PV.__dict__)

OWNER = PV.OWNER
ALPHA = os.environ.get("HOOK_ALPHA") == "1"
FRAMES = os.path.join(HERE, "brand", "hooks-alpha" if ALPHA else "hooks")
TAG = "Hooks Transparent" if ALPHA else "Hooks"


def slug(s):
    s = re.sub(r"\*\*|\|", " ", s)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return re.sub(r"-+", "-", s)[:48].strip("-")


def name(s):
    """The Library lists by name, so the name is the hook, tidied of the marks
    that only mean something to the renderer."""
    return re.sub(r"\s+", " ", re.sub(r"\*\*|\|", " ", s)).strip()[:110]


def items():
    book = {r["id"]: r for r in json.load(open(os.path.join(HERE, "hooks.json")))}
    out = []
    for hid in sorted(book):
        p = os.path.join(FRAMES, f"{hid}.png")
        if not os.path.exists(p):
            print(f"  MISSING {hid}.png - run slide-hook.py --all first")
            sys.exit(1)
        out.append(dict(id=hid, file=p, text=book[hid]["text"],
                        key=f"imports/ultron-hook{'-alpha' if ALPHA else ''}-{hid}-{slug(book[hid]['text'])}.png"))
    return out


if __name__ == "__main__":
    go = "--go" in sys.argv
    its = items()
    print(f"  {len(its)} hook frame(s) -> category {TAG!r}, one item each\n")
    for it in its[:3]:
        print(f"    {it['key']}")
    print(f"    ... and {len(its) - 3} more\n")

    if not go:
        print("  DRY RUN. add --go to upload and insert.")
        sys.exit(0)

    print("  R2:")
    for it in its:
        if not PV.put(it["key"], it["file"], "image/png"):
            sys.exit(1)

    print("\n  D1:")
    import subprocess
    now = int(subprocess.run(["date", "+%s%3N"], capture_output=True,
                             text=True).stdout.strip())
    rows = []
    for i, it in enumerate(its):
        rows.append((str(uuid.uuid4()), OWNER, "image", name(it["text"]), "upload",
                     None, None, PV.thumb(Image.open(it["file"])),
                     json.dumps([{"key": it["key"], "type": "image", "ext": "png",
                                  "contentType": "image/png"}]),
                     json.dumps([TAG]), "", now + i))
    cols = ("id,owner,kind,name,source,duration_sec,thumb_key,thumb_url,"
            "media,tags,caption,created_at")
    # 12 columns, 100 bound parameters per statement, so eight rows a time.
    for i in range(0, len(rows), 8):
        chunk = rows[i:i + 8]
        vals = ",".join(["(" + ",".join(["?"] * 12) + ")"] * len(chunk))
        r = PV.api(f"/d1/database/{os.environ['DB']}/query",
                   {"sql": f"INSERT INTO vault_items ({cols}) VALUES {vals}",
                    "params": [v for row in chunk for v in row]}, "POST")
        print(f"    rows {i + 1}-{i + len(chunk)}  "
              + ("ok" if r.get("success") else f"ERR {json.dumps(r.get('errors'))[:200]}"))

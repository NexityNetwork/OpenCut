#!/usr/bin/env python3
"""Pair each body in `n8n reels` with a hook and assemble the post.

    python3 push-match.py          # dry run
    python3 push-match.py --go

A POST IS THE HOOK FRAME FOLLOWED BY THE BODY. Nothing is re-rendered and
nothing is copied: the new item's media array is the hook's R2 key with the
body's existing slides after it, so a match costs one row and zero bytes. Change
a hook and every match that uses it changes with it.

THE MATCH IS BY SUBJECT, NOT BY COUNT. `frontend dashboards` goes under `if your
BUSINESS doesn't have these 6 DASHBOARDS`; `30 day client` under `I want my
FIRST CLIENT in the next 30 DAYS`; `The AI Coding Matrix` under `open CLAUDE
CODE for 3 HOURS`. Pairing on slide count alone would have put six of anything
under any hook with a six in it.

ONE HOOK, ONE BODY. Thirty-three bodies take thirty-three of the forty-three
hooks. The ten left over are listed at the end rather than forced onto a body
they do not describe.
"""
import json
import os
import sys
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, "push-vault.py")).read().split('if __name__ ==')[0]
PV = type(sys)("pv")
exec(compile(_src, "push-vault.py", "exec"), PV.__dict__)

OWNER = PV.OWNER
TAG = "HOOKS+BODIES"
SRC_TAG = "n8n reels"

# body name -> hook id
MATCH = {
    "n8n agents carousel":                      "h032",
    "six agents carousel":                      "h020",
    "seven agents wrong vs right":              "h030",
    "six operating systems":                    "h024",
    "lead machine walkthrough":                 "h015",
    "six agents by the number":                 "h022",
    "content OS":                               "h039",
    "frontend dashboards":                      "h019",
    "five agents":                              "h009",
    "sales system":                             "h001",
    "agent offers":                             "h014",
    "ultron playbook":                          "h035",
    "30 day client":                            "h004",
    "content agent":                            "h034",
    "ceo in 24h":                               "h025",
    "blueprint":                                "h005",
    "business models":                          "h007",
    "custom plan":                              "h033",
    "ai engines":                               "h043",
    "agent menu":                               "h036",
    "agency 2026":                              "h010",
    "tool stack":                               "h026",
    "sdr system":                               "h017",
    "agent blueprint":                          "h023",
    "ten agents":                               "h029",
    "7 Unheard Of Apps":                        "h027",
    "7 Google AI Tools":                        "h021",
    "My One Person Company":                    "h031",
    "The AI Coding Matrix":                     "h012",
    "Your Ultimate AI Team in 2026":            "h011",
    "AI Content Agent":                         "h040",
    "Zero Budget Stack":                        "h018",
    "AI Business Automation 24h - 6 variations": "h002",
}


def d1(sql, params=None):
    r = PV.api(f"/d1/database/{os.environ['DB']}/query",
               {"sql": sql, "params": params or []}, "POST")
    if not r.get("success"):
        sys.exit(f"D1 refused: {json.dumps(r.get('errors'))[:300]}")
    return r["result"][0].get("results", [])


def short(s, n=54):
    s = " ".join(s.split())
    return s if len(s) <= n else s[:n - 1].rstrip() + "…"


if __name__ == "__main__":
    go = "--go" in sys.argv

    bodies = {r["name"]: r for r in d1(
        "SELECT id,name,kind,media,thumb_url FROM vault_items "
        "WHERE owner = ? AND tags LIKE ? ORDER BY created_at", [OWNER, f"%{SRC_TAG}%"])}
    hooks = {r["id"]: r for r in json.load(open(os.path.join(HERE, "hooks.json")))}
    hkeys = {r["name"]: json.loads(r["media"])[0]["key"] for r in d1(
        "SELECT name, media FROM vault_items WHERE owner = ? AND tags LIKE ?",
        [OWNER, "%Hooks%"])}
    # the hook rows are named by their text, so index them back to ids by key
    by_id = {}
    for nm, key in hkeys.items():
        m = key.split("ultron-hook-")[1][:4]
        by_id[m] = key

    missing = [b for b in MATCH if b not in bodies]
    if missing:
        sys.exit(f"  no such body: {missing}")

    pairs = []
    for body_name, hid in MATCH.items():
        b = bodies[body_name]
        if hid not in by_id:
            sys.exit(f"  no hook frame for {hid}")
        media = [{"key": by_id[hid], "type": "image", "ext": "png",
                  "contentType": "image/png"}] + json.loads(b["media"])
        pairs.append(dict(hid=hid, body=body_name, media=media,
                          hook_text=short(hooks[hid]["text"].replace("**", "")
                                          .replace("|", " ")),
                          thumb=b["thumb_url"]))

    print(f"  {len(pairs)} pair(s) -> category {TAG!r}\n")
    for p in pairs:
        print(f"    {p['hid']}  {len(p['media']):>2} slides  "
              f"{p['hook_text'][:52]:52}  <- {p['body']}")
    spare = sorted(set(hooks) - set(MATCH.values()))
    print(f"\n  {len(spare)} hook(s) with no body yet: {' '.join(spare)}")

    if not go:
        print("\n  DRY RUN. add --go to insert.")
        sys.exit(0)

    import subprocess
    now = int(subprocess.run(["date", "+%s%3N"], capture_output=True,
                             text=True).stdout.strip())
    from PIL import Image
    rows = []
    for i, p in enumerate(pairs):
        # the card should show the HOOK, because that is what the post opens on
        hook_png = os.path.join(HERE, "brand", "hooks", f"{p['hid']}.png")
        rows.append((str(uuid.uuid4()), OWNER, "carousel",
                     f"{p['hook_text']}  +  {p['body']}", "upload", None, None,
                     PV.thumb(Image.open(hook_png)), json.dumps(p["media"]),
                     json.dumps([TAG]), "", now + i))

    cols = ("id,owner,kind,name,source,duration_sec,thumb_key,thumb_url,"
            "media,tags,caption,created_at")
    for i in range(0, len(rows), 8):
        chunk = rows[i:i + 8]
        vals = ",".join(["(" + ",".join(["?"] * 12) + ")"] * len(chunk))
        d1(f"INSERT INTO vault_items ({cols}) VALUES {vals}",
           [v for row in chunk for v in row])
        print(f"    rows {i + 1}-{i + len(chunk)}  ok")

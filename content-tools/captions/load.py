#!/usr/bin/env python3
"""Load the caption book into the monolith's `snippets` table.

    python3 load.py --check     # parse and report, touch nothing
    python3 load.py             # wipe the caption bucket and reload all of it

THE FILES ARE THE SOURCE OF TRUTH. The tab reads D1, but D1 is a copy - every
caption lives here first, in git, one file each, so an edit is a diff and not a
mystery. Reloading is a wipe and a rewrite rather than a merge, because a
half-updated book is worse than either version of it.

FILE SHAPE: line one is `keyword|kind|source`, everything after it is the
caption exactly as written. Blank lines are paragraph breaks and they matter -
the view reads them back as structure.

Needs CFE / CFK / ACC / DB in the environment (see the runbook). The global key
goes in X-Auth-Email + X-Auth-Key; a Bearer header gets a 10000 error.
"""
import glob
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OWNER = "E6OxEK7KHZ4ZwiyXQnEoiMH8ElCpFk5B"
BUCKET = "caption"


def sql(query, params=None):
    env = {k: os.environ.get(k) for k in ("CFE", "CFK", "ACC", "DB")}
    missing = [k for k, v in env.items() if not v]
    if missing:
        sys.exit(f"missing env: {', '.join(missing)}")
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{env['ACC']}"
        f"/d1/database/{env['DB']}/query",
        data=json.dumps({"sql": query, "params": params or []}).encode(),
        headers={"X-Auth-Email": env["CFE"], "X-Auth-Key": env["CFK"],
                 "Content-Type": "application/json"})
    body = json.load(urllib.request.urlopen(req))
    if not body.get("success"):
        sys.exit(f"D1 refused: {body.get('errors')}")
    return body["result"][0].get("results", [])


def book():
    out = []
    for p in sorted(glob.glob(os.path.join(HERE, "*.txt"))):
        head, body = open(p).read().split("\n", 1)
        ref, kind, source = (head.split("|") + ["", ""])[:3]
        text = body.strip()
        paras = [x for x in re.split(r"\n{2,}", text) if x.strip()]
        out.append(dict(
            n=int(os.path.basename(p)[:2]),
            ref=ref.strip(), kind=kind.strip(), source=source.strip(), text=text,
            note=f"{len(text)} chars, {len(paras)} paragraphs"))
    return out


if __name__ == "__main__":
    rows = book()
    print(f"  {len(rows)} caption(s)")
    kinds = {}
    for r in rows:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
    print("  " + "  ".join(f"{k} {v}" for k, v in sorted(kinds.items(), key=lambda x: -x[1])))

    if "--check" in sys.argv:
        sys.exit(0)

    sql("DELETE FROM snippets WHERE owner = ? AND bucket = ?", [OWNER, BUCKET])
    for r in rows:
        sql("INSERT INTO snippets (id,owner,bucket,ref,text,kind,source,deck,note,"
            "status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [f"c{r['n']:03d}", OWNER, BUCKET, r["ref"], r["text"], r["kind"],
             r["source"], "", r["note"], "raw", r["n"], r["n"], r["n"]])
    live = sql("SELECT COUNT(*) c FROM snippets WHERE owner = ? AND bucket = ?",
               [OWNER, BUCKET])
    print(f"  loaded, {live[0]['c']} in the tab")

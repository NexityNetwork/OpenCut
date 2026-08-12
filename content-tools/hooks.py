#!/usr/bin/env python3
"""The hook book. Every first line we have collected, and nothing else.

    python3 hooks.py add "line one | line two" --kind claim --source "ig @who"
    python3 hooks.py list                       # everything, newest last
    python3 hooks.py list --kind number         # one kind
    python3 hooks.py list --free                # not yet tied to a body
    python3 hooks.py pair h004 zero             # tie a hook to a body
    python3 hooks.py stats

THE HOOK IS THE POST. Thirty bodies are built and every one of them opens on a
frame that does not exist yet, because the reference's first slide is captured
for context and never rebuilt. This file is where that frame's words live until
there are enough of them to choose from.

NOTHING HERE RENDERS. On purpose. A hook gets written down, argued with, and
only then does it become a slide - collecting and designing at the same time is
how you end up defending a bad line because you already set it nicely.

`|` IS A LINE BREAK and `**bold**` is emphasis, the same two marks the decks
already use, so a hook can go straight into a frame with no translation.

STORAGE IS ONE JSON FILE, sorted by id, one hook per entry. It is read by eye as
often as by code, so it stays readable and it stays in git - a hook list that
lives in somebody's notes app is a hook list that gets lost.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(HERE, "hooks.json")

KINDS = ["claim", "number", "question", "contrarian", "promise", "callout",
         "confession", "list"]
STATUS = ["raw", "picked", "used"]


def load():
    if not os.path.exists(STORE):
        return []
    with open(STORE) as fh:
        return json.load(fh)


def save(rows):
    rows.sort(key=lambda r: r["id"])
    with open(STORE, "w") as fh:
        json.dump(rows, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


def next_id(rows):
    n = max((int(r["id"][1:]) for r in rows), default=0)
    return f"h{n + 1:03d}"


def add(args):
    rows = load()
    text = " | ".join(p.strip() for p in args.text.split("|"))
    if any(r["text"].lower() == text.lower() for r in rows):
        sys.exit(f"already have that one: {text}")
    row = dict(id=next_id(rows), text=text, kind=args.kind,
               source=args.source or "", deck=args.deck or None,
               note=args.note or "", status="raw")
    rows.append(row)
    save(rows)
    print(f"  {row['id']}  {text}")


def show(rows):
    for r in rows:
        deck = f"-> {r['deck']}" if r.get("deck") else ""
        star = {"raw": " ", "picked": "*", "used": "x"}[r.get("status", "raw")]
        print(f" {star} {r['id']}  {r['kind']:11} {r['text']}")
        tail = "  ".join(x for x in (r.get("source", ""), deck, r.get("note", ""))
                         if x)
        if tail:
            print(f"        {tail}")


def cmd_list(args):
    rows = load()
    if args.kind:
        rows = [r for r in rows if r["kind"] == args.kind]
    if args.deck:
        rows = [r for r in rows if r.get("deck") == args.deck]
    if args.free:
        rows = [r for r in rows if not r.get("deck")]
    if args.grep:
        rows = [r for r in rows if args.grep.lower() in r["text"].lower()]
    show(rows)
    print(f"\n  {len(rows)} hook(s)")


def pair(args):
    rows = load()
    for r in rows:
        if r["id"] == args.id:
            r["deck"] = args.deck
            r["status"] = "picked"
            save(rows)
            print(f"  {r['id']} -> {args.deck}")
            return
    sys.exit(f"no hook {args.id}")


def stats(args):
    rows = load()
    print(f"  {len(rows)} hooks, {sum(1 for r in rows if not r.get('deck'))} free")
    for k in KINDS:
        n = sum(1 for r in rows if r["kind"] == k)
        if n:
            print(f"    {k:11} {n}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add")
    a.add_argument("text", help="`|` breaks the line, `**bold**` emphasises")
    a.add_argument("--kind", choices=KINDS, default="claim")
    a.add_argument("--source", default="")
    a.add_argument("--deck", default=None)
    a.add_argument("--note", default="")
    a.set_defaults(fn=add)

    l = sub.add_parser("list")
    l.add_argument("--kind", choices=KINDS)
    l.add_argument("--deck")
    l.add_argument("--free", action="store_true")
    l.add_argument("--grep")
    l.set_defaults(fn=cmd_list)

    p = sub.add_parser("pair")
    p.add_argument("id")
    p.add_argument("deck")
    p.set_defaults(fn=pair)

    s = sub.add_parser("stats")
    s.set_defaults(fn=stats)

    args = ap.parse_args()
    args.fn(args)

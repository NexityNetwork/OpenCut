#!/usr/bin/env python3
"""Apply a list of (file, old, new) replacements to the caption book.

Every replacement has to match EXACTLY ONCE. A miss means the caption changed
under me; two hits means I am about to edit a sentence I never read. Both are
errors, and both stop the run before anything is written.
"""
import collections
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def apply(edits):
    by_file = collections.OrderedDict()
    for f, old, new in edits:
        by_file.setdefault(f, []).append((old, new))

    staged, bad = {}, []
    for f, pairs in by_file.items():
        p = os.path.join(HERE, f)
        t = open(p).read()
        for old, new in pairs:
            n = t.count(old)
            if n != 1:
                bad.append(f"{f}: {n} hits for {old[:70]!r}")
                continue
            t = t.replace(old, new)
        staged[p] = t

    if bad:
        print("NOTHING WRITTEN:")
        for b in bad:
            print("  ", b)
        sys.exit(1)

    for p, t in staged.items():
        open(p, "w").write(t)
    print(f"  {len(staged)} file(s), {sum(len(v) for v in by_file.values())} edit(s)")

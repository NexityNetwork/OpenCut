#!/bin/bash
# Upload serving copies to ultron-reels under imports/ (what the library file route serves).
set -a; . /tmp/cfenv; set +a
cd /home/user/OpenCut/apps/web || exit 1
WR=./node_modules/.bin/wrangler
SP=/tmp/claude-0/-home-user-OpenCut/7a087813-4460-554b-9bad-fdf05b7a0f16/scratchpad
MAN="$SP/upload-manifest.txt"
BUCKET=ultron-reels
ok=0; fail=0; i=0
total=$(wc -l < "$MAN")
echo "uploading $total files -> $BUCKET/imports/"
while IFS=$'\t' read -r local key; do
  [ -z "$local" ] && continue
  if "$WR" r2 object put "$BUCKET/$key" --file "$SP/$local" --content-type image/png --remote >/dev/null 2>&1; then
    ok=$((ok+1))
  else
    fail=$((fail+1)); echo "FAIL $key"
  fi
  i=$((i+1))
  if [ $((i % 30)) -eq 0 ]; then echo "  $i/$total (ok=$ok fail=$fail)"; fi
done < "$MAN"
echo "IMPORTS UPLOAD DONE ok=$ok fail=$fail total=$total"

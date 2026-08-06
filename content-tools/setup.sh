#!/usr/bin/env bash
# Take a fresh container from nothing to a working render.
#
# This exists because the container is ephemeral and has already been wiped
# mid-session once, taking the whole toolkit with it. The generators are in git
# now; this is everything AROUND them that is not.
#
# Nothing here is heavy: three apt packages, six pip packages, one font download.
# Source media is not fetched by default - it lives in the Library and comes down
# on demand, see `pull` below.
#
#   ./setup.sh          deps + fonts, enough to render
#   ./setup.sh pull     also pull the B-rolls, reference videos and audio
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-$PWD/../.content-work}"
mkdir -p "$WORK/brand"

echo "== system =="
# tesseract is only needed by extract-script.py (reading copy off a reference).
# Everything else runs without it.
if ! command -v tesseract >/dev/null; then
  apt-get install -y -qq tesseract-ocr >/dev/null 2>&1 || \
    sudo apt-get install -y -qq tesseract-ocr
fi
echo "   $(tesseract --version 2>&1 | head -1)"

echo "== python =="
# ffmpeg comes from imageio-ffmpeg rather than apt on purpose: Playwright's
# bundled build is a minimal one that cannot open an ordinary h264 mp4, and the
# system one is not guaranteed to be there at all.
pip install --quiet -r requirements.txt
python3 - <<'PY'
import importlib.metadata as md
for m in ("numpy", "scipy", "pillow", "cairosvg", "imageio-ffmpeg", "pytesseract"):
    print(f"   {m:16} {md.version(m)}")
import imageio_ffmpeg
print(f"   ffmpeg           {imageio_ffmpeg.get_ffmpeg_exe()}")
PY

echo "== fonts =="
# Inter, SIL OFL. The generators expect brand/fonts/extras/ttf/Inter-*.ttf,
# which is the layout inside the official release zip.
if [ ! -f "$WORK/brand/fonts/extras/ttf/Inter-Bold.ttf" ]; then
  mkdir -p "$WORK/brand/fonts"
  curl -sSL --retry 3 -o /tmp/inter.zip \
    https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip
  python3 -c "import zipfile,sys; zipfile.ZipFile('/tmp/inter.zip').extractall(sys.argv[1])" \
    "$WORK/brand/fonts"
  rm -f /tmp/inter.zip
fi
echo "   $(ls "$WORK/brand/fonts/extras/ttf" | wc -l) faces in $WORK/brand/fonts/extras/ttf"

cp -n wordmark_paths.json "$WORK/brand/" 2>/dev/null || true

if [ "${1:-}" = "pull" ]; then
  echo "== source media =="
  : "${CFE:?set CFE CFK ACC DB first}" "${CFK:?}" "${ACC:?}" "${DB:?}"
  # The Library is the source of truth for footage, reference videos and music.
  # None of it belongs in git; all of it is one query away.
  python3 - "$WORK" <<'PY'
import json, os, subprocess, sys, urllib.request
work = sys.argv[1]
H = {"X-Auth-Email": os.environ["CFE"], "X-Auth-Key": os.environ["CFK"],
     "Content-Type": "application/json"}
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/accounts/{os.environ['ACC']}"
    f"/d1/database/{os.environ['DB']}/query",
    data=json.dumps({"sql": "select name,kind,source,media from vault_items "
                            "where kind in ('video','audio')"}).encode(),
    headers=H, method="POST")
rows = json.load(urllib.request.urlopen(req, timeout=120))["result"][0]["results"]
buckets = {"broll": "brolls", "ref": "refs", "audio": "audio"}
for r in rows:
    key = json.loads(r["media"])[0]["key"]
    base = os.path.basename(key)
    if r["kind"] == "audio":
        d = "audio"
    elif r["source"] == "instagram":
        d = "refs"
    elif r["name"].startswith("IMG_"):
        d = "brolls"
        base = r["name"] + ".mp4"
    else:
        continue
    out = os.path.join(work, d, base)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out):
        continue
    subprocess.run(["curl", "-sS", "--max-time", "240", "-o", out,
                    f"https://edits.51ultron.com/api/import-from-url/file?key={key}"],
                   check=False)
for d in ("brolls", "refs", "audio"):
    p = os.path.join(work, d)
    print(f"   {d:8} {len(os.listdir(p)) if os.path.isdir(p) else 0} files")
PY
  echo "   extracting reference audio and canvases"
  ( cd "$WORK" && for f in refs/*.mp4; do
      b=$(basename "$f" .mp4); mkdir -p refs/audio
      [ -f "refs/audio/$b.mp3" ] || python3 -c "
import imageio_ffmpeg,subprocess,sys
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-v','error','-i',sys.argv[1],
                '-vn','-ac','2','-ar','44100','-c:a','libmp3lame','-q:a','2',sys.argv[2]])
" "$f" "refs/audio/$b.mp3"
    done
    python3 "$OLDPWD/extract-inset.py" refs/*.mp4 2>&1 | grep distinct || true )
fi

cat <<EOF

ready. work dir: $WORK

  cd $WORK
  TOOL_LOGOS=$PWD/../apps/web/public/tools \\
    python3 $PWD/state-overlay.py brolls/IMG_2398.mp4 brand/out.mp4 receptionist
EOF

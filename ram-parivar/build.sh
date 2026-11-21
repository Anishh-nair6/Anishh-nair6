#!/bin/sh
# One command: picture → score → master. Needs the Lemo-Opuscar library (LIB) with its core packages installed.
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
cd "$HERE"
if sh "$LIB/core/render/mux.sh" out/video.mp4 out/mix.wav ram-parivar.mp4 30 1 2>/dev/null; then exit 0; fi
# shortcut: mux.sh needs ffmpeg 7+; with ffmpeg 6, master by hand (two-pass loudnorm, then check the audio length)
M=$(ffmpeg -hide_banner -i out/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
set -- $(echo "$M" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
ffmpeg -hide_banner -loglevel error -y -i out/mix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$1:measured_TP=$2:measured_LRA=$3:measured_thresh=$4:offset=$5:linear=true,volume=0.8dB" -ar 48000 out/mix_norm.wav
python3 -c "import subprocess as s;d=float(s.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','out/mix_norm.wav']));assert d>5.95,d"
ffmpeg -hide_banner -loglevel error -y -i out/video.mp4 -i out/mix_norm.wav -vf "noise=alls=4:allf=t,format=yuv420p" -c:v libx264 -crf 18 -preset slow -r 30 \
  -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -movflags +faststart ram-parivar.mp4
ffmpeg -hide_banner -i ram-parivar.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+I:|Peak:" | tail -2

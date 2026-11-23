#!/bin/sh
# One command, from script + voiceover to final.mp4, captions.srt and thumbnail.png.
#   ./make.sh preview     960x540 preview (veryfast)
#   ./make.sh final       1920x1080, x264 preset slow
# Needs: python3 + faster-whisper, node + playwright (Chromium), ffmpeg.
set -e
cd "$(dirname "$0")"
MODE=${1:-preview}
[ -f work/asr.json ] || HF_HUB_DISABLE_XET=1 python3 tools/transcribe.py voiceover.mp3 large-v3     # Whisper word timestamps (cached)
python3 tools/build_timeline.py script.txt work/asr.json voiceover.mp3                            # → timeline.json, captions.srt
python3 tools/mix.py voiceover.mp3 music.mp3 out/mix.wav
if [ "$MODE" = final ]; then SCALE=1; PRESET=slow; OUT=final.mp4; else SCALE=0.5; PRESET=veryfast; OUT=out/preview.mp4; fi
node tools/render.mjs --scale $SCALE --preset $PRESET --out out/video_$SCALE.mp4
ffmpeg -hide_banner -loglevel error -y -i out/video_$SCALE.mp4 -i out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
node tools/thumbnail.mjs
python3 tools/verify.py "$OUT"

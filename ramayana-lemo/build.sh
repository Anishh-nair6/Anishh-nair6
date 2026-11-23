#!/bin/sh
# One command: script + voiceover → final.mp4, captions.srt, thumbnail.png (Gilded Illumination, Lemo-Opuscar kit).
# Needs: python3 (faster-whisper, numpy, scipy, soundfile, numba), node + playwright (Chromium), ffmpeg.
set -e
cd "$(dirname "$0")"
[ -f work/asr.json ] || HF_HUB_DISABLE_XET=1 python3 tools/transcribe.py voiceover.mp3 large-v3   # Whisper word timings (cached)
python3 tools/build_timeline.py script.txt work/asr.json voiceover.mp3                           # → timeline.json, captions.srt
node tools/events.mjs                                                                            # sound cues from the picture
python3 audio/score.py                                                                           # → out/music.wav (original score)
python3 audio/mix.py voiceover.mp3 out/music.wav out/mix.wav                                     # duck, compress, -14 LUFS
node tools/render.mjs --scale 1 --preset "${PRESET:-slow}" --workers 4 --out out/video.mp4       # picture, 30 s chunks in parallel
ffmpeg -hide_banner -loglevel error -y -i out/video.mp4 -i out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4
node tools/thumbnail.mjs
python3 tools/verify.py final.mp4

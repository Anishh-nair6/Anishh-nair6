# Valmiki Ramayana series: Gilded Illumination video pipeline

Builds a faceless voiceover video for Dharma Manjari from two inputs, `script.txt` and `voiceover.mp3`.
Part 1 is Bala Kanda, Sarga 1, shlokas 1.1.1 to 1.1.8.

```
./make.sh preview     # 960x540 check render → out/preview.mp4
./make.sh final       # 1920x1080, x264 CRF 18 preset slow → final.mp4, captions.srt, thumbnail.png
```

## Making Part 2 or Part 3

1. Replace `voiceover.mp3`, and `music.mp3` too if you have one (optional, see below).
2. Replace `script.txt`, marked up as described below. Keep the shloka text exactly as you want it on screen.
3. Delete `work/asr.json` so Whisper transcribes the new audio. This takes about 25 min on 4 CPU cores with large-v3.
4. Run `./make.sh preview`, then read the timing summary that `build_timeline.py` prints and watch the preview. Then run `./make.sh final`.
5. For the thumbnail, change the title string in `window.thumb()` in `src/main.js`.

## script.txt markup

```
## coldopen                 a scene marker: ## <scene> [arg]
एक सवाल, जो …               a narration line (captioned)
---                         starts a new text "page" inside the scene (used by the cold open)
## shloka 1.1.8 bow         a shloka page: reference, then an optional motif (sage | veena | bow)
> इक्ष्वाकुवंशप्रभवो रामो नाम जनैः श्रुतः।       a shloka line, gold, shown exactly as written, never captioned
> नियतात्मा महावीर्यो द्युतिमान् धृतिमान् वशी॥
= इक्ष्वाकु वंश में …        the Hindi meaning: cream, under the shloka, captioned in the .srt
```

* Scenes: `coldopen`, `title`, `intro`, `series`, `ashram`, `shloka`, `lotus`, `narada`, `rama`, `ayodhya`, `close`, `endcard`.
* ElevenLabs `<break …/>` tags can stay in the file. They are stripped before display.
* A single `#` starts a comment line.
* Words that begin with राम (राम, रामो, रामः …) are drawn in vermilion with a gold edge on shloka pages. रामायण is excluded.

## How timing works (nothing is hand-timed)

1. `tools/transcribe.py` runs faster-whisper large-v3 on the voiceover and writes word timestamps to `work/asr.json`.
2. `tools/build_timeline.py` reduces the script and the transcript to a phonetic skeleton, so that ऋषि matches रिशी and ष matches श. It aligns the two character by character (global edit distance) and gives every script character the time of the transcript character it matched. Where Whisper skipped something, mostly the chanted Sanskrit, times are interpolated between the matched Hindi on either side. Line starts and ends are then snapped to the silences that ffmpeg `silencedetect` finds. The output is `timeline.json` (scenes → lines → per-character times) and `captions.srt`.
3. Each scene reads its line times from `timeline.json`. A shloka line appears when it starts being chanted, and the meaning appears when it starts being spoken.

## Rendering

* Everything on screen is drawn procedurally with Canvas 2D (`src/*.js`): the gold-leaf texture, the frame, the ornaments, the art and the particles. Nothing is a photo, stock image or generated image.
* `tools/render.mjs` opens `src/index.html` in Playwright's headless Chromium and draws frame *t*. It pipes the frames as JPEG (q 0.95) into ffmpeg/x264. The video is split into 30 s chunks spread over 4 browser pages. Finished chunks are cached in `out/chunks/` and reused until a source file or the timeline changes.
* Still frames for checking: `node tools/render.mjs --stills 12,80.5 --scale 1 --dir out/stills`. This also writes `report.json`, which flags any text box that crosses the inner frame rule.
* `tools/mix.py` loudness-normalises the voice to -14 LUFS (two-pass loudnorm, linear gain, true peak -1.5 dBTP). If `music.mp3` exists, it is set about 22 dB below the voice, ducked further under speech with a sidechain compressor, and faded in (4 s) and out (6 s).
* `tools/verify.py` checks the video duration against the voiceover, extracts one frame per scene plus one on the longest shloka line into `out/verify/`, and measures loudness and true peak.

## Files

| path | what |
|---|---|
| `script.txt` | voiceover script with scene markup (Part 1) |
| `voiceover.mp3` | the narration, which is the master clock |
| `timeline.json` | generated timing map |
| `captions.srt` | generated subtitles |
| `final.mp4`, `thumbnail.png` | deliverables (not committed to git, see `.gitignore`) |
| `fonts/` | Tiro Devanagari Sanskrit, Noto Serif Devanagari, Cinzel (SIL OFL 1.1, licences included) |
| `src/engine.js` | gold leaf, shimmer, frame, text layers, diya, dust |
| `src/art.js` | ashram, veena and halo, bow, Ayodhya, lotus petal |
| `src/scenes.js` | one function per scene type |
| `src/main.js` | composition, transitions (cross-dissolve, page turn, gold-dust wipe), captions, thumbnail |
| `tools/` | transcribe, build_timeline, render, mix, thumbnail, verify |

## Requirements

* Python 3 with `faster-whisper` and `numpy`
* Node 18 or newer with `playwright` (Chromium)
* ffmpeg

The Whisper model downloads from huggingface.co on first use.

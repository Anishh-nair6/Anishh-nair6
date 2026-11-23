# Valmiki Ramayana series, Gilded Illumination (Lemo-Opuscar kit)

Part 1 (Bala Kanda, Sarga 1, 1.1.1–1.1.8) for Dharma Manjari, rebuilt on the Lemo-Opuscar Gilded Illumination style:
flat mineral pigments in ink outlines, white-lead dots, gold leaf laid in squares that lights only where a light in the
picture crosses it, deep ultramarine night, a vellum speech scroll for subtitles, an original score.

```
./build.sh            # → final.mp4, captions.srt, thumbnail.png  (PRESET=veryfast ./build.sh for a quicker check)
```

## Part 2 / Part 3
1. Replace `voiceover.mp3` and `script.txt` (same markup as Part 1; see below). Delete `work/` so Whisper re-transcribes.
2. `./build.sh`. Read the timing summary printed by `build_timeline.py`; check `out/verify/sheet.png`.
3. Change the thumbnail title in `window.thumb` (src/film.js) and the close plaque text (`SCN.close`, src/scenes.js).

## script.txt markup
`## <scene> [arg]` starts a scene: `coldopen title intro series parts ashram shloka lotus rama ayodhya close endcard`.
`## shloka 1.1.8 bow` — reference and motif medallion (`sage`, `veena`, `bow`; default lotus).
`> …` shloka line (lettered in gold exactly as written; words beginning with राम in vermilion); `= …` meaning (on the
speech scroll, captioned); other lines are narration (speech scroll, captioned); `---` starts a new page in the cold open.
New scene types for later parts are one object each in `src/scenes.js` (`build`, `draw`, `lights`, optional `pools`).

## Timing
Line starts are snapped to the real speech onsets (the end of the pause before each line); shlokas and subtitles are written
at the pace of the voice itself (per-character times from the aligner); meaning icons appear on their Sanskrit word and light
on their Hindi word. Add the icons for a new shloka in `QUAL` (src/vignettes.js): Sanskrit word, Hindi word, label, icon.

## One tempo
All motion speeds live in `PACE` (src/paint.js): camera push and drift, pen speed, build time, the cloud-bank wipe,
the light rake. Change them there and every scene follows.

## Files
| path | what |
|---|---|
| `src/lib.js` | Lemo-Opuscar Gilded Illumination drawing kit (MIT) |
| `src/paint.js` | pace, pigment shapes, gold text, scrolls, plaques, quatrefoil medallions, diya, cached layers, the light pass |
| `src/scenes.js` | the scenes |
| `src/figures.js` | Maharshi Valmiki and Devarshi Narada (miniature-style profile figures; poses blend smoothly: ask, namaste, pluck, talk, nod, blink) |
| `src/vignettes.js` | the meaning picture under each shloka (dialogue, qualities as icon roundels, Narada's answer), timed to the chanted and spoken words |
| `src/film.js` | composition: cameras, cloud wipe, speech scroll, border, lights; cue export; thumbnail |
| `audio/score.py` | the original score (tanpura, veena-like strings, harp, bells, frame drum), from `work/events.json` |
| `audio/mix.py` | ducking, compression, two-pass loudnorm to −14 LUFS |
| `tools/` | transcribe (Whisper), build_timeline, events, render (Playwright + ffmpeg, 30 s chunks × 4), thumbnail, verify |
| `TREATMENT.md`, `CREDITS` | the plan, and every third-party asset with its licence |

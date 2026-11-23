#!/usr/bin/env python3
"""Audio master. The voiceover is the clock and is never time-shifted.
- voice: two-pass loudnorm to -14 LUFS integrated, true peak -1.5 dBTP (linear gain, no compression artefacts)
- music.mp3 (optional): looped/trimmed to the voice length, set ~22 dB below the voice's loudness, gently ducked further
  under speech (sidechain compressor), 4 s fade in, 6 s fade out.
Usage: python3 tools/mix.py voiceover.mp3 [music.mp3] out/mix.wav
"""
import json, os, re, subprocess, sys
voice, out = sys.argv[1], sys.argv[-1]
music = sys.argv[2] if len(sys.argv) > 3 else None
if music and not os.path.exists(music): music = None
run = lambda a: subprocess.run(a, capture_output=True, text=True)
dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice]).stdout)
def loud(path, pre=''):
    r = run(['ffmpeg', '-hide_banner', '-i', path, '-af', (pre + ',' if pre else '') + 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']).stderr
    return json.loads(r[r.rindex('{'):r.rindex('}') + 1])
m = loud(voice)
vchain = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
if not music:
    print('music.mp3 not found: voice only')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', voice, '-af', vchain, '-ar', '48000', '-ac', '2', out], check=True)
else:
    mm = loud(music); gain = (-14 - 22) - float(mm['input_i'])
    print(f'music: {mm["input_i"]} LUFS → gain {gain:+.1f} dB (≈ -22 dB under the voice), ducked under speech')
    fc = (f"[0:a]{vchain},asplit=2[v][sc];"
          f"[1:a]aloop=loop=-1:size=2e9,atrim=0:{dur},asetpts=N/SR/TB,aresample=48000,volume={gain:.2f}dB,"
          f"afade=t=in:st=0:d=4,afade=t=out:st={max(0, dur - 6):.2f}:d=6[m];"
          f"[m][sc]sidechaincompress=threshold=0.05:ratio=4:attack=40:release=600[md];"
          f"[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.84[o]")
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', voice, '-i', music, '-filter_complex', fc, '-map', '[o]', '-ac', '2', '-t', f'{dur}', out], check=True)
r = run(['ffmpeg', '-hide_banner', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]; pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1]
print(f'mix → {out}: {I} LUFS integrated, true peak {pk} dBFS')

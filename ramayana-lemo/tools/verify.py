#!/usr/bin/env python3
"""Checks before delivery: duration vs voiceover, 12+ frames (one per scene, plus the longest shloka line), audio levels.
Usage: python3 tools/verify.py final.mp4   → out/verify/*.png, out/verify/sheet.png, printed report"""
import json, os, re, subprocess, sys
vid = sys.argv[1] if len(sys.argv) > 1 else 'final.mp4'
run = lambda a: subprocess.run(a, capture_output=True, text=True)
probe = lambda p, k: run(['ffprobe', '-v', 'error', '-show_entries', k, '-of', 'csv=p=0', p]).stdout.strip()
dv, da = float(probe(vid, 'format=duration')), float(probe('voiceover.mp3', 'format=duration'))
vs = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', vid]).stdout)['streams']
v = next(s for s in vs if s['codec_type'] == 'video'); a = next(s for s in vs if s['codec_type'] == 'audio')
print(f"video {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} fps | audio {a['codec_name']} {int(a.get('bit_rate', 0)) // 1000} kb/s {a['sample_rate']} Hz")
print(f'duration {dv:.3f}s vs voiceover {da:.3f}s → diff {abs(dv - da):.3f}s ' + ('OK' if abs(dv - da) <= .1 else 'FAIL'))
TL = json.load(open('timeline.json', encoding='utf-8'))
times = []
for s in TL['scenes']:
    mid = s['start'] + (s['end'] - s['start']) * .62
    if s['type'] == 'shloka' and s['lines']: mid = max(l['end'] for l in s['lines'] if l['kind'] in ('shloka', 'meaning')) + .6
    times.append((min(mid, s['end'] - .3), f"{s['type']} {s['arg']}".strip()))
sl = [(len(l['text']), l, s) for s in TL['scenes'] for l in s['lines'] if l['kind'] == 'shloka']
if sl:
    _, l, s = max(sl, key=lambda x: x[0]); times.append((min(s['end'] - .3, l['end'] + .5), 'longest shloka line: ' + l['text']))
times.sort()
os.makedirs('out/verify', exist_ok=True)
for f in os.listdir('out/verify'): os.remove(os.path.join('out/verify', f))
for i, (t, lab) in enumerate(times):
    f = f'out/verify/{i:02d}_{t:07.2f}.png'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t:.3f}', '-i', vid, '-frames:v', '1', f]); print(f'  frame {f}  ({lab})')
cols = 4; rows = (len(times) + cols - 1) // cols
run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', 'out/verify/[0-9]*.png', '-vf', f'scale=640:-1,tile={cols}x{rows}:padding=6', '-frames:v', '1', 'out/verify/sheet.png'])
r = run(['ffmpeg', '-hide_banner', '-i', vid, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]; pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1]
r2 = run(['ffmpeg', '-hide_banner', '-i', vid, '-af', 'astats=metadata=0', '-f', 'null', '-']).stderr
clip = re.findall(r'Number of samples clipped: (\d+)', r2) or re.findall(r'Peak count: (\d+)', r2)
print(f'audio: integrated {I} LUFS, true peak {pk} dBFS → ' + ('no clipping' if float(pk) < 0 else 'CLIPPING'))

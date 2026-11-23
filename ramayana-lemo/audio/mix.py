#!/usr/bin/env python3
"""Mix: voice on top, the score under it.
- the voice is compressed lightly (library sfx.compress) and never moved in time: it is the clock
- the music sits about 20 dB under the voice while he speaks, and rises about 8 dB in the pauses
  (ducking follows the voice envelope: 80 ms attack, 600 ms release)
- master: two-pass loudnorm to -14 LUFS, true peak -1.5 dBTP
Usage: python3 audio/mix.py voiceover.mp3 out/music.wav out/mix.wav
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as X
SR = X.SR
voice_p, music_p, out_p = sys.argv[1:4]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice_p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.float32).astype(np.float64)
m, _ = sf.read(music_p); m = m[:len(v)]
if len(m) < len(v): m = np.pad(m, ((0, len(v) - len(m)), (0, 0)))
# voice envelope (20 ms RMS) and its active level
w = int(.02 * SR); env = np.sqrt(np.convolve(v * v, np.ones(w) / w, 'same') + 1e-12)
act = env > 10 ** (-42 / 20) * env.max() / 10 ** (-6 / 20)
v_rms = np.sqrt((v[act] ** 2).mean()); m_rms = np.sqrt((m.mean(1) ** 2).mean())
# ducking gain: speech → 0 dB on the "under" level, pause → +8 dB; smoothed attack/release
speech = (env > v_rms * 10 ** (-24 / 20)).astype(np.float64)
target = np.where(speech > 0, 0.0, 8.0)
step = int(.005 * SR); tg = target[::step]; g = np.zeros_like(tg); a_att, a_rel = np.exp(-step / (.08 * SR)), np.exp(-step / (.6 * SR)); cur = 8.0
for i, x in enumerate(tg):
    a = a_att if x < cur else a_rel; cur = a * cur + (1 - a) * x; g[i] = cur
gain_db = np.interp(np.arange(len(v)), np.arange(len(g)) * step, g)
under = v_rms / m_rms * 10 ** (-20 / 20)                       # music ≈ 20 dB under the voice while speaking
mus = m * (under * 10 ** (gain_db / 20))[:, None]
vc = X.compress(v.astype(np.float32), thr=.35 * np.abs(v).max(), ratio=2.5, att=.004, rel=.12)
mix = mus + np.stack([vc, vc], 1)
mix = np.stack([X.limit(mix[:, 0], .95), X.limit(mix[:, 1], .95)], 1)
tmp = out_p + '.pre.wav'; sf.write(tmp, mix.astype(np.float32), SR)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
M = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={M['input_i']}:measured_TP={M['input_tp']}:measured_LRA={M['input_lra']}:measured_thresh={M['input_thresh']}:offset={M['target_offset']}:linear=true", '-ar', str(SR), out_p], check=True)
os.remove(tmp)
# report: voice-to-music difference while speaking and in pauses
sp = speech > 0
d_sp = 20 * np.log10(np.sqrt((v[sp] ** 2).mean()) / np.sqrt((mus[sp].mean(1) ** 2).mean()))
d_pz = 20 * np.log10(v_rms / np.sqrt((mus[~sp].mean(1) ** 2).mean()))
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', out_p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]; pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1]
print(f'mix → {out_p}: {I} LUFS, true peak {pk} dBFS; voice over music: {d_sp:.1f} dB while speaking, {d_pz:.1f} dB vs music in pauses')

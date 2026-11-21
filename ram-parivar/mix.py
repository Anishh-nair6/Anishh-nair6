"""Score and foley for Shri Ram Parivar, synthesized (no samples): harp (Karplus-Strong), bells, a soft organ drone,
frame drum, temple air, flame, quill. Cue times come from events.json (window.EV). Writes out/mix.wav (48 kHz stereo)."""
import json, os, sys
import numpy as np
import soundfile as sf
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, brown, thump, compress, limit, add

HERE = os.path.dirname(os.path.abspath(__file__))
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = EVJ['dur'], {e['type'] + str(e.get('i', '')): e['t'] for e in EVJ['ev']}
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
buf = np.zeros((int(DUR * SR) + 1, 2))

def harp(m, d=2.6, v=.5, seed=0):   # plucked string: Karplus-Strong with a soft, slightly bright excitation
    n, p = int(d * SR), max(2, int(round(SR / hz(m))))
    rng = np.random.default_rng(seed + m)
    y = np.zeros(n); y[:p] = lp(rng.uniform(-1, 1, p), 5200) * v
    loss = .996 if m < 60 else .993
    for i in range(p, n): y[i] = loss * .5 * (y[i - p] + y[i - p + 1])
    return hp(y * env_exp(len(y) / SR, d * .55), 70)

def bell(m, d=3.0, v=.4):   # inharmonic partials, each with its own decay
    tt = t_(d); f = hz(m); y = np.zeros_like(tt)
    for r, a, tau in [(1, 1, 1.4), (2.0, .55, .9), (2.76, .4, .6), (5.4, .22, .3), (8.93, .12, .18)]:
        y += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / tau)
    return y * v * np.minimum(1, tt / .002)

def organ(ms, d, v=.12, att=.6):   # a soft flue register: a few harmonics, slow speech, gentle wind wobble
    tt = t_(d); y = np.zeros_like(tt)
    for m in ms:
        f = hz(m) * (1 + .0015 * np.sin(2 * np.pi * 4.8 * tt))
        for k, a in [(1, 1), (2, .35), (3, .12), (4, .06)]: y += a * np.sin(2 * np.pi * f * k * tt)
    env = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / .25)
    return lp(y * env * v / len(ms), 2400)

def quill(d=.55):
    y = hp(noise(d), 2500) * .05; tt = t_(d)
    return y * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * tt))) * np.minimum(1, (d - tt) / .05)

def flame(d):
    return bp(noise(d), 300, 1400) * .012 * (1 + .6 * np.sin(2 * np.pi * 3.1 * t_(d)))

# ambience and the lamp
add(buf, lp(brown(DUR), 900) * .05, 0, 1.0)
add(buf, flame(EV['spark']), 0, 1.0, .05)
add(buf, flame(DUR - EV['touch'] - .3), EV['touch'] + .3, .8, .05)

# harp: the first note, then an arpeggio up through D dorian as the family is painted in
add(buf, harp(50, 3.0, .6), 0.0, 1.0, -.1)
for i, m in enumerate([57, 62, 65, 69, 67, 64]):
    add(buf, harp(m, 2.4, .45, i), EV['paint0'] + i * (60 / 90 / 2), .9, -.3 + .12 * i)
for k in ['paint0', 'paint1', 'paint2']: add(buf, thump(.5, 82), EV[k], .5)
add(buf, thump(.35, 70), EV['chord'], .5)

# the held note through the silence, the drone under everything
add(buf, organ([38, 50], DUR - .5, .1, 1.0), .5, 1.0)
add(buf, organ([62], EV['touch'] - EV['silence'] + .2, .07, .15), EV['silence'], 1.0, .1)

# the plaque is written
add(buf, quill(), EV['write'], 1.0, 0)

# the touch: bells and a harp roll; the rake: one more bell; the chord with the Picardy third
for j, m in enumerate([74, 81, 86]): add(buf, bell(m, 2.6, .32 - .07 * j), EV['touch'] + .03 * j, 1.0, [-.2, .25, 0][j])
for j, m in enumerate([62, 65, 69, 74]): add(buf, harp(m, 2.4, .4, 10 + j), EV['touch'] + .05 + .06 * j, .9, -.2 + .13 * j)
add(buf, bell(81, 1.6, .2), EV['rake'], 1.0, .3)
for j, m in enumerate([50, 57, 62, 66, 69]): add(buf, harp(m, 1.2, .45, 20 + j), EV['chord'] + .04 * j, .9, -.25 + .12 * j)
add(buf, organ([50, 57, 66], DUR - EV['chord'], .09, .2), EV['chord'], 1.0)

fade = np.minimum(1, (DUR - np.arange(len(buf)) / SR) / .3)[:, None]   # breathe out over the last 0.3 s
mix = np.stack([limit(compress(c, thr=.3, ratio=2.5), .9) for c in (buf * fade).T], axis=1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix.wav', mix.shape, 'peak', float(np.abs(mix).max()))

#!/usr/bin/env python3
"""Original score for Part 1, written from the film's own cue list (work/events.json) and the voice.

Instruments (all synthesized, no samples): a tanpura drone (four plucked strings with jawari buzz, Pa-Sa-Sa-Sa low),
a veena-like melody (the library's Karplus-Strong 'guqin' model, with meend slides and gamak vibrato), a harp for
chords, temple bells and small hand bells (additive, inharmonic partials) for the gold, a soft frame drum.
Raga colour: Bhupali (Sa Re Ga Pa Dha) on D; after the turn in Ayodhya, komal Ga and Ni (Kafi colour) for the shadow.

Writes out/music.wav (stereo, 48 kHz) as long as the voiceover.
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sfx as X
import pluck as PL

SR = X.SR
ROOT = os.path.dirname(HERE)
EV = json.load(open(os.path.join(ROOT, 'work/events.json')))
DUR = EV['duration']
N = int(DUR * SR) + SR
bus = {k: np.zeros((N, 2), np.float32) for k in ('drone', 'melody', 'bells', 'drum', 'fx')}
SA = 62                                     # Sa = D4
BHUP = [0, 2, 4, 7, 9]                       # Sa Re Ga Pa Dha
KAFI = [0, 2, 3, 7, 10]                      # with komal Ga, komal Ni
def deg(i, scale=BHUP, base=SA):             # scale degree (can be negative or above an octave) → midi
    o, k = divmod(i, len(scale)); return base + 12 * o + scale[k]
ev = lambda kind: [e for e in EV['ev'] if e['type'] == kind]
def first(kind, default=None): e = ev(kind); return e[0]['t'] if e else default

# ---------------------------------------------------------------- sounds
def temple_bell(f0=196., d=7., v=1.):
    t = np.arange(int(d * SR)) / SR
    parts = [(.5, .5, 5.5), (1., 1., 4.), (1.183, .55, 3.), (1.506, .45, 2.4), (2., .4, 2.), (2.514, .3, 1.4), (2.662, .22, 1.2), (3.011, .18, .9), (4.166, .1, .6)]
    x = sum(a * np.sin(2 * np.pi * f0 * r * t + r) * np.exp(-t / tau) * (1 + .004 * np.sin(2 * np.pi * 3.1 * t)) for r, a, tau in parts)
    x[:int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR))
    strike = X.bp(X.noise(.03), 1500, 6000) * np.exp(-np.arange(int(round(.03 * SR))) / (.004 * SR)) * .3
    x[:len(strike)] += strike
    return (X.norm(x) * v).astype(np.float32)
def hand_bell(f0=1318., v=.6): return temple_bell(f0, 2.4, v)
def tanpura(m, v=.35):
    return PL.pluck('shamisen', m, None, v, t60=7.5, damp=.3, bright=.45, buzz=.45, thr=.12, bmix=.55, noise=.02)
def veena(m, dur, v=.6, **kw): return PL.pluck('guqin', m, dur, v, **kw)
def harp(m, dur=None, v=.5): return PL.pluck('harp', m, dur, v)

def put(name, x, at, gain=1., pan=0.):
    if at < DUR + 1: X.add(bus[name], x, at, gain, pan)

# a melodic phrase: list of (scale degree, beats, extra) at a tempo
def phrase(at, notes, beat=.55, scale=BHUP, v=.6, gain=1., pan=-.1):
    t = at
    for n in notes:
        d, b = n[0], n[1]; kw = n[2] if len(n) > 2 else {}
        if d is not None: put('melody', veena(deg(d, scale), b * beat * 1.6, v, **kw), t, gain, pan)
        t += b * beat
    return t

# ---------------------------------------------------------------- the drone: the whole film, Pa Sa Sa Sa (low), one cycle every 3.2 s
turn = first('turn', 1e9)
cyc = [SA - 12 - 5, SA - 12, SA - 12, SA - 24]
t = 0.2; i = 0
while t < DUR - 1:
    v = .32 * (1.0 if not (turn < t < turn + 2.5) else .55)
    put('drone', tanpura(cyc[i % 4], v), t, 1., [-.35, .1, .25, -.1][i % 4]); t += .8; i += 1

# ---------------------------------------------------------------- melody and bells, by cue
MEEND = {'bend': [(0.0, -1), (0.18, 0)]}                    # slide into the note from below
GAMAK = {'vib': (5.5, .25, .25)}
phrase(first('light', .3) + .2, [(0, 2, MEEND), (2, 1), (4, 1), (3, 3, GAMAK)], beat=.6, v=.5, gain=.9)          # cold open: the question
put('bells', temple_bell(147, 7, .9), first('light', .3), .55, 0)                                                   # the diya is lit
tt = first('title')
if tt:
    put('bells', temple_bell(196, 6, 1), tt + .1, .6, 0)
    put('melody', harp(SA - 12, None, .6), tt + .1, .8); put('melody', harp(SA - 5, None, .5), tt + .2, .7); put('melody', harp(SA, None, .5), tt + .3, .7)
    phrase(tt + 1.2, [(5, 1, MEEND), (4, .5), (3, .5), (2, 1), (0, 3, GAMAK)], beat=.6, v=.55)

for w in ev('wipe'):                                         # every cloud wipe: the same rising four notes and a soft whoosh
    to = w['to']; a = w['t']
    put('fx', X.lp(X.whoosh(1.6, .35), 2500), a, .55, 0)
    if to in ('shloka',): phrase(a, [(0, .5), (2, .5), (4, .5), (5, 1.5, GAMAK)], beat=.42, v=.45, gain=.8)
    elif to in ('lotus', 'rama', 'close', 'endcard'): pass
    else: phrase(a, [(4, .5), (5, .5), (7, .5), (5, 1.5, GAMAK)], beat=.42, v=.45, gain=.8)

for p in ev('petal'):                                        # the sixteen petals: one bell each, rising through Bhupali
    k = p['k']; m = deg(k % 10, BHUP, SA + 12 if k < 10 else SA)
    put('bells', hand_bell(440 * 2 ** ((m + 12 - 69) / 12), .45), p['t'], .5, -.4 + .8 * (k % 4) / 3)
    if k % 4 == 0: put('melody', veena(deg(k // 4 * 2 - 2), 1.6, .5, **MEEND), p['t'], .7)
pl = ev('petal')
if pl: put('bells', temple_bell(220, 6, 1), pl[-1]['t'] + 1.2, .6)

th = first('touch')
if th:                                                       # the touch on राम: the fullest bar of the film
    put('bells', temple_bell(147, 9, 1), th, .9); put('bells', temple_bell(294, 6, .7), th + .02, .4, .3)
    for k, m in enumerate([SA - 24, SA - 12, SA - 5, SA, SA + 4, SA + 7]): put('melody', harp(m, None, .7), th + k * .06, .8, -.3 + k * .12)
    phrase(th + 1.0, [(7, 1, MEEND), (6, .5), (5, .5), (7, 1), (9, 2, GAMAK), (7, 2)], beat=.5, v=.62)
    put('drum', X.thump(1, 70), th, .8)
    put('fx', X.lp(X.whoosh(.8, .6), 1800), th - .7, .6)

fs = first('festive')
if fs:                                                       # Ayodhya celebrates: veena in running notes, the frame drum, hand bells
    beat = .36; t = fs + .3; pat = [0, 2, 4, 7, 4, 2, 4, 7, 9, 7, 4, 2]; k = 0
    while t < turn - .2:
        put('melody', veena(deg(pat[k % len(pat)]), beat * 1.4, .45), t, .55, .15)
        if k % 4 == 0: put('drum', X.thump(.9, 82), t, .55)
        if k % 4 == 2: put('drum', X.thump(.5, 120), t, .35)
        if k % 8 == 6: put('bells', hand_bell(1760, .35), t, .3, .4)
        t += beat; k += 1
if turn < 1e8:                                               # the turn: the band stops; after a breath, one low bell and komal notes
    put('bells', temple_bell(110, 8, 1), turn + 1.6, .7)
    phrase(turn + 3.0, [(0, 1, MEEND), (-1, 1), (-2, 2, GAMAK), (-3, 1), (-4, 3, MEEND)], beat=.7, scale=KAFI, v=.5, gain=.85)

cl = first('close')
if cl: phrase(cl, [(2, 1, MEEND), (4, 1), (5, 2), (4, 1), (2, 1), (0, 3, GAMAK)], beat=.62, v=.55)
for b in ev('bell'): put('bells', hand_bell(1318, .55), b['t'], .55, .2); put('bells', hand_bell(1975, .3), b['t'] + .12, .3, -.2)
en = first('end')
if en:                                                       # the end card: the opening phrase again, now resolved on Sa with the harp
    tt2 = phrase(en + .4, [(0, 1, MEEND), (2, 1), (4, 1), (7, 2, GAMAK), (5, 1), (4, 1), (2, 1), (0, 3, GAMAK)], beat=.6, v=.55)
    for k, m in enumerate([SA - 12, SA - 5, SA, SA + 4]): put('melody', harp(m, None, .55), tt2 - .4 + k * .08, .7)
    put('bells', temple_bell(147, 7, .8), min(DUR - 4, tt2), .5)

# ---------------------------------------------------------------- stems → music.wav (balanced, gentle fade in and out)
G = {'drone': .9, 'melody': .85, 'bells': .55, 'drum': .6, 'fx': .4}
mix = sum(bus[k] * G[k] for k in bus)[:int(DUR * SR)]
fi, fo = int(3 * SR), int(6 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None] ** 1.5; mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = X.hp(mix.T, 45).T.astype(np.float32)
pk = np.abs(mix).max(); mix *= .8 / pk
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
import soundfile as sf
sf.write(os.path.join(ROOT, 'out/music.wav'), mix, SR)
print(f'music → out/music.wav  {DUR:.2f}s')

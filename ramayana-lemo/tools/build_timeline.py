#!/usr/bin/env python3
"""Map every script.txt line onto the voiceover using Whisper word timestamps.

Usage: python3 tools/build_timeline.py [script.txt] [work/asr.json] [voiceover.mp3]
Writes timeline.json and captions.srt, prints a summary.

script.txt format (see README.md):
  ## <scene> [arg]        starts a scene: coldopen, title, intro, ashram, shloka <ref>, lotus, narada, rama, ayodhya, close, endcard
  > Sanskrit line         a shloka line, shown exactly as written (gold, large); not captioned
  = Hindi meaning         the meaning, shown under the shloka (cream) and captioned
  anything else           narration, captioned
  <break .../> tags are stripped for display. Lines starting with a single '#' are comments.

Alignment: the script text and the ASR text are reduced to a phonetic skeleton (so ऋषि/रिशी, ष/श, ी/ि match), aligned
with a global edit-distance alignment over characters, and every script character gets the time of the ASR character it
matches; unmatched characters are interpolated between matched neighbours. Line starts are then snapped to nearby
silence ends found by ffmpeg silencedetect.
"""
import json, re, subprocess, sys, unicodedata
import numpy as np

SCRIPT = sys.argv[1] if len(sys.argv) > 1 else 'script.txt'
ASR = sys.argv[2] if len(sys.argv) > 2 else 'work/asr.json'
AUDIO = sys.argv[3] if len(sys.argv) > 3 else 'voiceover.mp3'
FPS = 30

BREAK = re.compile(r'<break[^>]*/?>')

def parse_script(path):
    secs, cur, page = [], None, False
    for raw in open(path, encoding='utf-8'):
        line = raw.rstrip('\n')
        if line.strip() == '---': page = True; continue
        if line.startswith('## '):
            parts = line[3:].strip().split(None, 1)
            cur = {'type': parts[0], 'arg': parts[1] if len(parts) > 1 else '', 'lines': []}
            secs.append(cur); continue
        if line.startswith('#'): continue
        brk = sum(float(x) for x in re.findall(r'time="([\d.]+)s?"', line))
        text = BREAK.sub('', line).strip()
        if not text: continue
        kind = 'narration'
        if text.startswith('>'): kind, text = 'shloka', text[1:].strip()
        elif text.startswith('='): kind, text = 'meaning', text[1:].strip()
        if cur is None: cur = {'type': 'coldopen', 'arg': '', 'lines': []}; secs.append(cur)
        cur['lines'].append({'kind': kind, 'text': re.sub(r'\s+', ' ', text), 'break': brk, 'page': page}); page = False
    return secs

# ---- phonetic skeleton of Devanagari (and a little Latin)
EQ = {'ष': 'स', 'श': 'स', 'ण': 'न', 'ञ': 'न', 'ङ': 'न', 'ऋ': 'र', 'ृ': 'र', 'ी': 'ि', 'ू': 'ु', 'ई': 'इ', 'ऊ': 'उ', 'ऐ': 'ए', 'औ': 'ओ',
      'ै': 'े', 'ौ': 'ो', 'व': 'ब', 'ं': 'न', 'ँ': 'न', 'ः': 'ह', 'ॉ': 'ा', 'ॅ': 'े', 'ढ': 'ड', 'ठ': 'ट', 'ध': 'द', 'थ': 'त', 'भ': 'ब',
      'घ': 'ग', 'ख': 'क', 'छ': 'च', 'झ': 'ज', 'फ': 'प', 'ऽ': ''}
DROP = set('़्॒॑।॥ॐ')
def skel_chars(s):
    """yield (skeleton_char, index_in_s)"""
    s2 = unicodedata.normalize('NFD', s)
    # NFD splits nukta forms; keep index map approximately by walking original string
    out = []
    for i, ch in enumerate(s):
        for c in unicodedata.normalize('NFD', ch):
            if c in DROP or not (c.isalpha() or unicodedata.category(c).startswith('M')): continue
            c = EQ.get(c, c)
            if not c: continue
            out.append((c.lower(), i))
    return out

def align(a, b):
    """global alignment of sequences a, b (lists of chars) -> list of (i, j) matched pairs"""
    n, m = len(a), len(b)
    A = np.array([ord(c) for c in a], np.int32); B = np.array([ord(c) for c in b], np.int32)
    D = np.zeros((n + 1, m + 1), np.int32); D[0] = np.arange(m + 1)
    P = np.zeros((n + 1, m + 1), np.uint8)  # 0 diag, 1 up (skip a), 2 left (skip b)
    P[0, 1:] = 2; P[1:, 0] = 1
    jj = np.arange(m + 1)
    for i in range(1, n + 1):
        cost = np.where(B == A[i - 1], 0, 1)
        diag = D[i - 1, :-1] + cost
        up = D[i - 1, 1:] + 1
        best = np.minimum(diag, up); src = np.where(diag <= up, 0, 1).astype(np.uint8)
        row = np.empty(m + 1, np.int32); row[0] = i; row[1:] = best
        # insertion along the row: row[j] = min(row[j], row[k] + (j-k))  -> cummin trick
        cm = np.minimum.accumulate(row - jj) + jj
        left = cm < row
        P[i, 1:] = np.where(left[1:], 2, src); P[i, 0] = 1
        D[i] = np.minimum(row, cm)
    i, j, pairs = n, m, []
    while i > 0 or j > 0:
        p = P[i, j]
        if p == 0:
            if a[i - 1] == b[j - 1]: pairs.append((i - 1, j - 1))
            i -= 1; j -= 1
        elif p == 1: i -= 1
        else: j -= 1
    return pairs[::-1], int(D[n, m])

def silences(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'silencedetect=noise=-38dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    return starts, ends

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))

def main():
    secs = parse_script(SCRIPT)
    asr = json.load(open(ASR, encoding='utf-8'))
    dur = duration(AUDIO)
    # ASR chars with times
    bt, bc = [], []
    for sgm in asr:
        for w in sgm['words']:
            sk = skel_chars(w['w'])
            for k, (c, _) in enumerate(sk):
                bc.append(c); bt.append(w['s'] + (w['e'] - w['s']) * (k + .5) / len(sk))
    # script chars
    ac, aref = [], []   # aref: (sec, line, char index)
    for si, s in enumerate(secs):
        for li, l in enumerate(s['lines']):
            for c, ix in skel_chars(l['text']):
                ac.append(c); aref.append((si, li, ix))
    print(f'aligning {len(ac)} script chars with {len(bc)} ASR chars …', file=sys.stderr)
    pairs, dist = align(ac, bc)
    t = np.full(len(ac), np.nan)
    for i, j in pairs: t[i] = bt[j]
    # enforce monotonic, interpolate gaps
    good = ~np.isnan(t); idx = np.arange(len(ac))
    if good.sum() < 2: sys.exit('alignment failed')
    t = np.interp(idx, idx[good], t[good])
    t = np.maximum.accumulate(t)
    match_rate = good.mean()
    # per line times and per-char times
    pos = 0
    for si, s in enumerate(secs):
        for li, l in enumerate(s['lines']):
            n = len(skel_chars(l['text']))
            lt = t[pos:pos + n]; lg = good[pos:pos + n]; refs = aref[pos:pos + n]; pos += n
            l['start'], l['end'] = float(lt[0]), float(lt[-1])
            l['match'] = float(lg.mean()) if n else 0
            l['chars'] = [[int(r[2]), round(float(x), 3)] for r, x in zip(refs, lt)]
    # snap starts to silence ends; ends to silence starts
    s_st, s_en = silences(AUDIO)
    allines = [l for s in secs for l in s['lines']]
    for k, l in enumerate(allines):
        c = [e for e in s_en if l['start'] - .7 <= e <= l['start'] + .35]
        if c: l['start'] = max(c) if max(c) <= l['start'] + .35 else l['start']
        c = [b for b in s_st if l['end'] - .3 <= b <= l['end'] + .8]
        if c: l['end'] = min(c)
        l['start'] = max(0.0, l['start'] - .08); l['end'] = min(dur, l['end'] + .12)
    # chanted shlokas that Whisper did not transcribe: spread the block of lines over the voiced gap between the
    # neighbouring matched lines, cutting at the silences nearest to the length-proportional split points
    sil = list(zip(s_st, s_en)); k = 0
    while k < len(allines):
        if allines[k]['kind'] == 'shloka' and allines[k]['match'] < .5:
            j = k
            while j + 1 < len(allines) and allines[j + 1]['kind'] == 'shloka' and allines[j + 1]['match'] < .5: j += 1
            blk = allines[k:j + 1]
            g0 = allines[k - 1]['end'] if k > 0 else 0.0
            g1 = allines[j + 1]['start'] if j + 1 < len(allines) else dur
            # the meaning that follows may itself have been pulled early: trust the silence structure instead
            inside = [(a, b) for a, b in sil if b > g0 - .3 and a < g1 + .3]
            v0 = max([b for a, b in inside if a <= g0 + .4] + [g0])
            # if a pause ends shortly before the next matched line, that line really starts there (its first words were
            # absorbed by the alignment): end the chant at the pause and move the next line's start to the pause end
            near = [(a, b) for a, b in inside if g1 - 1.6 <= b <= g1 + .05 and a > v0 + 2]
            if near:
                a, b = max(near, key=lambda x: x[1]); v1 = a
                if j + 1 < len(allines): allines[j + 1]['start'] = round(b, 3)
            else: v1 = min([a for a, b in inside if b >= g1 - .4] + [g1])
            lens = [max(1, len(l['text'])) for l in blk]; tot = sum(lens); cuts = [v0]; acc = 0
            for L in lens[:-1]:
                acc += L; target = v0 + (v1 - v0) * acc / tot
                cand = [((a + b) / 2, a, b) for a, b in inside if v0 + .5 < a < v1 - .5]
                if cand: m, a, b = min(cand, key=lambda c: abs(c[0] - target)); cuts.append((a, b))
                else: cuts.append((target, target))
            cuts.append(v1)
            for n, l in enumerate(blk):
                st = cuts[n] if n == 0 else cuts[n][1]
                en = cuts[n + 1] if n + 1 == len(blk) else cuts[n + 1][0]
                l['start'], l['end'] = round(st, 3), round(en, 3)
                print(f"  chant fallback: {l['text'][:30]}… {st:.2f}–{en:.2f}", file=sys.stderr)
            k = j + 1
        else: k += 1
    for a, b in zip(allines, allines[1:]):
        if b['start'] < a['end']: m = (a['end'] + b['start']) / 2; a['end'], b['start'] = m, m
    # scene spans: each scene starts a little before its first line, ends where the next begins
    for i, s in enumerate(secs):
        s['start'] = 0.0 if i == 0 else None
    for i, s in enumerate(secs):
        if i == 0: continue
        prev_end = secs[i - 1]['lines'][-1]['end'] if secs[i - 1]['lines'] else secs[i - 1]['start']
        first = s['lines'][0]['start'] if s['lines'] else prev_end
        s['start'] = round(max(prev_end, first - .6) if first - prev_end > .6 else (prev_end + first) / 2, 3)
    for i, s in enumerate(secs):
        s['end'] = secs[i + 1]['start'] if i + 1 < len(secs) else dur
    # captions: narration + meaning, max 2 lines (~80 chars), split at word boundaries, timed by char times
    caps = []
    for s in secs:
        for l in s['lines']:
            if l['kind'] == 'shloka': continue
            words = l['text'].split(' '); chunks, cur = [], ''
            for w in words:
                if cur and len(cur) + 1 + len(w) > 78: chunks.append(cur); cur = w
                else: cur = (cur + ' ' + w).strip()
            if cur: chunks.append(cur)
            # merge a tiny tail chunk
            if len(chunks) > 1 and len(chunks[-1]) < 18: tail = chunks.pop(); chunks[-1] += ' ' + tail
            ctimes = l['chars']; off = 0
            for ch in chunks:
                a0, a1 = off, off + len(ch); off = a1 + 1
                inside = [x for ix, x in ctimes if a0 <= ix < a1]
                st = inside[0] if inside else l['start']; en = inside[-1] if inside else l['end']
                caps.append({'text': ch, 'start': st, 'end': en, 'scene': s['type'], 'kind': l['kind']})
            caps[-len(chunks)]['start'] = l['start']; caps[-1]['end'] = l['end']
    for a, b in zip(caps, caps[1:]):
        a['end'] = min(max(a['end'] + .25, a['start'] + 1.0), b['start'])
    caps[-1]['end'] = min(dur, caps[-1]['end'] + .4)
    out = {'duration': dur, 'fps': FPS, 'frames': int(round(dur * FPS)), 'match_rate': round(float(match_rate), 3),
           'scenes': [{k: s[k] for k in ('type', 'arg', 'start', 'end')} | {'lines': [{k: l[k] for k in ('kind', 'text', 'start', 'end', 'match', 'page', 'chars')} for l in s['lines']]} for s in secs],
           'captions': [{k: round(v, 3) if isinstance(v, float) else v for k, v in c.items()} for c in caps]}
    for s in out['scenes']:
        s['start'] = round(s['start'], 3); s['end'] = round(s['end'], 3)
        for l in s['lines']: l['start'] = round(l['start'], 3); l['end'] = round(l['end'], 3); l['match'] = round(l['match'], 2)
    json.dump(out, open('timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    def ts(x):
        ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
    with open('captions.srt', 'w', encoding='utf-8') as f:
        for i, c in enumerate(caps, 1):
            # at most 2 lines: break near the middle at a space
            tx = c['text']
            if len(tx) > 42:
                sp = [m.start() for m in re.finditer(' ', tx)]; k = min(sp, key=lambda p: abs(p - len(tx) / 2)) if sp else None
                if k: tx = tx[:k] + '\n' + tx[k + 1:]
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{tx}\n\n")
    # summary
    print(f'duration {dur:.2f}s  frames {out["frames"]}  char match rate {match_rate:.0%}  edit distance {dist}')
    for s in out['scenes']:
        print(f"\n[{s['start']:7.2f} – {s['end']:7.2f}] {s['type']} {s['arg']}")
        for l in s['lines']:
            flag = '' if l['match'] > .5 or l['kind'] == 'shloka' else '  ⚠ low match'
            print(f"   {l['start']:7.2f} {l['end']:7.2f} {l['kind'][:4]} {int(l['match']*100):3d}%  {l['text'][:70]}{flag}")
    print(f'\n{len(caps)} captions → captions.srt')

if __name__ == '__main__':
    main()

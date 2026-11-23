'use strict';
// Meaning pictures under each shloka. Everything is timed from the voice: an icon appears when its Sanskrit word is
// chanted and lights when its Hindi meaning is spoken; figures gesture on their words. Motion is eased and continuous.

// time at which a word is spoken inside a timeline line (per-character times from the aligner; linear if unmatched)
function wordTime(l, word) {
  if (!l) return null; const pos = l.text.indexOf(word); if (pos < 0) return null;
  if (l.match > .5 && l.chars && l.chars.length) { const c = l.chars.find(c => c[0] >= pos); if (c) return c[1]; }
  return l.start + (l.end - l.start) * pos / l.text.length;
}
function sceneWordTime(sc, kind, word) { for (const l of sc.lines) if (l.kind === kind) { const t = wordTime(l, word); if (t !== null) return t; } return null; }
// how much of a line has been spoken at t (0..1), from character times: drives the pen
function spokenFrac(l, t) {
  if (t <= l.start) return 0; if (t >= l.end) return 1;
  if (l.match > .5 && l.chars && l.chars.length > 4) { const n = l.text.length, ch = l.chars; let k = 0; while (k + 1 < ch.length && ch[k + 1][1] <= t) k++;
    const a = ch[k], b = ch[Math.min(k + 1, ch.length - 1)], u = b[1] > a[1] ? clamp((t - a[1]) / (b[1] - a[1])) : 1; return clamp((lerp(a[0], b[0], u) + 1) / n); }
  return (t - l.start) / (l.end - l.start);
}

// ------------------------------------------------------------------ icons (local units, about ±44)
const ICON = {
  lotus: (g, t) => lotusFlower(g, 0, 22, 46),
  bow: g => {   // a drawn bow facing right: limbs bulge right, the string is pulled back left, the arrow flies right
    const p = P2(q => { q.moveTo(4, -46); q.quadraticCurveTo(42, 0, 4, 46); }); g.strokeStyle = INK; g.lineWidth = 9; g.stroke(p); g.strokeStyle = WOOD; g.lineWidth = 6; g.stroke(p);
    g.strokeStyle = 'rgba(42,26,16,.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, -46); g.lineTo(-30, 0); g.lineTo(4, 46); g.stroke();
    leafCord(g, P2(q => { q.moveTo(-30, 0); q.lineTo(40, 0); }), 4, { ink: 1.6 });
    for (const s of [-1, 1]) { const f = P2(q => { q.moveTo(-30, 0); q.lineTo(-38, 8 * s); q.lineTo(-24, 8 * s); q.lineTo(-18, 0); q.closePath(); }); paint(g, f, VERM, VERM_D, 1, 1); }
    const h = P2(q => { q.moveTo(50, 0); q.lineTo(38, -7); q.lineTo(40, 0); q.lineTo(38, 7); q.closePath(); }); leaf(g, h, [38, -7, 12, 14], { lw: 1, rimW: 1 }); },
  wheel: (g, t) => { g.save(); g.rotate(t * .25); const r = P2(q => { q.arc(0, 0, 40, 0, TAU); q.arc(0, 0, 32, 0, TAU, true); }); leaf(g, r, [-40, -40, 80, 80], { lw: 1.6, rimW: 2, rule: 'evenodd' });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; leafCord(g, P2(q => { q.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); q.lineTo(Math.cos(a) * 32, Math.sin(a) * 32); }), 3.5, { ink: 1.4 }); }
    const hub = P2(q => q.arc(0, 0, 9, 0, TAU)); paint(g, hub, VERM, VERM_D, 2, 1.6); g.restore(); },
  anjali: g => { for (const s of [-1, 1]) { const p = P2(q => { q.moveTo(0, 40); q.bezierCurveTo(s * 26, 30, s * 22, -10, s * 4, -44); q.quadraticCurveTo(0, -48, 0, -40); q.closePath(); }); paint(g, p, SKIN_N, SKIN_ND, 4, 1.8); }
    const cuff = P2(q => q.rect(-16, 36, 32, 8)); leaf(g, cuff, [-16, 36, 32, 8], { lw: 1, rimW: 1 }); },
  palm: g => { const p = P2(q => { q.moveTo(-18, 44); q.lineTo(-20, 0); q.quadraticCurveTo(-22, -30, -14, -38); q.lineTo(-10, -6); q.lineTo(-6, -44); q.lineTo(0, -6); q.lineTo(6, -46); q.lineTo(10, -6); q.lineTo(16, -40); q.lineTo(18, 0); q.quadraticCurveTo(30, -10, 28, 6); q.quadraticCurveTo(20, 30, 18, 44); q.closePath(); });
    paint(g, p, SKIN_N, SKIN_ND, 4, 1.8); const c = P2(q => q.arc(0, 14, 7, 0, TAU)); paint(g, c, VERM, VERM_D, 1, 1.2); },
  sun: (g, t) => { g.save(); g.rotate(t * .15); const R = P2(q => { for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, a2 = (k + .5) / 16 * TAU; k ? q.lineTo(Math.cos(a) * 46, Math.sin(a) * 46) : q.moveTo(46, 0); q.lineTo(Math.cos(a2) * 30, Math.sin(a2) * 30); } q.closePath(); });
    leaf(g, R, [-46, -46, 92, 92], { lw: 1.6, rimW: 3 }); g.restore(); const d = P2(q => q.arc(0, 0, 24, 0, TAU)); paint(g, d, VERM, VERM_D, 4, 1.8); gpush(0, 0, 80, 1); },
  diya: (g, t) => diya(g, -6, 16, .62, t, 1, 7),
  kalash: g => { for (let k = -2; k <= 2; k++) { const l = P2(q => q.ellipse(k * 9, -30, 6, 16, k * .4, 0, TAU)); paint(g, l, VERD, VERD_D, 2, 1.2); }
    const co = P2(q => q.ellipse(0, -34, 13, 12, 0, 0, TAU)); paint(g, co, OCHRE_D, WOOD, 3, 1.6);
    const pot = P2(q => { q.moveTo(-14, -20); q.lineTo(14, -20); q.bezierCurveTo(44, 0, 40, 34, 0, 42); q.bezierCurveTo(-40, 34, -44, 0, -14, -20); q.closePath(); }); leaf(g, pot, [-40, -20, 80, 62], { lw: 1.6, rimW: 3 }); pearlLine(g, [[-30, 8], [30, 8]], 8, 2, .9); },
  deer: (g, t) => { const b = P2(q => { q.ellipse(0, 6, 30, 16, 0, 0, TAU); }); paint(g, b, OCHRE, OCHRE_D, 5, 1.8);
    for (const lx of [-20, -12, 14, 22]) { const l = P2(q => q.rect(lx, 14, 4, 28)); paint(g, l, OCHRE_D, null, 0, 1.2); }
    const nk = P2(q => { q.moveTo(20, 0); q.lineTo(32, -26); q.lineTo(40, -24); q.lineTo(30, 4); q.closePath(); }); paint(g, nk, OCHRE, OCHRE_D, 3, 1.6);
    const hd = P2(q => q.ellipse(42, -26, 11, 7, .3, 0, TAU)); paint(g, hd, OCHRE, OCHRE_D, 2, 1.6);
    ink(g, P2(q => { q.moveTo(36, -32); q.lineTo(30, -48); q.moveTo(33, -42); q.lineTo(24, -46); q.moveTo(40, -32); q.lineTo(42, -50); }), 2);
    for (let k = 0; k < 5; k++) triad(g, -16 + k * 7, 2 + (k % 2) * 4, 1.5, .85);
    const bird = P2(q => { q.moveTo(-40, -36 + Math.sin(t * 3) * 3); q.quadraticCurveTo(-32, -44, -24, -36 + Math.sin(t * 3) * 3); q.quadraticCurveTo(-32, -40, -40, -36 + Math.sin(t * 3) * 3); }); ink(g, bird, 2); },
  book: g => { g.save(); g.scale(.36, .36); palmBundle(g, 0, 0); g.restore(); },
  mountain: g => drawSpires(g, [{ pts: spirePts(-8, 42, 46, 92, .05, mulberry(3)), col: [LILAC, LILAC_D] }, { pts: spirePts(24, 42, 30, 58, -.1, mulberry(4)), col: [VERDI, VERDI_D] }, { pts: spirePts(-34, 42, 24, 44, .1, mulberry(5)), col: [AZUR, AZUR_D] }]),
  moon: g => { const m = P2(q => q.arc(0, 0, 36, 0, TAU)); vellum(g, m); triad(g, -10, -8, 2.4, .5); triad(g, 12, 10, 2, .45); },
  meditator: g => { const h = P2(q => q.arc(0, -40, 14, 0, TAU)); leaf(g, h, [-14, -54, 28, 28], { lw: 1, rimW: 1 }); gpush(0, -40, 40, 1);
    const b = P2(q => { q.moveTo(-14, 6); q.quadraticCurveTo(-16, -22, 0, -26); q.quadraticCurveTo(16, -22, 14, 6); q.closePath(); }); paint(g, b, SAFF, SAFF_D, 3, 1.6);
    const hd = P2(q => q.arc(0, -32, 9, 0, TAU)); paint(g, hd, SKIN_V, SKIN_VD, 2, 1.4); const l = P2(q => q.ellipse(0, 14, 34, 12, 0, 0, TAU)); paint(g, l, SAFF, SAFF_D, 3, 1.6); },
  storm: (g, t) => { const sh = Math.sin(t * 22) * 1.6; g.save(); g.translate(sh, 0); const c = cloudPath(0, -10, 90, 40, 4); paint(g, c, ASH, ASH_D, 6, 1.8);
    const bolt = P2(q => { q.moveTo(-4, 4); q.lineTo(10, 4); q.lineTo(0, 22); q.lineTo(12, 22); q.lineTo(-10, 48); q.lineTo(-2, 28); q.lineTo(-12, 28); q.closePath(); }); leaf(g, bolt, [-12, 4, 24, 44], { lw: 1.2, rimW: 1 }); gpush(0, 26, 40, 1); g.restore(); },
};
function iconRoundel(g, x, y, r, k, name, t) {
  if (k <= 0) return; const s = eo(k), rr = r * (.6 + .4 * s);
  g.save(); g.globalAlpha = clamp(k * 1.6); g.translate(x, y + Math.sin(t * 1.1 + x * .01) * 4);
  const ring = P2(q => { q.arc(0, 0, rr + 10, 0, TAU); q.arc(0, 0, rr, 0, TAU, true); }), disc = P2(q => q.arc(0, 0, rr, 0, TAU));
  leaf(g, ring, [-rr - 10, -rr - 10, 2 * rr + 20, 2 * rr + 20], { lw: 1.8, rimW: 2, rule: 'evenodd' }); ultra(g, disc); rimShade(g, disc, ULTRA_D, 10); ink(g, disc, 1.8);
  pearls(g, 0, 0, rr + 5, 28, 1.8, .85);
  g.save(); g.clip(disc); g.scale(rr / 64, rr / 64); ICON[name](g, t); g.restore();
  g.restore(); gpush(x, y - rr, rr * 1.6, .9);
}

// ------------------------------------------------------------------ the vignettes
const QUAL = {
  '1.1.2': [['गुणवान्', 'गुणवान', 'गुणवान', 'lotus'], ['वीर्यवान्', 'वीर्यवान', 'वीर्यवान', 'bow'], ['धर्मज्ञ', 'धर्म', 'धर्मज्ञ', 'wheel'], ['कृतज्ञ', 'उपकार', 'कृतज्ञ', 'anjali'], ['सत्यवाक्यो', 'सत्य', 'सत्यवादी', 'sun'], ['दृढव्रतः', 'व्रत', 'दृढव्रत', 'diya']],
  '1.1.3': [['चारित्रेण', 'चरित्र', 'चरित्रवान', 'kalash'], ['सर्वभूतेषु', 'प्राणियों', 'सर्वहितैषी', 'deer'], ['विद्वान्', 'विद्वान', 'विद्वान', 'book'], ['समर्थ', 'समर्थ', 'समर्थ', 'mountain'], ['प्रियदर्शनः', 'छवि', 'प्रियदर्शन', 'moon']],
  '1.1.4': [['आत्मवान्', 'आत्मवान', 'आत्मवान', 'meditator'], ['जितक्रोधो', 'क्रोध', 'जितक्रोध', 'diya'], ['द्युतिमान्', 'तेजस्वी', 'द्युतिमान', 'sun'], ['अनसूयकः', 'ईर्ष्या', 'अनसूयक', 'palm'], ['बिभ्यति', 'देवता', 'देव भी काँपें', 'storm']],
  '1.1.8': [['इक्ष्वाकु', 'इक्ष्वाकु', 'सूर्यवंश', 'sun'], ['नियतात्मा', 'संयमी', 'संयमी', 'meditator'], ['महावीर्यो', 'महावीर्य', 'महावीर्य', 'bow'], ['द्युतिमान्', 'तेजस्वी', 'तेजस्वी', 'wheel'], ['धृतिमान्', 'धैर्य', 'धैर्यवान', 'mountain'], ['वशी', 'इन्द्रियों', 'जितेन्द्रिय', 'diya']],
};
function qualTimes(sc) {
  if (sc._qt) return sc._qt; const ref = sc.arg.split(/\s+/)[0], Q = QUAL[ref] || [], sl = sc.lines.filter(l => l.kind === 'shloka'), me = sc.lines.find(l => l.kind === 'meaning');
  const c0 = sl.length ? sl[0].start : sc.start, c1 = sl.length ? sl[sl.length - 1].end : sc.start + 4, m0 = me ? me.start : c1, m1 = me ? me.end : c1 + 6;
  return (sc._qt = Q.map((q, i) => { const ta = sceneWordTime(sc, 'shloka', q[0]) ?? lerp(c0, c1, i / Q.length), tl = sceneWordTime(sc, 'meaning', q[1]) ?? lerp(m0, m1, (i + .5) / Q.length);
    return { appear: tl - .15, light: tl, label: q[2], icon: q[3] }; }));   // on the spoken Hindi word (the voice-over), not the chant
}
const VIG = {};
const VZ = { y: 792 };   // ground line of the vignettes (above the speech scroll)
// figures in conversation: Valmiki (left) asks, Narada (right) listens and answers
VIG.dialogue = {
  draw(g, t, sc, mode) {
    const askT = mode === 'ask' ? (sceneWordTime(sc, 'shloka', 'परिपप्रच्छ') ?? sceneWordTime(sc, 'meaning', 'पूछा') ?? sc.start + 3) : null;
    const reqT = mode === 'request' ? (sceneWordTime(sc, 'meaning', 'समर्थ') ?? sc.start + 6) : null;
    const pose = { ask: askT ? clamp((t - askT) / 1.2) : 0, namaste: mode === 'request' ? clamp((t - sc.start - .4) / 1.2) * (1 - clamp((t - reqT) / 1.2)) : 0, blink: blinkAt(t), look: .35 };
    if (reqT) pose.ask = clamp((t - reqT) / 1.2);
    valmiki(g, 600, VZ.y, .92, 1, t, pose);
    const hear = askT ?? reqT ?? 1e9;
    narada(g, 1330, VZ.y - 20, .8, -1, t, { pluck: 1 - clamp((t - hear) / 1.2) * .8, nod: clamp((t - hear - .8) / 1), blink: blinkAt(t, 2) });
    notes(g, 1420, 560, t, 1 - clamp((t - hear) / 1.5));
    speechThread(g, [700, 650], [1300, 560], clamp((t - hear) / 1.6), t, 90);
  },
  lights(t, sc, mode) { const hear = mode === 'ask' ? (sceneWordTime(sc, 'shloka', 'परिपप्रच्छ') ?? sc.start + 3) : (sceneWordTime(sc, 'meaning', 'समर्थ') ?? sc.start + 6), u = clamp((t - hear) / 1.6);
    const out = [{ type: 'r', x: 610, y: 620, r: 300, a: .5 }, { type: 'r', x: 1340, y: 520, r: 300, a: .5 }]; if (u > 0 && u < 1) out.push({ type: 'r', x: lerp(700, 1300, u), y: lerp(650, 560, u) - Math.sin(u * Math.PI) * 90, r: 200, a: .9 }); return out; },
};
// the qualities, one roundel each, spoken by Valmiki (asking) or Narada (telling)
VIG.qualities = {
  pos(n, i) { const x0 = 740, x1 = 1580; return [n > 1 ? lerp(x0, x1, i / (n - 1)) : (x0 + x1) / 2, 590 + (i % 2 ? 46 : -30)]; },
  draw(g, t, sc, speaker) {
    const Q = qualTimes(sc), n = Q.length;
    if (speaker === 'narada') { narada(g, 360, VZ.y - 20, .78, 1, t, { pluck: .6, talk: clamp((t - sc.start - 1) / 1.2), blink: blinkAt(t, 3), out: (sc._out = {}) }); notes(g, 300, 560, t, .6); }
    else valmiki(g, 350, VZ.y, .86, 1, t, { ask: .35 + .65 * clamp((t - sc.start - .8) / 1.4), blink: blinkAt(t), look: .4 });
    Q.forEach((q, i) => { const [x, y] = this.pos(n, i), k = clamp((t - q.appear) / .4); iconRoundel(g, x, y, 70, k, q.icon, t);
      if (k > 0) goldText(g, q.label, x, y + 122, 32, { wipe: clamp((t - q.appear - .1) / .35), id: 'qual' }); });
  },
  lights(t, sc) { const Q = qualTimes(sc), out = [{ type: 'r', x: 370, y: 600, r: 300, a: .45 }]; if (sc._out && sc._out.palm) out.push({ type: 'r', x: sc._out.palm[0], y: sc._out.palm[1], r: 120, a: .8 });
    Q.forEach((q, i) => { const [x, y] = this.pos(Q.length, i), u = t - q.light, a0 = clamp((t - q.appear) / .4) * .3;
      out.push({ type: 'r', x, y, r: 190, a: u > 0 ? (u < .5 ? lerp(a0, 1.1, u / .5) : lerp(1.1, .45, clamp((u - .5) / 1.5))) : a0 }); });
    return out; },
};
// Narada answers: sixteen stars, rare together; one rises bright when he says such a man exists
VIG.answer = {
  stars() { return Array.from({ length: 16 }, (_, i) => { const a = Math.PI * (1.08 + .84 * i / 15); return [870 + Math.cos(a) * 330, 700 + Math.sin(a) * 250]; }); },
  times(sc) { const me = sc.lines.find(l => l.kind === 'meaning'), bol = sc.lines.find(l => /बोले/.test(l.text));
    return { talk: bol ? bol.start : sc.start + 8, m0: me ? me.start : sc.start + 10, rare: sceneWordTime(sc, 'meaning', 'दुर्लभ') ?? (me ? me.start + 3 : sc.start + 13), one: sceneWordTime(sc, 'meaning', 'मनुष्य') ?? (me ? me.end - 2 : sc.end - 3) }; },
  draw(g, t, sc) {
    const T = this.times(sc);
    valmiki(g, 420, VZ.y, .84, 1, t, { namaste: clamp((t - sc.start - .6) / 1.2), blink: blinkAt(t), look: .45 });
    narada(g, 1400, VZ.y - 20, .8, -1, t, { pluck: 1 - clamp((t - T.talk) / 1) * .7, talk: clamp((t - T.talk) / 1.2), nod: .3, blink: blinkAt(t, 2), out: (sc._out = {}) });
    notes(g, 1480, 560, t, 1 - clamp((t - T.talk) / 1.5) * .6);
    this.stars().forEach(([x, y], i) => { const k = clamp((t - T.m0 - i * .12) / .6), big = i === 8 ? 1 + 1.4 * ease(clamp((t - T.one) / 1.4)) : 1; if (k <= 0) return;
      const r = 13 * eo(k) * big, p = P2(q => star8(q, x, y - (i === 8 ? 40 * ease(clamp((t - T.one) / 1.4)) : 0), r, .42, i)); leaf(g, p, [x - r, y - r - 60, 2 * r, 2 * r + 60], { lw: 1.2, rimW: 2 }); });
    speechThread(g, [1310, 570], [520, 640], clamp((t - T.talk) / 1.6), t, 80);
  },
  lights(t, sc) { const T = this.times(sc), out = [{ type: 'r', x: 430, y: 620, r: 280, a: .45 }, { type: 'r', x: 1410, y: 520, r: 300, a: .5 }]; if (sc._out && sc._out.palm) out.push({ type: 'r', x: sc._out.palm[0], y: sc._out.palm[1], r: 120, a: .8 * clamp((t - T.talk) / 1.2) });
    this.stars().forEach(([x, y], i) => { const on = clamp((t - T.m0 - i * .12) / .6), dim = i === 8 ? 0 : clamp((t - T.rare) / 1.2) * .7; if (on > 0) out.push({ type: 'r', x, y, r: 70, a: .9 * on * (1 - dim) }); });
    const u = clamp((t - T.one) / 1.4); if (u > 0) { const [x, y] = this.stars()[8]; out.push({ type: 'r', x, y: y - 40 * ease(u), r: 360, a: 1.1 * u }); if (u < 1) out.push({ type: 'o', x, y: y - 40, rad: 600 * u, w: 50, a: .8 * (1 - u) }); }
    return out; },
};
const VIG_OF = { '1.1.1': ['dialogue', 'ask'], '1.1.2': ['qualities', 'valmiki'], '1.1.3': ['qualities', 'valmiki'], '1.1.4': ['qualities', 'valmiki'], '1.1.5': ['dialogue', 'request'], '1.1.7': ['answer'], '1.1.8': ['qualities', 'narada'] };

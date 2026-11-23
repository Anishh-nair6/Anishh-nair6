'use strict';
// Composition: scene → transition → frame border → gold dust → vignette → burned-in captions.
// window.frame(t) draws the frame at time t; window.ready resolves once fonts, timeline and caches are in.

const BUF = { a: null, b: null };
function sceneAt(t) { const s = TL.scenes; let i = 0; while (i + 1 < s.length && t >= s[i + 1].start) i++; return i; }
function transitionFor(i) {
  const a = TL.scenes[i - 1], b = TL.scenes[i];
  if (a.type === 'shloka' && b.type === 'shloka') return { type: 'page', d: 1.3 };
  if (b.type === 'lotus' || b.type === 'ayodhya' || b.type === 'rama') return { type: 'dust', d: 1.6 };
  if (a.type === 'coldopen') return { type: 'fade', d: 1.0 };
  return { type: 'fade', d: 1.3 };
}
function drawScene(g, t, sc) { g.save(); (SCENES[sc.type] || SCENES.ashram)(g, t, sc); g.restore(); }
function frameAlpha(t, sc) {
  if (sc.type === 'coldopen') return ss(seg(t, sc.start + 2.6, sc.start + 4.6));
  if (sc.type === 'close') return 0;   // the close scene carries its own frame, which shrinks with the page
  return 1;
}
function pageTurn(g, A, B, u) {   // the new page is uncovered by a curling edge travelling right → left
  g.drawImage(A, 0, 0, W, H);
  const e = eio(u), x = lerp(W + 200, -300, e), slant = 260;
  g.save(); g.beginPath(); g.moveTo(x + slant, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(x - slant * .2, H); g.closePath(); g.clip(); g.drawImage(B, 0, 0, W, H);
  // shadow cast by the lifting page onto the new one
  const sg = g.createLinearGradient(x, 0, x + 180, 0); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(x - 300, 0, 800, H); g.restore();
  // the curl: a narrow band, back of the old page, with a gold edge highlight
  g.save(); g.beginPath(); g.moveTo(x + slant, 0); g.lineTo(x + slant - 90, 0); g.lineTo(x - slant * .2 - 60, H); g.lineTo(x - slant * .2, H); g.closePath();
  const cg = g.createLinearGradient(x - 90, 0, x + 40, 0); cg.addColorStop(0, 'rgba(30,25,50,.0)'); cg.addColorStop(.6, 'rgba(60,50,80,.85)'); cg.addColorStop(1, 'rgba(243,217,139,.55)'); g.fillStyle = cg; g.fill();
  g.strokeStyle = 'rgba(243,217,139,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + slant, 0); g.lineTo(x - slant * .2, H); g.stroke(); g.restore();
}
function dustWipe(g, A, B, u, t) {   // new scene revealed behind a soft front of gold dust moving left → right
  g.drawImage(A, 0, 0, W, H);
  const e = eio(u), x = lerp(-300, W + 300, e), M = tmp('wipe', W, H), mg = M.g;
  mg.drawImage(B, 0, 0, W, H); mg.globalCompositeOperation = 'destination-in';
  const gr = mg.createLinearGradient(x - 260, 0, x + 260, 0); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); mg.fillStyle = gr; mg.fillRect(0, 0, W, H);
  g.drawImage(M, 0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter'; const R = mulberry(77);
  for (let i = 0; i < 260; i++) { const px = x + (R() - .5) * 340 + Math.sin(t * 2 + i) * 10, py = R() * H, s = 3 + R() * 9; g.globalAlpha = (1 - Math.abs(px - x) / 200) * Math.sin(u * Math.PI) * .9; if (g.globalAlpha <= 0) continue; g.drawImage(DOT, px - s / 2, py - s / 2, s, s); }
  g.restore();
}
// burned-in captions: narration only (meanings are already on the page, shlokas are on screen large)
const NO_CAP = new Set(['coldopen', 'title', 'close']);
function captions(g, t) {
  const c = TL.captions.find(c => t >= c.start - .05 && t < c.end); if (!c || c.kind !== 'narration' || NO_CAP.has(c.scene)) return;
  const sc = TL.scenes[sceneAt(t)]; if (sc.type === 'intro') { const t0 = sc.lines.length ? sc.lines[0].start : sc.start; if (t < t0 + 7) return; }
  const a = ss(seg(t, c.start - .05, c.start + .2)) * (1 - ss(seg(t, c.end - .2, c.end)));
  const size = 40, lines = wrap(c.text, 'noto', size, 1360).slice(0, 2), lh = size * 1.55, h = lines.length * lh + 26;
  const w = Math.max(...lines.map(l => measure(l, 'noto', size).w)) + 64, x = W / 2 - w / 2, y = 1000 - h;
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(11,10,18,.66)'; g.beginPath(); g.roundRect(x, y, w, h, 24); g.fill();
  g.strokeStyle = 'rgba(212,166,58,.28)'; g.lineWidth = 1.2; g.stroke();
  g.font = fontStr('noto', size, 500); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = C.cream;
  lines.forEach((l, i) => g.fillText(l, W / 2, y + 13 + size * 1.12 + i * lh));
  g.restore();
  TEXTS.push({ x0: x, y0: y, x1: x + w, y1: y + h, a, id: 'caption' });
}

function frame(t) {
  TEXTS.length = 0;
  const g = ctx; g.setTransform(S, 0, 0, S, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const i = sceneAt(t), sc = TL.scenes[i];
  let tr = null, u = 1;
  if (i > 0) { tr = transitionFor(i); u = (t - sc.start) / tr.d; }
  if (tr && u < 1) {
    const A = tmp('A', W, H), B = tmp('B', W, H);
    drawScene(A.g, t, TL.scenes[i - 1]); drawScene(B.g, t, sc);
    if (tr.type === 'page') pageTurn(g, A, B, u);
    else if (tr.type === 'dust') dustWipe(g, A, B, u, t);
    else { g.drawImage(A, 0, 0, W, H); g.globalAlpha = ss(u); g.drawImage(B, 0, 0, W, H); g.globalAlpha = 1; }
    const fa = lerp(frameAlpha(t, TL.scenes[i - 1]), frameAlpha(t, sc), ss(u)); drawFrame(g, t, fa);
  } else { drawScene(g, t, sc); drawFrame(g, t, frameAlpha(t, sc)); }
  const dk = sc.type === 'coldopen' ? ss(seg(t, sc.start + .6, sc.start + 2.5)) : 1;
  dust(g, t, { k: dk });
  g.drawImage(VIGN, 0, 0, W, H);
  captions(g, t);
  return TEXTS;
}

window.ready = (async () => {
  const tl = Q.get('timeline') || '../timeline.json';
  TL = await (await fetch(tl)).json();
  // pages inside a scene: a line following '---' in the script starts a new page
  await Promise.all([`400 60px ${F.tiro}`, `400 40px ${F.noto}`, `500 40px ${F.noto}`, `400 40px ${F.cinzel}`, `700 40px ${F.cinzel}`].map(f => document.fonts.load(f, 'अआ राम Aa')));
  initEngine();
  if (Q.has('t')) frame(+Q.get('t'));
  return { duration: TL.duration, frames: TL.frames, fps: TL.fps };
})();
window.frame = frame;
window.texts = () => TEXTS;

// thumbnail composition (1920x1080, downscaled to 1280x720 by tools/thumbnail.mjs): the title in gold leaf and a large diya
window.thumb = function () {
  const g = ctx; g.setTransform(S, 0, 0, S, 0, 0); const t = 2.2;
  backdrop(g, t); diyaLight(g, W / 2, 760, t, 1.6, 1200);
  halo(g, W / 2, 700, 300, t, .9);
  if (!ART.introLotus) sceneIntro(mk(4, 4).g, 0, { start: 0, end: 10, lines: [] });
  g.save(); g.globalAlpha = .5; g.drawImage(ART.introLotus, W / 2 - 520, 560, 1040, 485); g.restore();
  diya(g, W / 2 - 40, 800, 2.3, 3.1, 1);
  const T = textLayer('रामायण · बालकाण्ड · सर्ग १', 'tiro', 150, 'gold', { glow: 22 }); drawText(g, T, W / 2, 330, 1, { glowA: .45 });
  const s = textLayer('VALMIKI RAMAYANA · PART 1', 'cinzel', 52, 'gold'); drawText(g, s, W / 2, 440, 1);
  rule(g, W / 2, 490, 620, 1);
  drawFrame(g, 0, 1); dust(g, 7, { n: 140, alpha: .9 }); g.drawImage(VIGN, 0, 0, W, H);
  return TEXTS;
};

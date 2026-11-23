// Render the timeline to video: headless Chromium (Playwright) draws each frame on a canvas, frames are piped to ffmpeg.
// Work is split into 30-second chunks spread over parallel browser pages; chunks already rendered are reused (resume).
//
//   node tools/render.mjs --scale 0.5 --out out/preview.mp4                  # 960x540 preview
//   node tools/render.mjs --scale 1 --preset slow --out out/video.mp4       # final picture
//   node tools/render.mjs --stills 12.5,80,140 --scale 1 --dir out/stills  # single frames (PNG)
//   options: --workers 4 --chunk 30 --from 0 --to 290 --crf 18
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const scale = +arg('scale', 1), workers = +arg('workers', Math.min(4, os.cpus().length)), chunkS = +arg('chunk', 30);
const preset = arg('preset', 'veryfast'), crf = arg('crf', '18');
const out = path.resolve(ROOT, arg('out', scale < 1 ? 'out/preview.mp4' : 'out/video.mp4'));
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, arg('timeline', 'timeline.json')), 'utf8'));
const fps = TL.fps, N = TL.frames;

// static file server for the project (fonts and timeline are local files)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise(r => server.listen(0, r));
const URL0 = `http://127.0.0.1:${server.address().port}/src/index.html?scale=${scale}`;

const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
async function newPage() {
  const page = await browser.newPage({ viewport: { width: Math.round(1920 * scale), height: Math.round(1080 * scale) }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message)); page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(URL0); await page.evaluate(() => window.ready); return page;
}
const grab = (page, t, type = 'image/jpeg') => page.evaluate(([t, type]) => { const tx = window.frame(t); return { img: document.getElementById('c').toDataURL(type, .95), tx }; }, [t, type]);

if (arg('stills')) {
  const dir = path.resolve(ROOT, arg('dir', 'out/stills')); fs.mkdirSync(dir, { recursive: true });
  const page = await newPage(), report = [];
  for (const s of arg('stills').split(',')) { const t = +s, { img, tx } = await grab(page, t, 'image/png');
    const f = path.join(dir, `t${t.toFixed(2).padStart(7, '0')}.png`); fs.writeFileSync(f, Buffer.from(img.split(',')[1], 'base64'));
    // overflow check: every visible text box must stay inside the frame's inner rule (70 px) — captions and lower-thirds included
    const bad = tx.filter(b => b.a > .05 && (b.x0 < 70 || b.x1 > 1850 || b.y0 < 70 || b.y1 > 1010));
    report.push({ t, file: path.relative(ROOT, f), texts: tx.length, overflow: bad }); console.log(f, bad.length ? 'OVERFLOW ' + JSON.stringify(bad) : 'ok'); }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
  await browser.close(); server.close(); process.exit(0);
}

const f0 = Math.round(+arg('from', 0) * fps), f1 = Math.min(N, Math.round(+arg('to', N / fps) * fps));
const tag = `${Math.round(1920 * scale)}p_${crf}_${preset}`, cdir = path.resolve(ROOT, 'out/chunks', tag); fs.mkdirSync(cdir, { recursive: true });
const chunks = []; for (let a = f0; a < f1; a += chunkS * fps) chunks.push([a, Math.min(f1, a + chunkS * fps)]);
const ver = fs.statSync(path.join(ROOT, 'timeline.json')).mtimeMs + ['engine', 'art', 'scenes', 'main'].map(n => fs.statSync(path.join(ROOT, 'src', n + '.js')).mtimeMs).reduce((a, b) => Math.max(a, b));
let done = 0; const t0 = Date.now(), overflow = [];
async function renderChunk(page, [a, b]) {
  const file = path.join(cdir, `c${String(a).padStart(6, '0')}_${b}.mp4`), stamp = file + '.ok';
  if (fs.existsSync(stamp) && +fs.readFileSync(stamp, 'utf8') >= ver) { done += b - a; return file; }
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    const { img, tx } = await grab(page, (f + .5) / fps - .5 / fps);
    if (f % 15 === 0) for (const x of tx) if (x.a > .05 && (x.x0 < 70 || x.x1 > 1850 || x.y0 < 70 || x.y1 > 1010)) overflow.push({ t: f / fps, ...x });
    if (!ff.stdin.write(Buffer.from(img.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    done++; if (done % 150 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${f1 - f0} frames  ${(done / el).toFixed(1)} fps  eta ${((f1 - f0 - done) / (done / el) / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await new Promise((r, j) => ff.on('close', c => c ? j(new Error('ffmpeg ' + c)) : r()));
  fs.writeFileSync(stamp, String(ver)); return file;
}
const queue = chunks.map((c, i) => [c, i]), files = [];
await Promise.all(Array.from({ length: Math.min(workers, chunks.length) }, async () => { const page = await newPage(); while (queue.length) { const [c, i] = queue.shift(); files[i] = await renderChunk(page, c); } await page.close(); }));
const list = path.join(cdir, 'list.txt'); fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
console.log(`picture → ${out}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
if (overflow.length) { console.log('TEXT OUTSIDE FRAME:', JSON.stringify(overflow.slice(0, 10))); fs.writeFileSync(out + '.overflow.json', JSON.stringify(overflow, null, 1)); }
await browser.close(); server.close();

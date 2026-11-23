// thumbnail.png (1280x720): draws window.thumb() at 1920x1080 and downsamples with lanczos.
import { createRequire } from 'node:module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } fs.createReadStream(p).pipe(r); });
await new Promise(r => server.listen(0, r));
const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/src/index.html?scale=1`); await page.evaluate(() => window.ready);
const img = await page.evaluate(() => { window.thumb(); return document.getElementById('c').toDataURL('image/png'); });
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'out/thumb_1080.png'), Buffer.from(img.split(',')[1], 'base64'));
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(ROOT, 'out/thumb_1080.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(ROOT, 'thumbnail.png')]);
console.log('thumbnail → thumbnail.png'); await b.close(); server.close();

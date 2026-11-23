// export the film's sound cues (window.events) → work/events.json
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } fs.createReadStream(p).pipe(r); });
await new Promise(r => server.listen(0, r));
const b = await chromium.launch(), page = await b.newPage(); page.on('pageerror', e => console.error(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/src/index.html`); await page.evaluate(() => window.ready);
const ev = await page.evaluate(() => window.events()); fs.mkdirSync(path.join(ROOT, 'work'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'work/events.json'), JSON.stringify(ev, null, 1)); console.log(ev.ev.length, 'events → work/events.json');
await b.close(); server.close();

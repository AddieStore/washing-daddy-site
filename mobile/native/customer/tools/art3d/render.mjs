// node render.mjs <scene> [size]  -> out/<scene>.png (transparent). Needs a static server: started here.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const root = path.dirname(new URL(import.meta.url).pathname), [scene, size = '720'] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.html': 'text/html' };
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return } s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); s.end(d) }) }).listen(0);
const port = srv.address().port, b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +size, height: +size } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto(`http://localhost:${port}/harness.html?scene=${scene}&size=${size}`); await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
await p.locator('canvas').screenshot({ path: path.join(root, 'out', scene + '.png'), omitBackground: true }); await b.close(); srv.close(); console.log('out/' + scene + '.png');

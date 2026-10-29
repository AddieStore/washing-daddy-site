// Web export -> one self-contained HTML (dist-preview/index.html), openable from file://.
// Usage: node tools/preview.mjs [--skip-export]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-web');
const out = path.join(root, 'dist-preview');

if (!process.argv.includes('--skip-export')) {
  execSync('npx expo export --platform web --output-dir dist-web --clear', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, EXPO_OFFLINE: '1', CI: '1' },
  });
}

const MIME = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  svg: 'image/svg+xml', ico: 'image/x-icon', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff',
  woff2: 'font/woff2', mp3: 'audio/mpeg', wav: 'audio/wav', json: 'application/json',
};
const cache = new Map();
const missing = new Set();
function dataUri(url) {
  // url like /assets/assets/img/a.1234.webp?platform=web&hash=x
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const file = path.join(dist, clean);
  if (!fs.existsSync(file)) { missing.add(url); return null; }
  if (!cache.has(file)) {
    const ext = path.extname(file).slice(1).toLowerCase();
    cache.set(file, `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`);
  }
  return cache.get(file);
}

// Matches /assets/... file references (optionally ?query) inside JS/HTML strings.
const ASSET_RE = /\/assets\/[^"'`\s()\\<>]+?\.(?:webp|png|jpe?g|gif|svg|ico|ttf|otf|woff2?|mp3|wav)(?:\?[^"'`\s()\\<>]*)?/gi;
const inline = (text) => text.replace(ASSET_RE, (m) => dataUri(m) ?? m);

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// Inline scripts (moved to end of body since `defer` does not apply to inline scripts).
const scripts = [];
html = html.replace(/<script\b([^>]*?)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (_, a, src, b) => {
  const file = path.join(dist, decodeURIComponent(src.split(/[?#]/)[0]));
  let js = fs.readFileSync(file, 'utf8');
  js = inline(js).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const isModule = /type=["']module["']/.test(a + b);
  scripts.push(`<script${isModule ? ' type="module"' : ''}>${js}</script>`);
  return '';
});
// <link href> to assets (favicon etc.) and any other asset URLs in HTML
html = inline(html);
// any remaining local href/src (favicon.ico etc.)
html = html.replace(/(\s(?:href|src)=["'])(\/(?!\/)[^"'?#]+\.(?:ico|png|webp|svg|jpe?g))(["'])/gi, (m, a, u, c) => { const d = dataUri(u); return d ? a + d + c : m; });
// Drop remaining stylesheet/preload links to local files that would 404 on file://
html = html.replace(/<link\b[^>]*rel=["'](?:preload|modulepreload)["'][^>]*>/gi, '');

const head = `
<meta name="theme-color" content="#5409DA">
<style id="wd-frame">
html,body{margin:0;padding:0;height:100%;background:#120724}
body{display:flex;justify-content:center}
#root{width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;transform:translateZ(0)}
@media (min-width:481px){#root{width:430px;max-width:430px;flex:none;box-shadow:0 0 60px rgba(0,0,0,.5)}}
</style>`;

// title / viewport
html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
html = html.replace(/<meta\b[^>]*name=["']viewport["'][^>]*>/i, '');
html = html.replace(/<head([^>]*)>/i, `<head$1>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Washing Daddy</title>${head}`);
html = html.replace(/<\/body>/i, () => `${scripts.join("\n")}\n</body>`);

// Safety: no absolute local paths may remain.
const leftovers = (html.match(/(?:src|href)=["']\/(?!\/)[^"']*["']/g) || []);
if (leftovers.length) console.warn('WARNING: absolute URLs left in HTML:', leftovers);
if (missing.size) console.warn('WARNING: referenced assets not found in dist-web:', [...missing]);

fs.mkdirSync(out, { recursive: true });
const dest = path.join(out, 'index.html');
fs.writeFileSync(dest, html);
const kb = fs.statSync(dest).size / 1024;
console.log(`Wrote ${dest}  ${kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(0) + ' KB'}  (${cache.size} assets inlined, ${scripts.length} script(s))`);

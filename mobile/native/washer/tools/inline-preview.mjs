// Turns the `expo export -p web` output into ONE self-contained HTML file (no external requests).
// Usage: node tools/inline-preview.mjs <distDir> <out.html>
import fs from 'node:fs';
import path from 'node:path';

const [distArg, outArg] = process.argv.slice(2);
if (!distArg || !outArg) {
  console.error('usage: node tools/inline-preview.mjs <distDir> <out.html>');
  process.exit(1);
}
const dist = path.resolve(distArg);

const MIME = {
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4',
};
const CODE = new Set(['.js', '.css', '.html', '.map']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

// Binary/asset files -> data URIs, keyed by their URL path relative to dist ("assets/x.ttf").
const assets = [];
for (const f of walk(dist)) {
  const ext = path.extname(f).toLowerCase();
  if (CODE.has(ext)) continue;
  const rel = path.relative(dist, f).split(path.sep).join('/');
  const mime = MIME[ext] || 'application/octet-stream';
  assets.push({ rel, uri: `data:${mime};base64,${fs.readFileSync(f).toString('base64')}` });
}
assets.sort((a, b) => b.rel.length - a.rel.length); // longest first so no path shadows another

// Replace "/rel" (and URL-encoded form) wherever it appears. Only matches when preceded by a
// delimiter so "/assets/a.png" is not found inside "/assets/xassets/a.png".
function replaceAssets(text) {
  for (const { rel, uri } of assets) {
    for (const variant of new Set([rel, encodeURI(rel)])) {
      const re = new RegExp(`(^|[^A-Za-z0-9_.-])(?:\\.?/)${escapeRe(variant)}`, 'g');
      text = text.replace(re, (_m, pre) => pre + uri);
    }
  }
  return text;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readText(urlPath) {
  const clean = urlPath.split(/[?#]/)[0].replace(/^\.?\//, '');
  const file = path.join(dist, decodeURI(clean));
  if (!fs.existsSync(file)) throw new Error(`referenced file not found in dist: ${urlPath}`);
  return fs.readFileSync(file, 'utf8');
}
const stripMaps = (t) => t.replace(/\n?\/[/*][#@] sourceMappingURL=.*?(\*\/)?\s*$/gm, '');

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// Stylesheets -> <style>
html = html.replace(/<link\b[^>]*>/gi, (tag) => {
  const rel = /\brel=["']?([^"'\s>]+)/i.exec(tag)?.[1]?.toLowerCase();
  const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
  if (!href || /^(data:|https?:)/i.test(href)) return tag;
  if (rel === 'stylesheet') {
    return `<style>${replaceAssets(stripMaps(readText(href))).replace(/<\/style/gi, '<\\/style')}</style>`;
  }
  if (rel === 'modulepreload' || rel === 'preload' || rel === 'prefetch') return '';
  return replaceAssets(tag); // icons etc. -> data URI
});

// Scripts -> inline, moved to the end of <body> in original order (external ones were deferred).
const scripts = [];
html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (_m, a, src, b) => {
  if (/^(data:|https?:)/i.test(src)) throw new Error(`external script not allowed: ${src}`);
  const attrs = `${a} ${b}`.replace(/\b(defer|async)\b/gi, '').replace(/\s+/g, ' ').trim();
  const code = replaceAssets(stripMaps(readText(src))).replace(/<\/script/gi, '<\\/script');
  scripts.push(`<script${attrs ? ' ' + attrs : ''}>${code}</script>`);
  return '';
});

// Anything left in the HTML itself that points at an asset.
html = replaceAssets(html);

// expo-router reads location on start; make sure it starts at the index route.
const reset = `<script>try{history.replaceState(null,'','/')}catch(e){}</script>`;
html = html.replace(/<\/head>/i, `${reset}</head>`);
if (!html.includes(reset)) html = reset + html;
const body = scripts.join('\n');
html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => `${body}</body>`) : html + body;

const bad = html.match(/\b(?:src|href)=["'](?!data:|#|javascript:)[^"']+["']/gi);
if (bad) console.warn('warning: remaining external-looking references:', [...new Set(bad)].slice(0, 10));

fs.mkdirSync(path.dirname(path.resolve(outArg)), { recursive: true });
fs.writeFileSync(outArg, html);
console.log(`wrote ${outArg}: ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB (${assets.length} assets inlined)`);

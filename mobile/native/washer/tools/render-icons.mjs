// Renders the WD Partner app icons and splash image with Chromium (Playwright).
// Usage: node tools/render-icons.mjs [outDir=assets]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'assets'));

const A = { bg: '#FFBA08', fg: '#5409DA', sub: '#1A0A33', tag: 'PARTNER' };
const fontUrl = (p) => pathToFileURL(path.join(root, 'node_modules', p)).href;
const FONT = `<style>
@font-face{font-family:Anton;src:url("${fontUrl('@expo-google-fonts/anton/400Regular/Anton_400Regular.ttf')}")}
@font-face{font-family:Poppins;font-weight:700;src:url("${fontUrl('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf')}")}
</style>`;

// safe = fraction of the canvas the mark may use; bg: colour | 'transparent'; round = rounded tile
function iconHtml(a, size, safe, round) {
  const s = size * safe;
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>
  html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}
  .bg{position:absolute;inset:0;background:${a.bg};${round ? `border-radius:${size * 0.225}px;` : ''}}
  .m{position:absolute;left:50%;top:50%;width:${s}px;height:${s}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center}
  .wd{font-family:Anton;color:${a.fg};font-size:${s * 0.62}px;line-height:.9;letter-spacing:${s * 0.005}px}
  .tag{font-family:Poppins;font-weight:700;color:${a.sub};font-size:${s * 0.105}px;letter-spacing:${s * 0.02}px;margin-top:${s * 0.04}px}
  .drop{position:absolute;right:${s * 0.08}px;top:${s * 0.1}px;width:${s * 0.13}px;height:${s * 0.13}px;background:${a.sub};border-radius:50% 0 50% 50%;transform:rotate(-45deg)}
  </style></head><body><div class="bg"></div><div class="m"><div class="drop"></div><div class="wd">WD</div><div class="tag">${a.tag}</div></div></body></html>`;
}

const b = await chromium.launch();
async function shot(html, size, file, transparent) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  // setContent pages are about:blank and cannot load file:// fonts, so go through a real file
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wd-icon-')), 'page.html');
  fs.writeFileSync(tmp, html);
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await p.screenshot({ path: file, omitBackground: !!transparent });
  await p.close();
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  console.log('wrote', path.relative(root, file));
}

await shot(iconHtml(A, 1024, 0.8, false), 1024, `${out}/icon.png`);
await shot(iconHtml({ ...A, bg: 'transparent' }, 1024, 0.6, false), 1024, `${out}/android-icon-foreground.png`, true);
await shot(`<!doctype html><html><body style="margin:0;width:1024px;height:1024px;background:${A.bg}"></body></html>`, 1024, `${out}/android-icon-background.png`);
await shot(iconHtml({ bg: 'transparent', fg: '#fff', sub: '#fff', tag: A.tag }, 1024, 0.6, false), 1024, `${out}/android-icon-monochrome.png`, true);
await shot(iconHtml(A, 1024, 0.8, true), 1024, `${out}/splash-icon.png`, true);
await shot(iconHtml(A, 48, 0.8, true), 48, `${out}/favicon.png`, true);
await b.close();

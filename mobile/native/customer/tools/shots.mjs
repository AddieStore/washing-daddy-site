// Screenshot the self-contained preview with Playwright.
// Usage: node tools/shots.mjs [outDir=dist-preview/shots] [steps.json]
// steps: [{"tap":"text=Get code"},{"type":"9876504210"},{"fill":["input","x"]},{"wait":800},{"shot":"home"},{"scroll":400},{"press":"Enter"}]
// tap selectors: "text=Foo" -> exact-ish visible text (getByText), anything else is a Playwright locator ("input", "css=...", "role=button[name=Go]").
// type: types into the focused element (or {"type":"..","into":"input"}).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'dist-preview/shots'));
const steps = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : [];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url().slice(0, 120)));

const loc = (sel) => {
  if (sel.startsWith('text=')) return page.getByText(sel.slice(5), { exact: false }).first();
  if (sel.startsWith('role=')) {
    const m = sel.slice(5).match(/^(\w+)(?:\[name=(.*)\])?$/);
    return page.getByRole(m[1], m[2] ? { name: m[2] } : {}).first();
  }
  return page.locator(sel).first();
};
const shot = async (name) => {
  const f = path.join(outDir, name.replace(/\.png$/, '') + '.png');
  await page.screenshot({ path: f });
  console.log('shot', f);
};

await page.goto(pathToFileURL(path.join(root, 'dist-preview/index.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.evaluate(() => document.fonts.ready);
await shot('initial');

for (const s of steps) {
  try {
    if (s.tap) await loc(s.tap).click({ timeout: 5000 });
    else if (s.fill) await loc(s.fill[0]).fill(s.fill[1]);
    else if (s.type !== undefined) {
      if (s.into) await loc(s.into).click({ timeout: 5000 });
      await page.keyboard.type(String(s.type), { delay: 20 });
    } else if (s.press) await page.keyboard.press(s.press);
    else if (s.scroll !== undefined) await page.mouse.wheel(0, s.scroll);
    else if (s.wait) await page.waitForTimeout(s.wait);
    else if (s.shot) { await page.evaluate(() => document.fonts.ready); await shot(s.shot); }
    else if (s.goto) await page.goto(s.goto);
    else if (s.eval) console.log('eval ->', JSON.stringify(await page.evaluate(s.eval)));
  } catch (e) {
    problems.push(`step ${JSON.stringify(s)} failed: ${e.message.split('\n')[0]}`);
  }
}
if (problems.length) { console.log('--- problems ---'); [...new Set(problems)].forEach((p) => console.log(p)); }
else console.log('no console/page errors');
await browser.close();

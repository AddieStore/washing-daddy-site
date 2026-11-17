// Screenshot harness for the WD Partner washer web preview. Captures every reachable screen/sheet as PNG so a
// designer can compare it with the customer app (see /tmp/claude-0/tools/customer-shots.cjs).
//
// Usage:  node tools/shots.mjs <outDir> [previewHtml]
//   outDir       where the PNGs go (created; old *.png in it are removed)
//   previewHtml  default: ../preview.html (the single-file build from `node tools/inline-preview.mjs dist preview.html`)
// Needs the global `playwright` package (NODE_PATH=$(npm root -g) if it is not found).
// Each capture is wrapped in step(): a failure is logged and written to <outDir>/_report.txt, the run goes on.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2]) { console.error('usage: node tools/shots.mjs <outDir> [preview.html]'); process.exit(1); }
const html = path.resolve(process.argv[3] || path.join(here, '..', 'preview.html'));
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.png') || f === '_report.txt') fs.rmSync(path.join(out, f));

const W = 390, H = 844;
const report = [];
let n = 0;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => report.push('pageerror: ' + e.message.split('\n')[0]));
page.setDefaultTimeout(8000);
// served over http (file:// breaks expo-router's history.replaceState)
const srv = http.createServer((req, res) => { res.setHeader('content-type', 'text/html; charset=utf-8'); fs.createReadStream(html).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port + '/';
await page.goto(base);

/* ---------- helpers ---------- */
const sleep = ms => page.waitForTimeout(ms);
const settle = async (ms = 700) => { await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {}); await sleep(ms); };
const txt = (t, o = {}) => page.getByText(t, { exact: true, ...o }).filter({ visible: true }).first();
const lbl = (t, o = {}) => page.getByLabel(t, { exact: true, ...o }).filter({ visible: true }).first();
/** wait until some text (or aria-label) is on screen */
const waitFor = async (t, timeout = 10000) => {
  await page.waitForFunction(s => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
    for (const e of document.querySelectorAll('*')) {
      if (e.children.length === 0 && (e.textContent || '').trim() === s && vis(e)) return true;
      if (e.getAttribute('aria-label') === s && vis(e)) return true;
    }
    return false;
  }, t, { timeout });
};
/** click by visible text or aria-label (whichever is found) */
let alertShot = false;
/** the "Naya kaam aaya!" job-alert sheet pops up on its own after a while and covers everything: shoot it once, dismiss it */
const clearAlert = async () => {
  if (!(await txt('Nahi karna').count())) return;
  if (!alertShot) { alertShot = true; await settle(600); await shot('job-alert-sheet'); }
  await txt('Nahi karna').click(); await settle(700);
};
const tap = async (t, o = {}) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await clearAlert();
      await waitFor(t, o.timeout || 8000);
      const a = lbl(t);
      const el = (await a.count()) ? a : txt(t);
      await el.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
      await sleep(250);
      await el.click({ timeout: 4000, position: o.pos });
      await settle(o.settle ?? 500);
      return;
    } catch (e) { if (attempt) throw e; await clearAlert(); }
  }
};
const has = async t => (await txt(t).count()) + (await lbl(t).count()) > 0;
/** the biggest vertically scrollable element (the screen's ScrollView) */
const SCROLLER = () => {
  let e = document.elementFromPoint(195, 380);
  while (e && e !== document.body) {
    const cs = getComputedStyle(e);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4) return e;
    e = e.parentElement;
  }
  return null;
};
const shot = async (name, o = {}) => {
  n++;
  const file = `${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(out, file) });
  console.log('shot', file);
  if (o.full) await fullShot(file.replace('.png', '-full.png'));
};
/** the whole scrollable content as one tall image: grow the viewport to the content height, shoot, restore */
const fullShot = async file => {
  const h = await page.evaluate(`(${SCROLLER})()?.scrollHeight || 0`);
  if (h <= H + 40) return false;
  const hh = Math.min(h + 4, 6000);
  await page.setViewportSize({ width: W, height: hh });
  await settle(900);
  await page.screenshot({ path: path.join(out, file) });
  console.log('shot', file, `(${hh}px)`);
  await page.setViewportSize({ width: W, height: H });
  await settle(500);
  return true;
};
/** scrolled-down viewport shot (the screen's own scroller scrolled to the end) */
const scrolledShot = async name => {
  const moved = await page.evaluate(`(() => { const e = (${SCROLLER})(); if (!e) return false; e.scrollTo(0, e.scrollHeight); return true })()`);
  if (!moved) return;
  await settle(700);
  await shot(name);
  await page.evaluate(`(() => { const e = (${SCROLLER})(); e && e.scrollTo(0, 0) })()`);
  await settle(300);
};
const step = async (name, fn) => {
  try { await fn(); } catch (e) {
    const m = `NOT REACHED: ${name}: ${String(e.message).split('\n')[0]}`;
    console.log(m); report.push(m);
    await page.screenshot({ path: path.join(out, `zz-failed-${name}.png`) }).catch(() => {});
  }
};
const closeSheet = async () => {
  await clearAlert();
  const c = lbl('Close');
  if (await c.count()) { await c.click({ position: { x: 5, y: 5 }, force: true }).catch(() => {}); await settle(500); }
  if (await lbl('Close').count()) { await page.mouse.click(195, 30); await settle(500); }
};
const goTab = async name => { await tap(name, { settle: 900 }); };
const back = async () => { await page.goBack().catch(() => {}); await settle(700); };

/* ---------- 1. login + OTP + onboarding ---------- */
await step('login', async () => {
  await waitFor('OTP bhejo', 20000);
  await settle(1200);
  await shot('login', { full: true });
});
await step('login-otp', async () => {
  await tap('Chotte', { settle: 800 });   // picking a test washer sends the OTP right away
  await waitFor('OTP daalo');
  await settle(500);
  await shot('login-otp');
  await page.locator('input[aria-label="OTP digit 1"]').fill('1234');
  await waitFor('OTP sahi hai!', 8000).catch(() => {});
  await settle(300);
  await shot('login-otp-ok');
});
let onboarded = false;
await step('onboarding', async () => {
  await waitFor('Apni bhasha chuniye', 15000);
  await settle(900);
  await shot('onboard-1-language');
  await tap('Aage badhein', { settle: 900 });
  await waitFor('Location chalu karein');
  await settle(500);
  await shot('onboard-2-location');
  await tap('Location allow karein', { settle: 900 });
  await waitFor('Alerts chalu karein');
  await settle(500);
  await shot('onboard-3-notifications');
  await tap('Alerts allow karein', { settle: 900 });
  await waitFor('Washing Daddy partner banein, sirf 3 aasaan steps mein');
  await settle(900);
  await shot('onboard-4-partner-steps');
  // docs sheet + referral sheet are reachable from this last step
  await tap('Aadhaar aur PAN ki details', { settle: 800 }).catch(() => {});
  if (await has('Aadhaar aur PAN')) await shot('onboard-5-docs-sheet', { full: false });
  await closeSheet();
  await tap('Referral code daalein', { settle: 800 }).catch(() => {});
  if (await has('Code save karein')) await shot('onboard-6-referral-sheet');
  await closeSheet();
  await tap('Aage badhein', { settle: 600 });
  onboarded = true;
});

/* any "join / waiting" gate would show here instead of the round */
await step('home-wait', async () => { await waitFor('Round', 20000); await settle(1500); });

/* ---------- 2. tabs ---------- */
await step('tab-round', async () => {
  await shot('tab-round-home', { full: true });
  await scrolledShot('tab-round-home-bottom');
});
await step('tab-extra', async () => { await goTab('Extra'); await settle(600); await shot('tab-extra', { full: true }); });
await step('tab-paisa', async () => { await goTab('Paisa'); await settle(900); await shot('tab-paisa', { full: true }); });
await step('tab-profile', async () => { await goTab('Profile'); await settle(900); await shot('tab-profile', { full: true }); });

/* ---------- 3. Profile: sheets and sub-screens ---------- */
const toProfile = async () => { await goTab('Profile'); await page.evaluate(`(() => { const e = (${SCROLLER})(); e && e.scrollTo(0, 0) })()`); await settle(300); };
/** open a Profile row (by its title), shoot the sheet, close it */
const profileSheet = (name, row, waitText, shotName, o = {}) => step(name, async () => {
  await toProfile();
  await tap(row, { settle: 800 });
  if (waitText) await waitFor(waitText);
  await settle(700);
  await shot(shotName, o);
  if (o.more) await o.more();
  await closeSheet();
});
await profileSheet('lang-sheet', 'Bhasha', 'Hinglish', 'profile-language-picker');
await profileSheet('help-sheet', 'Madad / SOS', null, 'profile-help-sos-sheet');
await profileSheet('refer-sheet', 'Dost ko laao', null, 'profile-refer-sheet');
await profileSheet('sync-sheet', 'Customer app se sync', null, 'profile-sync-sheet');
await profileSheet('reset-sheet', 'Aaj ka round reset', null, 'profile-reset-round-sheet');
await profileSheet('logout-sheet', 'Log out', null, 'profile-logout-sheet');
await profileSheet('photo-sheet', 'Profile photo badlo', null, 'profile-photo-chooser-sheet');
await profileSheet('kit-add-sheet', 'Saaman add karo', 'Kya hai?', 'profile-add-kit-sheet');
await step('docs-upload-sheet', async () => {
  await toProfile();
  const b = page.getByRole('button', { name: /Upload karo/ }).filter({ visible: true }).first();
  await b.scrollIntoViewIfNeeded(); await b.click(); await settle(800);
  await shot('profile-docs-upload-sheet');
  await closeSheet();
});
await step('theme-dark', async () => {
  await toProfile();
  await tap('Raat', { settle: 900 }); await shot('profile-dark-mode', { full: true });
  await tap('Din', { settle: 600 });
});

/* screens with a back button: rewards, complaints, round setup */
const subScreen = (name, row, waitText, shotName) => step(name, async () => {
  await toProfile();
  await tap(row, { settle: 1000 });
  if (waitText) await waitFor(waitText);
  await settle(700);
  await shot(shotName, { full: true });
  await scrolledShot(shotName + '-bottom');
  await goBack();
});
const goBack = async () => {
  const b = lbl('Back');
  if (await b.count()) await b.click(); else await page.goBack().catch(() => {});
  await settle(800);
};
await subScreen('rewards', 'Attendance aur bonus', null, 'profile-rewards');
await subScreen('complaints', 'Customer feedback', null, 'profile-complaints');
await step('round-setup', async () => {
  await toProfile();
  await tap('Apna round set karo', { settle: 1200 });
  await waitFor('Slot mein nahi', 6000).catch(() => {});
  await settle(800);
  await shot('round-setup', { full: true });
  await scrolledShot('round-setup-bottom');
  await goBack();
});

/* ---------- 4. Round tab: week strip, today, day, attendance, add car, job ---------- */
const toRound = async () => { await goTab('Round'); await page.evaluate(`(() => { const e = (${SCROLLER})(); e && e.scrollTo(0, 0) })()`); await settle(300); };
await step('attendance-sheet', async () => {
  await toRound();
  await tap('Hub pahunch gaya', { settle: 900 });
  await waitFor('Hazri ki photo');
  await settle(600);
  await shot('round-attendance-sheet');
  await closeSheet();
});
await step('add-car-sheet', async () => {
  await toRound();
  await tap('Nayi gaadi add karo', { settle: 900 });   // raised centre + button
  await settle(700);
  await shot('add-car-sheet', { full: true });
  await closeSheet();
});
await step('slot-sheet', async () => {
  await toRound();
  await tap('Round badlo', { settle: 1000 });   // pill on the round list -> round setup, so use the car's slot picker there
  await goBack();
});
await step('today', async () => {
  await toRound();
  await tap('Aaj ka round', { settle: 1000 });
  await waitFor('Gaadiyon ki list');
  await settle(900);
  await shot('today-round', { full: true });
  await scrolledShot('today-round-bottom');
  await goBack();
});
await step('day', async () => {
  await toRound();
  // a past day from the week strip: pick the first enabled strip day that is not today
  const d = page.locator('[aria-label]').filter({ visible: true }).filter({ hasText: /./ });
  const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.top < 700 && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Som|Man|Bud|Gur|Shu|Shan|Ravi)/i.test(e.getAttribute('aria-label')) }).map(e => e.getAttribute('aria-label')));
  const pick = labels[0];
  if (!pick) throw new Error('no week-strip day found: ' + JSON.stringify(labels));
  await page.locator(`[aria-label="${pick}"]`).first().click();
  await waitFor('Din ka hisaab', 6000);
  await settle(900);
  await shot('day-past', { full: true });
  await goBack();
});
await step('job', async () => {
  await toRound();
  const car = page.locator('[aria-label]').filter({ visible: true }).filter({ hasText: /\w/ });
  const plate = await page.evaluate(() => { const e = [...document.querySelectorAll('[aria-label]')].find(e => /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4} /.test(e.getAttribute('aria-label'))); return e && e.getAttribute('aria-label') });
  if (!plate) throw new Error('no car card found on the round');
  await page.locator(`[aria-label="${plate}"]`).first().scrollIntoViewIfNeeded();
  await page.locator(`[aria-label="${plate}"]`).first().click();
  await settle(1500);
  await shot('job-before-round-start', { full: true });
});

fs.writeFileSync(path.join(out, '_report.txt'), report.join('\n') + '\n');
await browser.close(); srv.close();
console.log(report.length ? '\n' + report.join('\n') : '\nall steps reached');

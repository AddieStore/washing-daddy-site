// Renders app icons and iOS splash screens for both apps with Chromium.
// node render-assets.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'assets';

const APPS = {
  customer: { bg: '#5409DA', fg: '#FFBA08', sub: '#FFF6E9', tag: 'MY CAR', splashBg: '#FFF6E9', splashInk: '#1A0A33' },
  washer:   { bg: '#FFBA08', fg: '#5409DA', sub: '#1A0A33', tag: 'WASHER', splashBg: '#5409DA', splashInk: '#FFF6E9' },
};
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@700&display=block" rel="stylesheet">`;

// safe = fraction of the canvas the mark may use (maskable / adaptive icons need ~0.62)
function iconHtml(a, size, safe, round) {
  const s = size * safe;
  return `<!doctype html><html><head>${FONT}<style>
  html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}
  .bg{position:absolute;inset:0;background:${a.bg};${round ? `border-radius:${size * 0.225}px;` : ''}}
  .m{position:absolute;left:50%;top:50%;width:${s}px;height:${s}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center}
  .wd{font-family:Anton;color:${a.fg};font-size:${s * 0.62}px;line-height:.9;letter-spacing:${s * 0.005}px}
  .tag{font-family:Poppins;font-weight:700;color:${a.sub};font-size:${s * 0.105}px;letter-spacing:${s * 0.02}px;margin-top:${s * 0.04}px}
  .drop{position:absolute;right:${s * 0.08}px;top:${s * 0.1}px;width:${s * 0.13}px;height:${s * 0.13}px;background:${a.sub};border-radius:50% 0 50% 50%;transform:rotate(-45deg)}
  </style></head><body><div class="bg"></div><div class="m"><div class="drop"></div><div class="wd">WD</div><div class="tag">${a.tag}</div></div></body></html>`;
}
function fgOnlyHtml(a, size) { // adaptive-icon foreground, transparent background
  return iconHtml({ ...a, bg: 'transparent' }, size, 0.6, false);
}
function splashHtml(a, w, h, name) {
  const s = Math.min(w, h) * 0.34;
  return `<!doctype html><html><head>${FONT}<style>
  html,body{margin:0;width:${w}px;height:${h}px;background:${a.splashBg};display:flex;flex-direction:column;align-items:center;justify-content:center}
  .tile{width:${s}px;height:${s}px;border-radius:${s * 0.225}px;background:${a.bg};display:flex;flex-direction:column;align-items:center;justify-content:center}
  .wd{font-family:Anton;color:${a.fg};font-size:${s * 0.5}px;line-height:.9}
  .tag{font-family:Poppins;font-weight:700;color:${a.sub};font-size:${s * 0.085}px;letter-spacing:${s * 0.016}px;margin-top:${s * 0.03}px}
  .n{font-family:Anton;color:${a.splashInk};font-size:${s * 0.22}px;margin-top:${s * 0.18}px;letter-spacing:1px}
  </style></head><body><div class="tile"><div class="wd">WD</div><div class="tag">${a.tag}</div></div><div class="n">${name}</div></body></html>`;
}

// iPhone portrait splash sizes (device px) and their media queries (css w x h @ dpr)
const SPLASH = [
  [1320, 2868, 440, 956, 3], [1206, 2622, 402, 874, 3], [1290, 2796, 430, 932, 3], [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3], [1170, 2532, 390, 844, 3], [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2], [1242, 2208, 414, 736, 3], [750, 1334, 375, 667, 2], [640, 1136, 320, 568, 2],
];
const MIPMAP = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FG = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const shot = async (html, w, h, file, transparent) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: !!transparent });
    await p.close();
  };
  for (const [id, a] of Object.entries(APPS)) {
    const web = `${out}/${id}/web`;
    await shot(iconHtml(a, 192, 0.8, false), 192, 192, `${web}/icon-192.png`);
    await shot(iconHtml(a, 512, 0.8, false), 512, 512, `${web}/icon-512.png`);
    await shot(iconHtml(a, 512, 0.62, false), 512, 512, `${web}/icon-maskable-512.png`);
    await shot(iconHtml(a, 180, 0.8, false), 180, 180, `${web}/apple-touch-icon.png`);
    await shot(iconHtml(a, 1024, 0.8, false), 1024, 1024, `${out}/${id}/ios/AppIcon-1024.png`);
    await shot(iconHtml(a, 64, 0.8, true), 64, 64, `${web}/favicon.png`, true);
    const name = id === 'customer' ? 'WASHING DADDY' : 'WD WASHER';
    for (const [pw, ph, cw, chh, r] of SPLASH) {
      await shot(splashHtml(a, pw, ph, name), pw, ph, `${web}/splash/${pw}x${ph}.png`);
    }
    for (const [d, px] of Object.entries(MIPMAP)) {
      await shot(iconHtml(a, px, 0.8, true), px, px, `${out}/${id}/android/mipmap-${d}/ic_launcher.png`, true);
      await shot(fgOnlyHtml(a, FG[d]), FG[d], FG[d], `${out}/${id}/android/mipmap-${d}/ic_launcher_foreground.png`, true);
    }
  }
  fs.writeFileSync(`${out}/splash.json`, JSON.stringify(SPLASH));
  await b.close();
})();

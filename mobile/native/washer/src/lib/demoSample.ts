// Demo/preview only (backend mode 'demo'): when the sample round is started, the first cars are moved to different
// points of the day so every screen has something to show: the 2 after photos, Nikla, Pahuncha, a Sunday-style
// interior wash with its 5 spot photos. Photos are small drawn pictures. Never used with Firebase.
import { isoIST } from './time';
import { SPOTS } from './washGuide';
import type { Photo, Wash } from './data';

const svg = (body: string) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">${body}</svg>`);
const car = (bg: string, body: string, extra: string) =>
  `<rect width="240" height="240" fill="${bg}"/><rect x="20" y="110" width="200" height="64" rx="22" fill="${body}"/><rect x="62" y="74" width="116" height="48" rx="18" fill="${body}"/><rect x="74" y="84" width="40" height="30" rx="6" fill="#cfe3f5"/><rect x="124" y="84" width="40" height="30" rx="6" fill="#cfe3f5"/><circle cx="68" cy="176" r="20" fill="#222"/><circle cx="172" cy="176" r="20" fill="#222"/>${extra}`;
const sparkle = '<path d="M200 50l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fff"/><path d="M40 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff"/>';
const IMG = {
  after: svg(car('#d6e9ff', '#2d6cdf', sparkle)),
  after2: svg(car('#e4f4e4', '#2d6cdf', sparkle).replace('x="20" y="110"', 'x="30" y="110"')),
};
const spotImg = (label: string, hue: number) => svg(`<rect width="240" height="240" fill="hsl(${hue} 18% 28%)"/><rect x="30" y="70" width="180" height="110" rx="14" fill="hsl(${hue} 22% 40%)"/><text x="120" y="135" font-family="sans-serif" font-size="20" fill="#fff" text-anchor="middle">${label}</text>`);

/** step: 0 done, 1 done on a "Sunday" (5 spot photos), 2 washing, 3 arrived (Pahuncha), 4 on the way (Nikla); later cars stay scheduled */
export function demoSample(w: Wash, step: number, now = Date.now()) {
  const ago = (min: number) => isoIST(now - min * 60e3);
  let n = 0;
  const ph = (kind: Photo['kind'], url: string, min: number, spot?: string): Photo => ({ kind, url, at: ago(min), n: n++, ...(spot ? { spot } : {}) });
  const doneTasks = () => w.tasks.forEach((t, i) => { t.done = true; t.done_at = ago(50 - i * 3) });
  if (step === 0 || step === 1) {
    w.status = 'done'; w.on_the_way_at = ago(75); w.arrived_at = ago(65); w.started_at = ago(60); w.finished_at = ago(38); w.minutes = 22; w.water_litres = 18;
    doneTasks();
    // photo rule v3: two after photos, one with the number plate; the Sunday car's 2nd photo was rejected by the manager (demo of the retake flow)
    w.photos = [{ ...ph('after', IMG.after, 40), plate: true }, ph('after', IMG.after2, 39)];
    if (step === 1) { w.photos[1].rejected = { at: ago(30), by: 'manager', reason: 'Number plate saaf nahi dikh rahi' }; w.photo_review = 'rejected'; w.photo_review_at = ago(30) }
    else { w.photos[0].plate_ok = { at: ago(30), by: 'manager' }; w.photo_review = 'ok'; w.photo_review_at = ago(30) }
    if (step === 1) {
      w.sunday = true;
      w.photos.push(...SPOTS.map((s, i) => ph('inside', spotImg(s.label, 200 + i * 30), 45 - i, s.key)));
    }
  } else if (step === 2) {
    w.status = 'washing'; w.on_the_way_at = ago(14); w.arrived_at = ago(9); w.started_at = ago(6);
    w.tasks.slice(0, 1).forEach(t => { t.done = true; t.done_at = ago(3) });
    w.photos = [];
  } else if (step === 3) {
    w.status = 'arrived'; w.on_the_way_at = ago(8); w.arrived_at = ago(1);
  } else if (step === 4) {
    w.status = 'on_the_way'; w.on_the_way_at = ago(1);
  }
}

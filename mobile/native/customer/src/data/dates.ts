// Washes run on IST, whatever the phone's time zone: TODAY is the IST calendar date, held as a local midnight.
export const istNow = () => new Date(Date.now() + 5.5 * 3600e3);
const istToday = () => { const n = istNow(); return new Date(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) };
export let TODAY = istToday();
// called when the app comes back to the front, so a phone left open overnight moves to the new day
export function refreshToday() { const t = istToday(); if (t.getTime() !== TODAY.getTime()) { TODAY = t; return true } return false }

export const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x };

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type FmtOpts = { weekday?: 'short' | 'long'; day?: 'numeric'; month?: 'short' | 'long'; year?: 'numeric' };
// en-GB style dates without Intl, which Hermes on older Androids only partly has: "12 Nov", "Thu 29 Oct"
export function fmt(d: Date | string, o: FmtOpts = { day: 'numeric', month: 'short' }) {
  const x = typeof d === 'string' ? parse(d) : d, out: string[] = [];
  if (o.weekday) out.push(o.weekday === 'long' ? WDAY[x.getDay()] : WDAY[x.getDay()].slice(0, 3));
  if (o.day) out.push(String(x.getDate()));
  if (o.month) out.push(o.month === 'long' ? MON[x.getMonth()] : MON[x.getMonth()].slice(0, 3));
  if (o.year) out.push(String(x.getFullYear()));
  return out.join(' ');
}
// Indian grouping: 1,23,456
export function inGroup(n: number) {
  const s = String(Math.round(Math.abs(n))), sign = n < 0 ? '-' : '';
  if (s.length <= 3) return sign + s;
  const last = s.slice(-3), rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return sign + rest + ',' + last;
}
export const inr = (n: number) => '₹' + inGroup(n);

export const nowIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().replace(/\.\d+Z$/, '+05:30');
export const t2m = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m };
export const m2t = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
export const hm = (v: unknown): string | null => {
  if (!v) return null; const s = String(v);
  const m = s.match(/T(\d{2}:\d{2})/) || s.match(/^(\d{1,2}:\d{2})/); return m ? m[1].padStart(5, '0') : null;
};
export const ampm = (t: string | null | undefined) => {
  if (!t) return ''; const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

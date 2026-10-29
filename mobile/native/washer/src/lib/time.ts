// All times are IST, as ISO strings with +05:30 (see .notes/sync-contract.md).
const IST = 5.5 * 3600e3;

export const isoIST = (ms = Date.now()) => new Date(ms + IST).toISOString().slice(0, 19) + '+05:30';
export const dateIST = (ms = Date.now()) => new Date(ms + IST).toISOString().slice(0, 10);
export const hourIST = () => Number(isoIST().slice(11, 13));

// '2026-10-15T06:42:10+05:30' -> '6:42 AM'
export const t12 = (iso?: string | null) => {
  if (!iso) return '';
  let [h, m] = iso.slice(11, 16).split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
};
// '06:35' -> '6:35 AM'
export const hm12 = (s?: string | null) => (s ? t12('0000-00-00T' + s) : '');
// the same without AM/PM, for tight list rows
export const short12 = (s: string) => s.replace(/ (AM|PM)/, '');

export const dObj = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDaysStr = (s: string, n: number) => {
  const d = dObj(s);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
export const daysInMonth = (day: string) => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0).getDate();

const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_EN_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const WD_HI_LONG = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_HI = ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'];
const MON_HI_LONG = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'];

// Formatted by hand: Hermes on Android ships without full Intl, so toLocaleDateString is not safe.
export const dayShort = (day: string, hi: boolean) => {
  const d = dObj(day);
  return `${(hi ? WD_HI : WD_EN)[d.getDay()]}, ${d.getDate()} ${(hi ? MON_HI : MON_EN)[d.getMonth()]}`;
};
export const dayLong = (day: string, hi: boolean) => {
  const d = dObj(day);
  return `${(hi ? WD_HI_LONG : WD_EN_LONG)[d.getDay()]}, ${d.getDate()} ${(hi ? MON_HI_LONG : MON_EN_LONG)[d.getMonth()]}`;
};
export const dayNarrow = (day: string, hi: boolean) => (hi ? WD_HI : WD_EN)[dObj(day).getDay()].slice(0, hi ? 2 : 1);

// ₹1,23,456 (Indian grouping), without relying on Intl
export const rupee = (n?: number | null) => {
  const v = Math.round(n || 0);
  const neg = v < 0;
  const s = String(Math.abs(v));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + '₹' + (rest ? rest + ',' + last3 : last3);
};
export const groupIN = (n: number) => rupee(n).slice(1);

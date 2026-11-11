// Monthly rewards, worked out from the washer's own attendance log (no money moves in the app; Ravi pays).
// Early bird: the first photo of the day's first car taken before 06:00 IST, 30 days in a row -> Rs 1,000.
// Full month: checked in every single day of the calendar month -> Rs 1,000. Both -> Rs 2,000.
export type AttendDay = { in?: string | null; first?: string | null };   // ISO IST times: hub check-in, first car photo
export type Attend = Record<string, AttendDay>;
export const EARLY_BEFORE = '06:00';
export const EARLY_DAYS = 30;
export const EARLY_BONUS = 1000;
export const MONTH_BONUS = 1000;

const dayMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);
const dim = (d: string) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();
export const isEarly = (iso?: string | null) => !!iso && iso.slice(11, 16) < EARLY_BEFORE;

// consecutive days up to `today` with an early first photo (today not yet photographed does not break yesterday's streak)
export function earlyStreak(a: Attend, today: string): number {
  let d = isEarly(a[today]?.first) ? today : addDays(today, -1), n = 0;
  while (isEarly(a[d]?.first)) { n++; d = addDays(d, -1) }
  return n;
}

export function monthAttendance(a: Attend, today: string) {
  const ym = today.slice(0, 7), total = dim(today), elapsed = +today.slice(8, 10);
  let came = 0, missed = 0;
  for (let i = 1; i <= elapsed; i++) {
    const d = ym + '-' + String(i).padStart(2, '0');
    if (a[d]?.in) came++; else if (d !== today) missed++;   // today may still be checked in
  }
  return { came, missed, total, elapsed, left: total - elapsed, possible: missed === 0 };
}

export function rewards(a: Attend, today: string) {
  const streak = earlyStreak(a, today), m = monthAttendance(a, today);
  const early = { streak, target: EARLY_DAYS, earned: streak >= EARLY_DAYS, bonus: streak >= EARLY_DAYS ? EARLY_BONUS : 0 };
  // paid at month end: full only when every day of the month is there
  const full = { ...m, earned: m.came === m.total, bonus: m.came === m.total ? MONTH_BONUS : 0 };
  return { early, month: full, total: early.bonus + full.bonus, best: EARLY_BONUS + MONTH_BONUS };
}

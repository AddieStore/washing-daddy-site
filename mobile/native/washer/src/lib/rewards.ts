// Monthly rewards, worked out from the washer's own attendance log (no money moves in the app; the manager pays at month end).
// Early bird: the first photo of the day's first car taken before 06:00 IST, 30 days in a row -> Rs 1,000.
// Full month: checked in every single day of the calendar month -> Rs 1,000.
// No complaint: no customer complaint in the calendar month (IST), OR a monthly average rating of 4.8+ over at least
// 5 ratings -> Rs 1,000 (see `cleanMonth` below and lib/complaints.ts). All three together -> Rs 3,000.
export type AttendDay = { in?: string | null; first?: string | null };   // ISO IST times: hub check-in, first car photo
export type Attend = Record<string, AttendDay>;
export const EARLY_BEFORE = '06:00';
export const EARLY_DAYS = 30;
export const EARLY_BONUS = 1000;
export const MONTH_BONUS = 1000;
export const CLEAN_BONUS = 1000;
export const CLEAN_MIN_AVG = 4.8;        // average stars for the month that still earns it despite complaints
export const CLEAN_MIN_RATINGS = 5;      // ...but only once there are this many ratings, so one 5-star day is not enough
export const BEST = EARLY_BONUS + MONTH_BONUS + CLEAN_BONUS;

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

/** This month's complaints and ratings for the washer, as lib/complaints.ts counts them (cleanInput()).
 *  complaints: complaints dated this calendar month (IST) whose status is open, seen or resolved; one the manager
 *  marked 'invalid' is not counted. ratingCount/ratingAvg: the customers' star ratings of his washes this month. */
export type CleanInput = { complaints: number; ratingCount: number; ratingAvg: number | null };

/** The No Complaint Bonus for the month of `today`.
 *  Eligible when complaints === 0, OR ratingCount >= CLEAN_MIN_RATINGS and ratingAvg >= CLEAN_MIN_AVG.
 *  Like the full-month bonus it is only "earned" on the last day of the month (a complaint can still come before);
 *  until then `eligible` says he is on course and `possible` that the money can still be had.
 *  Without an input (not loaded yet) nothing is counted as earned, and it stays possible. */
export function cleanMonth(c: CleanInput | null | undefined, today: string) {
  const known = !!c, complaints = c ? Math.max(0, c.complaints | 0) : 0;
  const ratingCount = c ? Math.max(0, c.ratingCount | 0) : 0;
  const ratingAvg = c && ratingCount && c.ratingAvg != null && isFinite(c.ratingAvg) ? c.ratingAvg : null;
  const byNone = known && complaints === 0;
  const byRating = known && ratingCount >= CLEAN_MIN_RATINGS && ratingAvg != null && ratingAvg >= CLEAN_MIN_AVG;
  const eligible = byNone || byRating, over = +today.slice(8, 10) === dim(today);
  const earned = eligible && over;
  // ratings can still lift the average while the month runs, so it is only lost for good once the month is over
  return { known, complaints, ratingCount, ratingAvg, byNone, byRating, eligible, earned, possible: !known || eligible || !over, bonus: earned ? CLEAN_BONUS : 0 };
}

export function rewards(a: Attend, today: string, clean?: CleanInput | null) {
  const streak = earlyStreak(a, today), m = monthAttendance(a, today);
  const early = { streak, target: EARLY_DAYS, earned: streak >= EARLY_DAYS, bonus: streak >= EARLY_DAYS ? EARLY_BONUS : 0 };
  // paid at month end: full only when every day of the month is there
  const full = { ...m, earned: m.came === m.total, bonus: m.came === m.total ? MONTH_BONUS : 0 };
  const cl = cleanMonth(clean, today);
  return { early, month: full, clean: cl, total: early.bonus + full.bonus + cl.bonus, best: BEST };
}

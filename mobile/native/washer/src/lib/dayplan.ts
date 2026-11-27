// Day-plan helpers for the Round home: the streak of days worked (checked in), the last seven days as dots.
import { addDays, type Attend } from './rewards.ts';

/** Consecutive days checked in, ending today (or yesterday while today is not checked in yet: that does not break it). */
export function workStreak(a: Attend, today: string): number {
  let d = a[today]?.in ? today : addDays(today, -1), n = 0;
  while (a[d]?.in) { n++; d = addDays(d, -1) }
  return n;
}

/** The last 7 days ending today, oldest first: came / missed / today (not checked in yet). */
export function lastWeek(a: Attend, today: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6), here = !!a[key]?.in;
    return { key, state: (key === today ? (here ? 'came' : 'today') : here ? 'came' : 'missed') as 'came' | 'missed' | 'today' };
  });
}

/** "2h 15m" from an ISO time to `toMs` (now while still working). */
export function hoursLabel(fromIso?: string | null, toMs = Date.now()): string {
  const a = fromIso ? Date.parse(fromIso) : NaN;
  if (!isFinite(a) || toMs < a) return '0h 00m';
  const m = Math.floor((toMs - a) / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

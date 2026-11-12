// What the rewards screen shows, worked out on top of rewards.ts (which stays as it is).
import { BEST, CLEAN_BONUS, EARLY_BONUS, EARLY_DAYS, MONTH_BONUS, isEarly, rewards, type Attend, type CleanInput } from './rewards.ts';

export type DayState = 'came' | 'missed' | 'today' | 'upcoming';
export function monthDays(a: Attend, today: string) {
  const ym = today.slice(0, 7), n = +today.slice(8, 10);
  const total = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0)).getUTCDate();
  const lead = (new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, 1)).getUTCDay() + 6) % 7;   // Monday first
  const days = [...Array(total)].map((_, i) => {
    const day = i + 1, key = ym + '-' + String(day).padStart(2, '0'), e = a[key];
    const state: DayState = day > n ? 'upcoming' : e?.in ? 'came' : day === n ? 'today' : 'missed';
    return { day, key, state, isToday: day === n, early: isEarly(e?.first) };
  });
  return { lead, days };
}

export function outlook(a: Attend, today: string, clean?: CleanInput | null) {
  const r = rewards(a, today, clean), e = a[today];
  const lateToday = !!e?.first && !isEarly(e.first);            // today's first photo came after 06:00: the streak is broken
  const streak = lateToday ? 0 : r.early.streak;
  const days = r.month.left + (e?.first ? 0 : 1);               // days that can still add to the streak
  const earlyLive = r.early.earned || streak + days >= EARLY_DAYS;
  const monthLive = r.month.possible;
  const cleanLive = r.clean.possible;                            // No Complaint Bonus: see cleanMonth() in rewards.ts
  return {
    r, streak, lateToday, earlyLive, monthLive, cleanLive,
    need: Math.max(0, EARLY_DAYS - streak),
    possible: (earlyLive ? EARLY_BONUS : 0) + (monthLive ? MONTH_BONUS : 0) + (cleanLive ? CLEAN_BONUS : 0),
    earnedSoFar: r.total,
    best: BEST,
  };
}

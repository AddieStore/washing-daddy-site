import test from 'node:test';
import assert from 'node:assert/strict';
import { earlyStreak, monthAttendance, rewards, addDays, isEarly } from './rewards.ts';

const days = (end: string, n: number, f: (d: string) => any) => Object.fromEntries(Array.from({ length: n }, (_, i) => { const d = addDays(end, -i); return [d, f(d)] }));
test('early means before 6:00', () => {
  assert.ok(isEarly('2026-11-10T05:59:00+05:30')); assert.ok(!isEarly('2026-11-10T06:00:00+05:30')); assert.ok(!isEarly(null));
});
test('30 early days in a row earns 1000, one late day resets', () => {
  const a = days('2026-11-30', 30, d => ({ in: d + 'T05:30:00+05:30', first: d + 'T05:45:00+05:30' }));
  assert.equal(earlyStreak(a, '2026-11-30'), 30); assert.equal(rewards(a, '2026-11-30').early.bonus, 1000);
  a['2026-11-20'].first = '2026-11-20T06:10:00+05:30';
  assert.equal(earlyStreak(a, '2026-11-30'), 10);
});
test('today not photographed yet keeps yesterday streak', () => {
  const a = days('2026-11-09', 5, d => ({ first: d + 'T05:40:00+05:30' }));
  assert.equal(earlyStreak(a, '2026-11-10'), 5);
});
test('full month attendance, a missed day kills it', () => {
  const a = days('2026-11-30', 30, d => ({ in: d + 'T05:30:00+05:30' }));
  const r = rewards(a, '2026-11-30'); assert.equal(r.month.bonus, 1000); assert.equal(r.total, 1000);
  delete a['2026-11-12'];
  const m = monthAttendance(a, '2026-11-30'); assert.equal(m.missed, 1); assert.equal(m.possible, false); assert.equal(rewards(a, '2026-11-30').month.bonus, 0);
});
test('both together are 2000', () => {
  const a = days('2026-11-30', 30, d => ({ in: d + 'T05:20:00+05:30', first: d + 'T05:50:00+05:30' }));
  assert.equal(rewards(a, '2026-11-30').total, 2000);
});

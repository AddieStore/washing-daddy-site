import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, outlook } from './rewardsView.ts';

const A = (o: Record<string, [string?, string?]>) => Object.fromEntries(Object.entries(o).map(([k, [i, f]]) => [k, { in: i, first: f }]));
test('empty log: today pending, everything still possible early in the month', () => {
  const o = outlook({}, '2026-11-01');
  assert.equal(o.possible, 2000);
});
import { addDays } from './rewards.ts';
const run = (end: string, n: number, skipIn: string[] = []) => Object.fromEntries(Array.from({ length: n }, (_, i) => {
  const d = addDays(end, -i);
  return [d, { in: skipIn.includes(d) ? undefined : d + 'T06:10:00+05:30', first: d + 'T05:40:00+05:30' }];
}));
test('a missed day kills the full-month bonus only', () => {
  const o = outlook(run('2026-11-02', 29, ['2026-11-02']), '2026-11-03');
  assert.equal(o.monthLive, false);
  assert.equal(o.streak, 29);
  assert.equal(o.earlyLive, true);
  assert.equal(o.possible, 1000);
});
test('late photo today breaks the streak', () => {
  const log = run('2026-11-09', 29);
  log['2026-11-10'] = { in: '2026-11-10T06:10:00+05:30', first: '2026-11-10T07:10:00+05:30' };
  const o = outlook(log, '2026-11-10');
  assert.equal(o.lateToday, true);
  assert.equal(o.streak, 0);
  assert.equal(o.earlyLive, false);   // only 20 days left after today
  assert.equal(o.monthLive, true);
  assert.equal(o.possible, 1000);
});
test('month grid starts on Monday and marks states', () => {
  const g = monthDays(A({ '2026-11-01': ['x'] }), '2026-11-03');   // 1 Nov 2026 is a Sunday
  assert.equal(g.lead, 6);
  assert.equal(g.days.length, 30);
  assert.deepEqual(g.days.slice(0, 4).map(d => d.state), ['came', 'missed', 'today', 'upcoming']);
});

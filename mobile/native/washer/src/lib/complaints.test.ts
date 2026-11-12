import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivals, cleanComplaint, cleanInput, cleanState, countInMonth, firstName, inMonth, ratingKeys, ratingStats, sampleComplaintDoc, showAvg, unseen } from './complaints.ts';
import { cleanMonth, rewards } from './rewards.ts';

const doc = (id: string, date: string, status: any = 'open') => cleanComplaint(sampleComplaintDoc({ id, date, reg: 'DL4CAB2731', washer_id: 'chotte', status }), id)!;

test('cleanComplaint keeps the first name only and never the phone', () => {
  const c = cleanComplaint({ ...sampleComplaintDoc({ id: 'x', date: '2026-11-03', reg: 'DL4CAB2731', washer_id: 'chotte', customer_name: 'Pooja S.' }), customer_phone: '+919811009090' }, 'x')!;
  assert.equal(c.customer_first, 'Pooja');
  assert.ok(!JSON.stringify(c).includes('9811009090'));
  assert.equal(c.month, '2026-11');
  assert.equal(firstName('  Rakesh  Kumar '), 'Rakesh');
});
test('cleanComplaint rejects junk and repairs unknown kind/status', () => {
  assert.equal(cleanComplaint(null, 'a'), null);
  assert.equal(cleanComplaint({ date: 'yesterday' }, 'a'), null);
  const c = cleanComplaint({ date: '2026-11-03', kind: 'zzz', status: 'weird', text: 'x'.repeat(900), stars: 9 }, 'a')!;
  assert.equal(c.kind, 'other'); assert.equal(c.status, 'open'); assert.equal(c.text.length, 500); assert.equal(c.stars, null);
});
test('month filter: calendar month by the doc date; invalid does not count', () => {
  const list = [doc('a', '2026-10-31'), doc('b', '2026-11-01'), doc('c', '2026-11-12', 'resolved'), doc('d', '2026-11-05', 'invalid'), doc('e', '2026-11-06', 'seen')];
  assert.equal(countInMonth(list, '2026-11'), 3);
  assert.equal(countInMonth(list, '2026-10'), 1);
  assert.deepEqual(inMonth(list, '2026-11').map(c => c.id), ['c', 'e', 'd', 'b']);
  assert.equal(unseen(list), 2);
});
test('arrivals are new open ones only', () => {
  const list = [doc('a', '2026-11-01'), doc('b', '2026-11-02', 'seen'), doc('c', '2026-11-03')];
  assert.deepEqual(arrivals(new Set(['a']), list).map(c => c.id), ['c']);
});
test('ratingKeys: month only, done washes, unique, newest first, capped', () => {
  const w = [
    { date: '2026-11-02', reg: 'A', status: 'done' }, { date: '2026-11-03', reg: 'A', status: 'done' }, { date: '2026-11-03', reg: 'A', status: 'done' },
    { date: '2026-11-04', reg: 'B', status: 'skipped' }, { date: '2026-10-30', reg: 'A', status: 'done' },
  ];
  assert.deepEqual(ratingKeys(w, '2026-11'), ['2026-11-03_A', '2026-11-02_A']);
  const many = Array.from({ length: 200 }, (_, i) => ({ date: '2026-11-' + String(1 + (i % 28)).padStart(2, '0'), reg: 'R' + i, status: 'done' }));
  assert.equal(ratingKeys(many, '2026-11').length, 120);
});
test('ratingStats ignores bad stars and other months', () => {
  const r = ratingStats([{ date: '2026-11-01', reg: 'A', stars: 5 }, { date: '2026-11-02', reg: 'A', stars: 4 }, { date: '2026-11-02', reg: 'B', stars: 7 }, { date: '2026-10-02', reg: 'B', stars: 1 }], '2026-11');
  assert.equal(r.count, 2); assert.equal(r.avg, 4.5);
  assert.deepEqual(ratingStats([], '2026-11'), { count: 0, avg: null });
});
test('showAvg floors so 4.78 never looks like 4.8', () => {
  assert.equal(showAvg(4.78), '4.7'); assert.equal(showAvg(4.8), '4.8'); assert.equal(showAvg(5), '5.0'); assert.equal(showAvg(null), '–');
});
const five = (s: number[]) => s.map((stars, i) => ({ date: '2026-11-0' + (i + 1), reg: 'A', stars }));
test('No Complaint Bonus: no complaints -> on course', () => {
  const c = cleanMonth(cleanInput([], [], '2026-11'), '2026-11-12');
  assert.equal(c.eligible, true); assert.equal(c.earned, false); assert.equal(c.possible, true);
  assert.deepEqual(cleanState(c), { kind: 'none' });
});
test('No Complaint Bonus: a complaint but 4.8+ over 5 ratings still qualifies', () => {
  const c = cleanMonth(cleanInput([doc('a', '2026-11-03')], five([5, 5, 5, 5, 4]), '2026-11'), '2026-11-12');
  assert.equal(c.byRating, true); assert.equal(c.eligible, true);
  assert.deepEqual(cleanState(c), { kind: 'rated', n: 1, avg: '4.8' });
});
test('No Complaint Bonus: high average over fewer than 5 ratings is not enough', () => {
  const c = cleanMonth(cleanInput([doc('a', '2026-11-03')], five([5, 5, 5, 5]), '2026-11'), '2026-11-12');
  assert.equal(c.eligible, false); assert.equal(c.possible, true);
  assert.deepEqual(cleanState(c), { kind: 'low', n: 1, avg: '5.0', few: true });
});
test('No Complaint Bonus: low rating with complaints is lost at month end', () => {
  const inp = cleanInput([doc('a', '2026-11-03'), doc('b', '2026-11-04')], five([5, 4, 4, 5, 3]), '2026-11');
  const mid = cleanMonth(inp, '2026-11-12'), end = cleanMonth(inp, '2026-11-30');
  assert.deepEqual(cleanState(mid), { kind: 'low', n: 2, avg: '4.2', few: false });
  assert.equal(end.possible, false); assert.equal(end.bonus, 0);
  assert.deepEqual(cleanState(end), { kind: 'lost', n: 2, avg: '4.2' });
});
test('No Complaint Bonus: an invalid complaint does not count, and it pays on the last day', () => {
  const c = cleanMonth(cleanInput([doc('a', '2026-11-03', 'invalid')], [], '2026-11'), '2026-11-30');
  assert.equal(c.earned, true); assert.equal(c.bonus, 1000);
});
test('all three bonuses together are 3000', () => {
  const a: Record<string, any> = {};
  for (let i = 1; i <= 30; i++) { const d = '2026-11-' + String(i).padStart(2, '0'); a[d] = { in: d + 'T05:20:00+05:30', first: d + 'T05:50:00+05:30' } }
  const r = rewards(a, '2026-11-30', { complaints: 0, ratingCount: 0, ratingAvg: null });
  assert.equal(r.total, 3000); assert.equal(r.best, 3000);
});

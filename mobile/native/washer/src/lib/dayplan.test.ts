import test from 'node:test';
import assert from 'node:assert/strict';
import { workStreak, lastWeek, hoursLabel } from './dayplan.ts';

const a = { '2026-11-22': { in: 'x' }, '2026-11-23': { in: 'x' } };
test('streak survives a not-yet-checked-in today', () => { assert.equal(workStreak(a, '2026-11-24'), 2) });
test('streak counts today', () => { assert.equal(workStreak({ ...a, '2026-11-24': { in: 'x' } }, '2026-11-24'), 3) });
test('a gap breaks it', () => { assert.equal(workStreak({ '2026-11-22': { in: 'x' } }, '2026-11-24'), 0) });
test('last week', () => { const w = lastWeek(a, '2026-11-24'); assert.equal(w.length, 7); assert.equal(w[6].state, 'today'); assert.equal(w[5].state, 'came'); assert.equal(w[0].state, 'missed') });
test('hours label', () => { assert.equal(hoursLabel('2026-11-24T08:05:00+05:30', Date.parse('2026-11-24T10:20:00+05:30')), '2h 15m') });

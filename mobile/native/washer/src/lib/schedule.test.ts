// node --experimental-strip-types --test src/lib/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tasksFor, normReg, hash } from './schedule.ts';
import { rupee, addDaysStr, daysInMonth, t12, hm12 } from './time.ts';

test('REG is the plate uppercased with separators removed', () => {
  assert.equal(normReg('DL 4C AB 2731'), 'DL4CAB2731');
  assert.equal(normReg('dl-3c-bk-0419'), 'DL3CBK0419');
});

test('hash is unsigned, so offsets never go negative (sync contract note)', () => {
  assert.ok(hash('DL3CBK0419') >= 0);
  assert.ok(((hash('DL3CBK0419') >>> 9) % 7) >= 0);
});

test('every car gets pressure first and dry last', () => {
  for (const plan of ['legacy', 'std', 'pro', 'exc', 'res']) {
    const t = tasksFor('DL4CAB2731', plan, '2026-10-29');
    assert.equal(t[0], 'pressure');
    assert.equal(t[t.length - 1], 'dry');
  }
});

test('WD Reserve gets interior, tyre and foam every day', () => {
  for (let i = 0; i < 7; i++) {
    const t = tasksFor('DL1CAA0550', 'res', addDaysStr('2026-10-26', i));
    for (const k of ['foam', 'interior', 'tyre']) assert.ok(t.includes(k as never), k);
  }
});

test('per-week counts match the plan over any week', () => {
  const week = (reg: string, plan: string, key: string) =>
    [...Array(7)].filter((_, i) => tasksFor(reg, plan, addDaysStr('2026-10-26', i)).includes(key as never)).length;
  for (const reg of ['DL4CAB2731', 'DL3CBK0419', 'HR26DK4471', 'DL1CZ4410']) {
    assert.equal(week(reg, 'std', 'interior'), 1);
    assert.equal(week(reg, 'std', 'tyre'), 2);
    assert.equal(week(reg, 'std', 'foam'), 1);
    assert.equal(week(reg, 'pro', 'interior'), 2);
    assert.equal(week(reg, 'pro', 'tyre'), 7);
    assert.equal(week(reg, 'exc', 'foam'), 4);
    assert.equal(week(reg, 'res', 'detailing'), 4);
  }
});

test('Pro gets detailing once a month, Exclusive twice', () => {
  const month = (reg: string, plan: string) =>
    [...Array(31)].filter((_, i) => tasksFor(reg, plan, addDaysStr('2026-10-01', i)).includes('detailing')).length;
  assert.equal(month('DL4CAB2731', 'pro'), 1);
  assert.equal(month('DL4CAB2731', 'exc'), 2);
  assert.equal(month('DL4CAB2731', 'std'), 0);
});

test('money and time formatting', () => {
  assert.equal(rupee(123456), '₹1,23,456');
  assert.equal(rupee(999), '₹999');
  assert.equal(rupee(0), '₹0');
  assert.equal(daysInMonth('2026-02-10'), 28);
  assert.equal(t12('2026-10-15T06:42:10+05:30'), '6:42 AM');
  assert.equal(hm12('13:05'), '1:05 PM');
});

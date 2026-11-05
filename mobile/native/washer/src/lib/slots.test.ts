import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, slotRange, etaIn, place, lists, SLOT_COUNT } from './slots.ts';
import { guideAt, withInterior, GUIDE } from './washGuide.ts';

test('six slots between 5:30 and 11:00', () => {
  assert.equal(SLOT_COUNT, 6); assert.equal(SLOTS[0].from, '05:30'); assert.equal(SLOTS[5].to, '11:00');
  assert.equal(slotRange(1).from, '06:25'); assert.equal(slotRange(1).to, '07:20');
});
test('cars in a slot are spread across it', () => {
  assert.equal(etaIn(0, 0, 3), '05:30'); assert.equal(etaIn(0, 1, 3), '05:48'); assert.equal(etaIn(0, 2, 3), '06:06'); assert.equal(etaIn(2, 0, 1), '07:20');
});
test('placing and moving cars', () => {
  let o = ['A', 'B', 'C', 'D'], s: Record<string, number> = {};
  ({ order: o, slots: s } = place(o, s, 'C', 0)); ({ order: o, slots: s } = place(o, s, 'A', 0, 0));
  assert.deepEqual(o, ['A', 'C', 'B', 'D']); assert.deepEqual(lists(o, s).slots[0], ['A', 'C']); assert.deepEqual(lists(o, s).pool, ['B', 'D']);
  ({ order: o, slots: s } = place(o, s, 'A', 3)); assert.deepEqual(lists(o, s).slots[3], ['A']); assert.deepEqual(lists(o, s).slots[0], ['C']);
  ({ order: o, slots: s } = place(o, s, 'A', null)); assert.equal(s['A'], undefined);
});
test('interior add-on inserts 10 minutes and shifts the rest', () => {
  const p = withInterior(GUIDE, 360);   // starts when polish starts
  const at = (sec: number) => guideAt('2026-11-02T06:00:00+05:30', Date.parse('2026-11-02T06:00:00+05:30') + sec * 1000, 360)!.step.clip;
  assert.equal(at(100), 'ph_wash'); assert.equal(at(361), 'ph_i_dash'); assert.equal(at(361 + 480), 'ph_i_glass');
  assert.equal(at(360 + 600), 'ph_polish'); assert.equal(at(540 + 600), 'ph_check'); assert.equal(at(660 + 600), 'ph_end');
  assert.equal(p.length, GUIDE.length + 5);
});

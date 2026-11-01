import test from 'node:test';
import assert from 'node:assert/strict';
import { guideAt, GUIDE } from './washGuide.ts';

const t0 = '2026-11-01T06:00:00+05:30', ms = (s: number) => Date.parse(t0) + s * 1000;
test('stages follow the 3-3-3-1 plan then photo', () => {
  const at = (s: number) => guideAt(t0, ms(s))!.step.key;
  assert.equal(at(0), 'wash'); assert.equal(at(179), 'wash');
  assert.equal(at(180), 'dry'); assert.equal(at(359), 'dry');
  assert.equal(at(360), 'polish'); assert.equal(at(539), 'polish');
  assert.equal(at(540), 'check'); assert.equal(at(599), 'check');
  assert.equal(at(600), 'photo'); assert.equal(at(5000), 'photo');
});
test('seconds left in a stage', () => {
  assert.equal(guideAt(t0, ms(170))!.secsLeft, 10);
  assert.equal(guideAt(t0, ms(700))!.secsLeft, null);
  assert.equal(guideAt(null), null);
  assert.equal(GUIDE.length, 5);
});

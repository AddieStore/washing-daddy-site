import test from 'node:test';
import assert from 'node:assert/strict';
import { guideAt, GUIDE, SPOTS, isSundayIST, nameClip } from './washGuide.ts';

const t0 = '2026-11-02T06:00:00+05:30', ms = (s: number) => Date.parse(t0) + s * 1000;
test('stages follow the 3-3-3-1 plan then photo', () => {
  const at = (s: number) => guideAt(t0, ms(s))!.step.key;
  assert.equal(at(0), 'wash'); assert.equal(at(179), 'wash');
  assert.equal(at(180), 'dry'); assert.equal(at(359), 'dry');
  assert.equal(at(360), 'polish'); assert.equal(at(539), 'polish');
  assert.equal(at(540), 'check'); assert.equal(at(599), 'check');
  assert.equal(at(600), 'photo'); assert.equal(at(659), 'photo');
  assert.equal(at(660), 'end'); assert.equal(at(5000), 'end');
});
test('seconds left in a stage', () => {
  assert.equal(guideAt(t0, ms(170))!.secsLeft, 10);
  assert.equal(guideAt(t0, ms(700))!.secsLeft, null);
  assert.equal(guideAt(null), null);
  assert.equal(GUIDE.length, 6);
});

test('Sunday: 12 min outside, 12 min inside, check, photos (25 min)', () => {
  const sun = '2026-11-01T06:00:00+05:30', at = (s: number) => guideAt(sun, Date.parse(sun) + s * 1000)!.step.clip;
  assert.equal(isSundayIST(sun), true); assert.equal(isSundayIST(t0), false);
  assert.equal(at(100), 'ph_wash'); assert.equal(at(300), 'ph_dry'); assert.equal(at(600), 'ph_polish');
  assert.equal(at(730), 'ph_i_dash'); assert.equal(at(1000), 'ph_i_seat'); assert.equal(at(1100), 'ph_i_back');
  assert.equal(at(1250), 'ph_i_mat'); assert.equal(at(1400), 'ph_i_glass'); assert.equal(at(1450), 'ph_check'); assert.equal(at(1550), 'ph_photo_sun'); assert.equal(at(1560), 'ph_end'); assert.equal(at(1600), 'ph_end');
  assert.equal(SPOTS.length, 4);
});
test('late Saturday UTC is already Sunday in India', () => { assert.equal(isSundayIST('2026-10-31T19:00:00Z'), true) });
test('name clip', () => { assert.equal(nameClip('Sharukh Khan'), 'nm_sharukh'); assert.equal(nameClip(''), null) });

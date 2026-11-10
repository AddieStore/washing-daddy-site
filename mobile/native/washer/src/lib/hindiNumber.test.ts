import test from 'node:test';
import assert from 'node:assert/strict';
import { amountClips, announceClips, HINDI_WORDS } from './hindiNumber.ts';

test('amounts split into clips', () => {
  assert.deepEqual(amountClips(799), ['n7', 'sau', 'n99']);
  assert.deepEqual(amountClips(1500), ['n1', 'hazaar', 'n5', 'sau']);
  assert.deepEqual(amountClips(40), ['n40']);
  assert.deepEqual(amountClips(100), ['n1', 'sau']);
  assert.deepEqual(amountClips(12005), ['n12', 'hazaar', 'n5']);
});
test('announcement wraps the amount', () => {
  assert.deepEqual(announceClips(499), ['intro', 'n4', 'sau', 'n99', 'rupaye']);
  assert.deepEqual(announceClips(null), ['intro']);
});
test('every clip key has a Hindi word', () => {
  for (const a of [1, 99, 100, 999, 1000, 99999]) for (const k of announceClips(a)) assert.ok(HINDI_WORDS[k], k);
  assert.equal(Object.keys(HINDI_WORDS).length, 155);
});
import { plateClips, lateClips } from './hindiNumber.ts';
test('car number is read character by character', () => {
  assert.deepEqual(plateClips('DL4CAB2731'), ['pl_d', 'pl_l', 'n4', 'pl_c', 'pl_a', 'pl_b', 'n2', 'n7', 'n3', 'n1']);
  assert.deepEqual(plateClips('HR 26 0'), ['pl_h', 'pl_r', 'n2', 'n6', 'pl_0']);
});
test('late alert says the car, the slot and the line', () => {
  const c = lateClips('DL4C1', '07:20'); assert.deepEqual(c.slice(-6), ['ph_slot', 'n7', 'ph_bajkar', 'n20', 'ph_min', 'ph_late']);
  assert.deepEqual(lateClips('A1', '05:00'), ['pl_a', 'n1', 'ph_slot', 'n5', 'ph_late']);
  for (const k of lateClips('DL4CAB2731', '10:05')) assert.ok(HINDI_WORDS[k], k);
});

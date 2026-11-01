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
  assert.equal(Object.keys(HINDI_WORDS).length, 99 + 4);
});

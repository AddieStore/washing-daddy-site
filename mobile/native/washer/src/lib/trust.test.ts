import test from 'node:test';
import assert from 'node:assert/strict';
import { trustOf } from './trust.ts';

const kinds = ['a', 'b', 'c'];
const base = { profile: null, docs: {}, docKinds: kinds, kit: [] };

test('nothing on file means nothing earned', () => {
  const t = trustOf(base);
  assert.deepEqual([t.id, t.docs, t.kit, t.background, t.verified, t.earned], [false, false, false, false, false, 0]);
});
test('verified needs ID and every document', () => {
  const profile = { phone: '1', name: 'x', status: 'approved', aadhaar_verified_at: '2026-01-01' } as any;
  assert.equal(trustOf({ ...base, profile }).verified, false);
  const docs = { a: { status: 'verified' }, b: { status: 'verified' }, c: { status: 'submitted' } };
  assert.equal(trustOf({ ...base, profile, docs }).docsDone, 2);
  assert.equal(trustOf({ ...base, profile, docs }).verified, false);
  docs.c.status = 'verified';
  assert.equal(trustOf({ ...base, profile, docs }).verified, true);
});
test('background check only when the certificate is clear', () => {
  const mk = (s: string) => ({ phone: '1', name: 'x', status: 'approved', pcc: { status: s } }) as any;
  assert.equal(trustOf({ ...base, profile: mk('pending') }).background, false);
  assert.equal(trustOf({ ...base, profile: mk('rejected') }).background, false);
  assert.equal(trustOf({ ...base, profile: mk('clear') }).background, true);
});
test('kit is ready only when the assigned clothes are there', () => {
  const profile = { phone: '1', name: 'x', status: 'approved', assigned_clothes: 5 } as any;
  const k = (qty: number) => [{ id: '1', kind: 'clothes', name: 'c', qty, at: '' }] as any;
  assert.equal(trustOf({ ...base, profile, kit: k(3) }).kit, false);
  assert.equal(trustOf({ ...base, profile, kit: k(5) }).kit, true);
});

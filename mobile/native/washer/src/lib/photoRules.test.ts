import test from 'node:test';
import assert from 'node:assert/strict';
import { carGate, mergeReview, placeAfter, rejectInfo, rejectLine, reviewAfterRetake } from './photoRules.ts';
import type { Photo } from './data.ts';

const ph = (n: number, o: Partial<Photo> = {}): Photo => ({ kind: 'after', at: `2026-11-27T10:0${n}:00+05:30`, n, ...o });

test('finish gate: 2 after photos and at least one with the number plate', () => {
  assert.equal(carGate([]).ok, false);
  assert.equal(carGate([ph(0, { plate: true })]).ok, false);
  assert.equal(carGate([ph(0), ph(1)]).ok, false);
  assert.equal(carGate([ph(0), ph(1, { plate: true })]).ok, true);
  assert.equal(carGate([ph(0, { plate: true }), ph(1, { plate: true })]).plate, 2);
});
test('a before photo, an issue photo and inside spots never count', () => {
  const x = [{ kind: 'before', at: '', n: 5, plate: true }, ph(0), ph(1, { kind: 'issue', plate: true }), ph(2, { kind: 'inside', spot: 'seat' })] as unknown as Photo[];
  assert.equal(carGate(x).car, 1);
  assert.equal(carGate(x).ok, false);
});
test('a rejected photo stops counting until it is retaken', () => {
  const g = carGate([ph(0, { plate: true }), ph(1, { rejected: { at: 'x', by: 'manager', reason: 'blur' } })]);
  assert.equal(g.car, 1); assert.equal(g.rejected, 1); assert.equal(g.ok, false);
});
test('a third after photo is refused; with a rejected one it replaces only that one', () => {
  const l: Photo[] = [ph(0, { plate: true }), ph(1)];
  assert.equal(placeAfter(l, ph(2)), 'full'); assert.equal(l.length, 2);
  l[1].rejected = { at: 'x', by: 'manager', reason: 'blur' };
  const np = ph(3);
  assert.equal(placeAfter(l, np), 'replaced');
  assert.deepEqual(l.map(p => p.n), [0, 3]);
  assert.equal(l[1].rejected, undefined);
  assert.equal(l[0].plate, true);
  assert.equal(reviewAfterRetake(l), 'pending');
});
test('the first car photo is simply added; the issue photo is not part of the 2', () => {
  const l: Photo[] = [ph(0, { kind: 'issue' })];
  assert.equal(placeAfter(l, ph(1)), 'added'); assert.equal(placeAfter(l, ph(2)), 'added'); assert.equal(placeAfter(l, ph(3)), 'full');
});
test('two rejected: retaking one keeps the wash flagged rejected', () => {
  const r = { at: 'x', by: 'manager', reason: 'a' };
  const l: Photo[] = [ph(0, { rejected: r }), ph(1, { rejected: r })];
  placeAfter(l, ph(2));
  assert.equal(reviewAfterRetake(l), 'rejected');
});
test('the banner line: reason, or none', () => {
  const tr = (s: string) => s;
  assert.equal(rejectInfo([ph(0)]), null);
  const i = rejectInfo([ph(0), ph(1, { rejected: { at: 'x', by: 'manager', reason: 'Plate saaf nahi' } })])!;
  assert.equal(rejectLine(i, tr), 'Photo reject hui: Plate saaf nahi. Dobara lo');
  assert.equal(rejectLine({ reason: '' }, tr), 'Photo reject hui. Dobara lo');
});

test('sync: the admin review is copied onto the local photo', () => {
  const local = { photos: [ph(0, { plate: true }), ph(1)], photo_review: undefined, photo_review_at: undefined } as any;
  const remote = { photos: [ph(0, { plate: true, plate_ok: { at: '2026-11-27T11:00:00+05:30', by: 'manager' } }), ph(1, { rejected: { at: '2026-11-27T11:01:00+05:30', by: 'manager', reason: 'dhundhli' } })], photo_review: 'rejected', photo_review_at: '2026-11-27T11:01:00+05:30' } as any;
  assert.equal(mergeReview(local, remote), true);
  assert.equal(local.photos[0].plate_ok.by, 'manager');
  assert.equal(local.photos[1].rejected.reason, 'dhundhli');
  assert.equal(local.photo_review, 'rejected');
  assert.equal(mergeReview(local, remote), false);   // nothing new the second time
});
test('sync: a stale local photo does not overwrite a newer admin review, and a retake is not hit by the old rejection', () => {
  // the washer toggled the plate locally (older copy), the admin rejected photo 1 meanwhile
  const local = { photos: [ph(0, { plate: true }), ph(1, { plate: true })], photo_review: 'pending', photo_review_at: '2026-11-27T10:30:00+05:30' } as any;
  const remote = { photos: [ph(0, { plate: true }), ph(1, { plate: true, rejected: { at: '2026-11-27T11:00:00+05:30', by: 'manager' } })], photo_review: 'rejected', photo_review_at: '2026-11-27T11:00:00+05:30' } as any;
  mergeReview(local, remote);
  assert.ok(local.photos[1].rejected); assert.equal(local.photo_review, 'rejected');
  // the washer retook it (new n, review 'pending' set later than the admin's): the old rejection must not come back
  const retaken = { photos: [ph(0, { plate: true }), ph(7, { at: '2026-11-27T12:00:00+05:30' })], photo_review: 'pending', photo_review_at: '2026-11-27T12:00:00+05:30' } as any;
  assert.equal(mergeReview(retaken, remote), false);
  assert.equal(retaken.photos[1].rejected, undefined); assert.equal(retaken.photo_review, 'pending');
});
test('sync: a newer local review is kept over an older remote one', () => {
  const local = { photos: [ph(0, { rejected: { at: '2026-11-27T12:00:00+05:30', by: 'manager', reason: 'new' } })], photo_review: 'rejected', photo_review_at: '2026-11-27T12:00:00+05:30' } as any;
  const remote = { photos: [ph(0, { rejected: { at: '2026-11-27T11:00:00+05:30', by: 'manager', reason: 'old' } })], photo_review: 'rejected', photo_review_at: '2026-11-27T11:00:00+05:30' } as any;
  assert.equal(mergeReview(local, remote), false);
  assert.equal(local.photos[0].rejected.reason, 'new');
});

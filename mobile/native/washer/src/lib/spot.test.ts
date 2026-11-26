import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSpot, cleanReq, distM, distText } from './data.ts';

const mk = (id: string, o: Record<string, unknown> = {}) => cleanReq({ reg: 'DL1', kind: 'spot', text: '', lat: 28.67, lng: 77.1, acc: 10, from: '2026-11-27', to: '2026-11-28', until_back: false, created_at: '2026-11-26T22:00:00+05:30', status: 'open', ...o }, id);
test('a spot applies only inside from..to', () => {
  const l = [mk('a')];
  assert.equal(pickSpot(l, 'DL1', '2026-11-26'), null);
  assert.equal(pickSpot(l, 'DL1', '2026-11-27')?.id, 'a');
  assert.equal(pickSpot(l, 'DL1', '2026-11-28')?.id, 'a');
  assert.equal(pickSpot(l, 'DL1', '2026-11-29'), null);
});
test('cancelled, done and other cars are ignored; seen still applies', () => {
  assert.equal(pickSpot([mk('a', { status: 'cancelled' }), mk('b', { status: 'done' }), mk('c', { reg: 'DL2' })], 'DL1', '2026-11-27'), null);
  assert.equal(pickSpot([mk('a', { status: 'seen' })], 'DL1', '2026-11-27')?.id, 'a');
});
test('the newest created_at wins; plain notes never count', () => {
  const l = [mk('old'), mk('new', { created_at: '2026-11-26T23:00:00+05:30' }), cleanReq({ reg: 'DL1', kind: 'note', created_at: '2026-11-27T01:00:00+05:30' }, 'n')];
  assert.equal(pickSpot(l, 'DL1', '2026-11-27')?.id, 'new');
});
test('distance text', () => {
  assert.equal(distText(distM({ lat: 28.67, lng: 77.1 }, { lat: 28.67, lng: 77.1 })), '10 m');
  assert.equal(distText(distM({ lat: 28.67, lng: 77.1 }, { lat: 28.68, lng: 77.1 })), '1.1 km');
});

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { roundsOf, pagesToMove, rslug, handleRounds } = createRequire(import.meta.url)('./lib.js');
const page = (id, round, washer, area, plate = 'DL 4C AB 2731', status = 'Active') => ({ id, properties: {
  'Account Status': { select: { name: status } }, Round: { select: round ? { name: round } : null }, Washer: { select: washer ? { name: washer } : null },
  Area: { rich_text: [{ plain_text: area }] }, 'Car Number': { rich_text: [{ plain_text: plate }] } } });
const pages = [
  page('a', 'Paschim Vihar A', 'Chotte', 'GH-9'), page('b', 'Paschim Vihar A', 'Chotte', 'GH-6'), page('c', 'Paschim Vihar A', 'Unassigned', 'GH-9'),
  page('d', 'Paschim Vihar B', 'Shahrukh', 'Meera Bagh'), page('e', null, 'Chotte', 'GH-9'), page('f', 'Paschim Vihar B', 'Shahrukh', 'Sundar Vihar', 'NUMBER NEEDED'),
  page('g', 'Paschim Vihar B', 'Shahrukh', 'Sundar Vihar', 'DL 1C Z 4410', 'Paused'),
];
assert.equal(rslug('Paschim Vihar A'), 'paschim-vihar-a');
const r = roundsOf(pages);
assert.deepEqual(r.map(x => [x.id, x.count, x.washer, x.areas]), [['paschim-vihar-a', 3, 'chotte', 'GH-6 · GH-9'], ['paschim-vihar-b', 1, 'shahrukh', 'Meera Bagh']]);
assert.deepEqual(pagesToMove(pages, 'paschim-vihar-a', 'shahrukh'), ['a', 'b', 'c']);
assert.deepEqual(pagesToMove(pages, 'paschim-vihar-a', 'chotte'), ['c']);
assert.deepEqual(pagesToMove(pages, 'paschim-vihar-a', 'nobody'), []);
// handler: list, then take
const calls = [];
const http = async o => { calls.push(o.method + ' ' + o.url.split('/').slice(-2).join('/')); return o.method === 'POST' ? { status: 200, body: { results: pages, has_more: false } } : { status: 200, body: {} } };
const l = await handleRounds({ washer: 'chotte', body: { action: 'list' }, http, token: 't', dbId: 'db' }); assert.equal(l.ok, true); assert.equal(l.mine, 'paschim-vihar-a');
const p = await handleRounds({ washer: 'shahrukh', body: { action: 'pick', round: 'Paschim Vihar A' }, http, token: 't', dbId: 'db' });
assert.deepEqual([p.ok, p.moved, p.total], [true, 3, 3]);
assert.equal(calls.filter(c => c.startsWith('PATCH')).length, 3);
assert.equal((await handleRounds({ washer: 'chotte', body: { action: 'pick', round: 'zzz' }, http, token: 't', dbId: 'db' })).ok, false);
assert.equal((await handleRounds({ washer: 'x', http, token: 't', dbId: 'db' })).ok, false);
console.log('rounds: all passed');

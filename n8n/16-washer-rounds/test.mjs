import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { roundsOf, pagesToMove, rslug, handleRounds, parseWasherIds, setWashers, washerLabel, opsGroups, findCar, handleOps } = createRequire(import.meta.url)('./lib.js');
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
const stolen = await handleRounds({ washer: 'shahrukh', body: { action: 'pick', round: 'Paschim Vihar A' }, http, token: 't', dbId: 'db' });
assert.deepEqual([stolen.ok, stolen.error, stolen.washer], [false, 'taken', 'chotte']);
assert.equal(calls.filter(c => c.startsWith('PATCH')).length, 0);
// a round nobody has is takeable
const free = pages.map(pg => pg.id === 'd' ? page('d', 'Paschim Vihar B', 'Unassigned', 'Meera Bagh') : pg);
const http2 = async o => (o.method === 'POST' ? { status: 200, body: { results: free, has_more: false } } : { status: 200, body: {} });
const p = await handleRounds({ washer: 'chotte', body: { action: 'pick', round: 'Paschim Vihar B' }, http: http2, token: 't', dbId: 'db' });
assert.deepEqual([p.ok, p.moved, p.total], [true, 1, 1]);
assert.equal((await handleRounds({ washer: 'chotte', body: { action: 'pick', round: 'zzz' }, http, token: 't', dbId: 'db' })).ok, false);
assert.equal((await handleRounds({ washer: 'x', http, token: 't', dbId: 'db' })).ok, false);

// ---- washer list, ops ----
assert.deepEqual(Object.keys(parseWasherIds('chotte, Aman ,x')), ['chotte', 'aman']);
assert.deepEqual(Object.keys(parseWasherIds('["a1","b2"]')), ['a1', 'b2']);
assert.equal(parseWasherIds(''), null);
assert.equal(washerLabel('aman', 'Aman'), 'Aman'); assert.equal(washerLabel('aman', 'Evil'), 'Aman');
const g = opsGroups(pages);
assert.deepEqual(g.washers.map(w => [w.id, w.count]), [['chotte', 3], ['shahrukh', 2]]);
assert.equal(g.total, 6);
assert.equal(g.unassigned.count, 1);
assert.equal(findCar(pages, { reg: 'dl 4c ab 2731' }).error, 'more than one car with this number');
assert.equal(findCar(pages, { carPageId: 'd' }).car.id, 'd');
assert.equal(findCar(pages, { carPageId: 'g' }).error, 'unknown car');   // paused
const writes = [];
const hop = async o => { if (o.method === 'POST') return { status: 200, body: { results: pages, has_more: false } }; writes.push(o); return { status: 200, body: {} } };
assert.equal((await handleOps({ body: { action: 'ops_list' }, http: hop, token: 't', dbId: 'db', admin: false })).error, 'forbidden');
assert.equal((await handleOps({ body: { action: 'ops_list' }, http: hop, token: 't', dbId: 'db' })).error, 'forbidden');
assert.equal(writes.length, 0);
const ol = await handleOps({ body: { action: 'ops_list' }, http: hop, token: 't', dbId: 'db', admin: true });
assert.equal(ol.ok, true); assert.deepEqual(ol.washerIds, ['chotte', 'shahrukh']);
const mv = await handleOps({ body: { action: 'ops_move', carPageId: 'd', washer: 'chotte', round: 'Paschim Vihar A' }, http: hop, token: 't', dbId: 'db', admin: true });
assert.deepEqual([mv.ok, mv.moved, mv.round], [true, 1, 'Paschim Vihar A']);
assert.deepEqual(writes[0].body.properties, { Washer: { select: { name: 'Chotte' } }, Round: { select: { name: 'Paschim Vihar A' } }, 'Round Order': { number: null } });
assert.equal((await handleOps({ body: { action: 'ops_move', carPageId: 'd', washer: 'bob' }, http: hop, token: 't', dbId: 'db', admin: true })).error, 'unknown washer');
assert.equal((await handleOps({ body: { action: 'ops_move', carPageId: 'd', washer: 'chotte', round: 'nope' }, http: hop, token: 't', dbId: 'db', admin: true })).error, 'unknown round');
writes.length = 0;
const ho = await handleOps({ body: { action: 'ops_handover', round: 'Paschim Vihar A', toWasher: 'shahrukh' }, http: hop, token: 't', dbId: 'db', admin: true });
assert.deepEqual([ho.ok, ho.moved, ho.total], [true, 3, 3]); assert.equal(writes.length, 3);
// a new washer from the one list
setWashers('chotte,shahrukh,aman');
assert.equal((await handleOps({ body: { action: 'ops_handover', round: 'paschim-vihar-b', toWasher: 'aman', washerName: 'Aman' }, http: hop, token: 't', dbId: 'db', admin: true })).moved, 1);
assert.equal(writes.at(-1).body.properties.Washer.select.name, 'Aman');
setWashers('');
console.log('rounds: all passed');

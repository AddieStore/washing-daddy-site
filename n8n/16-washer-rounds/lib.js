// Rounds: every car of one area collected into one list (Notion "Monthly Customers", select property "Round").
// Pure functions, shared by the n8n Code node and the tests.
// The washers a round can belong to: ONE list, id -> id. Default is the two original washers; n8n env WASHER_IDS
// (JSON array or comma list, e.g. chotte,shahrukh,aman) replaces it. The Notion "Washer" select option is the id, any capitals.
// Workflow 9 reads the same env, so a washer added here also gets his own list there.
let ROUND_WASHERS = { chotte: 'chotte', shahrukh: 'shahrukh' };
function parseWasherIds(raw) {
  let a = raw;
  if (typeof raw === 'string') { try { a = JSON.parse(raw) } catch (e) { a = raw.split(',') } }
  if (!Array.isArray(a)) return null;
  const o = {};
  a.map(x => String(x || '').trim().toLowerCase()).filter(x => /^[a-z0-9][a-z0-9-]{1,39}$/.test(x)).forEach(x => { o[x] = x });
  return Object.keys(o).length ? o : null;
}
function setWashers(raw) { ROUND_WASHERS = parseWasherIds(raw) || { chotte: 'chotte', shahrukh: 'shahrukh' }; return ROUND_WASHERS }
/** Notion select option name for a washer id: the caller's label if it spells the same id, else Title-case of the id. */
function washerLabel(id, label) {
  const l = String(label || '').trim();
  if (l && l.length <= 40 && l.toLowerCase() === id) return l;
  return id.charAt(0).toUpperCase() + id.slice(1);
}
const rtxt = p => ((p && (p.rich_text || p.title)) || []).map(t => t.plain_text).join('').trim();
const rpick = p => (p && p.select && p.select.name) || '';
const rslug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Active, registered cars that are on a round. */
function roundCars(pages) {
  return (pages || []).filter(pg => {
    const p = pg.properties || {};
    if (rpick(p['Account Status']) !== 'Active') return false;
    if (!rpick(p['Round'])) return false;
    const reg = rtxt(p['Car Number']).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return !!reg && !/NUMBERNEEDED/.test(reg);
  });
}

/** [{ id, name, areas, count, washer }] sorted by name. washer = the one who has most of its cars today ('' if none). */
function roundsOf(pages) {
  const by = {};
  roundCars(pages).forEach(pg => {
    const p = pg.properties, name = rpick(p['Round']), id = rslug(name);
    const r = by[id] = by[id] || { id, name, areas: new Set(), count: 0, w: {} };
    const area = rtxt(p['Area']); if (area) r.areas.add(area);
    r.count++;
    const w = ROUND_WASHERS[rpick(p['Washer']).toLowerCase()] || ''; r.w[w] = (r.w[w] || 0) + 1;
  });
  return Object.values(by).map(r => {
    const top = Object.entries(r.w).sort((a, b) => b[1] - a[1])[0];
    return { id: r.id, name: r.name, areas: [...r.areas].sort().join(' · '), count: r.count, washer: top ? top[0] : '' };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** The Notion page ids that must change so every car of `roundId` belongs to `washer`. */
function pagesToMove(pages, roundId, washer) {
  if (!ROUND_WASHERS[washer]) return [];
  return roundCars(pages).filter(pg => rslug(rpick(pg.properties['Round'])) === roundId && (ROUND_WASHERS[rpick(pg.properties['Washer']).toLowerCase()] || '') !== washer).map(pg => pg.id);
}

async function queryAll(http, headers, dbId) {
  const out = []; let cursor;
  for (let i = 0; i < 30; i++) {   // 30 pages x 100 = 3000 cars; out.truncated says if the book is still bigger
    const r = await http({ method: 'POST', url: `https://api.notion.com/v1/databases/${dbId}/query`, headers,
      body: { filter: { property: 'Account Status', select: { equals: 'Active' } }, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) } });
    if (r.status !== 200 || !r.body) throw new Error('notion query ' + r.status);
    out.push(...(r.body.results || [])); if (!r.body.has_more) break; cursor = r.body.next_cursor;
    if (i === 29) out.truncated = true;
  }
  return out;
}

/** body.action 'list' (default): the rounds. 'pick' + body.round: take a round, all its cars go to this washer. */
async function handleRounds({ washer, body, http, token, dbId }) {
  if (!ROUND_WASHERS[washer]) return { ok: false, error: 'unknown washer' };
  const headers = { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
  const pages = await queryAll(http, headers, dbId);
  if (!(body && body.action === 'pick')) return { ok: true, rounds: roundsOf(pages), mine: (roundsOf(pages).find(r => r.washer === washer) || {}).id || '' };
  const round = rslug(body && body.round);
  const known = roundsOf(pages).find(r => r.id === round);
  if (!round || !known) return { ok: false, error: 'unknown round' };
  if (known.washer && known.washer !== washer) return { ok: false, error: 'taken', washer: known.washer };   // a round that another washer already has is changed by ops in Notion
  const ids = pagesToMove(pages, round, washer);
  let moved = 0;
  for (const id of ids) {
    const r = await http({ method: 'PATCH', url: 'https://api.notion.com/v1/pages/' + id, headers, body: { properties: { Washer: { select: { name: washerLabel(washer, '') } } } } });
    if (r.status === 200) moved++;
  }
  return { ok: moved === ids.length, moved, total: known.count, round };
}

/* ---------------- ops (owner only): see and move cars, hand over a round ---------------- */
const regOf = p => rtxt(p['Car Number']).toUpperCase().replace(/[^A-Z0-9]/g, '');
const washerOf = p => ROUND_WASHERS[rpick(p['Washer']).toLowerCase()] || '';
function carOfPage(pg) {
  const p = pg.properties || {}, reg = regOf(p);
  return { id: pg.id, reg, plate: rtxt(p['Car Number']), name: rtxt(p['Car']), area: rtxt(p['Area']), round: rpick(p['Round']), roundId: rslug(rpick(p['Round'])),
    washer: washerOf(p), order: typeof (p['Round Order'] || {}).number === 'number' ? p['Round Order'].number : null, missingReg: !reg || /NUMBERNEEDED/.test(reg) };
}
/** Active cars grouped washer -> round -> cars. Cars with no (known) washer go to `unassigned`. */
function opsGroups(pages) {
  const cars = (pages || []).filter(pg => rpick((pg.properties || {})['Account Status']) === 'Active').map(carOfPage);
  const srt = (a, b) => (a.order == null ? 9999 : a.order) - (b.order == null ? 9999 : b.order) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name);
  const bucket = list => {
    const by = {};
    list.forEach(c => { const k = c.roundId || ''; (by[k] = by[k] || { id: k, name: c.round || 'No round', cars: [] }).cars.push(c) });
    return Object.values(by).map(r => ({ ...r, count: r.cars.length, cars: r.cars.sort(srt) })).sort((a, b) => (a.id ? 0 : 1) - (b.id ? 0 : 1) || a.name.localeCompare(b.name));
  };
  const washers = Object.keys(ROUND_WASHERS).map(id => { const mine = cars.filter(c => c.washer === id); return { id, count: mine.length, rounds: bucket(mine) } });
  const un = cars.filter(c => !c.washer);
  return { washers, unassigned: { count: un.length, rounds: bucket(un) }, total: cars.length, rounds: roundsOf(pages).map(r => ({ id: r.id, name: r.name })) };
}
/** The one car for { carPageId } or { reg }: { car } or { error }. */
function findCar(pages, body) {
  const act = (pages || []).filter(pg => rpick((pg.properties || {})['Account Status']) === 'Active');
  if (body.carPageId) { const pg = act.find(x => x.id === String(body.carPageId)); return pg ? { car: pg } : { error: 'unknown car' } }
  const reg = String(body.reg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!reg) return { error: 'unknown car' };
  const hit = act.filter(pg => regOf(pg.properties) === reg);
  return hit.length === 1 ? { car: hit[0] } : { error: hit.length ? 'more than one car with this number' : 'unknown car' };
}

/** Owner only (`admin` comes from the verified token). ops_list | ops_move | ops_handover. */
async function handleOps({ body, http, token, dbId, admin }) {
  if (admin !== true) return { ok: false, error: 'forbidden' };
  const headers = { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
  const act = body && body.action;
  const pages = await queryAll(http, headers, dbId);
  if (act === 'ops_list') return { ok: true, ...opsGroups(pages), washerIds: Object.keys(ROUND_WASHERS), truncated: !!pages.truncated };
  const toId = String((body && (act === 'ops_move' ? body.washer : body.toWasher)) || '').toLowerCase();
  if (!ROUND_WASHERS[toId]) return { ok: false, error: 'unknown washer' };
  const name = washerLabel(toId, body.washerName), patch = async (id, props) => (await http({ method: 'PATCH', url: 'https://api.notion.com/v1/pages/' + id, headers, body: { properties: props } })).status === 200;
  if (act === 'ops_move') {
    const f = findCar(pages, body); if (f.error) return { ok: false, error: f.error };
    const props = { Washer: { select: { name } } };
    const cur = rpick(f.car.properties['Round']);
    if (body.round) {
      const known = roundsOf(pages).find(r => r.id === rslug(body.round));
      if (!known) return { ok: false, error: 'unknown round' };
      props.Round = { select: { name: known.name } };
      if (known.name !== cur) props['Round Order'] = { number: null };   // new round: car goes to the end of its order
    }
    if (!(await patch(f.car.id, props))) return { ok: false, error: 'notion write failed' };
    return { ok: true, moved: 1, car: carOfPage(f.car).plate, washer: toId, round: props.Round ? props.Round.select.name : cur };
  }
  if (act === 'ops_handover') {
    const round = rslug(body.round), known = roundsOf(pages).find(r => r.id === round);
    if (!known) return { ok: false, error: 'unknown round' };
    const ids = pagesToMove(pages, round, toId);
    let moved = 0;
    for (const id of ids) if (await patch(id, { Washer: { select: { name } } })) moved++;
    return { ok: moved === ids.length, moved, total: known.count, round, washer: toId };
  }
  return { ok: false, error: 'unknown action' };
}
if (typeof module !== 'undefined') module.exports = { parseWasherIds, setWashers, washerLabel, opsGroups, findCar, handleOps, roundsOf, pagesToMove, rslug, roundCars, handleRounds };

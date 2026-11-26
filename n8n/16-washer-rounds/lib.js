// Rounds: every car of one area collected into one list (Notion "Monthly Customers", select property "Round").
// Pure functions, shared by the n8n Code node and the tests.
const ROUND_WASHERS = { chotte: 'chotte', shahrukh: 'shahrukh' };
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
const WASHER_LABEL = { chotte: 'Chotte', shahrukh: 'Shahrukh' };   // the Notion select option names

async function queryAll(http, headers, dbId) {
  const out = []; let cursor;
  for (let i = 0; i < 6; i++) {
    const r = await http({ method: 'POST', url: `https://api.notion.com/v1/databases/${dbId}/query`, headers,
      body: { filter: { property: 'Account Status', select: { equals: 'Active' } }, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) } });
    if (r.status !== 200 || !r.body) throw new Error('notion query ' + r.status);
    out.push(...(r.body.results || [])); if (!r.body.has_more) break; cursor = r.body.next_cursor;
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
    const r = await http({ method: 'PATCH', url: 'https://api.notion.com/v1/pages/' + id, headers, body: { properties: { Washer: { select: { name: WASHER_LABEL[washer] } } } } });
    if (r.status === 200) moved++;
  }
  return { ok: moved === ids.length, moved, total: known.count, round };
}
if (typeof module !== 'undefined') module.exports = { roundsOf, pagesToMove, rslug, roundCars, handleRounds };

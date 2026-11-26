// Day sheet: what the customer sees after tapping a date on the Daily tab (or "today's photos").
// Order: hero summary, PHOTOS card, the coloured "time stem" timeline, then the details. Real accounts only ever show what the washer wrote.
import { LinearGradient as Grad } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, ScrollView, Animated, Easing, Modal, Pressable, Platform, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle as SCircle } from 'react-native-svg';
import { C, SP } from '../theme';
import { Txt as KTxt, TxtProps } from '../ui/kit';
import { P, NUM, Tap, POutline } from '../ui/pr';
import { IMG } from '../img';
import { WashGlyph, type GlyphKind } from '../ui/washGlyph';
import { SPOT_LABEL, Photo, COND_LABEL, ISSUE_LABEL, ABANDON_LABEL, TASK_LABEL } from '../data/model';
import { TODAY, fmt, iso, parse, ampm, t2m, hm } from '../data/dates';
import { car, doc, dayDetail, realAcct, photosOf, carryNote, ratedToday, requestsFor, history7, activeStage } from '../state';

const Txt = (p: TxtProps) => <KTxt {...p} color={p.color ?? P.ink} />;
const ND = Platform.OS !== 'web';
const SAFFRON = '#FFBA08', SAFFRON_D = '#B45309';
// one colour + icon per stage / task, all from the violet / saffron family plus a few warm and cool accents
const TASK_STYLE: Record<string, { c: string; i: string; g: GlyphKind }> = {
  pressure: { c: '#5409DA', i: '💦', g: 'pressure' }, foam: { c: '#8B5CF6', i: '🫧', g: 'foam' }, interior: { c: '#F59E0B', i: '🧽', g: 'interior' },
  tyre: { c: '#EA580C', i: '🛞', g: 'tyre' }, detailing: { c: '#C026D3', i: '✨', g: 'detailing' }, dry: { c: '#0EA5E9', i: '🧺', g: 'dry' }, other: { c: '#7C3AED', i: '✓', g: 'other' },
};
const STAGE_STYLE: Record<string, { c: string; i: string; g: GlyphKind }> = { onway: { c: '#7C3AED', i: '🛵', g: 'onway' }, arrived: { c: '#A855F7', i: '📍', g: 'arrived' }, started: { c: '#4F46E5', i: '▶', g: 'started' }, finished: { c: '#E09A00', i: '🏁', g: 'finished' } };
const SPOT_ORDER = ['driver_mat', 'passenger_mat', 'back_seat', 'boot', 'dashboard'];
const keyOf = (label: string) => { const l = label.toLowerCase(); return l.includes('foam') ? 'foam' : l.includes('interior') || l.includes('mat') || l.includes('seat') ? 'interior' : l.includes('tyre') ? 'tyre' : l.includes('detail') || l.includes('polish') ? 'detailing' : l.includes('dr') && l.includes('hand') ? 'dry' : l.includes('pressure') ? 'pressure' : 'other' };
const dur = (a?: string | null, b?: string | null) => (a && b ? Math.max(0, t2m(b) - t2m(a)) : null);
const h5 = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h };

type Task = { key: string; label: string; done: boolean; at: string | null };
type Ph = { src: any; label: string; at: string | null };
type Ack = { icon: string; title: string; sub: string };
type Model = {
  date: string; title: string; status: 'done' | 'skipped' | 'live' | 'upcoming' | 'none' | 'paused'; badge: string;
  washer: string; photo: any; car: string; plate: string; minutes: number | null; rating: { stars: number; tag?: string } | null;
  before: Ph | null; after: Ph | null; spots: { key: string; ph: Ph | null }[]; flagged: Ph[]; showSpots: boolean; photoCount: number;
  on: string | null; arr: string | null; st: string | null; fin: string | null; tasks: Task[]; water: number | null; note: string | null; skip: string | null; carry: string | null; acks: Ack[]; live: boolean;
  cond: string | null; issues: string[]; damage: string | null; stopped: { reason: string; minutes: number; tasks: string[]; note: string | null } | null;
};

const m2 = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');

/** the photos of a day (before, after, inside spots, flagged) for the thumbnail strip on the Daily cards; [] when there are none */
export function dayPhotos(date: string): { src: any; label: string }[] {
  try {
    const m = buildModel(date);
    return [m.before, m.after, ...m.spots.map(x => x.ph), ...m.flagged].filter(Boolean).map(p => ({ src: p!.src, label: p!.label }));
  } catch { return [] }
}
function buildModel(date: string): Model { return { cond: null, issues: [], damage: null, stopped: null, ...build0(date) } as Model }
const reasonOf = (r: string) => ABANDON_LABEL[r] || r;
type Part = Omit<Model, 'cond' | 'issues' | 'damage' | 'stopped'> & Partial<Pick<Model, 'cond' | 'issues' | 'damage' | 'stopped'>>;
function build0(date: string): Part {
  const c = car(), real = realAcct(), dt = parse(date), ti = iso(TODAY), isToday = date === ti, dd = dayDetail(date, c);
  const base = { date, title: dd.title, washer: dd.washer || c.washer, car: c.name, plate: c.plate || '' };
  const empty = { before: null, after: null, spots: [] as Model['spots'], flagged: [] as Ph[], showSpots: false, photoCount: 0, on: null, arr: null, st: null, fin: null, tasks: [] as Task[], water: null, note: null, skip: null, carry: null, acks: [] as Ack[], live: false, minutes: null, rating: null, photo: null };
  const acks = ((): Ack[] => requestsFor(c).filter((r: any) => {
    const f = String(r.from || ''), t = String(r.to || r.from || '');
    return (f && date >= f && date <= t) || String(r.created_at || '').slice(0, 10) === date || String(r.done_at || '').slice(0, 10) === date;
  }).map((r: any) => {
    const kind = r.kind === 'skip_tomorrow' ? 'Skip request' : r.kind === 'pause' ? 'Pause request' : r.kind === 'rewash' ? 'Re-wash request' : r.kind === 'note' ? 'Your note' : 'Request';
    const t = ampm(hm(r.status === 'done' ? r.done_at : r.seen_at));
    return { icon: r.status === 'done' ? '✓' : r.status === 'seen' ? '👀' : '⏳', title: `${kind}: ${r.status === 'done' ? 'done' : r.status === 'seen' ? 'seen by ' + (dd.washer || c.washer) : 'sent'}${t ? ' · ' + t : ''}`, sub: r.washer_reply ? `"${r.washer_reply}"` : String(r.text || '') };
  }))();
  const ratingFor = (): Model['rating'] => (isToday ? ratedToday(c) : real ? null : { stars: 4 + (h5(date) % 2) });

  // ---- real account (and today's doc in demo): a WashDoc
  let d = real || isToday ? (isToday ? doc(c) : dd.doc) : null;
  if (real && !isToday && !d) return { ...base, ...empty, status: dd.paused ? 'paused' : 'none', badge: dd.paused ? 'Paused' : 'No wash', skip: dd.paused ? 'Paused by you. The day is added to the end of your plan.' : 'No wash was recorded for this day.', acks };
  if (isToday && real && d && (d as any).notStarted) return { ...base, ...empty, status: 'upcoming', badge: 'Not started', skip: 'Your washer has not started yet. Photos and each step show here as they happen.', acks };

  if (d) {
    const remotePh = photosOf(d), demoToday = !real;
    const pick = (k: string) => remotePh.find(p => p.kind === k);
    const mk = (p: Photo | undefined, label: string): Ph | null => (p ? { src: typeof p.src === 'string' ? { uri: p.src } : p.src, label, at: p.at || null } : null);
    const spots = SPOT_ORDER.map(k => ({ key: k, ph: mk(remotePh.find(p => p.spot === k), SPOT_LABEL[k]) }));
    const carry = carryNote(c, d), hasSpot = spots.some(s => s.ph);
    let before = mk(pick('before'), 'Before'), after = mk(pick('after'), 'After'), flagged = remotePh.filter(p => p.kind === 'issue').map(p => mk(p, 'Flagged')!);
    let sp = spots;
    if (demoToday) { // demo: the static before / after plus the Sunday inside spots
      const f = d.finished_at ? t2m(d.finished_at) : 400;
      before = { src: IMG.before, label: 'Before', at: m2(f - 12) }; after = { src: IMG.after, label: 'After', at: m2(f) };
      const imgs = ['svc-floor-mat', 'svc-vacuum-rear', 'svc-seat-shampoo', 'svc-boot-vacuum', 'svc-dashboard'] as const;
      sp = SPOT_ORDER.map((k, i) => ({ key: k, ph: { src: IMG[imgs[i]], label: SPOT_LABEL[k], at: m2(f - 6 + i) } }));
    }
    const sunday = dt.getDay() === 0 || !!carry || !!d.carried_from;
    const tasks = d.tasks.map(t => ({ key: t.key, label: t.label, done: t.done, at: t.done_at || null }));
    const skipped = d.status === 'skipped';
    const live = !!activeStage(d);
    const photoCount = (before ? 1 : 0) + (after ? 1 : 0) + sp.filter(s => s.ph).length + flagged.length;
    const ab = d.abandoned ? { reason: reasonOf(d.abandoned.reason), minutes: d.abandoned.minutes || 0, tasks: (d.abandoned.tasks_done || []).map(k => TASK_LABEL[k] || k), note: d.abandoned.note || null } : null;
    const x = { cond: d.condition ? COND_LABEL[d.condition] : null, issues: (d.issues || []).map(k => ISSUE_LABEL[k]).filter(Boolean), damage: d.damage_note || null, stopped: ab };
    return { ...base, ...x, status: skipped ? 'skipped' : live ? 'live' : d.status === 'done' ? 'done' : 'upcoming', badge: ab ? 'Wash could not be completed' : skipped ? 'Skipped' : live ? 'Live now' : d.status === 'done' ? 'Done' : 'Scheduled',
      washer: d.washer?.name || base.washer, photo: d.washer?.photo_url ? { uri: d.washer.photo_url } : real ? null : IMG.washerCut, minutes: ab ? ab.minutes || null : d.minutes || null, rating: ratingFor(),
      before, after, spots: sp, flagged, showSpots: sunday || hasSpot || (demoToday && sunday), photoCount, on: d.on_the_way_at || null, arr: d.arrived_at || null, st: d.started_at || null, fin: d.finished_at || null,
      tasks: ab ? tasks.filter(t => t.done) : tasks, water: d.water_litres || null, note: d.washer_note || null, skip: ab ? null : skipped ? d.skip_reason || 'Your washer marked this day as skipped.' : null, carry, acks, live };
  }

  // ---- demo account, an earlier day: sample data so every part of the sheet shows
  if (dd.paused) return { ...base, ...empty, status: 'paused', badge: 'Paused', skip: 'Paused by you. The day is added to the end of your plan.', acks };
  const ago = Math.round((TODAY.getTime() - dt.getTime()) / 864e5), mins0 = c.mins || 11, fin0 = t2m(dd.time.replace(/ [AP]M/, '')) || 398;
  if (ago === 2) { // demo: a wash that was stopped halfway
    const st0 = fin0 - mins0, done = dd.steps.slice(0, 2).map((s, i) => ({ key: keyOf(s.label), label: s.label, done: true, at: m2(st0 + 3 * (i + 1)) }));
    return { ...base, ...empty, status: 'skipped', badge: 'Wash could not be completed', photo: IMG.washerCut, minutes: 6, rating: null, st: m2(st0), on: m2(st0 - 9), arr: m2(st0 - 1), tasks: done,
      stopped: { reason: 'Rain', minutes: 6, tasks: done.map(t => t.label), note: null }, cond: COND_LABEL.normal, acks, carry: 'Nothing was lost. Your washer comes back for your car next morning.', live: false };
  }
  if (ago === 4) { // demo: finished, with a few things the washer noticed
    const r = build1(date); return { ...r, cond: COND_LABEL.heavy, issues: [ISSUE_LABEL.no_parking, ISSUE_LABEL.car_damage], damage: 'Small scratch on the rear bumper, seen before the wash.' };
  }
  return build1(date);
  function build1(date: string): Part {
  const hist = history7(c).find(h => iso(h[0]) === date);
  if (hist && !/ · \d+ min$/.test(hist[1])) return { ...base, ...empty, status: 'skipped', badge: 'Skipped', skip: hist[1], carry: /locked|key/i.test(hist[1]) ? 'Nothing was lost. Tomorrow the washer comes back for your car.' : null, photo: IMG.washerCut, rating: null, acks };
  if (date > ti) return { ...base, ...empty, status: 'upcoming', badge: 'Upcoming', skip: `${dd.washer} comes between 5:30 and 7:30 AM. Photos and each step show here on the day.`, acks };
  const mins = c.mins || 11, fin = t2m(dd.time.replace(/ [AP]M/, '')) || 398, start = fin - mins;
  const stepKeys = dd.steps.map(s => keyOf(s.label));
  const taskT = (i: number) => m2(start + Math.round(mins * (i + 1) / stepKeys.length));
  const tasks = dd.steps.map((s, i) => ({ key: stepKeys[i], label: s.label, done: true, at: taskT(i) }));
  const sunday = dt.getDay() === 0, imgs = ['svc-floor-mat', 'svc-vacuum-rear', 'svc-seat-shampoo', 'svc-boot-vacuum', 'svc-dashboard'] as const;
  const sp = SPOT_ORDER.map((k, i) => ({ key: k, ph: sunday ? { src: IMG[imgs[i]], label: SPOT_LABEL[k], at: m2(start + 2 + i) } as Ph : null }));
  const before: Ph = { src: IMG.before, label: 'Before', at: m2(start - 1) }, after: Ph = { src: IMG.after, label: 'After', at: m2(fin) };
  return { ...base, status: 'done', badge: 'Done', photo: IMG.washerCut, minutes: mins, rating: ratingFor(), before, after, spots: sp, flagged: [], showSpots: sunday, photoCount: 2 + (sunday ? 5 : 0),
    on: m2(start - 9), arr: m2(start - 1), st: m2(start), fin: m2(fin), tasks, water: 7, note: h5(date) % 3 === 0 ? 'All good today. Gate was open, parked in the usual spot.' : null, skip: null,
    carry: dt.getDay() === 1 ? `Sunday interior done ${fmt(dt, { weekday: 'long' })}` : null, acks, live: false, cond: COND_LABEL.normal, issues: [], damage: null, stopped: null };
  }
}

/* ---------- pieces ---------- */
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: P.line, padding: 14, marginTop: 12 }, style]}>{children}</View>;
const Head = ({ icon, title, right }: { icon: string; title: string; right?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Txt size={14}>{icon}</Txt></View>
    <Txt weight={600} size={16} style={{ flex: 1 }}>{title}</Txt>
    {right ? <Txt size={12} color={P.muted} weight={500}>{right}</Txt> : null}
  </View>);
const Stat = ({ v, l }: { v: string; l: string }) => (
  <View style={{ flexGrow: 1, flexBasis: 88, minWidth: 88, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)' }}>
    <Txt weight={600} size={16} color="#fff" style={[NUM, { lineHeight: 21 }]} numberOfLines={1}>{v}</Txt><Txt size={11} color="rgba(255,255,255,0.75)" style={{ lineHeight: 15 }}>{l}</Txt>
  </View>);

function Hero({ m }: { m: Model }) {
  const badgeBg = m.stopped ? '#FEE2E2' : m.status === 'live' ? SAFFRON : m.status === 'done' ? '#DCFCE7' : 'rgba(255,255,255,0.9)', badgeFg = m.stopped ? '#B91C1C' : m.status === 'live' ? '#3B2A00' : m.status === 'done' ? '#15803D' : '#525252';
  const initials = (m.washer || 'W').trim().slice(0, 1).toUpperCase();
  return (
    <View style={{ borderRadius: 20, padding: 16, backgroundColor: '#4A12C4' }}>
      {/* decoration lives in its own clipped layer so it can never cut the content */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: 'hidden' }}>
        <Grad colors={['#6D28F0', '#3A0599']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: SAFFRON, opacity: 0.22 }} />
        <View style={{ position: 'absolute', right: 40, bottom: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', opacity: 0.08 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt weight={600} size={20} color="#fff" style={{ flex: 1 }}>{m.title}</Txt>
        <View style={{ backgroundColor: badgeBg, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 }}><Txt weight={600} size={12} color={badgeFg}>{m.badge}</Txt></View>
      </View>
      {m.stopped ? <Txt size={13} color="rgba(255,255,255,0.9)" style={{ marginTop: 8 }}>{`Wash could not be completed: ${m.stopped.reason} (${m.stopped.minutes} min spent)`}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: SAFFRON, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          {m.photo ? <Image source={m.photo} resizeMode="cover" accessibilityLabel={m.washer + ' photo'} style={{ width: 52, height: 52 }} /> : <Txt weight={600} size={20} color={C.violet}>{initials}</Txt>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={600} size={16} color="#fff">{m.washer}</Txt>
          <Txt size={13} color="rgba(255,255,255,0.82)" numberOfLines={1}>{m.car}{m.plate ? ' · ' + m.plate : ''}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <Stat v={m.minutes ? `${m.minutes} min` : '-'} l="Total time" />
        <Stat v={m.rating ? '★ ' + m.rating.stars + '.0' : 'Not rated'} l="Rating" />
        <Stat v={m.photoCount ? String(m.photoCount) : '0'} l="Photos" />
      </View>
    </View>);
}

function Zoom({ ph, onClose }: { ph: Ph | null; onClose: () => void }) {
  return (
    <Modal visible={!!ph} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close photo" style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        {ph ? <>
          <Image source={ph.src} resizeMode="contain" style={{ width: '100%', aspectRatio: 1, maxHeight: '75%', borderRadius: 14 }} />
          <Txt weight={600} size={16} color="#fff" style={{ marginTop: 14 }}>{ph.label}</Txt>
          <Txt size={13} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>{ph.at ? 'Taken at ' + ampm(ph.at) : 'Tap anywhere to close'}</Txt>
        </> : null}
      </Pressable>
    </Modal>);
}

function Tile({ ph, label, onZoom, tone, small }: { ph: Ph | null; label: string; onZoom: (p: Ph) => void; tone: string; small?: boolean }) {
  return (
    <View style={{ flex: small ? undefined : 1, width: small ? '31%' : undefined }}>
      <Tap onPress={ph ? () => onZoom(ph) : undefined} accessibilityLabel={ph ? `${label} photo, tap to zoom` : `${label}, not taken`}
        style={{ aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: ph ? 2 : 1, borderColor: ph ? tone : P.line, backgroundColor: P.raised, alignItems: 'center', justifyContent: 'center' }}>
        {ph ? <Image source={ph.src} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Txt size={11} color={P.muted}>Not taken</Txt>}
        {ph ? <View style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(23,23,23,0.6)', alignItems: 'center', justifyContent: 'center' }}><Txt size={11} color="#fff">⤢</Txt></View> : null}
      </Tap>
      <View style={{ marginTop: 6 }}>
        <Txt weight={600} size={small ? 12 : 13} numberOfLines={1}>{label}</Txt>
        <Txt size={11} color={P.muted} style={NUM}>{ph?.at ? ampm(ph.at) : ' '}</Txt>
      </View>
    </View>);
}

function PhotosCard({ m, onZoom }: { m: Model; onZoom: (p: Ph) => void }) {
  const has = m.photoCount > 0, times = [m.before, m.after, ...m.spots.map(s => s.ph), ...m.flagged].filter(Boolean).map(p => p!.at).filter(Boolean) as string[];
  const range = times.length ? [...times].sort()[0] : null;
  return (
    <Card style={{ marginTop: 12, borderColor: 'rgba(84,9,218,0.25)', borderWidth: 1.5 }}>
      <Head icon="📷" title="Photos" right={has ? `${m.photoCount} photo${m.photoCount > 1 ? 's' : ''}${range ? ' · from ' + ampm(range) : ''}` : undefined} />
      {has ? <>
        {m.before || m.after ? <View style={{ flexDirection: 'row', gap: 12 }}><Tile ph={m.before} label="Before" onZoom={onZoom} tone="#EA580C" /><Tile ph={m.after} label="After" onZoom={onZoom} tone="#16a34a" /></View> : null}
        {m.showSpots ? <View style={{ marginTop: 16 }}>
          <Txt weight={600} size={13} color={SAFFRON_D} style={{ marginBottom: 8 }}>Sunday inside spots</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{m.spots.map(s => <Tile key={s.key} small ph={s.ph} label={SPOT_LABEL[s.key]} onZoom={onZoom} tone={SAFFRON} />)}</View>
        </View> : null}
        {m.flagged.length ? <View style={{ marginTop: 16 }}>
          <Txt weight={600} size={13} color="#dc2626" style={{ marginBottom: 8 }}>Flagged by your washer</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{m.flagged.map((p, i) => <Tile key={i} small ph={p} label="Flagged" onZoom={onZoom} tone="#dc2626" />)}</View>
        </View> : null}
        <Txt size={12} color={P.muted} style={{ marginTop: 12 }}>Tap a photo to zoom in.</Txt>
      </> : (
        <View style={{ alignItems: 'center', paddingVertical: 18 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}><Txt size={26}>📷</Txt></View>
          <Txt weight={600} size={15} style={{ marginTop: 10 }}>No photos for this day</Txt>
          <Txt size={13} color={P.grey} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>{m.status === 'live' || m.status === 'upcoming' ? 'Your washer adds before and after photos here during the wash.' : 'Your washer did not upload photos for this wash.'}</Txt>
        </View>)}
    </Card>);
}

/* ---------- the time stem ---------- */
type Node = { key: string; c: string; i: string; g: GlyphKind; title: string; sub?: string; at: string | null; gap: number | null; done: boolean };
function nodesOf(m: Model): Node[] {
  const raw: Omit<Node, 'gap'>[] = [];
  if (m.on) raw.push({ key: 'on', ...STAGE_STYLE.onway, title: `${m.washer} set off`, sub: 'On the way with the pressure washer', at: m.on, done: true });
  if (m.arr) raw.push({ key: 'arr', ...STAGE_STYLE.arrived, title: 'Reached your car', at: m.arr, done: true });
  if (m.st) raw.push({ key: 'st', ...STAGE_STYLE.started, title: 'Wash started', at: m.st, done: true });
  m.tasks.forEach((t, i) => { const s = TASK_STYLE[t.key] || TASK_STYLE.other; raw.push({ key: 't' + i, c: s.c, i: s.i, g: s.g, title: t.label, sub: t.done ? undefined : 'Next', at: t.at, done: t.done }); });
  if (m.stopped) raw.push({ key: 'stop', c: '#DC2626', i: '⏹', g: 'stop', title: 'Stopped', sub: `${m.stopped.reason} · ${m.stopped.minutes} min spent`, at: null, done: true });
  if (m.fin && !m.stopped) raw.push({ key: 'fin', ...STAGE_STYLE.finished, title: m.minutes ? `Finished in ${m.minutes} min` : 'Finished', sub: 'Photos sent here and on WhatsApp', at: m.fin, done: true });
  let prev: string | null = null;
  return raw.map(n => { const g = n.at && prev ? dur(prev, n.at) : null; if (n.at) prev = n.at; return { ...n, gap: g }; });
}
function StemRow({ n, i, last, pulse }: { n: Node; i: number; last: boolean; pulse: boolean }) {
  const a = useRef(new Animated.Value(0)).current, p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 420, delay: 120 + i * 90, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND }).start();
    if (!pulse) return;
    const l = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: ND })); l.start(); return () => l.stop();
  }, []);
  const slide = a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const ring = { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] };
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: slide }] }}>
      {n.gap !== null && i > 0 ? (
        <View style={{ marginLeft: 48, height: 26, justifyContent: 'center' }}>
          <View style={{ alignSelf: 'flex-start', borderRadius: 9, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: 'rgba(255,186,8,0.22)' }}><Txt weight={600} size={11} color={SAFFRON_D} style={NUM}>{n.gap < 1 ? '< 1 min' : `${n.gap} min`}</Txt></View>
        </View>) : i > 0 ? <View style={{ height: 14 }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          {pulse ? <Animated.View style={[{ position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: n.c }, ring]} /> : null}
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: n.done ? n.c : '#fff', borderWidth: 2, borderColor: n.c, alignItems: 'center', justifyContent: 'center', shadowColor: n.c, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
            <WashGlyph kind={n.g} size={24} ink={n.done ? '#fff' : n.c} acc={n.done ? '#FFD166' : n.c} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight={600} size={14}>{n.title}</Txt>
          {n.sub ? <Txt size={12} color={P.muted} style={{ marginTop: 1 }}>{n.sub}</Txt> : null}
        </View>
        {n.at ? <View style={{ borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: n.c + '1F' }}><Txt weight={600} size={12} color={n.c} style={NUM}>{ampm(n.at)}</Txt></View> : null}
      </View>
    </Animated.View>);
}
function Stem({ m }: { m: Model }) {
  const nodes = useMemo(() => nodesOf(m), [m.date]);
  const [h, setH] = useState(0);
  if (!nodes.length) return null;
  const cur = m.live ? Math.max(0, nodes.findIndex(n => !n.done)) : nodes.length - 1;
  const stops = nodes.map((n, i) => ({ o: nodes.length > 1 ? i / (nodes.length - 1) : 0, c: n.c }));
  return (
    <Card>
      <Head icon="⏱" title="Timeline" right={m.minutes ? `${m.minutes} min on site` : undefined} />
      <View onLayout={e => setH(e.nativeEvent.layout.height)}>
        {h > 0 && nodes.length > 1 ? (
          <Svg width={4} height={h - 36} style={{ position: 'absolute', left: 16, top: 18 }}>
            <Defs><LinearGradient id="stem" x1="0" y1="0" x2="0" y2="1">{stops.map((s, i) => <Stop key={i} offset={String(s.o)} stopColor={s.c} />)}</LinearGradient></Defs>
            <Rect x={0} y={0} width={4} height={h - 36} rx={2} fill="url(#stem)" opacity={0.85} />
          </Svg>) : null}
        {nodes.map((n, i) => <StemRow key={n.key} n={n} i={i} last={i === nodes.length - 1} pulse={i === cur && (m.live || n.key === 'fin' || n.key === 'stop')} />)}
      </View>
    </Card>);
}

/* ---------- details ---------- */
const DRow = ({ icon, title, sub, right, tone }: { icon: string; title: string; sub?: string; right?: string; tone?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: (tone || '#5409DA') + '1A', alignItems: 'center', justifyContent: 'center' }}><Txt size={14}>{icon}</Txt></View>
    <View style={{ flex: 1 }}><Txt weight={500} size={14}>{title}</Txt>{sub ? <Txt size={12} color={P.grey} style={{ marginTop: 1, lineHeight: 17 }}>{sub}</Txt> : null}</View>
    {right ? <Txt weight={600} size={13} style={NUM}>{right}</Txt> : null}
  </View>);
function Details({ m }: { m: Model }) {
  return (
    <Card>
      <Head icon="📋" title="Details" />
      {m.skip ? <DRow icon={m.status === 'paused' ? '⏸' : m.status === 'skipped' ? '🚫' : 'ℹ'} tone="#EA580C" title={m.status === 'skipped' ? 'No wash this day' : m.status === 'paused' ? 'Paused' : 'Status'} sub={m.skip} /> : null}
      {m.stopped ? <DRow icon="⏹" tone="#DC2626" title="Wash could not be completed" sub={`${m.stopped.reason} · ${m.stopped.minutes} min spent${m.stopped.tasks.length ? '. Done: ' + m.stopped.tasks.join(', ') : '. No steps were finished.'}${m.stopped.note ? '. ' + m.stopped.note : ''}`} /> : null}
      {m.cond ? <DRow icon="🚗" tone="#7C3AED" title="Car condition" sub="As seen by your washer on arrival" right={m.cond} /> : null}
      {m.issues.length ? <DRow icon="⚠" tone="#EA580C" title="What your washer ran into" sub={m.issues.join(', ')} /> : null}
      {m.damage ? <DRow icon="🔍" tone="#DC2626" title="Mark noted before the wash" sub={m.damage} /> : null}
      {m.carry ? <DRow icon="🧽" tone="#F59E0B" title={m.carry} sub="Interior is never lost on a Sunday" /> : null}
      {m.tasks.length ? <View style={{ marginTop: 4 }}><Txt weight={600} size={12} color={P.muted} style={{ marginTop: 4 }}>TASKS DONE</Txt>
        {m.tasks.map((t, i) => <DRow key={i} icon={t.done ? '✓' : '○'} tone={(TASK_STYLE[t.key] || TASK_STYLE.other).c} title={t.label} right={t.at ? ampm(t.at) : t.done ? undefined : 'Pending'} />)}</View> : null}
      {m.water ? <DRow icon="💧" tone="#0EA5E9" title="Water used" sub="Pressure wash, no bucket" right={`${m.water} L`} /> : null}
      {m.note ? <DRow icon="💬" tone="#7C3AED" title={`Note from ${m.washer}`} sub={m.note} /> : null}
      {m.acks.map((a, i) => <DRow key={'a' + i} icon={a.icon} tone="#16a34a" title={a.title} sub={a.sub} />)}
      {m.rating ? <DRow icon="★" tone={SAFFRON_D} title={`You rated this wash ${m.rating.stars} of 5`} sub={m.rating.tag || undefined} right={'★'.repeat(m.rating.stars)} /> : m.status === 'done' ? <DRow icon="☆" tone={SAFFRON_D} title="Not rated yet" sub="Rate from the Daily tab right after a wash." /> : null}
    </Card>);
}

export function DaySheet({ date, onIssue }: { date: string; onIssue?: () => void }) {
  const m = useMemo(() => buildModel(date), [date]), [zoom, setZoom] = useState<Ph | null>(null), { height } = useWindowDimensions();
  return (
    <View>
      <ScrollView style={{ maxHeight: Math.max(420, height * 0.82), flexGrow: 0 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
        <Hero m={m} />
        <PhotosCard m={m} onZoom={setZoom} />
        <Stem m={m} />
        <Details m={m} />
        {onIssue && m.status === 'done' ? <POutline label="Something missed? Tell us" onPress={onIssue} style={{ marginTop: 14 }} /> : null}
      </ScrollView>
      <Zoom ph={zoom} onClose={() => setZoom(null)} />
    </View>);
}

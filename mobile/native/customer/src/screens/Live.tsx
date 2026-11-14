// Washes tab: My bookings (upcoming / previous), booking detail and service in progress with a time-left ring.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Linking, ScrollView, Share } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Phone, Check, Help as HelpIc, Chev, Pin, Plan as CalIc, Card as CardIc, Clock as ClockIc, Share as ShareIc, Copy as CopyIc } from '../ui/icons';
import { IMG, src } from '../img';
import { TODAY, fmt, iso, ampm, parse, inr } from '../data/dates';
import { SUPPORT_PHONE, SHOW_RATINGS } from '../data/reference';
import { useApp, car, doc, act, A, maskPlate, liveHead, timeline, history7, syncLive, openPage, svcOf, refCode, toast , REAL} from '../state';
import { sheets } from '../sheets';
import { Pressable3, FadeUp } from '../ui/motion';
import { Plate } from '../ui/Plate';

// tokens
const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5', OK = '#16a34a', NEG = '#dc2626';
const SH = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;
const TN = { fontVariant: ['tabular-nums'] } as const;
const avatar = (d: ReturnType<typeof doc>) => (d.washer?.photo_url ? { uri: d.washer.photo_url } : IMG.washer);
const CARD = { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE } as const;

const Tag = ({ label, tone = 'grey' }: { label: string; tone?: 'ok' | 'grey' }) => (
  <View style={{ alignSelf: 'flex-start', backgroundColor: RAISED, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}><Txt weight={500} size={12} color={tone === 'ok' ? OK : SEC}>{label}</Txt></View>
);
function Panel({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const st = [CARD, { padding: 16 }, SH, style];
  return onPress ? <Pressable3 onPress={onPress} style={st}>{children}</Pressable3> : <View style={st}>{children}</View>;
}
function Sec({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <Txt weight={500} size={18} color={INK} style={{ flexShrink: 1 }}>{title}</Txt>{right}
    </View>
  );
}
const Stars = ({ n = 0, size = 20 }: { n?: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {[0, 1, 2, 3, 4].map(i => (
      <Svg key={i} width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3.3l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.6l6-.8z" fill={i < n ? C.violet : 'none'} stroke={i < n ? C.violet : MUTED} strokeWidth={1.5} strokeLinejoin="round" /></Svg>
    ))}
  </View>
);

/* ---- normalised rows for the list ---- */
type Row = { key: string; kind: 'today' | 'bk' | 'hist'; date: string; when: string; title: string; sub: string; mins: number; saved: number; washer: string; photo: any; done: boolean; bk?: any; hist?: [Date, string, string] };
const bkSvcs = (b: { type: string }) => b.type.split(/,| \+ /).map(s => s.trim()).filter(Boolean);
const bkAmt = (b: { what: string }) => Number((b.what.match(/₹\s*([\d,]+)/) || [])[1]?.replace(/,/g, '') || 0);
const bkLines = (b: { type: string; what: string }) => {
  const names = bkSvcs(b), svc = names.map(n => ({ n, s: svcOf(n) || (require('../data/reference').CAR_SERVICES as any[]).find((x: any) => x.name === n || x.short === n) || null }));
  const tot = bkAmt(b), sumP = svc.reduce((a, x) => a + (x.s?.price || 0), 0);
  return svc.map(x => ({ name: x.s?.name || x.n, mins: x.s?.mins || 25, price: x.s ? x.s.price : Math.round(tot / Math.max(1, svc.length)), mrp: x.s?.mrp || 0, img: x.s?.img as string | undefined, ok: !!x.s || sumP === 0 }));
};
const titleOf = (names: string[]) => (names.length > 1 ? `${names[0]} and ${names.length - 1} more` : names[0] || 'Car wash');
const hashN = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h };
const otpOf = (s: string) => String(1000 + (hashN(s) % 9000)).split('');

/* ---- header pieces ---- */
function RoundBtn({ onPress, children, label }: { onPress: () => void; children: React.ReactNode; label: string }) {
  return (
    <Pressable3 onPress={onPress} accessibilityLabel={label} accessibilityRole="button" style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: RAISED, alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable3>
  );
}
const CallBtn = () => (
  <Pressable3 onPress={() => Linking.openURL('tel:' + SUPPORT_PHONE).catch(() => toast('Call ' + SUPPORT_PHONE))} accessibilityRole="button" accessibilityLabel="Call your washer"
    style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Phone size={18} color={C.white} strokeWidth={1.5} /></Pressable3>
);
const IconCol = ({ children }: { children: React.ReactNode }) => <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;

function Timeline() {
  const rows = timeline();
  return (
    <Panel style={{ paddingVertical: 8 }}>
      <View style={{ position: 'absolute', left: 31, top: 32, bottom: 32, width: 1, backgroundColor: LINE }} />
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: r.st === 'done' ? OK : r.st === 'now' ? C.violet : C.white, borderWidth: r.st === 'todo' ? 1 : 0, borderColor: 'rgba(23,23,23,0.24)' }}>
            {r.st === 'done' ? <Check size={12} color={C.white} strokeWidth={2} /> : r.st === 'now' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.white }} /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0, opacity: r.st === 'todo' ? 0.6 : 1 }}>
            <Txt weight={500} size={14} color={INK}>{r.title}</Txt>
            {r.sub ? <Txt size={12} color={MUTED}>{r.sub}</Txt> : null}
          </View>
          <Txt size={12} color={MUTED} style={TN}>{r.at ? ampm(r.at) : ''}</Txt>
        </View>
      ))}
    </Panel>
  );
}

function Photos() {
  const d = doc(), ph = d.photos || [], before = ph.find(p => p.kind === 'before'), after = ph.find(p => p.kind === 'after');
  const tile = (p: (typeof ph)[number] | undefined, label: string, wait: string) => (
    <View style={{ flex: 1 }}>
      {p ? (
        <View style={{ aspectRatio: 1, borderRadius: 14, borderWidth: 1, borderColor: LINE, overflow: 'hidden', backgroundColor: RAISED }}>
          <Image source={typeof p.src === 'string' ? src(p.src)! : p.src} resizeMode={p.cut ? 'contain' : 'cover'} accessibilityLabel={`${label} photo`} style={[StyleSheet.absoluteFill, p.cut && { margin: 16 }]} />
          {p.local === 'before' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(80,50,10,.3)' }]} /> : null}
          <View style={{ position: 'absolute', left: 8, bottom: 8 }}><View style={{ backgroundColor: 'rgba(23,23,23,.72)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}><Txt weight={500} size={12} color={C.white}>{label}</Txt></View></View>
        </View>
      ) : (
        <View style={{ aspectRatio: 1, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,23,23,0.16)', backgroundColor: RAISED, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <Txt size={12} color={MUTED} style={{ textAlign: 'center' }}>{wait}</Txt>
        </View>
      )}
    </View>
  );
  // one photo is the norm: the before tile only shows when there is one
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {before ? tile(before, 'Before', '') : null}
      {tile(after, before ? 'After' : 'Your car', 'Photo comes the moment the wash is done')}
      {!before ? <View style={{ flex: 1 }} /> : null}
    </View>
  );
}


/* ---------- booking detail ---------- */
function TimePill({ left, frac }: { left: number; frac: number }) {
  const w = 152, h = 72, p = Math.max(4, Math.min(96, frac * 100));
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Rect x={4} y={4} width={w - 8} height={h - 8} rx={(h - 8) / 2} fill="none" stroke={RAISED} strokeWidth={6} />
        <Rect x={4} y={4} width={w - 8} height={h - 8} rx={(h - 8) / 2} fill="none" stroke={C.violet} strokeWidth={6} strokeLinecap="round" {...({ pathLength: 100 } as any)} strokeDasharray={`${p} ${100 - p}`} />
      </Svg>
      <Txt size={12} color={MUTED}>Time left</Txt>
      <Txt weight={500} size={22} color={INK} style={TN}>{`${left} min`}</Txt>
    </View>
  );
}

function Detail({ row, onBack }: { row: Row; onBack: () => void }) {
  const ui = useApp(), c = car(), ins = useInsets(), d = doc(c), h = liveHead(c), today = row.kind === 'today';
  const st = today ? d.status : 'scheduled';
  const live = today && (st === 'arrived' || st === 'washing'), done = today && st === 'done';
  const mode: 'light' | 'live' | 'done' = live ? 'live' : done ? 'done' : 'light';
  const b = row.bk, id = b ? b.id : 'WD' + String(hashN(c.plate + iso(TODAY))).padStart(8, '0');
  const left = Math.max(2, d.tasks.filter(t => !t.done).length * 3), frac = d.tasks.length ? d.tasks.filter(t => t.done).length / d.tasks.length : 0.3;
  const whenTxt = b ? `${fmt(b.date, { day: 'numeric', month: 'short' })}, ${b.slot}` : `${fmt(iso(TODAY), { day: 'numeric', month: 'short' })}, ${d.eta ? ampm(d.eta) : '6:30 AM'}`;
  const lines = b ? bkLines(b) : [{ name: 'Daily pressure wash', mins: d.minutes || 12, price: 0, mrp: 0, img: 'spray', ok: true }];
  const mins = lines.reduce((a, x) => a + x.mins, 0);
  const pay = b ? (/^Paid/.test(b.what) ? [`${inr(bkAmt(b))} paid`, `Booked ${fmt(iso(TODAY), { day: 'numeric', month: 'short' })}`] : [`Pay ${inr(bkAmt(b))} on arrival`, 'UPI, cash or card']) : (c.till ? ['Plan paid', `Till ${fmt(c.till, { day: 'numeric', month: 'short' })}`] : ['Pay after first wash', 'Nothing to pay now']);
  const addr = [c.parking, c.area || A().area].filter(Boolean).join(', ');
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 128 }}>
        <View style={{ paddingTop: Math.max(ins.top, 24) + 8, paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 40, alignItems: 'center' }}>
            <RoundBtn onPress={onBack} label="Back to bookings"><Back size={18} color={INK} strokeWidth={1.5} /></RoundBtn>
            <RoundBtn onPress={() => sheets.help()} label="Help"><HelpIc size={18} color={INK} strokeWidth={1.5} /></RoundBtn>
          </View>
          {mode === 'live' ? (
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <TimePill left={left} frac={frac} />
              <Txt weight={500} size={22} color={INK} style={{ marginTop: 16 }}>Service in progress</Txt>
              <Txt size={13} color={SEC} style={{ marginTop: 4, textAlign: 'center' }}>{h.sub}</Txt>
            </View>
          ) : mode === 'done' ? (
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: RAISED, alignItems: 'center', justifyContent: 'center' }}><Check size={24} color={OK} strokeWidth={1.5} /></View>
              <Txt weight={500} size={22} color={INK} style={{ marginTop: 16 }}>Booking completed</Txt>
              <Txt size={13} color={SEC} style={{ marginTop: 4, textAlign: 'center' }}>{`Washed at ${ampm(d.finished_at) || 'this morning'}`}</Txt>
            </View>
          ) : (
            <Txt weight={500} size={24} color={INK} style={{ marginTop: 16 }}>Your booking</Txt>
          )}
        </View>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {/* washer */}
          <View style={[CARD, SH, { overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <Image source={avatar(d)} resizeMode="cover" style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: RAISED }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={15} color={INK}>{h.washer}</Txt>
                <Txt size={12} color={MUTED} style={{ marginTop: 2 }}>{SHOW_RATINGS ? `4.9 · ${c.washes || 0} washes` : `${c.washes || 0} washes`}</Txt>
              </View>
              <CallBtn />
            </View>
            {/* The washer app does not check a start OTP yet, so the code only shows in the test version */}
            {mode === 'light' && !REAL ? (
              <View style={{ backgroundColor: RAISED, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                <Txt size={13} color={INK} style={{ width: 120, lineHeight: 20 }}>Share the OTP to start the service</Txt>
                <View style={{ flexDirection: 'row', gap: 4 }}>{otpOf(id).map((x, i) => <View key={i} style={{ width: 28, height: 36, borderRadius: 8, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={18} color={C.white} style={TN}>{x}</Txt></View>)}</View>
              </View>
            ) : mode === 'live' ? (
              <View style={{ backgroundColor: RAISED, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                <Txt size={13} color={INK} style={{ width: 120, lineHeight: 20 }}>Happy with the wash so far?</Txt>
                <Pressable3 onPress={() => sheets.tip()} style={{ backgroundColor: C.violet, borderRadius: 10, paddingHorizontal: 16, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={C.white}>Tip washer</Txt></Pressable3>
              </View>
            ) : null}
          </View>
          {/* scheduled + services */}
          <View style={[CARD, SH, { overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <IconCol><CalIc size={18} color={MUTED} strokeWidth={1.5} /></IconCol>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={15} color={INK}>{`Scheduled · ${whenTxt}`}</Txt>
                <Pressable onPress={() => toast('Booking ID copied')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Txt size={12} color={MUTED}>Booking ID: <Txt size={12} color={MUTED} style={{ textDecorationLine: 'underline' }}>{id}</Txt></Txt><CopyIc size={14} color={MUTED} />
                </Pressable>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: LINE }} />
            <View style={{ padding: 16, gap: 12 }}>
              <Txt size={12} color={MUTED}>{`${lines.length} service${lines.length > 1 ? 's' : ''} · ${mins} min`}</Txt>
              {lines.map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 4, backgroundColor: RAISED, overflow: 'hidden' }}>{l.img && src(l.img) ? <Image source={src(l.img)!} resizeMode="cover" style={{ width: 48, height: 48 }} /> : null}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight={500} size={14} color={INK} numberOfLines={1}>{l.name}</Txt>
                    <Txt size={12} color={MUTED} style={{ marginTop: 4 }}>{`${l.mins} min`}</Txt>
                  </View>
                  {l.price ? <View style={{ alignItems: 'flex-end' }}><Txt weight={500} size={14} color={INK} style={TN}>{inr(l.price)}</Txt>{l.mrp ? <Txt size={12} color={MUTED} style={[TN, { textDecorationLine: 'line-through' }]}>{inr(l.mrp)}</Txt> : null}</View> : <Txt weight={500} size={13} color={C.violet}>In plan</Txt>}
                </View>
              ))}
            </View>
          </View>
          {/* address */}
          <View style={[CARD, SH, { padding: 16 }]}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <IconCol><Pin size={18} color={MUTED} strokeWidth={1.5} /></IconCol>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={15} color={INK}>Service address</Txt>
                <Txt size={13} color={SEC} style={{ marginTop: 4 }}>{c.name}</Txt>
                <Plate reg={maskPlate(c.plate)} width={128} style={{ marginTop: 8 }} />
                <Txt size={13} color={SEC} style={{ marginTop: 8, lineHeight: 20 }}>{addr}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}><Phone size={14} color={MUTED} strokeWidth={1.5} /><Txt size={13} color={SEC}>{`${A().name || 'You'}, ${A().phone || ''}`}</Txt></View>
              </View>
            </View>
            <Pressable3 onPress={() => Share.share({ message: `My Washing Daddy booking: ${whenTxt}\nCar: ${c.name} ${maskPlate(c.plate)}\n${addr}` }).catch(() => {})}
              style={{ marginTop: 16, backgroundColor: RAISED, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 56 }}>
              <ShareIc size={18} color={MUTED} strokeWidth={1.5} />
              <View style={{ flex: 1 }}><Txt weight={500} size={13} color={INK}>Booked for someone else?</Txt><Txt size={12} color={MUTED}>Share your booking details with them</Txt></View>
              <Chev size={18} color={MUTED} strokeWidth={1.5} />
            </Pressable3>
          </View>
          {/* paid */}
          <View style={[CARD, SH, { paddingHorizontal: 16, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <IconCol><CardIc size={18} color={MUTED} strokeWidth={1.5} /></IconCol>
            <View style={{ flex: 1 }}><Txt weight={500} size={15} color={INK}>{pay[0]}</Txt><Txt size={12} color={MUTED} style={{ marginTop: 2 }}>{pay[1]}</Txt></View>
            <Chev size={18} color={MUTED} strokeWidth={1.5} />
          </View>
          {/* modify */}
          {b ? (
            <View style={[CARD, SH, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <IconCol><ClockIc size={18} color={MUTED} strokeWidth={1.5} /></IconCol>
                <View style={{ flex: 1 }}>
                  <Txt weight={500} size={15} color={INK}>Modify your booking</Txt>
                  <Txt size={13} color={SEC} style={{ marginTop: 4, lineHeight: 20 }}>Free cancellation up to 6 hours before booking time</Txt>
                  <Pressable onPress={() => sheets.help()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, minHeight: 24 }}><Txt weight={500} size={13} color={C.violet}>Read refund policy</Txt><Chev size={14} color={C.violet} strokeWidth={1.5} /></Pressable>
                </View>
              </View>
              <Pressable3 onPress={() => { act.cancelBooking(b.id); onBack() }} style={{ marginTop: 16, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(23,23,23,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Txt weight={500} size={14} color={INK}>Cancel this booking</Txt><Txt size={12} color={NEG}>No refund applies</Txt>
              </Pressable3>
              <Pressable3 onPress={() => sheets.help()} style={{ marginTop: 12, minHeight: 48, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={C.white}>Reschedule this booking</Txt></Pressable3>
            </View>
          ) : null}
          {/* live detail for today's wash */}
          {today ? (
            <>
              <View style={{ marginTop: 20 }}><Sec title="Live updates" right={<Txt size={12} color={MUTED}>{fmt(d.date || iso(TODAY), { weekday: 'short', day: 'numeric', month: 'short' })}</Txt>} /><Timeline /></View>
              <View style={{ marginTop: 20 }}>
                <Sec title="Photos" right={<Pressable onPress={() => sheets.proof()} hitSlop={12}><Txt weight={500} size={14} color={C.violet}>Compare</Txt></Pressable>} />
                <Photos />
              </View>
              <Pressable3 disabled={!!ui.sim} onPress={() => act.replay()} style={{ minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(23,23,23,0.16)', alignItems: 'center', justifyContent: 'center', opacity: ui.sim ? 0.6 : 1, backgroundColor: C.white }}>
                <Txt weight={500} size={14} color={INK}>{ui.sim ? 'Playing back…' : 'Replay this morning, live'}</Txt>
              </Pressable3>
            </>
          ) : null}
          {/* bring a friend */}
          <Pressable3 onPress={() => openPage({ k: 'refer' })} style={[CARD, SH, { marginTop: 20, overflow: 'hidden', minHeight: 160 }]}>
            <View style={{ position: 'absolute', right: -8, bottom: 0 }}><Image source={IMG.washer} resizeMode="contain" style={{ width: 128, height: 144 }} /></View>
            <View style={{ padding: 16 }}>
              <Txt weight={500} size={15} color={INK}>Bring a friend</Txt>
              <Txt weight={500} size={28} color={C.violet} style={[TN, { marginTop: 4 }]}>Get ₹200</Txt>
              <Txt size={12} color={MUTED} style={{ width: 168, marginTop: 4 }}>When your friend books their first wash</Txt>
              <View style={{ alignSelf: 'flex-start', backgroundColor: C.violet, borderRadius: 10, paddingHorizontal: 16, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}><Txt weight={500} size={14} color={C.white}>Refer now</Txt></View>
            </View>
          </Pressable3>
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Txt weight={500} size={15} color={INK} style={{ textAlign: 'center' }}>Your car is in professional hands</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- My bookings list ---------- */
function Card({ r, onPress, prev }: { r: Row; onPress: () => void; prev: boolean }) {
  const c = car(), [rate, setRate] = useState(0);
  return (
    <Pressable3 onPress={onPress} style={[{ marginLeft: 24 }, CARD, SH, { padding: 16 }]}>
      <Txt weight={500} size={17} color={INK}>{r.title}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <Txt size={13} color={SEC} style={TN}>{r.sub}</Txt>
        {r.saved ? <><Txt size={13} color={MUTED}>·</Txt><Txt size={13} color={OK} style={TN}>{`${inr(r.saved)} saved`}</Txt></> : null}
        {r.mins ? <><Txt size={13} color={MUTED}>·</Txt><Txt size={13} color={SEC}>{`${r.mins} min`}</Txt></> : null}
      </View>
      <View style={{ marginTop: 12, backgroundColor: RAISED, borderRadius: 10, padding: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={r.photo} resizeMode="cover" style={{ width: 48, height: 48, borderRadius: 4, backgroundColor: C.white }} />
          <View>
            <Txt weight={500} size={14} color={INK}>{r.washer}</Txt>
            <Txt size={12} color={MUTED} style={{ marginTop: 2 }}>{SHOW_RATINGS ? `4.9 · ${c.washes || 0} washes` : `${c.washes || 0} washes`}</Txt>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderColor: LINE, marginTop: 8, paddingTop: 8, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {prev ? (
            <>
              <Txt size={13} color={SEC}>{r.done ? 'Service rating' : 'Not washed'}</Txt>
              {r.done ? <Pressable onPress={() => { setRate(rate ? 0 : 5); if (!rate) toast('Thanks for rating') }} hitSlop={8}><Stars n={rate} /></Pressable> : null}
            </>
          ) : (
            <>
              <Txt size={13} color={SEC}>Status</Txt>
              <Tag label={r.kind === 'today' ? 'Washer assigned' : 'Scheduled'} />
            </>
          )}
        </View>
      </View>
    </Pressable3>
  );
}
function DateRow({ top, sub }: { top: string; sub: string }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 8, marginLeft: 24 }}>
      <Txt weight={500} size={13} color={INK}>{top}</Txt>
      <Txt size={12} color={MUTED} style={[TN, { marginTop: 2 }]}>{sub}</Txt>
    </View>
  );
}

export default function Live() {
  const ui = useApp(), c = car(), d = doc(c), ins = useInsets(), ref = useRef<any>(null);
  const [tab, setTab] = useState<'up' | 'prev'>('up'), [open, setOpen] = useState<Row | null>(null);
  useEffect(() => { if (ui.tabNonce) { setOpen(null); ref.current?.scrollTo({ y: 0, animated: true }) } }, [ui.tabNonce]);
  const h = liveHead(c), hist = history7(c), over = d.status === 'done' || d.status === 'skipped', ph = avatar(d);
  const eta = d.eta ? ampm(d.eta) : '6:30 AM';
  const todayRow: Row = { key: 'today', kind: 'today', date: iso(TODAY), when: eta, title: 'Daily pressure wash', sub: `${c.name} · ${maskPlate(c.plate)}`, mins: d.minutes || 12, saved: 0, washer: h.washer, photo: ph, done: d.status === 'done' };
  const bks: Row[] = A().bookings.filter(x => x.carId === c.id).map(b => {
    const ls = bkLines(b), nm = ls.map(x => x.name);
    return { key: b.id, kind: 'bk' as const, date: b.date, when: b.slot, title: titleOf(nm), sub: inr(bkAmt(b)), mins: ls.reduce((a, x) => a + x.mins, 0), saved: ls.reduce((a, x) => a + Math.max(0, x.mrp - x.price), 0), washer: c.washer, photo: ph, done: false, bk: b };
  });
  const up = [...bks.filter(b => b.date >= iso(TODAY)), ...(over ? [] : [todayRow])].sort((a, b) => a.date.localeCompare(b.date));
  const prevB = bks.filter(b => b.date < iso(TODAY));
  const prev: Row[] = [...(over ? [todayRow] : []), ...prevB, ...hist.map(([dt, title, sub]) => ({ key: iso(dt), kind: 'hist' as const, date: iso(dt), when: /skipped|paused/i.test(title) ? '' : (title.split(' · ')[1] || '6:30 AM'), title: /skipped|paused/i.test(title) ? 'Wash skipped' : 'Daily pressure wash', sub: title, mins: 0, saved: 0, washer: c.washer, photo: ph, done: !/skipped|paused/i.test(title), hist: [dt, title, sub] as [Date, string, string] }))];
  if (open) return <Detail row={open} onBack={() => setOpen(null)} />;
  const list = tab === 'up' ? up : prev;
  const dayLabel = (s: string) => (s === iso(TODAY) ? 'Today' : fmt(s, { day: 'numeric', month: 'short' }));
  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <View style={{ paddingTop: Math.max(ins.top, 24), borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: C.white }}>
        <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt weight={500} size={18} color={INK}>My bookings</Txt>
          <Pressable3 onPress={() => sheets.help()} accessibilityRole="button" style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white }}>
            <HelpIc size={18} color={MUTED} strokeWidth={1.5} /><Txt weight={500} size={14} color={INK}>Help</Txt>
          </Pressable3>
        </View>
      </View>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 128 }}>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: LINE, borderRadius: 999, padding: 4, height: 44 }}>
          {([['up', 'Upcoming'], ['prev', 'Previous']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="button" accessibilityState={{ selected: tab === k }} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? C.violet : 'transparent' }}>
              <Txt weight={500} size={14} color={tab === k ? C.white : SEC}>{l}</Txt>
            </Pressable>
          ))}
        </View>
        {list.length ? (
          <View>
            <View pointerEvents="none" style={{ position: 'absolute', left: 8, top: 20, bottom: 40, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,23,23,0.16)' }} />
            {list.map((r, i) => (
              <FadeUp key={tab + r.key} delay={Math.min(i, 5) * 50} duration={300} distance={8}>
                <DateRow top={dayLabel(r.date)} sub={r.when || ' '} />
                <Card r={r} prev={tab === 'prev'} onPress={() => (r.kind === 'hist' ? sheets.day(r.date) : setOpen(r))} />
              </FadeUp>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
            <Image source={IMG.washer} resizeMode="contain" style={{ width: 128, height: 128 }} />
            <Txt weight={500} size={17} color={INK} style={{ marginTop: 16 }}>{tab === 'up' ? 'No upcoming washes' : 'Nothing yet'}</Txt>
            <Txt size={13} color={SEC} style={{ marginTop: 4, textAlign: 'center' }}>{tab === 'up' ? 'Book a wash from Home and it shows up here' : 'Your washes show up here after the first one'}</Txt>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

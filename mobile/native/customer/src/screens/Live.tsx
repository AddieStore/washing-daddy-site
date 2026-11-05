// Washes tab, laid out like Pronto's Bookings tab: My Bookings (Upcoming / Previous, date rows, booking cards),
// booking detail (tinted or violet header, overlapping white cards) and service-in-progress with a TIME LEFT ring.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Linking, ScrollView, Share } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '../theme';
import { Txt, Ring, useInsets } from '../ui/kit';
import { Heart, Back, Phone, Check, Help as HelpIc, Chev, Pin, Receipt, Plan as PlanIc, WhatsApp, Star, Close } from '../ui/icons';
import { IMG, src } from '../img';
import { TODAY, fmt, iso, ampm, parse, inr } from '../data/dates';
import { SUPPORT_PHONE } from '../data/reference';
import { useApp, car, doc, act, A, maskPlate, liveHead, timeline, history7, syncLive, openPage, svcOf, refCode, toast , REAL} from '../state';
import { sheets } from '../sheets';
import { Pulse, useReduceMotion } from './Home';
import { Pressable3 } from '../ui/motion';

const INK = '#1A0A33', GREY = '#6B6580', LINE = '#ECEAF2', NAVY = '#2B1A66', OK = '#0E9F6E', BG = '#F4F2F8', TINT = '#EFE8FD', TINT2 = '#F6F1FF', HAIR = 'rgba(26,10,51,.09)';
const SH = { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;
const avatar = (d: ReturnType<typeof doc>) => (d.washer?.photo_url ? { uri: d.washer.photo_url } : IMG.washer);

const Tag = ({ label, tone = 'violet' }: { label: string; tone?: 'violet' | 'ok' | 'grey' | 'gold' }) => {
  const m = { violet: [TINT, C.violet], ok: ['#E3F6EE', OK], grey: ['#F0EEF4', GREY], gold: ['#FFF3CC', '#8A5A00'] }[tone];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: m[0], borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}><Txt weight={600} size={11} color={m[1]}>{label}</Txt></View>;
};
function Panel({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const st = [{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 16 }, SH, style];
  return onPress ? <Pressable3 onPress={onPress} style={st}>{children}</Pressable3> : <View style={st}>{children}</View>;
}
function Sec({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <Txt weight={600} size={18} color={INK} style={{ flexShrink: 1 }}>{title}</Txt>{right}
    </View>
  );
}
const Stars = ({ n = 0, size = 18 }: { n?: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 6 }}>
    {[0, 1, 2, 3, 4].map(i => (
      <Svg key={i} width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3.3l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.6l6-.8z" fill={i < n ? C.gold : 'none'} stroke={i < n ? C.gold : '#6B6580'} strokeWidth={1.5} strokeLinejoin="round" /></Svg>
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
  return svc.map(x => ({ name: x.s?.name || x.n, mins: x.s?.mins || 25, price: x.s ? x.s.price : Math.round(tot / Math.max(1, svc.length)), mrp: x.s?.mrp || 0, img: x.s?.img as string | undefined, tint: x.s?.tint as string | undefined, ok: !!x.s || sumP === 0 }));
};
const titleOf = (names: string[]) => (names.length > 1 ? `${names[0]} and ${names.length - 1} more` : names[0] || 'Car wash');
const hashN = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h };
const otpOf = (s: string) => String(1000 + (hashN(s) % 9000)).split('');

/* ---- Pronto header pieces ---- */
function RoundBtn({ onPress, children, label, dark }: { onPress: () => void; children: React.ReactNode; label: string; dark?: boolean }) {
  return (
    <Pressable3 onPress={onPress} accessibilityLabel={label} accessibilityRole="button" style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: dark ? 'rgba(0,0,0,.28)' : C.white, alignItems: 'center', justifyContent: 'center' }, !dark && SH]}>{children}</Pressable3>
  );
}
const CallBtn = () => (
  <Pressable3 onPress={() => Linking.openURL('tel:' + SUPPORT_PHONE).catch(() => toast('Call ' + SUPPORT_PHONE))} accessibilityRole="button" accessibilityLabel="Call your washer"
    style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Phone size={21} color={C.white} /></Pressable3>
);
const BookIcon = ({ children }: { children: React.ReactNode }) => (
  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F4F8', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
);

function Timeline() {
  const rows = timeline();
  return (
    <Panel style={{ paddingVertical: 8 }}>
      <View style={{ position: 'absolute', left: 32, top: 30, bottom: 30, width: 2, backgroundColor: HAIR }} />
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: r.st === 'done' ? OK : r.st === 'now' ? C.violet : C.white, borderWidth: r.st === 'todo' ? 2 : 0, borderColor: HAIR }}>
            <Txt weight={800} size={12} color={r.st === 'todo' ? GREY : C.white}>{r.st === 'done' ? (r.icon || '✓') : r.st === 'now' ? '•' : ''}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0, opacity: r.st === 'todo' ? 0.55 : 1 }}>
            <Txt weight={600} size={14} color={INK}>{r.title}</Txt>
            {r.sub ? <Txt size={12} color={GREY}>{r.sub}</Txt> : null}
          </View>
          <Txt weight={600} size={12} color={GREY}>{r.at ? ampm(r.at) : ''}</Txt>
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
        <View style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1, borderColor: HAIR, overflow: 'hidden', backgroundColor: TINT2 }}>
          <Image source={typeof p.src === 'string' ? src(p.src)! : p.src} resizeMode={p.cut ? 'contain' : 'cover'} accessibilityLabel={`${label} photo`} style={[StyleSheet.absoluteFill, p.cut && { margin: 14 }]} />
          {p.local === 'before' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(80,50,10,.3)' }]} /> : null}
          <View style={{ position: 'absolute', left: 8, bottom: 8 }}><View style={{ backgroundColor: 'rgba(26,10,51,.7)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}><Txt weight={700} size={11} color={C.white}>{label}</Txt></View></View>
        </View>
      ) : (
        <View style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(84,9,218,.3)', backgroundColor: TINT2, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <Txt size={12} color={GREY} style={{ textAlign: 'center' }}>{wait}</Txt>
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
function Copy({ size = 14 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GREY} strokeWidth={2}><Rect x={9} y={9} width={11} height={11} rx={2} /><Path d="M5 15V6a2 2 0 0 1 2-2h8" /></Svg>;
}
const CalIc = () => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round"><Rect x={4} y={5} width={16} height={15} rx={3} /><Path d="M4 10h16M8 3v4M16 3v4M9 14h6" /></Svg>;
const ClockIc = () => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round"><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3 2" /></Svg>;
const CardIc = () => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round"><Rect x={3} y={5} width={18} height={14} rx={3} /><Path d="M3 10h18M7 15h4" /></Svg>;
const PinIc = () => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round"><Path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z" /><Circle cx={12} cy={10.5} r={2.3} /></Svg>;
const Arrow = ({ color = INK }: { color?: string }) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>;

function TimePill({ left, frac }: { left: number; frac: number }) {
  const w = 150, h = 70, p = Math.max(4, Math.min(96, frac * 100));
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Rect x={4} y={4} width={w - 8} height={h - 8} rx={(h - 8) / 2} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={6} />
        <Rect x={4} y={4} width={w - 8} height={h - 8} rx={(h - 8) / 2} fill="none" stroke={C.gold} strokeWidth={6} strokeLinecap="round" {...({ pathLength: 100 } as any)} strokeDasharray={`${p} ${100 - p}`} />
      </Svg>
      <Txt weight={600} size={10.5} color="rgba(255,255,255,.9)" style={{ letterSpacing: 0.4 }}>TIME LEFT</Txt>
      <Txt weight={600} size={20} color={C.white}>{`${left} min`}</Txt>
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
  const lines = b ? bkLines(b) : [{ name: 'Daily pressure wash', mins: d.minutes || 12, price: 0, mrp: 0, img: 'spray', tint: TINT, ok: true }];
  const mins = lines.reduce((a, x) => a + x.mins, 0);
  const pay = b ? (/^Paid/.test(b.what) ? [`${inr(bkAmt(b))} paid`, `Booked ${fmt(iso(TODAY), { day: 'numeric', month: 'short' })}`] : [`Pay ${inr(bkAmt(b))} on arrival`, 'UPI, cash or card']) : (c.till ? ['Plan paid', `Till ${fmt(c.till, { day: 'numeric', month: 'short' })}`] : ['Pay after first wash', 'Nothing to pay now']);
  const addr = [c.parking, c.area || A().area].filter(Boolean).join(', ');
  const hdrBg = mode === 'light' ? '#E8DFFB' : C.violet2;
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={{ backgroundColor: hdrBg, paddingTop: Math.max(ins.top, 24) + 8, paddingHorizontal: 16, paddingBottom: mode === 'light' ? 70 : 60, minHeight: mode === 'light' ? 156 : undefined }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 40, alignItems: 'center' }}>
            <RoundBtn onPress={onBack} label="Back to bookings"><Back size={19} color={INK} /></RoundBtn>
            <RoundBtn onPress={() => sheets.help()} label="Help"><HelpIc size={19} color={INK} /></RoundBtn>
          </View>
          {mode === 'live' ? (
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <TimePill left={left} frac={frac} />
              <Txt weight={600} size={20} color={C.white} style={{ marginTop: 14 }}>Service in progress</Txt>
              <Txt size={12.5} color="rgba(255,255,255,.8)" style={{ marginTop: 4, textAlign: 'center' }}>{h.sub}</Txt>
            </View>
          ) : mode === 'done' ? (
            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' }}><Check size={30} color={C.white} /></View>
              <Txt weight={600} size={20} color="rgba(255,255,255,.8)" style={{ marginTop: 14 }}>Booking completed</Txt>
              <Txt size={12.5} color="rgba(255,255,255,.7)" style={{ marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>{`Washed at ${ampm(d.finished_at) || 'this morning'}. Thank you for choosing Washing Daddy!`}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -28, paddingHorizontal: 14, paddingTop: 14, gap: 12 }}>
          {/* washer */}
          <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, overflow: 'hidden' }, SH]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <Image source={avatar(d)} resizeMode="cover" style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: TINT }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={600} size={14} color={INK} upper>{h.washer}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Star size={12} color={C.gold} /><Txt size={11.5} color={INK}>4.9</Txt></View>
                  <Txt size={11.5} color={INK}>{`${c.washes || 0} washes`}</Txt>
                </View>
              </View>
              <CallBtn />
            </View>
            {/* The washer app does not check a start OTP yet, so the code only shows in the test version */}
            {mode === 'light' && !REAL ? (
              <View style={{ backgroundColor: '#F7F6FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Txt weight={500} size={13} color={INK} style={{ width: 120, lineHeight: 19 }}>Share the OTP to start the service</Txt>
                <View style={{ flexDirection: 'row', gap: 5 }}>{otpOf(id).map((x, i) => <View key={i} style={{ width: 29, height: 36, borderRadius: 6, backgroundColor: '#1C1233', alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={18} color={C.white}>{x}</Txt></View>)}</View>
              </View>
            ) : mode === 'live' ? (
              <View style={{ backgroundColor: '#F7F6FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                <Txt weight={500} size={13} color={INK} style={{ width: 120, lineHeight: 19 }}>Happy with the wash so far?</Txt>
                <Pressable3 onPress={() => sheets.tip()} style={{ backgroundColor: C.violet, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 }}><Txt weight={600} size={13} color={C.white}>Tip washer</Txt></Pressable3>
              </View>
            ) : null}
          </View>
          {/* scheduled + services */}
          <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, overflow: 'hidden' }, SH]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <BookIcon><CalIc /></BookIcon>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={14} color={INK}>{`Scheduled • ${whenTxt}`}</Txt>
                <Pressable onPress={() => toast('Booking ID copied')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Txt size={12} color={GREY}>Booking ID: <Txt size={12} color={GREY} style={{ textDecorationLine: 'underline' }}>{id}</Txt></Txt><Copy />
                </Pressable>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: LINE }} />
            <View style={{ padding: 14, gap: 12 }}>
              <Txt size={12} color={GREY}>{`${lines.length} service${lines.length > 1 ? 's' : ''} · ${mins} mins`}</Txt>
              {lines.map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: l.tint || TINT, overflow: 'hidden' }}>{l.img && src(l.img) ? <Image source={src(l.img)!} resizeMode="cover" style={{ width: 48, height: 48 }} /> : null}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight={500} size={13} color={INK} numberOfLines={1}>{l.name}</Txt>
                    <Txt size={12} color={GREY} style={{ marginTop: 3 }}>{`${l.mins} mins`}</Txt>
                  </View>
                  {l.price ? <View style={{ alignItems: 'flex-end' }}><Txt weight={600} size={13} color={INK}>{inr(l.price)}</Txt>{l.mrp ? <Txt size={10} color={GREY} style={{ textDecorationLine: 'line-through' }}>{inr(l.mrp)}</Txt> : null}</View> : <Txt weight={600} size={12} color={C.violet}>In plan</Txt>}
                </View>
              ))}
            </View>
          </View>
          {/* address */}
          <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 14 }, SH]}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <BookIcon><PinIc /></BookIcon>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={14} color={INK}>Service address</Txt>
                <Txt size={12} color={GREY} style={{ marginTop: 4, lineHeight: 18 }}>{`${c.name} · ${maskPlate(c.plate)}, ${addr}`}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}><Phone size={13} color={GREY} /><Txt size={12} color={GREY}>{`${A().name || 'You'}, ${A().phone || ''}`}</Txt></View>
              </View>
            </View>
            <Pressable3 onPress={() => Share.share({ message: `My Washing Daddy booking: ${whenTxt}\nCar: ${c.name} ${maskPlate(c.plate)}\n${addr}` }).catch(() => {})}
              style={{ marginTop: 14, backgroundColor: '#F7F6FA', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' }}><WhatsApp size={18} color={C.white} /></View>
              <View style={{ flex: 1 }}><Txt weight={500} size={12.5} color={INK}>Booked for someone else?</Txt><Txt size={11.5} color={GREY}>Share your booking details with them</Txt></View>
              <Arrow />
            </Pressable3>
          </View>
          {/* paid */}
          <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, SH]}>
            <BookIcon><CardIc /></BookIcon>
            <View style={{ flex: 1 }}><Txt weight={500} size={14} color={INK}>{pay[0]}</Txt><Txt size={12} color={GREY} style={{ marginTop: 2 }}>{pay[1]}</Txt></View>
            <Arrow />
          </View>
          {/* modify */}
          {b ? (
            <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 14 }, SH]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <BookIcon><ClockIc /></BookIcon>
                <View style={{ flex: 1 }}>
                  <Txt weight={500} size={14} color={INK}>Modify your booking</Txt>
                  <Txt size={12} color={GREY} style={{ marginTop: 3, lineHeight: 17 }}>Free cancellation allowed up to 6 hours before booking time.</Txt>
                  <Pressable onPress={() => sheets.help()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}><Txt weight={500} size={12} color={C.violet}>Read refund policy</Txt><Chev size={12} color={C.violet} /></Pressable>
                </View>
              </View>
              <Pressable3 onPress={() => { act.cancelBooking(b.id); onBack() }} style={{ marginTop: 14, borderRadius: 8, borderWidth: 1, borderColor: C.violet, alignItems: 'center', paddingVertical: 10 }}>
                <Txt weight={500} size={13.5} color={C.violet}>Cancel this booking</Txt><Txt size={10.5} color="#E8384F">No refund is applicable.</Txt>
              </Pressable3>
              <Pressable3 onPress={() => sheets.help()} style={{ marginTop: 10, borderRadius: 8, backgroundColor: C.violet, alignItems: 'center', paddingVertical: 13 }}><Txt weight={500} size={13.5} color={C.white}>Reschedule this booking</Txt></Pressable3>
            </View>
          ) : null}
          {/* live detail for today's wash */}
          {today ? (
            <>
              <View style={{ marginTop: 10 }}><Sec title="Live updates" right={<Txt size={12} color={GREY}>{fmt(d.date || iso(TODAY), { weekday: 'short', day: 'numeric', month: 'short' })}</Txt>} /><Timeline /></View>
              <View style={{ marginTop: 6 }}>
                <Sec title="Photos" right={<Pressable onPress={() => sheets.proof()} hitSlop={8}><Txt weight={600} size={13} color={C.violet}>Compare</Txt></Pressable>} />
                <Photos />
              </View>
              <Pressable3 disabled={!!ui.sim} onPress={() => act.replay()} style={{ minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: C.violet, alignItems: 'center', justifyContent: 'center', opacity: ui.sim ? 0.6 : 1, backgroundColor: C.white }}>
                <Txt weight={600} size={14} color={C.violet}>{ui.sim ? 'Playing back…' : 'Replay this morning, live'}</Txt>
              </Pressable3>
            </>
          ) : null}
          {/* bring a friend */}
          <Pressable3 onPress={() => openPage({ k: 'refer' })} style={{ marginTop: 6, borderRadius: 16, overflow: 'hidden', backgroundColor: C.violet2, height: 168 }}>
            <View style={{ position: 'absolute', right: -10, bottom: 0 }}><Image source={IMG.washer} resizeMode="contain" style={{ width: 140, height: 150 }} /></View>
            <View style={{ padding: 18 }}>
              <Txt weight={500} size={15} color={C.gold}>Bring a friend</Txt>
              <Txt weight={700} size={34} color={C.white} style={{ marginTop: 2 }}>Get ₹200</Txt>
              <Txt size={10.5} color="rgba(255,255,255,.85)" style={{ width: 170, marginTop: 2 }}>When your friend books their first wash</Txt>
              <View style={{ alignSelf: 'flex-start', backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 8, marginTop: 10 }}><Txt weight={600} size={12} color={C.violet}>Refer Now</Txt></View>
            </View>
          </Pressable3>
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Txt weight={600} size={15} color={INK} style={{ textAlign: 'center' }}>Relax, your car is in professional hands</Txt>
            <Txt size={12} color={GREY} style={{ marginTop: 4 }}>Trusted by 25,000+ cars</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- My Bookings list ---------- */
function Card({ r, onPress, prev }: { r: Row; onPress: () => void; prev: boolean }) {
  const c = car(), [rate, setRate] = useState(0);
  return (
    <Pressable3 onPress={onPress} style={[{ marginLeft: 26, backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 14 }, SH]}>
      <Txt weight={500} size={17} color={INK}>{r.title}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
        <Txt size={11} color={GREY}>{r.sub}</Txt>
        {r.saved ? <><Txt size={11} color={GREY}>•</Txt><Txt weight={500} size={11} color={OK}>{`${inr(r.saved)} saved`}</Txt></> : null}
        {r.mins ? <><Txt size={11} color={GREY}>•</Txt><Txt size={11} color={GREY}>{`${r.mins} min`}</Txt></> : null}
      </View>
      <View style={{ marginTop: 12, backgroundColor: '#FBFAFD', borderRadius: 10, borderWidth: 1, borderColor: LINE, padding: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={r.photo} resizeMode="cover" style={{ width: 46, height: 46, borderRadius: 6, backgroundColor: TINT }} />
          <View>
            <Txt weight={500} size={13.5} color={INK}>{r.washer}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}><Star size={11} color={GREY} /><Txt size={11} color={GREY}>4.9</Txt><Txt size={11} color={GREY}>•</Txt><Txt size={11} color={GREY}>{`${c.washes || 0} washes`}</Txt></View>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#D9D6E2', marginTop: 10, paddingTop: 10, marginHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {prev ? (
            <>
              <Txt size={13} color={GREY}>{r.done ? 'Service rating' : 'Not washed'}</Txt>
              {r.done ? <Pressable onPress={() => { setRate(rate ? 0 : 5); if (!rate) toast('Thanks for rating') }}><Stars n={rate} size={17} /></Pressable> : null}
            </>
          ) : (
            <>
              <Txt size={13} color={GREY}>Status</Txt>
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
    <View style={{ marginTop: 14, marginBottom: 8 }}>
      <Txt size={10} color={INK}>{top}</Txt>
      <Txt weight={500} size={12.5} color={INK} style={{ marginTop: 2 }}>{sub}</Txt>
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
        <View style={{ height: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt weight={600} size={17} color={INK}>My Bookings</Txt>
          <Pressable3 onPress={() => sheets.help()} accessibilityRole="button" style={{ height: 33, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white }}>
            <HelpIc size={15} color={INK} /><Txt weight={500} size={13} color={INK}>Help</Txt>
          </Pressable3>
        </View>
      </View>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 }}>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: LINE, borderRadius: 999, padding: 4, height: 42 }}>
          {([['up', 'Upcoming'], ['prev', 'Previous']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="button" accessibilityState={{ selected: tab === k }} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? NAVY : 'transparent' }}>
              <Txt weight={500} size={12} color={tab === k ? C.white : INK}>{l}</Txt>
            </Pressable>
          ))}
        </View>
        {list.length ? (
          <View>
            <View pointerEvents="none" style={{ position: 'absolute', left: 8, top: 18, bottom: 40, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#D5D1E0' }} />
            {list.map(r => (
              <View key={r.key}>
                <DateRow top={dayLabel(r.date)} sub={r.when || ' '} />
                <Card r={r} prev={tab === 'prev'} onPress={() => (r.kind === 'hist' ? sheets.day(r.date) : setOpen(r))} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 }}>
            <Image source={IMG.washer} resizeMode="contain" style={{ width: 130, height: 130, opacity: 0.9 }} />
            <Txt weight={600} size={16} color={INK} style={{ marginTop: 12 }}>{tab === 'up' ? 'No upcoming washes' : 'Nothing yet'}</Txt>
            <Txt size={12.5} color={GREY} style={{ marginTop: 4, textAlign: 'center' }}>{tab === 'up' ? 'Book a wash from Home and it shows up here.' : 'Your washes show up here after the first one.'}</Txt>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

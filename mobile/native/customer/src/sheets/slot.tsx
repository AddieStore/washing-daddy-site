// Bottom sheets for the cart and the schedule page. OWNER: HOME/CART worker (pronto-video-2026-11-15/CONTRACT.md).
// Exports: SlotPicker (day chips, Morning/Afternoon/Evening, 30-minute grid with surcharge and sold-out state, 30-minute arrival note; also used by
// pages/Schedule.tsx), openSlotSheet ("Schedule for later" + Confirm time), openRecurSheet (repeat plan) and openBillSheet (bill details).
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated, Easing, Platform, useWindowDimensions } from 'react-native';
import { Txt } from '../ui/kit';
import { Sun, Moon, Sunrise, Check, Chev } from '../ui/icons';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { Shimmer } from '../ui/motion';
import { PopPress, OfferStrip } from '../ui/bookKit';
import {
  useApp, act, openSheet, closeSheet, openPage, toast, when, recur, bill, slotDays, partsFor, slotsFor, slotLabel, whenText, svcLines, cartMode,
} from '../state';
import { DAY_PARTS, RECURRING, ARRIVAL_WINDOW_MIN, SOLD_OUT_TEXT, type DayPart, type RecurId } from '../data/reference';
import { G, PrimaryBtn, Tap, Price, TNUM, inr } from '../pages/parts';

const ND = Platform.OS !== 'web';
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const ORANGE = '#EA7A12';
const PART_ICON: Record<DayPart, (p: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement> = { Morning: Sunrise as any, Afternoon: Sun as any, Evening: Moon as any };

/** true while slots "load": calls act.loadSlots() (real mode reads slots/{date}) and holds the skeleton for at least a beat */
export function useSlotsLoading() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    let alive = true; const t0 = Date.now();
    Promise.resolve().then(() => act.loadSlots()).catch(() => {}).then(() => { setTimeout(() => { if (alive) setOn(false) }, Math.max(0, 420 - (Date.now() - t0))) });
    return () => { alive = false };
  }, []);
  return on;
}

/* ---------- day chips ---------- */
export function DayChips({ date, onPick, pad = 16 }: { date: string; onPick: (d: string) => void; pad?: number }) {
  useApp();
  const days = slotDays();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: pad, gap: 8, paddingVertical: 4 }}>
      {days.map(d => {
        const on = d.date === date;
        return (
          <PopPress key={d.date} disabled={d.disabled} accessibilityRole="button" accessibilityState={{ selected: on, disabled: d.disabled }} accessibilityLabel={d.label + (d.soldOut ? ', fully booked' : '')} onPress={() => onPick(d.date)}
            style={{ minWidth: 92, height: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.07)' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={on ? 500 : 400} size={14} color={d.disabled ? '#B4B4BA' : on ? G.violet : G.ink} style={{ lineHeight: 18 }}>{d.label}</Txt>
            {d.soldOut && !d.disabled ? <Txt size={10} color={G.neg} style={{ lineHeight: 12 }}>Fully booked</Txt> : null}
          </PopPress>
        );
      })}
    </ScrollView>
  );
}

/* ---------- Morning / Afternoon / Evening with a sliding pill ---------- */
export function PartTabs({ date, part, onPick }: { date: string; part: DayPart; onPick: (p: DayPart) => void }) {
  const parts = partsFor(date), [w, setW] = useState(0), i = Math.max(0, DAY_PARTS.findIndex(p => p.id === part)), x = useRef(new Animated.Value(i)).current;
  useEffect(() => { Animated.timing(x, { toValue: i, duration: 240, easing: EASE, useNativeDriver: ND }).start() }, [i]);
  const seg = w ? (w - 8) / 3 : 0;
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: G.raised, borderRadius: 12, padding: 4 }}>
      {seg ? <Animated.View style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: seg, borderRadius: 9, backgroundColor: G.violet, transform: [{ translateX: x.interpolate({ inputRange: [0, 1, 2], outputRange: [0, seg, seg * 2] }) }] }} /> : null}
      {DAY_PARTS.map(p => {
        const on = p.id === part, Ic = PART_ICON[p.id], so = parts.find(q => q.id === p.id)?.soldOut;
        return (
          <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onPick(p.id)} style={{ flex: 1, height: 40, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Ic size={16} color={on ? '#fff' : so ? '#B4B4BA' : G.mute} strokeWidth={1.5} />
            <Txt weight={on ? 500 : 400} size={13} color={on ? '#fff' : so ? '#B4B4BA' : G.ink} style={{ lineHeight: 18 }}>{p.id}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- SOLD OUT hanging sign ---------- */
function SoldOut() {
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(sway, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }), Animated.timing(sway, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND })])); l.start(); return () => l.stop() }, []);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <Animated.View style={{ alignItems: 'center', transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] }}>
        <View style={{ flexDirection: 'row', gap: 52, height: 14 }}><View style={{ width: 2, backgroundColor: '#C7C7CC' }} /><View style={{ width: 2, backgroundColor: '#C7C7CC' }} /></View>
        <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: G.neg, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 }}>
          <Txt weight={500} size={18} color={G.neg} style={{ letterSpacing: 1.5, lineHeight: 24 }}>SOLD OUT</Txt>
        </View>
      </Animated.View>
      <Txt weight={500} size={12} color={G.mute} style={{ letterSpacing: 1.5, marginTop: 14 }}>FULLY BOOKED</Txt>
      <Txt size={13} color={G.sub} style={{ textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 300 }}>{SOLD_OUT_TEXT}</Txt>
    </View>
  );
}

/* ---------- 30-minute slot grid (4 columns) ---------- */
export function SlotGrid({ date, part, slot, onPick, innerW }: { date: string; part: DayPart; slot: string; onPick: (t: string) => void; innerW: number }) {
  const list = slotsFor(date, part), pSold = partsFor(date).find(p => p.id === part)?.soldOut;
  const cw = Math.floor((innerW - 3 * 8) / 4);
  if (pSold) return <SoldOut />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {list.map(s => {
        const on = s.t === slot, off = !s.ok;
        return (
          <PopPress key={s.t} disabled={off} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }} accessibilityLabel={s.label + (s.surcharge ? ', plus ' + inr(s.surcharge) : '') + (s.soldOut ? ', sold out' : s.past ? ', not available' : '')} onPress={() => onPick(s.t)}
            style={{ width: cw, height: 52, borderRadius: 10, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.07)' : off ? '#FAFAFB' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={on ? 500 : 400} size={13} color={off ? '#B4B4BA' : on ? G.violet : G.ink} style={{ lineHeight: 18, textDecorationLine: s.soldOut ? 'line-through' : 'none', ...TNUM }}>{s.label}</Txt>
            {s.surcharge && !off ? <Txt weight={500} size={11} color={ORANGE} style={{ lineHeight: 14, ...TNUM }}>{'+' + inr(s.surcharge)}</Txt> : null}
            {s.soldOut ? <Txt size={10} color="#B4B4BA" style={{ lineHeight: 12 }}>Sold out</Txt> : null}
          </PopPress>
        );
      })}
    </View>
  );
}

/** day chips + part tabs + slot grid + arrival note in one controlled picker. value = { date, slot('HH:MM' | '') } */
export function SlotPicker({ value, onChange, innerW, chipsPad = 16, showNote = true, between }: { value: { date: string; slot: string }; onChange: (v: { date: string; slot: string }) => void; innerW: number; chipsPad?: number; showNote?: boolean; between?: React.ReactNode }) {
  useApp();
  const loading = useSlotsLoading();
  const firstPart = (d: string): DayPart => (partsFor(d).find(p => !p.soldOut)?.id || 'Morning');
  const [part, setPart] = useState<DayPart>(() => (value.slot ? (slotsFor(value.date).find(s => s.t === value.slot)?.part || firstPart(value.date)) : firstPart(value.date)));
  const pickDay = (d: string) => { setPart(firstPart(d)); onChange({ date: d, slot: '' }) };
  if (loading) return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: chipsPad }}>{[0, 1, 2, 3].map(i => <Shimmer key={i} width={92} height={44} radius={10} />)}</View>
      <View style={{ marginTop: 16 }}><Shimmer height={48} radius={12} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Shimmer key={i} width={Math.floor((innerW - 24) / 4)} height={52} radius={10} />)}</View>
    </View>
  );
  return (
    <View>
      <DayChips date={value.date} onPick={pickDay} pad={chipsPad} />
      {between}
      <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, padding: 12 }}>
        <Txt weight={500} size={13} color={G.mute} style={{ marginBottom: 10 }}>Service start time</Txt>
        <PartTabs date={value.date} part={part} onPick={p => { setPart(p); onChange({ date: value.date, slot: slotsFor(value.date, p).some(s => s.t === value.slot) ? value.slot : '' }) }} />
        <View style={{ marginTop: 12 }}><SlotGrid date={value.date} part={part} slot={value.slot} onPick={t => onChange({ date: value.date, slot: t })} innerW={innerW - 26} /></View>
      </View>
      {showNote ? (
        <View style={{ marginTop: 14, paddingHorizontal: 4 }}>
          <Txt weight={500} size={11} color={G.mute} style={{ letterSpacing: 1 }}>NOTE</Txt>
          <Txt size={13} color={G.sub} style={{ lineHeight: 18, marginTop: 2 }}>Washers arrive within {ARRIVAL_WINDOW_MIN} minutes of the selected slot.</Txt>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Cart "Select time slot": Schedule for later sheet ---------- */
function SlotSheet() {
  useApp();
  const { width } = useWindowDimensions(), W = Math.min(width, 520), w0 = when();
  const first = slotDays().find(d => !d.disabled && !d.soldOut) || slotDays().find(d => !d.disabled) || slotDays()[0];
  const [v, setV] = useState<{ date: string; slot: string }>(w0 ? { date: w0.date, slot: w0.slot } : { date: first.date, slot: '' });
  const confirm = () => { try { act.setWhen({ date: v.date, slot: v.slot }); closeSheet(); toast(whenText({ date: v.date, slot: v.slot })) } catch (e: any) { toast(e?.message || 'Pick another slot') } };
  return (
    <View>
      <SheetTitle>Schedule for later</SheetTitle>
      <View style={{ marginHorizontal: -16 }}><View style={{ height: 8 }} /></View>
      <View style={{ marginTop: 12 }}><SlotPicker value={v} onChange={setV} innerW={W - 32} chipsPad={0} /></View>
      <OfferStrip style={{ marginTop: 16 }} />
      <View style={{ marginTop: 12 }}><PrimaryBtn label="Confirm time" disabled={!v.slot} onPress={confirm} /></View>
    </View>
  );
}
export function openSlotSheet() { openSheet(<SlotSheet />) }

/* ---------- Cart Recurring tab: how often, which days, time, start ---------- */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function RecurSheet() {
  useApp();
  const r0 = recur(), { width } = useWindowDimensions(), W = Math.min(width, 520);
  const days = slotDays().filter(d => !d.disabled);
  const [freq, setFreq] = useState<RecurId>(r0?.freq || 'weekly'), [dow, setDow] = useState<number[]>(r0?.days || [6]), [start, setStart] = useState(r0?.start || (days.find(d => !d.soldOut) || days[0]).date), [slot, setSlot] = useState(r0?.slot || '');
  const need = freq === 'weekly' ? 1 : freq === 'twice' ? 2 : 0, rc = RECURRING.find(x => x.id === freq)!;
  const toggle = (d: number) => setDow(cur => (cur.includes(d) ? cur.filter(x => x !== d) : need === 1 ? [d] : cur.length >= need ? [...cur.slice(1), d] : [...cur, d]));
  const ok = !!slot && (need === 0 || dow.length === need);
  const times = slotsFor(start).filter(s => s.ok);
  const confirm = () => { try { act.setRecur({ freq, days: need === 0 ? [0, 1, 2, 3, 4, 5, 6] : dow, slot, start }); closeSheet(); toast('Recurring plan set') } catch (e: any) { toast(e?.message || 'Could not set the plan') } };
  const cw = Math.floor((W - 32 - 24) / 4);
  return (
    <View>
      <SheetTitle>Repeat this booking</SheetTitle>
      <SheetSub>Same slot, lower price per wash. Cancel anytime.</SheetSub>
      <View style={{ gap: 8 }}>
        {RECURRING.map(o => { const on = o.id === freq; return (
          <PopPress key={o.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { setFreq(o.id); setDow(d => (o.id === 'weekly' ? d.slice(0, 1) : d)) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, padding: 12, backgroundColor: on ? 'rgba(84,9,218,0.05)' : '#fff' }}>
            <View style={{ flex: 1 }}><Txt weight={500} size={15}>{o.label}</Txt><Txt size={12} color={G.mute}>{o.sub}</Txt></View>
            <View style={{ backgroundColor: 'rgba(22,163,74,.12)', borderRadius: 6, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><Txt weight={500} size={11} color={G.pos}>{o.off}% off</Txt></View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 1.5, borderColor: on ? G.violet : '#C7C7CC' }} />
          </PopPress>) })}
      </View>
      {need ? (
        <>
          <Txt weight={500} size={13} color={G.mute} style={{ marginTop: 20, marginBottom: 8 }}>{need === 1 ? 'Which day?' : 'Which ' + need + ' days?'}</Txt>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 0].map(d => { const on = dow.includes(d); return (
              <PopPress key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggle(d)} style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.07)' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Txt weight={on ? 500 : 400} size={12} color={on ? G.violet : G.ink}>{DOW[d]}</Txt>
              </PopPress>) })}
          </View>
        </>
      ) : <Txt size={13} color={G.sub} style={{ marginTop: 16 }}>Your washer comes every other day.</Txt>}
      <Txt weight={500} size={13} color={G.mute} style={{ marginTop: 20, marginBottom: 4 }}>Start from</Txt>
      <View style={{ marginHorizontal: 0 }}><DayChips date={start} pad={0} onPick={d => { setStart(d); setSlot('') }} /></View>
      <Txt weight={500} size={13} color={G.mute} style={{ marginTop: 16, marginBottom: 8 }}>Time</Txt>
      {times.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {times.map(s => { const on = s.t === slot; return (
            <PopPress key={s.t} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSlot(s.t)} style={{ width: cw, height: 44, borderRadius: 10, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.07)' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Txt weight={on ? 500 : 400} size={12} color={on ? G.violet : G.ink} style={TNUM}>{s.label}</Txt>
              {s.surcharge ? <Txt weight={500} size={10} color={ORANGE} style={{ lineHeight: 12 }}>{'+' + inr(s.surcharge)}</Txt> : null}
            </PopPress>) })}
        </View>
      ) : <Txt size={13} color={G.sub}>{SOLD_OUT_TEXT}</Txt>}
      <Txt size={12} color={G.mute} style={{ marginTop: 14, lineHeight: 18 }}>About {rc.perMonth} visits a month. Washers arrive within {ARRIVAL_WINDOW_MIN} minutes of the time.</Txt>
      <OfferStrip style={{ marginTop: 16 }} />
      <View style={{ marginTop: 12 }}><PrimaryBtn label="Confirm plan" disabled={!ok} onPress={confirm} /></View>
    </View>
  );
}
export function openRecurSheet() { openSheet(<RecurSheet />) }

/* ---------- Cart "To pay": bill details ---------- */
function BillSheet() {
  useApp();
  const b = bill(), { count, mins, lines } = svcLines();
  return (
    <View>
      <SheetTitle>Bill details</SheetTitle>
      <SheetSub>{count} {count === 1 ? 'service' : 'services'} · {mins} mins{b.mode === 'recurring' && b.perMonth ? ' · about ' + b.perMonth.visits + ' visits a month' : ''}</SheetSub>
      <View style={{ gap: 4, marginBottom: 16 }}>
        {lines.map(l => (
          <Tap key={l.key} label={`${l.name}. See what you get`} scaleTo={0.97} onPress={() => { closeSheet(); openPage({ k: 'svc', id: l.id }) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F6F2FF' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={14} numberOfLines={1}>{l.name}{l.variantLabel ? ' · ' + l.variantLabel : ''}</Txt>
              <Txt size={12} color={G.mute}>x{l.q} · {l.mins * l.q} mins</Txt>
            </View>
            <Price v={l.total} size={14} />
            <Chev size={16} color={G.mute} strokeWidth={1.5} />
          </Tap>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        {b.rows.map((r, i) => {
          const big = r.k === 'total' || r.k === 'topay', col = r.tone === 'pos' ? G.pos : r.tone === 'mute' ? G.mute : G.ink;
          return (
            <View key={r.k + i}>
              {big ? <View style={{ height: 1, backgroundColor: G.line, marginBottom: 12 }} /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt weight={big ? 500 : 400} size={big ? 16 : 14} color={r.tone === 'pos' ? G.pos : big ? G.ink : G.sub}>{r.label}</Txt>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  {r.strike ? <Price v={r.strike} size={13} weight={400} strike /> : null}
                  {r.amt === 0 && r.strike ? <Txt weight={500} size={14} color={G.pos}>Free</Txt> : <Price v={r.amt} size={big ? 16 : 14} weight={big ? 500 : 400} color={col} />}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {b.saved > 0 ? <View style={{ marginTop: 16, backgroundColor: 'rgba(84,9,218,0.07)', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Check size={16} color={G.violet} strokeWidth={2} /><Txt weight={500} size={13} color={G.violet}>{inr(b.saved)} saved on the total!</Txt></View> : null}
      {b.couponError ? <Txt size={12} color={G.neg} style={{ marginTop: 12 }}>{b.couponError}</Txt> : null}
      <View style={{ marginTop: 16 }}><PrimaryBtn label="Done" outline onPress={closeSheet} /></View>
    </View>
  );
}
export function openBillSheet() { openSheet(<BillSheet />) }

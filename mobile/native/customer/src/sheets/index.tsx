// Bottom-sheet contents, ported from the web app's ACT.* sheets. Screens call sheets.x(); logic lives in ../state.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView, PanResponder, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, InkContext, violetInk, useTheme, useInk, SP, R as RAD, HIT } from '../theme';
import { Txt, Btn, Pill, Rows, Row, Card, Chips, Seg, Opt, Field, Eyebrow, Confirm, useInsets } from '../ui/kit';
import { SheetTitle, SheetSub, Success } from '../ui/hosts';
import { Art } from '../ui/art';
import { Check, Arrow } from '../ui/icons';
import { PLANS, AREAS, SERVICES, PRODUCTS, SUPPORT_PHONE_SHOW } from '../data/reference';
import { PAUSE_MAX, canPause, pauseFits, pauseLeft } from '../data/model';
import { TODAY, addDays, fmt, iso, inr, ampm } from '../data/dates';
import { IMG, RATIO, src, ImgKey } from '../img';
import {
  A, car, carImg, doc, planOf, maskPlate, fmtPhone, pName, cartLines, planPayDates, switchQuote, dayDetail, chipText, payReal,
  act, toast, openSheet, closeSheet, confetti, go, sheetHooks, trackWasher, distance, useApp, Track,
} from '../state';
import { TrackMap } from './TrackMap';

/* ---------- small local helpers ---------- */
const VIAS = ['GPay', 'PhonePe', 'Paytm', 'Card', 'Net banking'];
function PayWith({ via, set }: { via: string; set: (v: string) => void }) {
  return <><Txt weight={600} size={13} style={{ marginTop: SP.hair }}>Pay with</Txt>
    <View style={{ marginBottom: -SP.s }}><Seg items={VIAS.slice(0, 3)} value={via} onChange={set} /></View><Seg items={VIAS.slice(3)} value={via} onChange={set} /></>;
}
function Demo({ children }: { children: string }) {
  const ink = useInk();
  return <View style={{ marginTop: SP.m, padding: SP.m, borderRadius: RAD.inner, borderWidth: 1.5, borderStyle: 'dashed', borderColor: ink.dash }}><Txt size={12} color={ink.fg3} style={{ textAlign: 'center' }}>{children}</Txt></View>;
}
// run an action; its Error message goes to a toast and the button comes back
function useRun() {
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => { setBusy(true); try { await f(); } catch (e: any) { setBusy(false); toast(e?.message || "That didn't go through."); } };
  return [busy, run] as const;
}
const Gap = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;
const Link = ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress} hitSlop={14}><Txt weight={700} size={13} color={useInk().accent}>{label}</Txt></Pressable>;
// a horizontally scrolling row of choices; `off` entries are dimmed and cannot be tapped
function Pick({ items, value, onChange, seg }: { items: { key: string; label: string; off?: boolean }[]; value: string; onChange: (k: string) => void; seg?: boolean }) {
  const T = useTheme(), edge = T.day ? C.ink : 'rgba(255,246,233,.22)';
  const row = items.map(o => {
    const on = o.key === value;
    return (
      <Pressable key={o.key} disabled={o.off} onPress={() => onChange(o.key)} style={[{ opacity: o.off ? 0.35 : 1, borderRadius: RAD.ctl, borderWidth: T.day ? 2.5 : 1.5, borderColor: edge, minHeight: HIT, justifyContent: 'center', paddingHorizontal: SP.l,
        backgroundColor: on ? (seg ? C.violet : C.gold) : T.day ? C.white : 'rgba(255,255,255,.06)' }, seg && { flexGrow: 1, alignItems: 'center' }]}>
        <Txt weight={600} size={13} color={on ? (seg ? C.cream : C.ink) : T.day ? C.ink : C.cream}>{o.label}</Txt>
      </Pressable>
    );
  });
  return seg ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.s, marginTop: SP.s, marginBottom: SP.l }}>{row}</View>
    : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SP.s, marginBottom: SP.l, flexGrow: 0 }} contentContainerStyle={{ gap: SP.s, paddingRight: SP.s }}>{row}</ScrollView>;
}
function Tiles({ a, b, al, bl, as, bs }: { a: string; b: string; al: string; bl: string; as?: string; bs?: string }) {
  const T = useTheme(), ink = useInk();
  const cell = (l: string, v: string, s: string | undefined, accent: boolean) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt weight={600} size={11} upper color={ink.fg3} style={{ letterSpacing: 0.9 }}>{l}</Txt>
      <Txt weight={700} size={17} color={accent ? ink.accent : undefined} style={{ textAlign: 'center' }}>{v}</Txt>
      {s ? <Txt size={12}>{s}</Txt> : null}
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.l, borderRadius: RAD.card, backgroundColor: ink.tile2, borderWidth: T.day ? 2.5 : 1, borderColor: T.day ? C.ink : ink.line, marginVertical: SP.l }}>
      {cell(al, a, as, false)}<Arrow size={20} color={ink.accent} />{cell(bl, b, bs, true)}
    </View>
  );
}
const Qty = ({ q, onMinus, onPlus }: { q: number; onMinus: () => void; onPlus: () => void }) => {
  const ink = useInk(), b = (l: string, f: () => void, a: string) => <Pressable accessibilityLabel={a} onPress={f} hitSlop={4} style={{ width: 40, height: HIT, alignItems: 'center', justifyContent: 'center' }}><Txt weight={800} size={18}>{l}</Txt></Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: RAD.ctl, backgroundColor: ink.tile2, borderWidth: 2, borderColor: ink.line, overflow: 'hidden' }}>{b('−', onMinus, 'One fewer')}<Txt weight={700} size={15} style={{ minWidth: 24, textAlign: 'center' }}>{q}</Txt>{b('+', onPlus, 'One more')}</View>;
};

/* ---------- day ---------- */
function Day({ date }: { date: string }) {
  const d = dayDetail(date), ink = useInk();
  return (
    <View>
      <Eyebrow>{d.title}</Eyebrow>
      <SheetTitle>{d.paused ? 'Paused' : 'Washed by ' + d.washer}</SheetTitle>
      <Gap h={8} />
      <Rows>
        {d.paused ? <Row title="No wash" sub="Added to the end of your plan" />
          : d.steps.map((s, i) => <Row key={i} icon="✓" tile="rgba(20,192,138,.15)" title={s} right={i === 0 ? <Txt weight={700} size={13}>{d.time}</Txt> : undefined} />)}
      </Rows>
    </View>
  );
}

/* ---------- proof: before/after compare ---------- */
function Compare() {
  const [w, setW] = useState(0), [k, setK] = useState(0.5), drag = useRef(false), wr = useRef(0), x0 = useRef(0);
  wr.current = w;
  const set = (x: number) => setK(Math.min(0.97, Math.max(0.03, x / (wr.current || 1))));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { drag.current = true; x0.current = e.nativeEvent.locationX; set(x0.current); },
    onPanResponderMove: (_, g) => set(x0.current + g.dx),
    onPanResponderRelease: () => { drag.current = false; }, onPanResponderTerminate: () => { drag.current = false; },
  })).current;
  useEffect(() => {   // one gentle wiggle so people see it can be dragged
    let off = false, raf = 0;
    AccessibilityInfo.isReduceMotionEnabled().then(rm => {
      if (rm || off) return; const t0 = Date.now();
      const step = () => { const t = (Date.now() - t0) / 1400; if (t > 1 || drag.current || off) return; setK(0.5 + 0.3 * Math.sin(t * Math.PI * 2)); raf = requestAnimationFrame(step); };
      step();
    });
    return () => { off = true; cancelAnimationFrame(raf); };
  }, []);
  const h = w / RATIO.proof, lab = (txt: string, right?: boolean) => (
    <View style={[{ position: 'absolute', top: 12, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: right ? C.gold : 'rgba(26,10,51,.75)' }, right ? { right: 12 } : { left: 12 }]}>
      <Txt weight={700} size={11.5} color={right ? C.ink : C.cream}>{txt}</Txt>
    </View>);
  return (
    <View {...pan.panHandlers} onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: h || 200, borderRadius: RAD.card, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, backgroundColor: C.ink }}>
      {w > 0 && <View pointerEvents="none" style={{ flex: 1 }}>
        <Image source={IMG.proof} style={{ width: w, height: h }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: k * w, overflow: 'hidden' }}>
          <Image source={IMG.proof} style={{ width: w, height: h }} />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(70,42,8,.5)' }} />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(196,160,104,.28)' }} />
        </View>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: k * w - 1.5, width: 3, backgroundColor: C.cream }} />
        <View style={{ position: 'absolute', top: h / 2 - 17, left: k * w - 17, width: 34, height: 34, borderRadius: 17, backgroundColor: C.cream, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Txt weight={800} size={13} color={C.ink}>‹ ›</Txt></View>
        {lab('Before')}{lab('After', true)}
      </View>}
    </View>
  );
}
function Proof() {
  const c = car(), d = doc(c);
  return (
    <View>
      <SheetTitle>{'This morning, ' + (ampm(d.finished_at) || '6:40 AM')}</SheetTitle>
      <SheetSub>Drag to compare with how Delhi dust leaves it by evening.</SheetSub>
      <Compare />
      <Gap h={SP.l} />
      <Rows>
        <Row title={'Washed by ' + c.washer} sub={c.parking} right={`${d.minutes || c.mins} min`} />
        <Row title="Water used" sub="Pressure wash, no bucket" right="7 L" />
      </Rows>
      <Btn variant="ghost" label="Something missed? Tell us" onPress={() => sheets.issue()} style={{ marginTop: SP.l }} />
    </View>
  );
}

/* ---------- plan ---------- */
function PayPlan() {
  const c = car(), p = planOf(c), { from, to } = planPayDates(c), [via, setVia] = useState('GPay'), [busy, run] = useRun();
  const go_ = () => run(async () => {
    const r = await act.payPlan(via);
    openSheet(r.pending ? <Success title="Payment received" sub="We're checking it with the bank. Your plan updates by itself as soon as it clears." />
      : <Success title="Paid" sub={`Your ${c.name} is covered till ${fmt(r.till)}. Receipt sent on WhatsApp.`} />);
  });
  return (
    <View>
      <Eyebrow>{c.name} · {p.name}</Eyebrow>
      <SheetTitle>{`Pay ${inr(p.price)} for ${c.till ? 'one more month' : 'your first month'}`}</SheetTitle>
      <Confirm fromLabel={c.till ? 'Paid up till' : 'Starts'} from={fmt(from)} toLabel="After paying" to={fmt(to)} />
      <PayWith via={via} set={setVia} />
      <Btn variant="violet" label={'Pay ' + inr(p.price)} busy={busy ? (payReal() ? 'Opening…' : `Opening ${via}…`) : false} onPress={go_} />
      {payReal() ? null : <Demo>Test version. No money moves. Live payments go through Cashfree.</Demo>}
    </View>
  );
}
function SwitchPlan({ id }: { id: any }) {
  const c = car(), q = switchQuote(id, c), { np, cp, left, up, diff } = q, pay = up && !!diff, [via, setVia] = useState('GPay'), [busy, run] = useRun();
  const go_ = () => run(async () => {
    await act.switchPlan(id, via);
    openSheet(<Success title="Done" sub={`From tomorrow, ${c.washer} follows the ${np.name} checklist for your ${c.name}.`} />);
  });
  return (
    <View>
      <Eyebrow>{c.name}</Eyebrow>
      <SheetTitle>{`${up ? 'Upgrade' : 'Switch'} to ${np.name}`}</SheetTitle>
      <Tiles al="Now" a={cp.name} as={inr(cp.price) + '/mo'} bl="From tomorrow" b={np.name} bs={inr(np.price) + '/mo'} />
      <SheetSub>{pay ? `You pay ${inr(diff)} today for the ${left} days left this month. After that it's ${inr(np.price)} a month.` : 'No charge today. The new price starts from your next payment.'}</SheetSub>
      {pay ? <PayWith via={via} set={setVia} /> : null}
      <Btn variant="violet" label={pay ? 'Pay ' + inr(diff) + ' and upgrade' : 'Confirm ' + np.name} busy={busy ? (pay ? (payReal() ? 'Opening…' : `Opening ${via}…`) : 'Saving…') : false} onPress={go_} />
    </View>
  );
}
function Pause() {
  const c = car(), [start, setStart] = useState(addDays(TODAY, 1)), [days, setDays] = useState(1), [busy, run] = useRun(), ink = useInk();
  const starts = Array.from({ length: 21 }, (_, i) => addDays(TODAY, i + 1));
  const pick = (d: Date) => { setStart(d); if (!pauseFits(c, d, days)) setDays([7, 6, 5, 4, 3, 2, 1].find(n => pauseFits(c, d, n)) || 0); };
  const ok = days > 0 && pauseFits(c, start, days), end = addDays(start, days - 1);
  const inMonth = Array.from({ length: days }, (_, i) => iso(addDays(start, i)).slice(0, 7)).filter(m => m === iso(start).slice(0, 7)).length;
  const go_ = () => { if (!ok) return; run(async () => {
    const pz = await act.pause(start, days);
    openSheet(<Success title="Paused" sub={`No washes ${days === 1 ? 'on ' + fmt(pz.from) : fmt(pz.from) + ' – ' + fmt(pz.to)}. ${c.washer} has been told.`} />);
  }); };
  const box = (l: string, v: string, accent?: boolean) => (
    <View style={{ flex: 1, alignItems: 'center' }}><Txt weight={600} size={11} upper color={ink.fg3} style={{ letterSpacing: 0.9 }}>{l}</Txt><Txt weight={700} size={17} color={accent ? ink.accent : undefined} style={{ textAlign: 'center' }}>{v}</Txt></View>);
  return (
    <View>
      <SheetTitle>Pause washes</SheetTitle>
      <SheetSub>{`Up to ${PAUSE_MAX} days a month, on any days. ${c.washer} skips your car and the days are added to your plan.`}</SheetSub>
      <Eyebrow>Starting</Eyebrow>
      <Pick items={starts.map((d, i) => ({ key: String(i), label: i ? fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Tomorrow' }))} value={String(starts.findIndex(d => iso(d) === iso(start)))} onChange={k => pick(starts[+k])} />
      <Eyebrow>For</Eyebrow>
      <Pick seg items={[1, 2, 3, 4, 5, 6, 7].map(n => ({ key: String(n), label: n + (n === 1 ? ' day' : ''), off: !pauseFits(c, start, n) }))} value={String(days)} onChange={k => setDays(+k)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.l, borderRadius: RAD.card, backgroundColor: ink.tile2, borderWidth: 2.5, borderColor: ink.line, marginBottom: SP.l }}>
        {ok ? <>{box('No washes', days === 1 ? fmt(start) : fmt(start) + ' – ' + fmt(end))}<Txt>·</Txt>{box('Left in ' + fmt(start, { month: 'long' }), `${pauseLeft(c, start) - Math.min(days, inMonth)} of ${PAUSE_MAX} days`, true)}</>
          : box('No pause days left', `You've used all ${PAUSE_MAX} for ${fmt(start, { month: 'long' })}`)}
      </View>
      <Btn variant="violet" label="Pause washes" disabled={!ok} busy={busy ? 'Telling ' + c.washer + '…' : false} onPress={go_} />
    </View>
  );
}
function NoPause() {
  const c = car();
  return (
    <View>
      <SheetTitle>Pausing comes with WD Pro</SheetTitle>
      <SheetSub>{`On WD Pro and above you can pause up to ${PAUSE_MAX} days a month, on any days you like. The days are added to the end of your plan.`}</SheetSub>
      <SheetSub>{`Your ${c.name} is on ${planOf(c).name}.`}</SheetSub>
      <Btn variant="violet" label="See plans" onPress={() => sheets.seePlans()} />
    </View>
  );
}

/* ---------- note, tip ---------- */
function NoteSheet() {
  const c = car(), [text, setText] = useState(c.note || ''), [busy, run] = useRun();
  return (
    <View>
      <SheetTitle>{'Note for ' + c.washer}</SheetTitle>
      <SheetSub>He sees it on tomorrow's round, in Hinglish.</SheetSub>
      <Field label="Your note" value={text} onChangeText={setText} multiline numberOfLines={3} maxLength={1000} placeholder="e.g. Please do the boot area too" style={{ minHeight: 84, textAlignVertical: 'top' }} />
      <Chips items={['Car is in the basement', 'Skip tomorrow', 'Extra interior please', 'Clean the boot']} value="" onChange={(v: string) => setText(t => (t ? t.trim() + '. ' : '') + v)} />
      <Btn variant="violet" label={'Send to ' + c.washer} busy={busy ? 'Sending…' : false} onPress={() => run(async () => { await act.note(text); closeSheet(); })} />
      {c.note ? <Btn variant="ghost" label="Remove note" onPress={() => { act.removeNote(); closeSheet(); }} style={{ marginTop: SP.m }} /> : null}
    </View>
  );
}
function Tip() {
  const fg2 = useInk().fg2;
  const c = car(), [amt, setAmt] = useState(50), [via, setVia] = useState('GPay'), [busy, run] = useRun();
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: SP.l, alignItems: 'center', marginBottom: SP.l }}>
        <Image source={IMG.washer} style={{ width: 64, height: 64, borderRadius: RAD.card, backgroundColor: C.violet }} resizeMode="cover" />
        <View style={{ flex: 1 }}><SheetTitle>{'Tip ' + c.washer}</SheetTitle><Txt size={14} color={fg2}>All of it goes to him, the same day.</Txt></View>
      </View>
      <Seg items={[20, 50, 100, 200].map(n => ({ key: String(n), label: '₹' + n }))} value={String(amt)} onChange={v => setAmt(+v)} />
      <PayWith via={via} set={setVia} />
      <Btn label={'Send ' + inr(amt)} busy={busy ? (payReal() ? 'Opening…' : `Opening ${via}…`) : false}
        onPress={() => run(async () => { await act.tip(amt, via); openSheet(<Success title="Sent" sub={`${c.washer} gets ${inr(amt)} and a thank-you from you on WhatsApp.`} />); })} />
    </View>
  );
}

/* ---------- book + track ---------- */
function Booked({ name, price, paid, id }: { name: string; price: number; paid: boolean; id: string }) {
  const fg2 = useTheme().card.fg2;
  useEffect(() => { confetti(); }, []);
  return (
    <View style={{ alignItems: 'center', paddingTop: SP.s }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.mint, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Check size={40} color={C.white} /></View>
      <Txt font="shout" size={34} upper style={{ textAlign: 'center' }}>Booked!</Txt>
      <Txt size={14} color={fg2} style={{ textAlign: 'center', maxWidth: 300, marginTop: SP.s, marginBottom: SP.l }}>{`${name} request sent. ${paid ? 'Paid ₹' + price + '.' : 'Pay ₹' + price + ' on arrival.'}`}</Txt>
      <Btn variant="violet" label="📍 Track washer live" onPress={() => sheets.track(id)} style={{ marginBottom: SP.m }} />
      <Btn label="Done" onPress={closeSheet} />
    </View>
  );
}
function Book() {
  const c = car(), [svcId, setSvc] = useState(SERVICES[0].id), [via, setVia] = useState('GPay'), [carTxt, setCarTxt] = useState(`${c.name} · ${maskPlate(c.plate)}`), [busy, run] = useRun();
  const svc = SERVICES.find(s => s.id === svcId)!, real = payReal();
  return (
    <View>
      <SheetTitle>Book a wash</SheetTitle>
      <SheetSub>{`Washer arrives in 45–60 min. ${real ? 'Pay now by UPI or card.' : 'Pay them on arrival — no advance needed.'}`}</SheetSub>
      {SERVICES.map(s => <Opt key={s.id} on={s.id === svcId} onPress={() => setSvc(s.id)} title={s.name} text={s.d} price={inr(s.price)} />)}
      <Field label="Which car" value={carTxt} onChangeText={setCarTxt} style={{ marginTop: 0 }} boxStyle={{ marginTop: SP.s }} />
      {real ? <PayWith via={via} set={setVia} /> : null}
      <Btn variant="violet" label={`${real ? 'Pay' : 'Book'} · ${inr(svc.price)}`} busy={busy ? (real ? 'Opening…' : 'Booking…') : false}
        onPress={() => run(async () => { const r = await act.book(svc.id, via); openSheet(<Booked name={svc.name} price={svc.price} paid={r.paid} id={r.id} />); })} />
    </View>
  );
}
function TrackSheet({ id }: { id: string }) {
  const [t, setT] = useState<Track | null>(null), ins = useInsets(), { height } = useWindowDimensions();
  useEffect(() => trackWasher(id, setT), [id]);
  const has = !!(t && t.lat && t.lng), dist = has ? Math.round(distance(t!.lat!, t!.lng!, t!.home[1], t!.home[0])) : 0, eta = Math.max(1, Math.round(dist / (20000 / 60)));
  const sub = !t ? 'Finding location…' : has ? (dist < 100 ? `Almost there! ${dist} m away` : `${dist} m away`) : t.status;
  return (
    <InkContext.Provider value={violetInk}>
      <View style={{ marginHorizontal: -20, marginBottom: -(24 + ins.bottom), backgroundColor: '#150830' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
          <Pressable accessibilityLabel="Back" onPress={closeSheet} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}><Txt size={22} color={C.cream}>‹</Txt></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt weight={700} size={15} color={C.cream}>Washer is on the way</Txt>
            <Txt size={12} color="rgba(255,246,233,.55)" style={{ marginTop: 2 }}>{sub}</Txt>
          </View>
          {has ? <View style={{ backgroundColor: C.violet, borderRadius: 24, paddingVertical: 7, paddingHorizontal: 14 }}><Txt weight={700} size={13} color={C.cream}>{dist < 100 ? 'Almost here' : eta === 1 ? '1 min' : eta + ' min'}</Txt></View> : null}
        </View>
        <View style={{ height: Math.max(320, height * 0.58) }}>{t ? <TrackMap track={t} /> : null}</View>
        <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14 + ins.bottom + 24 }}>
          <Txt size={13} color="rgba(255,246,233,.5)" style={{ textAlign: 'center' }}>{has ? `${t!.washer || 'Washer'} heading your way${payReal() ? '' : ' · pay on arrival'}` : 'Waiting for washer GPS…'}</Txt>
        </View>
      </View>
    </InkContext.Provider>
  );
}

/* ---------- bookings, issue, requests, orders ---------- */
function Bookings() {
  useApp(); const bs = A().bookings.slice().reverse();
  return (
    <View>
      <SheetTitle>One-time washes</SheetTitle><Gap h={8} />
      <Rows>{bs.length ? bs.map(b => <Row key={b.id} title={`${b.type} · ${b.what}`} sub={`${fmt(b.date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${b.slot}`}
        right={<Link label="Cancel" onPress={() => { act.cancelBooking(b.id); closeSheet(); }} />} />) : <Row title="Nothing booked" />}</Rows>
    </View>
  );
}
function Issue() {
  const c = car(), [spots, setSpots] = useState<string[]>(['Rims']), [busy, run] = useRun(), im = src(carImg(c)), key = carImg(c);
  return (
    <View>
      <SheetTitle>Report a missed spot</SheetTitle>
      <SheetSub>{`${c.washer} comes back and fixes it today. Tap where it was.`}</SheetSub>
      <Card pad={16}>
        {im ? <Image source={im} resizeMode="contain" style={{ width: '100%', aspectRatio: key && key in RATIO ? RATIO[key as ImgKey] : 1.6, marginBottom: 6 }} /> : null}
        <Chips multi items={['Roof', 'Rims', 'Glass', 'Bonnet', 'Doors', 'Interior', 'Boot']} value={spots} onChange={setSpots} />
      </Card>
      <Btn variant="violet" label={'Send to ' + c.washer} disabled={!spots.length} busy={busy ? 'Sending…' : false} style={{ marginTop: SP.m }}
        onPress={() => run(async () => { await act.issue(spots); openSheet(<Success title="We're on it" sub={`${c.washer} will come back by 11 AM and send a new photo.`} />); })} />
    </View>
  );
}
function Requests() {
  useApp(); const ok = useInk().ok;
  return (
    <View>
      <SheetTitle>Re-wash requests</SheetTitle><Gap h={8} />
      <Rows>{A().requests.length ? A().requests.map(r => <Row key={r.id} title={r.spots.join(', ')} sub={`${fmt(r.at)} · ${r.open ? 'Washer coming back by 11 AM' : 'Fixed'}`}
        right={r.open ? <Link label="Fixed" onPress={() => act.closeReq(r.id)} /> : <Txt weight={800} color={ok}>✓</Txt>} />) : <Row title="Nothing yet" />}</Rows>
    </View>
  );
}
function Orders() {
  const ink = useInk(), ok = ink.ok;
  return (
    <View>
      <SheetTitle>My orders</SheetTitle><Gap h={8} />
      <Rows>{A().orders.length ? A().orders.map(o => <Row key={o.id} title={`${o.id} · ${inr(o.total)}`}
        sub={<><Txt size={12} color={ink.fg3}>{o.items.map(i => i.q + ' × ' + i.name).join(', ')}</Txt><Txt weight={600} size={12} color={ok}>{o.status}</Txt></>} />) : <Row title="No orders yet" />}</Rows>
    </View>
  );
}

/* ---------- cart + product ---------- */
const Thumb = ({ p, size, art }: { p: (typeof PRODUCTS)[number]; size: number; art: number }) => (
  <LinearGradient colors={p.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size > 100 ? RAD.card + 4 : RAD.inner, alignItems: 'center', justifyContent: 'center' }}><Art kind={p.art} c={p.c} size={art} /></LinearGradient>
);
function Cart() {
  useApp(); const { lines, sub, save } = cartLines(), c = car(), [via, setVia] = useState('GPay'), [busy, run] = useRun(), ink = useInk();
  if (!lines.length) return (
    <View style={{ alignItems: 'center', paddingVertical: SP.l }}>
      <Art kind="cloth" c={['#2E8BFF', '#5409DA']} size={120} />
      <View style={{ height: SP.m }} />
      <SheetTitle>Your cart is empty</SheetTitle>
      <Txt size={14} color={ink.fg2} style={{ textAlign: 'center', maxWidth: 300, marginBottom: SP.xl }}>Anything you add comes with tomorrow morning's wash.</Txt>
      <Btn label="Browse the store" onPress={() => { closeSheet(); go('store'); }} />
    </View>);
  const sum = (l: string, v: string, o?: { ok?: boolean; tot?: boolean }) => (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, o?.tot && { borderTopWidth: 1.5, borderTopColor: ink.line, marginTop: 6, paddingTop: 10 }]}>
      <Txt weight={o?.tot ? 800 : 400} size={o?.tot ? 16 : 14} color={o?.tot ? undefined : ink.fg2}>{l}</Txt><Txt weight={o?.tot ? 800 : 600} size={o?.tot ? 16 : 14} color={o?.ok ? ink.ok : undefined}>{v}</Txt>
    </View>);
  return (
    <View>
      <SheetTitle>Your cart</SheetTitle>
      <SheetSub>{`${c.washer} brings it with tomorrow's wash, to ${c.parking}.`}</SheetSub>
      {lines.map(l => (
        <View key={l.p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m, paddingVertical: SP.s }}>
          <Thumb p={l.p} size={56} art={44} />
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: SP.s }}>
            <Txt weight={600} size={14}>{pName(l.p)}</Txt>
            <Qty q={l.q} onMinus={() => act.setQty(l.p.id, -1)} onPlus={() => act.setQty(l.p.id, 1)} />
          </View>
          <Txt weight={700}>{inr(l.total)}</Txt>
        </View>))}
      <View style={{ marginTop: SP.m, marginBottom: SP.l }}>
        {sum('Items', inr(sub))}{sum('You save', '−' + inr(save), { ok: true })}{sum('Delivery with your wash', 'Free', { ok: true })}{sum('Total', inr(sub), { tot: true })}
      </View>
      <PayWith via={via} set={setVia} />
      <Btn label={'Pay ' + inr(sub)} busy={busy ? (payReal() ? 'Opening…' : `Opening ${via}…`) : false}
        onPress={() => run(async () => { await act.checkoutCart(via); openSheet(<Success title="Order placed" sub={`${car().washer} brings it tomorrow before 7:30 AM and sends a photo when it's in your car.`} />); })} />
      {payReal() ? null : <Demo>Test version. No money moves.</Demo>}
    </View>
  );
}
function Product({ id }: { id: string }) {
  const p = PRODUCTS.find(x => x.id === id)!, c = car(), [q, setQ] = useState(1), ink = useInk();
  return (
    <View>
      <LinearGradient colors={p.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 200, borderRadius: RAD.card + 4, alignItems: 'center', justifyContent: 'center' }}><Art kind={p.art} c={p.c} size={160} /></LinearGradient>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SP.m, marginTop: SP.xl }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{p.cat}</Eyebrow>
          <SheetTitle>{pName(p)}</SheetTitle>
          {p.fit ? <Txt weight={600} size={12} color={ink.ok}>{`Fits your ${c.name} · ${maskPlate(c.plate)}`}</Txt> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt weight={800} size={22}>{inr(p.price)}</Txt>
          <Txt size={13} color={ink.fg3} style={{ textDecorationLine: 'line-through' }}>{inr(p.mrp)}</Txt>
        </View>
      </View>
      <Txt size={14} color={ink.fg2} style={{ marginTop: SP.s }}>{p.desc}</Txt>
      <View style={{ marginTop: SP.m, marginBottom: SP.l, gap: SP.hair + 2 }}>{p.pts.map((x, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}><Txt color={ink.ok} weight={800}>✓</Txt><Txt size={13.5} style={{ flex: 1 }}>{x}</Txt></View>)}</View>
      <View style={{ flexDirection: 'row', gap: SP.m, alignItems: 'center', padding: SP.m, borderRadius: RAD.card, backgroundColor: ink.tile2, marginBottom: SP.l }}>
        <Image source={IMG.washer} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.violet }} />
        <View style={{ flex: 1 }}><Txt weight={700} size={13.5}>Arrives with tomorrow's wash</Txt><Txt size={12} color={ink.fg3}>{c.washer} brings it by 7:30 AM</Txt></View>
      </View>
      <View style={{ flexDirection: 'row', gap: SP.m, alignItems: 'center' }}>
        <Qty q={q} onMinus={() => setQ(Math.max(1, q - 1))} onPlus={() => setQ(q + 1)} />
        <Btn label={'Add · ' + inr(p.price * q)} style={{ flex: 1 }} onPress={() => { closeSheet(); setTimeout(() => act.addToCart(id, q), 250); }} />
      </View>
    </View>
  );
}

/* ---------- profile ---------- */
function AddCar() {
  const [model, setModel] = useState(''), [plate, setPlate] = useState(''), [area, setArea] = useState(A().area), [plan, setPlan] = useState('std'), [busy, run] = useRun();
  return (
    <View>
      <SheetTitle>Add a car</SheetTitle>
      <SheetSub>Your washer takes its first photo tomorrow morning.</SheetSub>
      <Field label="Car" value={model} onChangeText={setModel} placeholder="e.g. Creta, Nexon, City" />
      <Field label="Registration number" value={plate} onChangeText={setPlate} placeholder="DL 8C AB 1234" autoCapitalize="characters" autoCorrect={false} />
      <Eyebrow>Area</Eyebrow>
      <Chips items={AREAS} value={area} onChange={setArea} />
      <Eyebrow>Plan</Eyebrow>
      <Seg items={PLANS.map(p => ({ key: p.id, label: `${p.name.replace('WD ', '')} ${inr(p.price)}` }))} value={plan} onChange={setPlan} />
      <Btn variant="violet" label="Start tomorrow" busy={busy ? 'Adding…' : false} onPress={() => run(async () => { await act.addCar({ name: model, plate, area, plan: plan as any }); closeSheet(); })} />
    </View>
  );
}
function EditDetail({ k }: { k: 'parking' | 'window' | 'keys' }) {
  const c = car(), [v, setV] = useState(c[k]);
  const opts = k === 'window' ? ['Before 6:30 AM', 'Before 7:30 AM', 'Before 9:00 AM', 'Any time'] : ['Keys with the guard', "I'll unlock it", 'Spare key with washer'];
  const save = () => { act.setDetail(k, v); closeSheet(); };
  if (k === 'parking') return (
    <View>
      <SheetTitle>Where the car is parked</SheetTitle>
      <SheetSub>{`So ${c.washer} finds it in the dark at 6 AM.`}</SheetSub>
      <Field label="Spot" value={v} onChangeText={setV} multiline numberOfLines={2} style={{ minHeight: 64, textAlignVertical: 'top' }} />
      <Btn variant="violet" label="Save" onPress={save} />
    </View>);
  return (
    <View>
      <SheetTitle>{k === 'window' ? 'Wash window' : 'Interior cleaning access'}</SheetTitle>
      <SheetSub>{k === 'window' ? c.washer + ' plans his round around this.' : 'Interior days need the car unlocked.'}</SheetSub>
      <Seg items={opts} value={v} onChange={setV} />
      <Btn variant="violet" label="Save" onPress={save} />
    </View>);
}
function EditName() {
  const [v, setV] = useState(A().name), ink = useInk(), T = useTheme();
  return (
    <View>
      <SheetTitle>Your details</SheetTitle><Gap h={8} />
      <Field label="Name" value={v} onChangeText={setV} autoComplete="name" />
      <Eyebrow style={{ marginBottom: 6 }}>Phone</Eyebrow>
      <View style={{ backgroundColor: T.day ? C.cream : 'rgba(255,255,255,.06)', borderWidth: T.day ? 2.5 : 1.5, borderColor: T.day ? C.ink : ink.line, borderRadius: RAD.ctl, minHeight: 52, justifyContent: 'center', paddingHorizontal: SP.l, marginBottom: SP.l }}>
        <Txt weight={500} size={16} color={ink.fg3}>{`+91 ${fmtPhone(A().phone)} · verified`}</Txt>
      </View>
      <Btn variant="violet" label="Save" onPress={() => { act.setName(v); closeSheet(); }} />
    </View>
  );
}
function Notifs() {
  const c = car(), ok = useInk().ok;
  return (
    <View>
      <SheetTitle>Updates</SheetTitle><Gap h={8} />
      <Rows>
        {c.status === 'new' ? <Row icon="★" tile="rgba(255,186,8,.2)" title="Welcome to Washing Daddy" sub={`${c.washer} comes tomorrow, 6–7:30 AM`} />
          : <Row icon={<Txt weight={800} color={ok}>✓</Txt>} tile="rgba(20,192,138,.15)" title={chipText(c, doc(c))} sub={`Today · ${c.name}`} />}
        {A().payments.slice(-2).reverse().map((p, i) => <Row key={i} icon={<Txt weight={800} color={C.orange}>₹</Txt>} tile="rgba(255,106,26,.16)" title={`Payment received, ${inr(p.amt)}`} sub={`${fmt(p.d)} · ${p.what}`} />)}
        <Row icon={<Txt weight={800} color={C.violet}>✦</Txt>} tile="rgba(84,9,218,.12)" title="Drop 01 is live in the store" sub="Daddy's Own Car Perfume" />
      </Rows>
    </View>
  );
}
const FAQ = [['How early do you come?', 'Between 5:30 and 7:30 AM, before you leave.'], ['What if it rains?', 'We still come. Rainy-day washes focus on glass, rims and interior.'],
  ['Why no pocha?', 'A wet cloth drags dust across the paint and leaves swirl marks. A pressure wash lifts it off.'], ['Can I pay my washer in cash?', 'Yes. He marks it in his app and you get the receipt here.']];
function HelpSheet() {
  const ink = useInk(), T = useTheme();
  return (
    <View>
      <SheetTitle>Talk to Washing Daddy</SheetTitle>
      <SheetSub>WhatsApp or call, 7 AM to 9 PM.</SheetSub>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.l, borderRadius: RAD.card, backgroundColor: ink.tile2, borderWidth: T.day ? 2.5 : 1, borderColor: T.day ? C.ink : ink.line, marginBottom: SP.m }}>
        <Txt weight={800} size={20}>{SUPPORT_PHONE_SHOW}</Txt>
        <Pill gold label="Copy" onPress={() => act.copy('7701808924', 'Number copied')} />
      </View>
      <View style={{ flexDirection: 'row', gap: SP.l, marginBottom: SP.xl }}>
        <Btn variant="violet" label="Call" onPress={act.call} style={{ flex: 1 }} />
        <Btn label="WhatsApp" onPress={() => act.whatsapp()} style={{ flex: 1 }} />
      </View>
      <Rows>{FAQ.map((q, i) => <Row key={i} title={q[0]} sub={q[1]} />)}</Rows>
    </View>
  );
}
function Logout() {
  return (
    <View>
      <SheetTitle>Log out?</SheetTitle>
      <SheetSub>{`Your washes carry on. Sign in again with +91 ${fmtPhone(A().phone)}.`}</SheetSub>
      <Btn variant="violet" label="Log out" onPress={() => { closeSheet(); act.logout().catch(e => toast(e.message)); }} />
      <Btn variant="ghost" label="Stay signed in" onPress={closeSheet} style={{ marginTop: SP.m }} />
    </View>
  );
}
function DeleteAccount() {
  return (
    <View>
      <SheetTitle>Delete account</SheetTitle>
      <SheetSub>We delete your number, your cars and your wash history within 7 days of your request. Your plan stops and anything unused is not refunded.</SheetSub>
      <SheetSub>Tap the button to send the request to us on WhatsApp. You will be signed out.</SheetSub>
      <Btn variant="violet" label="Send delete request on WhatsApp" onPress={() => { closeSheet(); act.deleteAccount().catch(e => toast(e.message)); }} />
      <Btn variant="ghost" label="Keep my account" onPress={closeSheet} style={{ marginTop: SP.m }} />
    </View>
  );
}

/* ---------- the public API ---------- */
export const sheets = {
  payPlan: () => openSheet(<PayPlan />),
  switchPlan: (id: string) => openSheet(<SwitchPlan id={id} />),
  pause: () => {
    const c = car();
    if (c.status === 'new') { toast('You can pause once washes have started'); return; }
    if (!canPause(c)) { openSheet(<NoPause />); return; }
    if (c.paused && c.paused.to >= iso(TODAY)) { toast(`Already paused till ${fmt(c.paused.to)}. Resume it from the Plan tab first.`); return; }
    openSheet(<Pause />);
  },
  note: () => openSheet(<NoteSheet />),
  tip: () => openSheet(<Tip />),
  book: () => openSheet(<Book />),
  track: (docId: string) => openSheet(<TrackSheet id={docId} />),
  bookings: () => openSheet(<Bookings />),
  issue: () => { if (car().status === 'new') { toast('You can report a spot after your first wash'); return; } openSheet(<Issue />); },
  requests: () => openSheet(<Requests />),
  orders: () => openSheet(<Orders />),
  cart: () => openSheet(<Cart />),
  product: (id: string) => openSheet(<Product id={id} />),
  addCar: () => openSheet(<AddCar />),
  editDetail: (k: 'parking' | 'window' | 'keys') => openSheet(<EditDetail k={k} />),
  editName: () => openSheet(<EditName />),
  notifs: () => openSheet(<Notifs />),
  help: () => openSheet(<HelpSheet />),
  logout: () => openSheet(<Logout />),
  deleteAccount: () => openSheet(<DeleteAccount />),
  day: (date: string) => openSheet(<Day date={date} />),
  proof: () => { if (!car().img) { toast('Photos start with your first wash'); return; } openSheet(<Proof />); },
  seePlans: () => { closeSheet(); go('plan'); },
};
sheetHooks.payPlan = sheets.payPlan; sheetHooks.note = sheets.note; sheetHooks.bookings = sheets.bookings; sheetHooks.orders = sheets.orders;

// Money sheets: gift card claim, wallet info tooltip, WD Pass promo popup (Home), pass price breakup. Also the small shared bits the money pages use (skeleton, section card). OWNER: MONEY worker.
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';
import { C } from '../theme';
import { Txt } from '../ui/kit';
import { Close, Check, Gift } from '../ui/icons';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { openSheet, closeSheet, openPage, toast, wallet, act, passQuote, passPlan } from '../state';
import { WALLET } from '../data/reference';
import { G, Tap, PrimaryBtn, inr, TNUM } from '../pages/parts';

const ND = Platform.OS !== 'web';
export const V = C.violet, V_SOFT = '#F1EBFD', V_LINE = '#E1D4FB';
export const rs = (n: number) => { const x = Math.round(n * 100) / 100; return '₹' + x.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(x) ? 0 : 2, maximumFractionDigits: 2 }) };

/** pulsing grey block used for the skeleton loaders */
export function Skel({ w, h = 16, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }), Animated.timing(o, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND })]));
    a.start(); return () => a.stop();
  }, []);
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: '#E8E8EB', opacity: o }, style]} />;
}
/** true for a short moment after the page opens (content then appears; real data is already in state) */
export function useSkeleton(ms = 450) {
  const [on, set] = useState(true);
  useEffect(() => { const t = setTimeout(() => set(false), ms); return () => clearTimeout(t) }, []);
  return on;
}
/** white rounded section card */
export function Sec({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: G.line }, style]}>{children}</View>;
}
export function Diamond() { return <View style={{ width: 7, height: 7, backgroundColor: V, transform: [{ rotate: '45deg' }], marginTop: 7 }} /> }
export function Bullets({ items }: { items: string[] }) {
  return <View style={{ gap: 12 }}>{items.map((t, i) => <View key={i} style={{ flexDirection: 'row', gap: 12 }}><Diamond /><Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 20 }}>{t}</Txt></View>)}</View>;
}

/** 'Claim a gift card': code field -> act.claimGift(code). */
function GiftBody() {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(0);
  const claim = async () => {
    setErr(''); setBusy(true);
    try { setDone(await act.claimGift(code.trim())) } catch (e: any) { setErr(e.message || 'Could not claim this gift card.') }
    setBusy(false);
  };
  if (done) return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: V, alignItems: 'center', justifyContent: 'center' }}><Check size={30} color="#fff" strokeWidth={1.5} /></View>
      <Txt weight={500} size={20} style={{ marginTop: 16 }}>{rs(done)} added</Txt>
      <Txt size={14} color={G.sub} style={{ marginTop: 4, marginBottom: 20 }}>It is now in your {WALLET.name}.</Txt>
      <PrimaryBtn label="Done" onPress={closeSheet} style={{ alignSelf: 'stretch' }} />
    </View>
  );
  return (
    <>
      <SheetTitle>Claim a gift card</SheetTitle>
      <SheetSub>Enter gift card details to claim.</SheetSub>
      <TextInput value={code} onChangeText={t => { setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErr('') }} autoCapitalize="characters" autoCorrect={false} placeholder="Gift card code" placeholderTextColor={G.mute} maxLength={16}
        style={{ height: 52, borderRadius: 12, backgroundColor: G.raised, paddingHorizontal: 16, fontSize: 16, color: G.ink, letterSpacing: 1, borderWidth: 1.5, borderColor: err ? C.red : 'transparent' } as any} />
      {err ? <Txt size={13} color={C.red} style={{ marginTop: 8 }}>{err}</Txt> : null}
      <PrimaryBtn label="Claim" busy={busy} disabled={code.length < 8} onPress={claim} style={{ marginTop: 16 }} />
    </>
  );
}
export function openGiftCard() { openSheet(<GiftBody />) }

/** info (i) next to the balance: WALLET.rules, cash vs promo split, expiringSoon. */
function InfoBody() {
  const w = wallet();
  const Row = ({ a, b, c }: { a: string; b: string; c?: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
      <View style={{ flex: 1 }}><Txt size={14}>{a}</Txt><Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{b}</Txt></View>
      <Txt weight={500} size={14} style={TNUM}>{c}</Txt>
    </View>
  );
  return (
    <>
      <SheetTitle>Using your balance</SheetTitle>
      <SheetSub>{WALLET.name} is for paying for bookings in the app.</SheetSub>
      <View style={{ backgroundColor: G.raised, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 }}>
        <Row a="Cash balance" b="Expires 1 year after it is added" c={rs(w.cash)} />
        <View style={{ height: 1, backgroundColor: G.line }} />
        <Row a="Promotional rewards" b="Expire 15 days after they are credited" c={rs(w.promo)} />
        {w.expiringSoon > 0 ? <><View style={{ height: 1, backgroundColor: G.line }} /><Row a="Expiring in 7 days" b="Use it soon on a booking" c={rs(w.expiringSoon)} /></> : null}
      </View>
      <Bullets items={WALLET.rules} />
      <PrimaryBtn label="Got it" onPress={closeSheet} style={{ marginTop: 20 }} />
    </>
  );
}
export function openWalletInfo() { openSheet(<InfoBody />) }

/** WD Pass launch popup shown over Home (homeConfig().passPromo): 'Book pass now' -> openPage({ k: 'pass' }). */
function PromoBody() {
  const q = passQuote(), p = q.plan;
  return (
    <View>
      <View style={{ backgroundColor: V, borderRadius: 20, padding: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, transform: [{ rotate: '-4deg' }] }}><Txt weight={600} size={13} color="#fff">{p.maxMins} MIN WASH</Txt></View>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, transform: [{ rotate: '3deg' }] }}><Txt weight={600} size={13} color={V}>WD PASS</Txt></View>
        </View>
        <Txt weight={500} size={22} color="#fff">{p.visits} washes for {inr(p.price)}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Txt size={14} color="rgba(255,255,255,0.7)" style={{ textDecorationLine: 'line-through' }}>{inr(p.mrp)}</Txt>
          <Txt size={14} color="rgba(255,255,255,0.85)">{p.days} days validity</Txt>
        </View>
      </View>
      <PrimaryBtn label="Book Pass Now" onPress={() => { closeSheet(); setTimeout(() => openPage({ k: 'pass' }), 250) }} style={{ marginTop: 16 }} />
      <Pressable onPress={closeSheet} accessibilityLabel="Close" style={{ alignItems: 'center', paddingVertical: 14 }}><Txt size={14} color={G.mute}>Not now</Txt></Pressable>
    </View>
  );
}
export function openPassPromo() { openSheet(<PromoBody />) }

/** 'Total amount' dropdown on the Pass checkout bar: passQuote(id) price + GST = total. */
function BreakupBody({ id }: { id?: string }) {
  const q = passQuote(id), p = passPlan(id);
  const R = ({ a, b, bold, strike, pos }: { a: string; b: string; bold?: boolean; strike?: boolean; pos?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Txt weight={bold ? 500 : 400} size={bold ? 16 : 14} color={bold ? G.ink : G.sub}>{a}</Txt>
      <Txt weight={bold ? 500 : 400} size={bold ? 16 : 14} color={pos ? G.pos : strike ? G.mute : G.ink} style={[TNUM, strike ? { textDecorationLine: 'line-through' } : null]}>{b}</Txt>
    </View>
  );
  return (
    <>
      <SheetTitle>Price breakup</SheetTitle>
      <SheetSub>{p.name} · {p.visits} visits · {p.days} days</SheetSub>
      <R a="Pass price (MRP)" b={rs(q.mrp)} strike />
      <R a={`${p.name} price`} b={rs(q.price)} />
      <R a="You save" b={rs(q.mrp - q.price)} pos />
      <R a="GST" b={rs(q.gst)} />
      <View style={{ height: 1, backgroundColor: G.line, marginVertical: 6 }} />
      <R a="Total amount" b={rs(q.total)} bold />
      <Txt size={12} color={G.mute} style={{ marginTop: 8 }}>That is about {inr(q.perVisit)} per visit before GST.</Txt>
      <PrimaryBtn label="Close" outline onPress={closeSheet} style={{ marginTop: 16 }} />
    </>
  );
}
export function openPassBreakup(id?: string) { openSheet(<BreakupBody id={id} />) }

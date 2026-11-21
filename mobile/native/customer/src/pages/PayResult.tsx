// Payment result: where checkout lands. paid / pending / failed / cancelled, with booking ID, what was booked, amount, how and what happens next.
import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Reanimated, { type SharedValue, useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, withRepeat, cancelAnimation, useAnimatedProps, useReducedMotion, Easing } from 'react-native-reanimated';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Copy, Close } from '../ui/icons';
import { FadeUp, CountUp } from '../ui/motion';
import { RiderTrack } from '../ui/RiderTrack';
import { useApp, act, lastPay, go, openPage, closePage, PayResult as PR } from '../state';
import { inr } from '../data/dates';
import { G, card, Tap, PrimaryBtn, PAGE_BG, TNUM } from './parts';

const AC = Reanimated.createAnimatedComponent(Circle), AP = Reanimated.createAnimatedComponent(Path);
const CONF = [C.violet, C.saffron, '#B79CF2', '#FFD66B', '#8A5CF0', '#FF8FA3'];

function Confetti() {
  const rm = useReducedMotion(), p = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) p.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }); }, []);
  const bits = useMemo(() => Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + (i % 2) * 0.2, d = 70 + (i % 3) * 22; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8 - 6, c: CONF[i % CONF.length], r: i % 2 ? 3 : 2, w: 5 + (i % 3) * 2, rot: i * 40 }; }), []);
  return <>{bits.map((b, i) => <Bit key={i} b={b} p={p} />)}</>;
}
function Bit({ b, p }: { b: any; p: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ opacity: p.value < 0.1 ? p.value * 10 : 1 - Math.max(0, (p.value - 0.6) / 0.4), transform: [{ translateX: b.dx * p.value }, { translateY: b.dy * p.value + p.value * p.value * 26 }, { rotate: `${b.rot + p.value * 360}deg` }] }));
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', width: b.w, height: b.w * 0.45 + 3, borderRadius: b.r, backgroundColor: b.c }, st]} />;
}

function Ring({ delay }: { delay: number }) {
  const rm = useReducedMotion(), p = useSharedValue(0);
  useEffect(() => { if (rm) return; p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)); return () => cancelAnimation(p); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 0.4 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.9 }] }));
  return <Reanimated.View style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(84,9,218,0.35)' }, st]} />;
}

const LEN = 34;
function Badge({ status }: { status: PR['status'] }) {
  const rm = useReducedMotion(), pop = useSharedValue(rm ? 1 : 0), draw = useSharedValue(rm ? 1 : 0), spin = useSharedValue(0);
  useEffect(() => {
    if (!rm) { pop.value = withSpring(1, { damping: 11, stiffness: 160 }); draw.value = withDelay(260, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })); }
    if (status === 'pending' && !rm) spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [status]);
  const popSt = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const spinSt = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const ap = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.value) * LEN * 2 }));
  const bg = status === 'paid' ? C.violet : status === 'pending' ? C.saffron : status === 'failed' ? '#DC2626' : '#737373';
  return (
    <View style={{ width: 200, height: 150, alignItems: 'center', justifyContent: 'center' }}>
      {status === 'paid' ? <><Ring delay={0} /><Ring delay={900} /><Confetti /></> : null}
      <Reanimated.View style={[{ width: 96, height: 96, borderRadius: 48, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', shadowColor: bg, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, popSt]}>
        {status === 'pending' ? (
          <Reanimated.View style={spinSt}><Svg width={48} height={48} viewBox="0 0 48 48"><Circle cx={24} cy={24} r={18} stroke="rgba(23,23,23,0.18)" strokeWidth={5} fill="none" /><Path d="M24 6 A18 18 0 0 1 42 24" stroke="#171717" strokeWidth={5} strokeLinecap="round" fill="none" /></Svg></Reanimated.View>
        ) : (
          <Svg width={56} height={56} viewBox="0 0 56 56">
            {status === 'paid' ? <AP animatedProps={ap} d="M15 29 L24 38 L41 18" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={LEN * 2} />
              : <AP animatedProps={ap} d="M18 18 L38 38 M38 18 L18 38" stroke="#fff" strokeWidth={6} strokeLinecap="round" fill="none" strokeDasharray={LEN * 2} />}
          </Svg>
        )}
      </Reanimated.View>
    </View>
  );
}

const bookRef = (r: PR) => r.bookingId ? (/^[A-Za-z]{1,3}-/.test(r.bookingId) ? r.bookingId : r.bookingId.toUpperCase()) : r.orderId || '';
const Line = ({ k, v, copy, strong, count }: { k: string; v: string; copy?: boolean; strong?: boolean; count?: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, minHeight: 32, paddingVertical: 4 }}>
    <Txt size={13} color={G.mute} style={{ width: 96 }}>{k}</Txt>
    <Pressable disabled={!copy} onPress={() => act.copy(v, 'Copied')} style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
      {count ? <CountUp to={v} delay={500} style={[TNUM, { fontFamily: 'Poppins_600SemiBold', fontSize: 16, textAlign: 'right', color: G.ink }]} /> : <Txt weight={strong ? 600 : 500} size={strong ? 16 : 14} style={[TNUM, { textAlign: 'right', flexShrink: 1 }]}>{v}</Txt>}
      {copy ? <Copy size={14} color={G.mute} strokeWidth={1.5} /> : null}
    </Pressable>
  </View>
);

export default function PayResult() {
  useApp();
  const ins = useInsets(), r = lastPay();
  const eta = useMemo(() => Date.now() + 15 * 60000, []);
  if (!r) return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Txt weight={600} size={20}>Nothing to show here</Txt>
      <Txt size={14} color={G.sub} style={{ marginTop: 6, textAlign: 'center' }}>Your bookings and payments are in the Washes tab.</Txt>
      <PrimaryBtn label="Back" onPress={closePage} style={{ marginTop: 20, alignSelf: 'stretch' }} />
    </View>
  );
  const ok = r.status === 'paid', pend = r.status === 'pending', bad = !ok && !pend;
  const isBooking = r.kind === 'booking', id = bookRef(r);
  const head = ok ? (isBooking ? 'Booking confirmed' : r.kind === 'pass' ? 'Pass activated' : r.kind === 'wallet' ? 'Money added' : 'Payment successful')
    : pend ? 'Confirming your payment…' : r.status === 'cancelled' ? 'Payment cancelled' : 'Payment failed';
  const sub = ok ? (r.message || (isBooking ? 'Your washer is being assigned. We will keep you posted here.' : 'All set. Thank you!'))
    : pend ? (r.message || 'Your money is safe. This page updates by itself as soon as the bank confirms, usually within a minute.')
    : (r.message || (r.status === 'cancelled' ? 'No money was taken. You can try again whenever you are ready.' : 'No money was taken. If anything was deducted, it is refunded to your source in 3 to 5 working days.'));
  const how = r.gateway ? (r.gateway === 'Demo' ? 'Demo payment' : r.gateway) : '';
  const when = r.at ? new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '';
  const tint = ok ? C.violet : pend ? '#B07A00' : bad && r.status === 'failed' ? G.neg : G.mute;
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 8, height: ins.top + 56, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Tap label="Close" onPress={() => go('home')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Close size={20} color={G.ink} strokeWidth={1.5} /></Tap>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 32, gap: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <Badge key={r.status + r.at} status={r.status} />
          <FadeUp delay={200}>
            <Txt weight={600} size={24} color={tint} style={{ textAlign: 'center' }}>{head}</Txt>
            <Txt size={14} color={G.sub} style={{ marginTop: 6, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>{sub}</Txt>
          </FadeUp>
        </View>

        {ok && isBooking ? <FadeUp delay={320}><RiderTrack compact progress={0.06} eta={eta} status="upcoming" /></FadeUp> : null}

        <FadeUp delay={380}>
          <View style={card({ padding: 16 })}>
            <Txt weight={500} size={13} color={G.mute} style={{ marginBottom: 6 }}>{ok ? 'RECEIPT' : 'DETAILS'}</Txt>
            {id ? <Line k={isBooking ? 'Booking ID' : 'Order ID'} v={id} copy strong /> : null}
            <Line k={isBooking ? 'Booked' : 'For'} v={r.title} />
            <Line k={ok ? 'Amount paid' : pend ? 'Amount' : 'Amount'} v={inr(r.amount)} strong count />
            {how ? <Line k={ok ? 'Paid via' : 'Via'} v={how} /> : null}
            {r.ref ? <Line k="Payment ref" v={r.ref} copy /> : null}
            {r.orderId && r.orderId !== id ? <Line k="Order" v={r.orderId} copy /> : null}
            {when ? <Line k="Time" v={when} /> : null}
          </View>
        </FadeUp>

        {ok && isBooking ? (
          <FadeUp delay={440}>
            <View style={card({ padding: 16, gap: 10 })}>
              <Txt weight={500} size={15}>What happens next</Txt>
              {['We assign a washer near you', 'The washer rides to your car, reaching in about 15 minutes for instant washes', 'Wash starts on arrival. You can rate it after'].map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={12} color={C.violet}>{i + 1}</Txt></View>
                  <Txt size={13} color={G.sub} style={{ flex: 1, lineHeight: 19 }}>{s}</Txt>
                </View>
              ))}
            </View>
          </FadeUp>
        ) : null}

        <FadeUp delay={500}>
          <View style={{ gap: 12, marginTop: 4 }}>
            {bad ? (
              <>
                <PrimaryBtn label="Try again" onPress={() => (r.retry ? r.retry() : closePage())} />
                {r.backup ? <PrimaryBtn outline label="Pay with Cashfree instead" onPress={() => r.backup!()} /> : null}
                <PrimaryBtn outline label="Chat with us" onPress={() => act.whatsapp(`Hi Washing Daddy, my payment ${r.status === 'cancelled' ? 'was cancelled' : 'failed'}${r.orderId ? ' (order ' + r.orderId + ')' : ''}.`)} />
                <Tap onPress={() => go('home')} style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}><Txt weight={500} size={14} color={G.sub}>Back to home</Txt></Tap>
              </>
            ) : (
              <>
                {r.bookingId ? <PrimaryBtn label="Track your wash" onPress={() => openPage({ k: 'booking', id: r.bookingId! })} /> : null}
                <PrimaryBtn outline={!!r.bookingId} label="Back to home" onPress={() => go('home')} />
              </>
            )}
          </View>
        </FadeUp>
      </ScrollView>
    </View>
  );
}

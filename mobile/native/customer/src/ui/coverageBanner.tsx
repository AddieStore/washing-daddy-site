// Top of Home when the customer's spot (selected address, else GPS) is outside every service circle (state.coverage()).
// Not a dead end: "we are not here yet, but N of 25 neighbours want us", a progress bar toward the 25 cars that open a new area,
// and a Notify me button that moves the bar and rewards the tap (burst, "you're neighbour #N", share with neighbours).
// "Change address" stays for someone who is actually inside an area but picked the wrong address.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withSequence, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Txt } from './kit';
import { Pressable3 } from './motion';
import { act, coverage, notifyState, interest, loadInterest, isGuest, toast, NOT_SERVED_TITLE, feature } from '../state';
import { openAddressPicker } from '../sheets/address';

const V = '#5409DA', INK = '#141414', SUB = '#55555C', OK = '#16a34a', GOLD = '#FFBA08';

function PinSoon() {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M12 21s-6.5-6.1-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.9 12 21 12 21z" stroke={V} strokeWidth={1.8} strokeLinejoin="round" />
        <Circle cx={12} cy={9.8} r={2.4} stroke={V} strokeWidth={1.8} />
      </Svg>
      <View style={{ position: 'absolute', right: -4, top: -4, height: 18, paddingHorizontal: 6, borderRadius: 9, backgroundColor: GOLD, justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Txt weight={700} size={9} color={INK} style={{ lineHeight: 11 }}>SOON</Txt>
      </View>
    </View>
  );
}

/** the goal bar: fills with a spring, a notch every 5 cars, a gold car marker at the end of the fill */
function GoalBar({ near, goal }: { near: number; goal: number }) {
  const rm = !!useReducedMotion(), f = useSharedValue(0), [w, setW] = useState(0);
  useEffect(() => { const to = Math.min(1, near / goal); f.value = rm ? to : withDelay(120, withSpring(to, { damping: 14, stiffness: 90 })) }, [near, goal, rm]);
  const fill = useAnimatedStyle(() => ({ width: Math.max(10, f.value * w) }));
  const mark = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, f.value * w - 12) }] }));
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: 24, justifyContent: 'center' }}>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: '#EFE8FF', overflow: 'hidden' }}>
        <Reanimated.View style={[{ height: 12, borderRadius: 6, backgroundColor: V }, fill]} />
        {[1, 2, 3, 4].map(i => <View key={i} style={{ position: 'absolute', left: `${i * 20}%`, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.7)' }} />)}
      </View>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }, mark]}>
        <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M3 14l2-5h14l2 5v4H3z" fill={INK} /><Circle cx={7.5} cy={18} r={2} fill={INK} stroke={GOLD} strokeWidth={1} /><Circle cx={16.5} cy={18} r={2} fill={INK} stroke={GOLD} strokeWidth={1} /></Svg>
      </Reanimated.View>
    </View>
  );
}

/** a short burst of confetti dots from the bar, played once when the customer joins */
function Burst() {
  const rm = !!useReducedMotion();
  const P = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, d: 34 + (i % 3) * 14, c: [V, GOLD, '#22C55E', '#FF6FA3', '#2E8BFF'][i % 5] }));
  return <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: 8, width: 0, height: 0 }}>{P.map((p, i) => <Dot key={i} p={p} rm={rm} />)}</View>;
}
function Dot({ p, rm }: { p: { a: number; d: number; c: string }; rm: boolean }) {
  const t = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) t.value = withSequence(withTiming(1, { duration: 700 })) }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.value * t.value, transform: [{ translateX: Math.cos(p.a) * p.d * t.value }, { translateY: Math.sin(p.a) * p.d * t.value + 18 * t.value * t.value }, { scale: 1 - t.value * 0.4 }] }));
  return <Reanimated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: p.c }, st]} />;
}

export function CoverageBanner() {
  const c = coverage(), n = notifyState(), [pillW, setPillW] = useState(0), [busy, setBusy] = useState(false), [burst, setBurst] = useState(0);
  const it = interest(), left = Math.max(0, it.goal - it.near), listed = it.joined;
  const was = useRef(listed);
  useEffect(() => { if (c.known && !c.ok) void loadInterest() }, [c.known, c.known ? c.lat : 0, c.known ? c.lng : 0]);
  useEffect(() => { if (listed && !was.current) setBurst(b => b + 1); was.current = listed }, [listed]);
  if (!c.known || c.ok || !feature('notify')) return null;   // HQ switch: the 'not in your area yet' card and Count me in
  const notify = async () => {
    if (isGuest()) { act.askLogin(); return }
    setBusy(true);
    try { const r = await act.notifyMe(); if (r !== 'saved') toast("Saved. We'll add you as soon as you're online.") }
    catch (e: any) { toast((e && e.message) || "That didn't go through. Try again.") }
    setBusy(false);
  };
  const invite = () => { void Share.share({ message: `Washing Daddy is coming to ${c.label || 'our area'} once ${it.goal} of us sign up for a doorstep car wash. ${it.near} neighbours are in already. Tap Notify me in the app: https://washingdaddy.com` }).catch(() => {}) };
  return (
    <Reanimated.View entering={FadeInDown.duration(380)} accessibilityRole="summary"
      style={{ marginBottom: 18, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(84,9,218,0.14)',
        shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <PinSoon />
        <View style={{ flex: 1 }}>
          <Txt weight={700} size={16} color={INK} style={{ lineHeight: 21 }}>{c.label ? `Not in ${c.label} yet` : NOT_SERVED_TITLE}</Txt>
          <Txt size={13} color={SUB} style={{ marginTop: 4, lineHeight: 19 }}>{listed ? `You're in! ${left ? `${left} more neighbour${left > 1 ? 's' : ''} and we go live here.` : 'We have enough cars here. We are setting up.'}` : `We open a new area at ${it.goal} cars. Add yourself and help bring us here.`}</Txt>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <Txt weight={700} size={13} color={INK} style={{ fontVariant: ['tabular-nums'] }}>{it.near} of {it.goal} neighbours</Txt>
          <Txt weight={600} size={12} color={left ? SUB : OK}>{left ? `${left} to go live` : 'Goal reached'}</Txt>
        </View>
        <GoalBar near={it.near} goal={it.goal} />
        {burst ? <Burst key={burst} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
        {listed ? (
          <>
            <Reanimated.View entering={FadeIn.duration(260)} onLayout={e => setPillW(e.nativeEvent.layout.width)} style={{ flex: 1, minWidth: 0, height: 44, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#EAF7EE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={OK} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              <Txt weight={600} size={13} color={OK} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ lineHeight: 18, textAlign: 'center', flexShrink: 1, includeFontPadding: false }}>{`${pillW && pillW < 180 ? 'Neighbour' : "You're neighbour"} #${Math.max(1, it.near)}`}</Txt>
            </Reanimated.View>
            <Pressable3 onPress={invite} accessibilityRole="button" accessibilityLabel="Tell your neighbours" scaleTo={0.97} style={{ height: 44, paddingHorizontal: 14, flexShrink: 0, alignItems: 'center', borderRadius: 14, backgroundColor: V, justifyContent: 'center' }}>
              <Txt weight={600} size={14} color="#fff">Tell neighbours</Txt>
            </Pressable3>
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}><Pressable3 onPress={notify} disabled={busy} accessibilityRole="button" accessibilityLabel="Notify me when you start in my area" scaleTo={0.97}
              style={{ height: 44, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round" /><Path d="M10 20.5a2 2 0 0 0 4 0" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /></Svg>
                <Txt weight={600} size={14} color="#fff">Count me in</Txt>
              </>}
            </Pressable3></View>
            <Pressable3 onPress={() => openAddressPicker()} accessibilityRole="button" haptics={false} scaleTo={0.97} style={{ height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F4F4F5', justifyContent: 'center' }}>
              <Txt weight={600} size={14} color={INK}>Change address</Txt>
            </Pressable3>
          </>
        )}
      </View>
      {listed && n ? <Txt size={12} color={SUB} style={{ marginTop: 10 }}>We will message you the day we start in {c.label || 'your area'}.</Txt> : null}
    </Reanimated.View>
  );
}

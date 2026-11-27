// Home hero story (no photos): a white card on the violet hero that plays what the app does, in three drawn scenes:
// 1 Book in seconds  ->  2 Washer on the way (scooter rides to your pin)  ->  3 Washed, with photo proof (tick draws, plate shows).
// Story bars on top fill over each scene's time; tap the card to skip ahead. Reduced motion: scene 1 only, no auto-advance.
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, LayoutChangeEvent } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, cancelAnimation, useReducedMotion, Easing, FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Txt } from './kit';
import { Zap, Check } from './icons';
import { Scooter, HomePin } from '../sheets/Scooter';
import { Plate } from './Plate';
import { SuccessTick } from './motion';

const V = '#5409DA', INK = '#141414', SUB = '#7A7A80', OK = '#16a34a';
const DUR = 3400;   // ms per scene

function Bar({ i, cur, run }: { i: number; cur: number; run: number }) {
  const rm = useReducedMotion(), p = useSharedValue(i < cur ? 1 : 0);
  useEffect(() => {
    cancelAnimation(p);
    if (i < cur) p.value = 1; else if (i > cur) p.value = 0;
    else { p.value = 0; p.value = rm ? 1 : withTiming(1, { duration: DUR, easing: Easing.linear }) }
  }, [cur, run]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(84,9,218,0.12)', overflow: 'hidden' }}><Reanimated.View style={[{ height: 3, backgroundColor: V, borderRadius: 2 }, st]} /></View>;
}

/* scene 1: booked */
function Booked() {
  const rm = useReducedMotion(), pop = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) pop.value = withDelay(650, withSpring(1, { damping: 9, stiffness: 260, mass: 0.6 })) }, []);
  const chip = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.6 + 0.4 * pop.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#F2ECFF', alignItems: 'center', justifyContent: 'center' }}><Zap size={26} color={V} strokeWidth={2} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={16} color={INK} numberOfLines={1}>Book in 10 seconds</Txt>
        <Txt size={12} color={SUB} numberOfLines={1} style={{ marginTop: 2 }}>Pick a wash, pay, done</Txt>
      </View>
      <Reanimated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: V }, chip]}>
        <Check size={14} color="#fff" strokeWidth={2.6} /><Txt weight={600} size={12} color="#fff">Booked</Txt>
      </Reanimated.View>
    </View>
  );
}

/* scene 2: scooter rides along a dashed road to your pin */
function OnTheWay({ w }: { w: number }) {
  const rm = useReducedMotion(), x = useSharedValue(rm ? 1 : 0), bob = useSharedValue(0);
  const road = Math.max(120, w - 32 - 40);
  useEffect(() => {
    if (rm) return;
    x.value = withTiming(1, { duration: DUR - 500, easing: Easing.bezier(0.3, 0, 0.2, 1) });
    bob.value = withRepeat(withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 180 })), -1, false);
  }, []);
  const sc = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (road - 60) }, { translateY: -1.5 * bob.value }] }));
  const mins = useSharedValue(0);
  const [m, setM] = useState(12);
  useEffect(() => { if (rm) return; const t = setInterval(() => setM(v => (v > 4 ? v - 2 : v)), 650); return () => clearInterval(t) }, []);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt weight={600} size={16} color={INK}>Washer on the way</Txt>
        <Txt weight={700} size={16} color={V} style={{ fontVariant: ['tabular-nums'] }}>{m} min</Txt>
      </View>
      <Txt size={12} color={SUB} style={{ marginTop: 2 }}>Comes to where your car is parked</Txt>
      <View style={{ height: 46, marginTop: 8 }}>
        <Svg width={road + 40} height={46} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={`M6 38 H${road + 14}`} stroke="#ECE6FA" strokeWidth={6} strokeLinecap="round" />
          <Path d={`M6 38 H${road + 14}`} stroke="#C9B8F5" strokeWidth={1.5} strokeDasharray="5 6" />
        </Svg>
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 6 }, sc]}><Scooter scale={0.62} /></Reanimated.View>
        <View style={{ position: 'absolute', left: road + 2, top: 0 }}><HomePin scale={0.72} /></View>
      </View>
    </View>
  );
}

/* scene 3: done, tick draws, the car's plate shows */
function Done() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#EAF7EE', alignItems: 'center', justifyContent: 'center' }}><SuccessTick size={40} color={OK} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={16} color={INK} numberOfLines={1}>Washed, with photo proof</Txt>
        <Txt size={12} color={SUB} numberOfLines={1} style={{ marginTop: 2 }}>After photos in the app</Txt>
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><Plate reg="DL3CAB1234" width={112} /></View>
      </View>
    </View>
  );
}

const STEPS = ['Book', 'On the way', 'Washed'];
export function HeroStory() {
  const rm = useReducedMotion(), [cur, setCur] = useState(0), [run, setRun] = useState(0), [w, setW] = useState(320), t = useRef<any>(null);
  useEffect(() => {
    if (rm) return;
    clearTimeout(t.current); t.current = setTimeout(() => { setCur(c => (c + 1) % 3); setRun(r => r + 1) }, DUR);
    return () => clearTimeout(t.current);
  }, [cur, run, rm]);
  const next = () => { setCur(c => (c + 1) % 3); setRun(r => r + 1) };
  return (
    <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={`How it works, step ${cur + 1} of 3: ${STEPS[cur]}. Tap for the next step.`}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, paddingTop: 12, shadowColor: '#1A0650', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>{STEPS.map((_, i) => <Bar key={i} i={i} cur={cur} run={run} />)}</View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 }}>
        {STEPS.map((s, i) => <Txt key={s} weight={i === cur ? 600 : 500} size={11} color={i === cur ? V : '#A1A1A8'} style={{ flex: 1, textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>{`${i + 1}  ${s}`}</Txt>)}
      </View>
      <View style={{ height: 96, justifyContent: 'center', overflow: 'hidden' }}>
        <Reanimated.View key={cur + ':' + run} entering={rm ? undefined : SlideInRight.duration(380).easing(Easing.bezier(0.22, 1, 0.36, 1))} exiting={rm ? undefined : FadeOut.duration(160)}>
          {cur === 0 ? <Booked /> : cur === 1 ? <OnTheWay w={w} /> : <Done />}
        </Reanimated.View>
      </View>
    </Pressable>
  );
}

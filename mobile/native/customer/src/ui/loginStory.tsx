/* Login story: four short animated scenes (book, ride, wash, proof) that switch by themselves while the customer types
   their number and code. Uses the same WD Partner rider as Home and tracking. UI-thread loops only; static with reduced motion. */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, FadeOut, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { C, SP } from '../theme';
import { Txt } from './kit';
import { RiderArt } from './heroRide';

const SAFF = '#FFBA08', WHITE = '#FFFFFF';
const SLIDES = [
  { t: 'Book in seconds', s: 'Pick a service and a time. Instant or monthly.' },
  { t: 'Your washer rides to you', s: 'Track them live, right to your parking spot.' },
  { t: 'Pressure wash. No pocha.', s: 'Water and power come with the washer.' },
  { t: 'Photo proof, every wash', s: 'See your car shine before you step out.' },
];

/** a 0..1 value that loops forever (or sits at `rest` with reduced motion) */
function useLoop(ms: number, rest = 0.5, delay = 0) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? rest : 0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)) }, [rm]);
  return v;
}
/** a value that eases there and back (bobbing, pulsing) */
function usePulse(ms: number, delay = 0) {
  const rm = useReducedMotion(), v = useSharedValue(0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1, false)) }, [rm]);
  return v;
}
/** plays once after `delay`: 0 -> 1 with a spring */
function usePop(delay = 0) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 140 })) }, [rm]);
  return v;
}

/* ------------------------------------------------------------------ shared art */
function Car({ w, shine }: { w: number; shine?: boolean }) {
  const h = w * 0.42;
  return (
    <Svg width={w} height={h} viewBox="0 0 200 84">
      <Path d="M8 56 Q8 44 24 42 L52 40 Q64 18 90 16 L128 16 Q152 18 164 40 L184 44 Q194 46 194 58 L194 62 Q194 66 190 66 L10 66 Q8 66 8 62Z" fill={shine ? '#FFFFFF' : '#D9CCFA'} />
      <Path d="M62 40 Q70 24 92 23 L124 23 Q142 24 152 40Z" fill="#7C5BE0" opacity={0.85} />
      <Path d="M107 23 L107 40" stroke="#D9CCFA" strokeWidth={3} />
      <Rect x={176} y={48} width={14} height={6} rx={3} fill={SAFF} />
      <Circle cx={54} cy={66} r={14} fill="#1A1033" /><Circle cx={54} cy={66} r={6} fill="#C9BDEB" />
      <Circle cx={146} cy={66} r={14} fill="#1A1033" /><Circle cx={146} cy={66} r={6} fill="#C9BDEB" />
    </Svg>
  );
}
function Pin({ size = 34, color = SAFF }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 32 40">
      <Path d="M16 38 C16 38 4 24 4 15 A12 12 0 0 1 28 15 C28 24 16 38 16 38Z" fill={color} />
      <Circle cx={16} cy={15} r={5} fill="#3A0599" />
    </Svg>
  );
}
function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  const p = usePulse(650, delay), st = useAnimatedStyle(() => ({ opacity: 0.25 + p.value * 0.75, transform: [{ scale: 0.5 + p.value * 0.7 }, { rotate: p.value * 40 + 'deg' }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: s, height: s }, st]}>
      <Svg width={s} height={s} viewBox="0 0 20 20"><Path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6Z" fill="#fff" /></Svg>
    </Animated.View>
  );
}
function Cloud({ x, y, w, delay = 0 }: { x: number; y: number; w: number; delay?: number }) {
  const p = usePulse(3200, delay), st = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 14 }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: w, height: w * 0.36, borderRadius: w, backgroundColor: 'rgba(255,255,255,0.14)' }, st]} />;
}

/* ------------------------------------------------------------------ 1. book */
function SceneBook({ W, H }: { W: number; H: number }) {
  const pop = usePop(250), pin = usePop(700), tick = usePop(1500), press = usePulse(700, 1200), ride = usePop(500);
  const phoneW = 104, phoneH = Math.min(H - 10, 176), px = W / 2 - phoneW - 4;
  const bob = usePulse(900);
  const phoneSt = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: (1 - pop.value) * 24 }] }));
  const pinSt = useAnimatedStyle(() => ({ opacity: Math.min(1, pin.value * 2), transform: [{ translateY: (1 - pin.value) * -40 }, { scale: 0.6 + pin.value * 0.4 }] }));
  const btnSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + press.value * 0.06 }] }));
  const tickSt = useAnimatedStyle(() => ({ opacity: tick.value, transform: [{ scale: 0.4 + tick.value * 0.6 }] }));
  const rideSt = useAnimatedStyle(() => ({ opacity: ride.value, transform: [{ translateX: (1 - ride.value) * 70 }, { translateY: bob.value * -4 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Cloud x={20} y={14} w={70} /><Cloud x={W - 110} y={30} w={90} delay={900} />
      <Animated.View style={[{ position: 'absolute', left: px, top: H - phoneH, width: phoneW, height: phoneH, borderRadius: 20, backgroundColor: WHITE, padding: 10 }, phoneSt]}>
        <View style={{ height: 10, width: 36, borderRadius: 5, backgroundColor: '#EDE5FF', alignSelf: 'center' }} />
        <View style={{ height: 52, borderRadius: 10, backgroundColor: '#EDE5FF', marginTop: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Animated.View style={pinSt}><Pin size={24} /></Animated.View>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F1ECFB', marginTop: 10, width: '80%' }} />
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F1ECFB', marginTop: 6, width: '55%' }} />
        <Animated.View style={[{ marginTop: 'auto', height: 28, borderRadius: 14, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }, btnSt]}>
          <Txt weight={600} size={11} color="#fff" style={{ lineHeight: 14 }}>Book a wash</Txt>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', right: -8, bottom: 26, width: 26, height: 26, borderRadius: 13, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }, tickSt]}>
          <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M2.5 7.5 L5.5 10.5 L11.5 4" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: W / 2 + 14, top: H - 98 }, rideSt]}><RiderArt w={120} /></Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ 2. ride */
function SceneRide({ W, H }: { W: number; H: number }) {
  const road = useLoop(900), city = useLoop(9000), bob = usePulse(420), ring = useLoop(1400), spin = useLoop(500);
  const enter = usePop(200), pinPop = usePop(900);
  const dash = 38, nDash = Math.ceil(W / dash) + 2;
  const roadSt = useAnimatedStyle(() => ({ transform: [{ translateX: -road.value * dash }] }));
  const citySt = useAnimatedStyle(() => ({ transform: [{ translateX: -city.value * 120 }] }));
  const riderSt = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateX: (1 - enter.value) * -90 }, { translateY: bob.value * -3 }] }));
  const ringSt = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 0.6 + ring.value * 1.6 }] }));
  const pinSt = useAnimatedStyle(() => ({ opacity: pinPop.value, transform: [{ translateY: (1 - pinPop.value) * -30 }] }));
  const roadY = H - 38;
  const blds = Array.from({ length: Math.ceil((W + 240) / 40) + 2 }, (_, i) => ({ x: i * 40, h: 26 + ((i * 37) % 44) }));
  return (
    <View style={{ width: W, height: H, overflow: 'hidden' }}>
      <Cloud x={30} y={8} w={80} /><Cloud x={W - 120} y={22} w={100} delay={1200} />
      <Animated.View style={[{ position: 'absolute', left: 0, bottom: 38, width: W + 240, height: 80, flexDirection: 'row' }, citySt]}>
        {blds.map((b, i) => <View key={i} style={{ position: 'absolute', left: b.x, bottom: 0, width: 30, height: b.h, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)' }} />)}
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: roadY, height: 38, backgroundColor: '#2A0F6B' }}>
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <Animated.View style={[{ position: 'absolute', left: 0, top: 17, flexDirection: 'row', width: nDash * dash }, roadSt]}>
          {Array.from({ length: nDash }, (_, i) => <View key={i} style={{ width: 22, height: 4, borderRadius: 2, marginRight: dash - 22, backgroundColor: 'rgba(255,255,255,0.6)' }} />)}
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', right: 28, top: roadY - 56, width: 40, alignItems: 'center' }}>
        <Animated.View style={[{ position: 'absolute', top: 44, width: 30, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,186,8,0.55)' }, ringSt]} />
        <Animated.View style={pinSt}><Pin size={34} /></Animated.View>
      </View>
      <Animated.View style={[{ position: 'absolute', left: W / 2 - 100, top: roadY - 92 }, riderSt]}><RiderArt w={150} spin={spin} /></Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ 3. wash */
function Bubble({ x, size, delay, ms }: { x: number; size: number; delay: number; ms: number }) {
  const p = useLoop(ms, 0.5, delay);
  const st = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.15, 0.8, 1], [0, 0.95, 0.8, 0]), transform: [{ translateY: -p.value * 70 }, { translateX: Math.sin(p.value * 9 + x) * 6 }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, bottom: 0, width: size, height: size, borderRadius: size, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }, st]} />;
}
function Jet({ y, delay }: { y: number; delay: number }) {
  const p = useLoop(520, 0.5, delay);
  const st = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]), transform: [{ translateX: p.value * 40 }, { translateY: p.value * 6 }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: y, width: 34, height: 4, borderRadius: 2, backgroundColor: '#9ED8FF' }, st]} />;
}
function SceneWash({ W, H }: { W: number; H: number }) {
  const carW = Math.min(W - 80, 230), cx = (W - carW) / 2 + 24, cy = H - carW * 0.42 - 10;
  const pop = usePop(150), shake = usePulse(160);
  const carSt = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: (1 - pop.value) * 20 + shake.value * -1.2 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Cloud x={24} y={12} w={70} /><Cloud x={W - 100} y={26} w={84} delay={800} />
      <View style={{ position: 'absolute', left: 8, right: 8, bottom: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <Animated.View style={[{ position: 'absolute', left: cx, top: cy }, carSt]}><Car w={carW} /></Animated.View>
      <View style={{ position: 'absolute', left: cx - 38, top: cy + 6, width: 40, height: 40 }}>
        <Jet y={4} delay={0} /><Jet y={16} delay={170} /><Jet y={28} delay={340} />
      </View>
      <View style={{ position: 'absolute', left: cx, top: cy - 70, width: carW, height: 110 }}>
        {[0.12, 0.28, 0.44, 0.6, 0.76, 0.9].map((f, i) => <Bubble key={i} x={f * carW} size={10 + (i % 3) * 6} delay={i * 380} ms={2200 + (i % 3) * 400} />)}
      </View>
      <View style={{ position: 'absolute', left: cx + carW - 6, top: cy + 22, width: 40, height: 44 }}>
        <Svg width={40} height={44} viewBox="0 0 40 44"><Path d="M6 10 H30 L28 40 Q28 42 26 42 H10 Q8 42 8 40Z" fill={SAFF} /><Path d="M10 10 Q18 -2 28 10" stroke="#fff" strokeWidth={3} fill="none" /><Rect x={13} y={20} width={14} height={10} rx={3} fill="#fff" opacity={0.9} /></Svg>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ 4. proof */
function SceneProof({ W, H }: { W: number; H: number }) {
  const carW = Math.min(W - 120, 210), cx = 24 + (W - 24 - carW) / 2 - 24, cy = H - carW * 0.42 - 10;
  const pop = usePop(150), card = usePop(900), stars = usePop(1500), bob = usePulse(1100);
  const carSt = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: (1 - pop.value) * 20 }] }));
  const cardSt = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: (1 - card.value) * 24 + bob.value * -3 }, { rotate: -4 + card.value * 4 + 'deg' }, { scale: 0.7 + card.value * 0.3 }] }));
  const starSt = useAnimatedStyle(() => ({ opacity: stars.value, transform: [{ scale: 0.4 + stars.value * 0.6 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Cloud x={20} y={14} w={70} />
      <View style={{ position: 'absolute', left: 8, right: 8, bottom: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <Animated.View style={[{ position: 'absolute', left: cx, top: cy }, carSt]}><Car w={carW} shine /></Animated.View>
      <Sparkle x={cx + 20} y={cy - 4} s={18} delay={0} /><Sparkle x={cx + carW * 0.55} y={cy - 12} s={22} delay={300} /><Sparkle x={cx + carW - 10} y={cy + 14} s={14} delay={600} />
      <Animated.View style={[{ position: 'absolute', right: 16, top: 6, width: 104, borderRadius: 16, backgroundColor: '#fff', padding: 8 }, cardSt]}>
        <View style={{ height: 58, borderRadius: 10, backgroundColor: '#EDE5FF', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ marginBottom: 6 }}><Car w={62} shine /></View>
          <Sparkle x={8} y={6} s={12} delay={200} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={11} height={11} viewBox="0 0 14 14"><Path d="M2.5 7.5 L5.5 10.5 L11.5 4" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </View>
          <Txt weight={600} size={11} color="#1A1033" style={{ lineHeight: 14 }}>Wash done</Txt>
        </View>
        <Animated.View style={[{ flexDirection: 'row', gap: 2, marginTop: 5 }, starSt]}>
          {[0, 1, 2, 3, 4].map(i => <Svg key={i} width={14} height={14} viewBox="0 0 20 20"><Path d="M10 1 L12.6 7 L19 7.6 L14.2 11.9 L15.6 18.3 L10 15 L4.4 18.3 L5.8 11.9 L1 7.6 L7.4 7Z" fill={SAFF} /></Svg>)}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ the story */
const SCENES = [SceneBook, SceneRide, SceneWash, SceneProof];
export function LoginStory({ W, H = 190, ms = 3800 }: { W: number; H?: number; ms?: number }) {
  const [i, setI] = useState(0), rm = useReducedMotion();
  useEffect(() => { if (rm) return; const t = setInterval(() => setI(n => (n + 1) % SLIDES.length), ms); return () => clearInterval(t) }, [rm, ms]);
  const Scene = SCENES[i];
  return (
    <View style={{ width: W }}>
      <View style={{ width: W, height: H }}>
        <Animated.View key={i} entering={FadeIn.duration(380)} exiting={FadeOut.duration(260)} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Scene W={W} H={H} />
        </Animated.View>
      </View>
      <View style={{ paddingHorizontal: SP.l + 4, marginTop: SP.m, minHeight: 82 }}>
        <Animated.View key={'t' + i} entering={FadeIn.duration(380).delay(120)} exiting={FadeOut.duration(200)}>
          <Txt weight={700} size={26} color="#fff" style={{ lineHeight: 33 }}>{SLIDES[i].t}</Txt>
          <Txt size={14} color="rgba(255,255,255,0.86)" style={{ lineHeight: 20, marginTop: 4 }}>{SLIDES[i].s}</Txt>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {SLIDES.map((_, k) => <View key={k} style={{ height: 6, width: k === i ? 22 : 6, borderRadius: 3, backgroundColor: k === i ? SAFF : 'rgba(255,255,255,0.4)' }} />)}
        </View>
      </View>
    </View>
  );
}

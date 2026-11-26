/* Welcome flow, after the code: a short "Setting things up for you…" screen and the notifications primer (a lock-screen mock with three
   notification cards that float in one by one and then keep bobbing). Own artwork only. */
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SP } from '../theme';
import { Txt, useInsets, PAD } from './kit';
import { Pressable3, FadeUp, SPRING } from './motion';
import { Car, Gift, Check, Bell, Zap } from './icons';
import { Cta } from './welcome';
import { Backdrop, Car as StoryCar, Person, WASHER, Sparkle, useLoop, usePop } from './loginStory';

const INK = '#1A1033', SEC = '#4F4766', DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Setting things up": the WD Partner waves hello next to a car that shines, over a waking city */
export function SetupScreen() {
  const { width: W, height: H } = useWindowDimensions(), car = usePop(200, true), dots = useLoop(1200);
  const cSt = useAnimatedStyle(() => ({ opacity: car.value, transform: [{ translateY: (1 - car.value) * 20 }] }));
  const dot = (i: number) => useAnimatedStyle(() => ({ opacity: 0.3 + 0.7 * Math.max(0, 1 - Math.abs(((dots.value * 3) % 3) - i)), transform: [{ scale: 0.8 + 0.4 * Math.max(0, 1 - Math.abs(((dots.value * 3) % 3) - i)) }] }));
  const d0 = dot(0), d1 = dot(1), d2 = dot(2), s = Math.min(1.25, W / 360), base = H * 0.64;
  return (
    <View style={{ flex: 1, backgroundColor: '#4B12C9', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}><Backdrop W={W} H={H} tone={1} road /></View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: base - 300, alignItems: 'center' }}>
        <Txt weight={700} size={26} color="#fff" style={{ lineHeight: 34, textAlign: 'center' }}>Setting things up for you…</Txt>
        <Txt size={14} color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>Getting your washers ready</Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>{[d0, d1, d2].map((st, i) => <Animated.View key={i} style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.saffron }, st]} />)}</View>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: H - 36 - 160 * s, height: 160 * s, transform: [{ scale: 1 }] }}>
        <View style={{ position: 'absolute', left: W * 0.5 - 150 * s, top: 0 }}><Person look={WASHER} pose="wave" h={160 * s} /></View>
        <Animated.View style={[{ position: 'absolute', left: W * 0.5 - 40 * s, top: 160 * s - 96 * s * 0.9 }, cSt]}><StoryCar w={220 * s * 0.9} shine /></Animated.View>
        <Sparkle x={W * 0.5 + 10} y={30} s={20} delay={0} /><Sparkle x={W * 0.5 + 120 * s} y={50} s={14} delay={400} />
      </View>
    </View>
  );
}

type Note = { icon: any; tone: string; tint: string; title: string; text: string; when: string };
const NOTES: Note[] = [
  { icon: Car, tone: C.violet, tint: '#EFE8FF', title: 'Washer is on the way', text: 'Arriving in 10 min', when: 'now' },
  { icon: Check, tone: '#16a34a', tint: '#E4F6EA', title: 'Your car is washed', text: 'Photo proof is in the app', when: '2m' },
  { icon: Gift, tone: '#B47B00', tint: '#FFF3D1', title: 'Cashback ₹25 added', text: 'Use it on your next wash', when: '5m' },
];

function NoteCard({ n, i }: { n: Note; i: number }) {
  const rm = useReducedMotion(), a = useSharedValue(0), o = useSharedValue(0), b = useSharedValue(0);
  useEffect(() => {
    if (rm) { a.value = 1; o.value = 1; return; }
    const d = 650 + i * 480;
    a.value = withDelay(d, withSpring(1, { damping: 14, stiffness: 120, mass: 0.9 }));
    o.value = withDelay(d, withTiming(1, { duration: 360 }));
    b.value = withDelay(d + 700, withRepeat(withSequence(withTiming(1, { duration: 1900 + i * 260, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1900 + i * 260, easing: Easing.inOut(Easing.sin) })), -1, false));
  }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - a.value) * 34 + b.value * -4 }, { scale: 0.92 + 0.08 * a.value }] }));
  const Ico = n.icon;
  return (
    <Animated.View style={[{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#1A0650', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 0, borderWidth: 1, borderColor: 'rgba(84,9,218,0.07)' }, st]}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: n.tint, alignItems: 'center', justifyContent: 'center' }}><Ico size={21} color={n.tone} strokeWidth={1.9} /></View>
      <View style={{ flex: 1 }}>
        <Txt weight={600} size={14} color={INK} numberOfLines={1}>{n.title}</Txt>
        <Txt size={12.5} color={SEC} style={{ marginTop: 1 }} numberOfLines={1}>{n.text}</Txt>
      </View>
      <Txt size={11} color="#8A82A3" style={{ alignSelf: 'flex-start', marginTop: 2 }}>{n.when}</Txt>
    </Animated.View>
  );
}

/** the phone: a lock screen cropped at the bottom, with the three cards floating over and past its edges */
function PhoneMock() {
  const d = new Date(), time = String(d.getHours() % 12 || 12) + ':' + String(d.getMinutes()).padStart(2, '0');
  return (
    <View style={{ width: 300, height: 372, alignItems: 'center' }}>
      <View style={{ width: 236, height: 372, borderTopLeftRadius: 38, borderTopRightRadius: 38, overflow: 'hidden', borderWidth: 7, borderBottomWidth: 0, borderColor: '#1A1033', backgroundColor: '#fff' }}>
        <LinearGradient colors={['#E2D6FF', '#F4EFFF', '#FBF9FF']} style={StyleSheet.absoluteFill} />
        <View style={{ alignSelf: 'center', width: 62, height: 18, borderRadius: 9, backgroundColor: '#1A1033', marginTop: 8 }} />
        <Txt weight={500} size={12.5} color={SEC} style={{ textAlign: 'center', marginTop: 14 }}>{DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]}</Txt>
        <Txt weight={700} size={46} color={INK} style={{ textAlign: 'center', lineHeight: 52, letterSpacing: -1 }}>{time}</Txt>
      </View>
      <View style={{ position: 'absolute', top: 122, left: 0, right: 0, paddingHorizontal: 4 }}>
        {NOTES.map((n, i) => <NoteCard key={n.title} n={n} i={i} />)}
      </View>
    </View>
  );
}

/** The phone mock is drawn at 300 x 372. It gets whatever height is left between the headline and the button, and is scaled down
 *  (from its bottom edge) to fit it, so on smaller phones it is never cut off by the headline above or the button below. */
const MOCK_W = 300, MOCK_H = 372;
function PhoneFit() {
  const [h, setH] = useState(0);
  const s = h > 0 ? Math.min(1, (h - SP.l) / MOCK_H) : 0;
  return (
    <View onLayout={e => setH(e.nativeEvent.layout.height)} style={{ flex: 1, marginTop: SP.l, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      {s > 0.3 ? (
        <View style={{ width: MOCK_W * s, height: MOCK_H * s }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: MOCK_W, height: MOCK_H, transform: [{ scale: s }], transformOrigin: '0px 0px' }}><PhoneMock /></View>
        </View>
      ) : null}
      {/* the phone is cropped at the bottom on purpose: fade its lower edge into the page so the crop looks deliberate */}
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', C.page]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 }} />
    </View>
  );
}

/** Skip top right, headline, the phone mock, a big CTA. onAllow runs the system ask; onSkip just moves on. */
export function NotifPrimer({ onAllow, onSkip, busy }: { onAllow: () => void; onSkip: () => void; busy?: boolean }) {
  const ins = useInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.page, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 440 }}>
        <View style={{ paddingTop: ins.top + SP.m, paddingHorizontal: PAD + 4, alignItems: 'flex-end' }}>
          <Pressable3 onPress={onSkip} haptics={false} accessibilityRole="button" accessibilityLabel="Skip notifications" hitSlop={10}
            style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: 'rgba(84,9,218,0.08)' }}>
            <Txt weight={600} size={14} color={C.violet}>Skip</Txt>
          </Pressable3>
        </View>
        <FadeUp style={{ paddingHorizontal: PAD + 8, marginTop: SP.l }}>
          <Txt weight={700} size={28} color={INK} style={{ lineHeight: 36, textAlign: 'center' }}>Know the moment your <Txt weight={700} size={28} color={C.violet}>washer</Txt> arrives</Txt>
          <Txt size={15} color={SEC} style={{ lineHeight: 22, textAlign: 'center', marginTop: SP.s }}>About your washes, photo proof and offers. Nothing else.</Txt>
        </FadeUp>
        <PhoneFit />
        <View style={{ paddingHorizontal: PAD + 4, paddingTop: SP.l, paddingBottom: Math.max(ins.bottom, SP.l) + SP.l, backgroundColor: C.page }}>
          <FadeUp delay={900}>
            <Cta label="Turn on notifications" busy={busy ? 'One moment…' : false} onPress={onAllow} />
            <Txt size={12} color="#6B6483" style={{ textAlign: 'center', marginTop: SP.m }}>You can change this any time in Settings</Txt>
          </FadeUp>
        </View>
      </View>
    </View>
  );
}

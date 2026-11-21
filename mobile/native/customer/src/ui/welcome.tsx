/* Welcome flow pieces (W1): the tilted, endlessly drifting photo collage behind login, the phone field with an animated focus glow,
   the CTA that wakes up from lilac to violet when it can be used, and OTP boxes whose ring follows focus and which pop when filled.
   Everything runs on the UI thread (reanimated) and jumps to its end state with reduced motion. */
import { ReactNode, useEffect } from 'react';
import { Image, Platform, StyleProp, StyleSheet, TextInput, View, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { C, F, SP } from '../theme';
import { Txt } from './kit';
import { Pressable3, SPRING } from './motion';
import { Check } from './icons';
import { src } from '../img';

const LILAC = 'rgba(84,9,218,0.18)', OFF = '#E6E0F5', MUTED = '#6B6483', INK = '#1A1033';
const ANDROID = Platform.OS === 'android';

/* ---------------------------------------------------------------------------------------------------------------- collage */
// our own washer photos only (de-duplicated: several slides are the same shot)
const PHOTOS = ['slide0', 'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6', 'red-foam', 'wipe', 'kit', 'gh9', 'after', 'before', 'proof'] as const;
const RATIOS = [1.28, 1.0, 1.42, 1.12, 1.34, 0.96, 1.2];       // card height / width, varied like a masonry wall
const GAP = 12, CARDS = 7, NCOL = 5;
const SPEEDS = [24, 20, 27, 22, 25];                            // px per second, slow on purpose

function Column({ idx, colW, minH, intro }: { idx: number; colW: number; minH: number; intro: boolean }) {
  const rm = useReducedMotion(), phase = useSharedValue(0), boost = useSharedValue(0);
  const cards = Array.from({ length: CARDS }, (_, k) => ({ key: PHOTOS[(idx * 3 + k * 2 + (k > 3 ? 1 : 0)) % PHOTOS.length], h: Math.round(colW * RATIOS[(k + idx * 2) % RATIOS.length]) }));
  const one = cards.reduce((s, c) => s + c.h + GAP, 0);
  const up = idx % 2 === 0;                                   // alternate columns drift up / down
  useEffect(() => {
    if (rm) return;
    phase.value = withRepeat(withTiming(one, { duration: Math.round(one / SPEEDS[idx % SPEEDS.length] * 1000), easing: Easing.linear }), -1, false);
    // intro: the wall arrives already moving fast and eases to the slow drift over ~1.8s (columns at 1.0 / .85 / 1.15 speed)
    if (intro) boost.value = withTiming(1150 * [1, 0.85, 1.15, 0.9, 1.05][idx % 5], { duration: 1800, easing: Easing.bezier(0.1, 0.8, 0.2, 1) });
  }, [rm, one]);
  const st = useAnimatedStyle(() => {
    const m = (((phase.value + boost.value) % one) + one) % one;
    return { transform: [{ translateY: up ? -m : m - one }] };
  });
  const copies = one >= minH ? 2 : 3;
  const list = Array.from({ length: copies }, () => cards).flat();
  return (
    <View style={{ width: colW, marginRight: GAP, marginTop: [-40, 30, -90, 10, -60][idx % 5] }}>
      <Animated.View style={st}>
        {list.map((c, i) => (
          <View key={i} style={{ width: colW, height: c.h, marginBottom: GAP, borderRadius: 22, overflow: 'hidden', backgroundColor: '#EDE5FF' }}>
            <Image source={src(c.key)!} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** Tilted wall of washer photos that keeps drifting (columns alternate up / down). Fades + settles in on mount. Fill its parent. */
export function WelcomeCollage({ tilt = -12, intro = true }: { tilt?: number; intro?: boolean }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const W = Math.min(sw, 440), colW = Math.round(W * 0.4);
  const cw = NCOL * (colW + GAP), ch = Math.round(sh * 1.5);
  const rm = useReducedMotion(), a = useSharedValue(intro && !rm ? 0 : 1);
  useEffect(() => { if (!rm) a.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); else a.value = 1; }, []);
  const st = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: 1.08 - 0.08 * a.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', alignItems: 'center' }, st]}>
      <View style={{ position: 'absolute', top: (sh - ch) / 2, width: cw, height: ch, overflow: 'hidden', flexDirection: 'row', paddingLeft: GAP / 2, transform: [{ rotate: tilt + 'deg' }] }}>
        {Array.from({ length: NCOL }, (_, i) => <Column key={i} idx={i} colW={colW} minH={ch} intro={intro} />)}
      </View>
    </Animated.View>
  );
}

/** 20px ring spinner for buttons */
function BtnSpinner() {
  const rm = useReducedMotion(), r = useSharedValue(0);
  useEffect(() => { if (!rm) r.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false); }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: r.value + 'deg' }] }));
  return <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }, st]} />;
}

/* ---------------------------------------------------------------------------------------------------------------- CTA */
/** Full-width brand button. Pale lilac while disabled; when it becomes usable the colour eases to violet and the button pops. Press = spring .97 + haptic. */
export function Cta({ label, onPress, disabled, busy, style }: { label: string; onPress?: () => void; disabled?: boolean; busy?: string | boolean; style?: StyleProp<ViewStyle> }) {
  const rm = useReducedMotion(), off = !!disabled || !!busy;
  const on = useSharedValue(disabled ? 0 : 1), pop = useSharedValue(1), first = useSharedValue(1);
  useEffect(() => {
    const target = disabled ? 0 : 1;
    if (first.value) { first.value = 0; on.value = target; return; }
    if (rm) { on.value = target; return; }
    on.value = withTiming(target, { duration: 180, easing: Easing.out(Easing.cubic) });
    if (target) pop.value = withSequence(withSpring(1.045, { damping: 9, stiffness: 520, mass: 0.5 }), withSpring(1, SPRING.release));
  }, [disabled]);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [OFF, C.violet]),
    shadowOpacity: 0.32 * on.value, elevation: ANDROID ? 4 * on.value : 0,
    transform: [{ scale: pop.value }],
  }));
  const white = useAnimatedStyle(() => ({ opacity: on.value }));
  const grey = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  return (
    <Pressable3 onPress={onPress} disabled={off} accessibilityRole="button" accessibilityState={{ disabled: off }} scaleTo={0.97} style={[{ minHeight: 56, borderRadius: 16, opacity: busy ? 0.88 : 1 }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16, shadowColor: C.violet, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }, bg]} />
      <View style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={grey} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden><Txt weight={600} size={16} color={MUTED}>{label}</Txt></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, white]}>{busy ? <BtnSpinner /> : <Txt weight={600} size={16} color="#fff">{label}</Txt>}</Animated.View>
      </View>
    </Pressable3>
  );
}

/* ---------------------------------------------------------------------------------------------------------------- phone field */
/** our own little tricolour: three stripes and a navy wheel (no asset) */
export function Flag() {
  return (
    <View style={{ width: 28, height: 20, borderRadius: 5, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(26,16,51,0.18)' }}>
      <View style={{ flex: 1, backgroundColor: '#FF9933' }} /><View style={{ flex: 1, backgroundColor: '#fff' }} /><View style={{ flex: 1, backgroundColor: '#138808' }} />
      <View style={{ position: 'absolute', left: 11, top: 7, width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: '#000080' }} />
    </View>
  );
}

/** flag + +91 + number. Border and a soft violet glow ease in on focus; a tick pops in when all 10 digits are in. */
export function PhoneField({ value, onChangeText, onSubmit, valid, focusNow }: { value: string; onChangeText: (t: string) => void; onSubmit?: () => void; valid: boolean; focusNow?: boolean }) {
  const rm = useReducedMotion(), f = useSharedValue(0), v = useSharedValue(0);
  useEffect(() => { v.value = rm ? (valid ? 1 : 0) : withSpring(valid ? 1 : 0, SPRING.pop); }, [valid]);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(f.value, v.value), [0, 1], [LILAC, C.violet]),
    backgroundColor: interpolateColor(f.value, [0, 1], [C.canvas, '#fff']),
    shadowOpacity: 0.2 * f.value, transform: [{ scale: 1 + 0.008 * f.value }],
  }));
  const tick = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.4 + 0.6 * v.value }] }));
  const set = (to: number) => { f.value = rm ? to : withTiming(to, { duration: 200, easing: Easing.out(Easing.cubic) }); };
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: SP.l, shadowColor: C.violet, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }, box]}>
      <Flag />
      <Txt weight={500} size={20} color={INK} style={{ lineHeight: 26, includeFontPadding: false } as any}>+91</Txt>
      <View style={{ width: 1, height: 24, backgroundColor: 'rgba(84,9,218,0.16)' }} />
      <TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} onFocus={() => set(1)} onBlur={() => set(0)} autoFocus={focusNow}
        inputMode="numeric" keyboardType="number-pad" maxLength={16} autoComplete="tel-national" textContentType="telephoneNumber"
        placeholder="Mobile number" placeholderTextColor={MUTED} accessibilityLabel="Mobile number"
        style={{ flex: 1, minWidth: 0, fontFamily: F.b500, fontSize: 20, letterSpacing: 0.4, color: INK, lineHeight: 26, paddingTop: 17, paddingBottom: 17, includeFontPadding: false, textAlignVertical: 'center', fontVariant: ['tabular-nums'], outlineStyle: 'none' } as any} />
      <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }, tick]}>
        <Check size={15} color="#fff" strokeWidth={2.6} />
      </Animated.View>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------------------------------------------------------- OTP box */
/** one digit: the ring and a soft glow animate with focus; entering a digit pops the box (tint + 1.08 bounce) */
export function OtpBox({ value, focused, small, inputRef, children, ...input }: {
  value: string; focused: boolean; small?: boolean; inputRef: (r: any) => void; children?: ReactNode;
} & Omit<React.ComponentProps<typeof TextInput>, 'style' | 'value'>) {
  const rm = useReducedMotion(), f = useSharedValue(0), fill = useSharedValue(value ? 1 : 0), s = useSharedValue(1), prev = useSharedValue(value);
  useEffect(() => { f.value = rm ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic) }); }, [focused]);
  useEffect(() => {
    const had = !!prev.value; prev.value = value;
    fill.value = rm ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 160 });
    if (value && !had && !rm) s.value = withSequence(withSpring(1.1, { damping: 8, stiffness: 520, mass: 0.5 }), withSpring(1, SPRING.release));
  }, [value]);
  const st = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(f.value, fill.value), [0, 1], [LILAC, C.violet]),
    backgroundColor: interpolateColor(fill.value, [0, 1], [C.canvas, '#F1EAFF']),
    shadowOpacity: 0.28 * f.value,
    transform: [{ scale: s.value * (1 + 0.04 * f.value) }],
  }));
  return (
    <Animated.View style={[{ flex: 1, maxWidth: 64, height: 68, borderRadius: 16, borderWidth: 1.5, shadowColor: C.violet, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, st]}>
      <TextInput ref={inputRef} value={value} {...input}
        style={{ flex: 1, textAlign: 'center', padding: 0, fontFamily: F.b600, fontSize: small ? 26 : 30, color: INK, fontVariant: ['tabular-nums'], backgroundColor: 'transparent', outlineStyle: 'none' } as any} />
    </Animated.View>
  );
}

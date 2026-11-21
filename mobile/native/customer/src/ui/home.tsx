// Home "punch" pieces (W2): mini map with pulsing markers, ETA chip, live countdown, carousel dots, photo tiles.
// Own images only (src/img.ts). Everything checks reduced motion and jumps to its end state.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, ScrollView, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSpring, useReducedMotion, Easing as REasing, cancelAnimation } from 'react-native-reanimated';
import Svg, { Rect, Path, Circle, Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './kit';
import { Zap } from './icons';
import { IMG } from '../img';
import { Pressable3, SPRING } from './motion';

/** a dot with an expanding ring (reanimated, UI thread) */
export function PulseDot({ x, y, color, size = 9, delay = 0 }: { x: number; y: number; color: string; size?: number; delay?: number }) {
  const rm = useReducedMotion(), v = useSharedValue(0);
  useEffect(() => { if (rm) return; v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1700, easing: REasing.out(REasing.quad) }), -1, false)); return () => cancelAnimation(v) }, [rm]);
  const ring = useAnimatedStyle(() => ({ opacity: rm ? 0 : 0.5 * (1 - v.value), transform: [{ scale: 1 + v.value * 2.6 }] }));
  const r = size * 2.4;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - r / 2, top: y - r / 2, width: r, height: r, alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: color }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color, borderWidth: 2, borderColor: '#fff' }} />
    </View>
  );
}

/** tiny stylised map: two road widths, a park, a pond, you (violet) and two washers (saffron) pulsing */
export function MiniMap({ w = 76, h = 76, radius = 16 }: { w?: number; h?: number; radius?: number }) {
  const sx = w / 76, sy = h / 76;
  return (
    <View style={{ width: w, height: h, borderRadius: radius, overflow: 'hidden', backgroundColor: '#EEF0F6' }}>
      <Svg width={w} height={h} viewBox="0 0 76 76" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Rect x={0} y={0} width={76} height={76} fill="#EEF0F6" />
        <Rect x={46} y={4} width={30} height={26} rx={6} fill="#DDEFD9" />
        <Ellipse cx={14} cy={62} rx={16} ry={9} fill="#D5E6F8" />
        <Path d="M-4 40 L80 30" stroke="#fff" strokeWidth={8} />
        <Path d="M30 -4 L40 80" stroke="#fff" strokeWidth={8} />
        <Path d="M-4 16 L80 20 M-4 62 L80 56 M60 -4 L56 80" stroke="#fff" strokeWidth={3.5} />
        <Path d="M30 -4 L40 80 M-4 40 L80 30" stroke="#E4E2EE" strokeWidth={0.8} strokeDasharray="3 3" />
      </Svg>
      <PulseDot x={36 * sx} y={36 * sy} color="#5409DA" size={10} />
      <PulseDot x={58 * sx} y={50 * sy} color="#FFBA08" size={7} delay={500} />
      <PulseDot x={14 * sx} y={22 * sy} color="#FFBA08" size={7} delay={1000} />
    </View>
  );
}

/** "⚡ 45 min" chip: pulls the first number out of the instant label ("Washer in 45-60 min") */
export function EtaChip({ label, open }: { label: string; open: boolean }) {
  const m = label.match(/(\d+)\s*(?:-|–)?\s*(\d+)?\s*min/i);
  const txt = open && m ? `${m[1]} min` : label;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: open ? 'rgba(84,9,218,0.10)' : '#EDEDF0' }}>
      <Zap size={12} color={open ? '#5409DA' : '#737373'} strokeWidth={2} />
      <Txt weight={600} size={12} color={open ? '#5409DA' : '#737373'} numberOfLines={1} style={{ lineHeight: 16, fontVariant: ['tabular-nums'] }}>{txt}</Txt>
    </View>
  );
}

/** time left until midnight, ticking every second ("05:12:09") */
export function useCountdown() {
  const left = () => { const n = new Date(), e = new Date(n); e.setHours(23, 59, 59, 999); return Math.max(0, Math.floor((e.getTime() - n.getTime()) / 1000)) };
  const [s, setS] = useState(left);
  useEffect(() => { const t = setInterval(() => setS(left()), 1000); return () => clearInterval(t) }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function Dot({ on }: { on: boolean }) {
  const rm = useReducedMotion(), v = useSharedValue(on ? 1 : 0);
  useEffect(() => { v.value = rm ? (on ? 1 : 0) : withSpring(on ? 1 : 0, SPRING.pop) }, [on, rm]);
  const st = useAnimatedStyle(() => ({ width: 6 + 12 * v.value, backgroundColor: v.value > 0.5 ? '#5409DA' : '#D4CBEF' }));
  return <Reanimated.View style={[{ height: 6, borderRadius: 3 }, st]} />;
}
export function Dots({ n, active }: { n: number; active: number }) {
  if (n < 2) return null;
  return <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 10 }}>{Array.from({ length: n }, (_, i) => <Dot key={i} on={i === active} />)}</View>;
}

export type Offer = { key: string; tag: string; title: string; sub: string; cta: string; colors: [string, string]; onPress: () => void; countdown?: boolean };
/** snapping offer carousel with live countdown on the first card and dots underneath */
export function OfferCarousel({ offers }: { offers: Offer[] }) {
  const { width } = useWindowDimensions(), W = Math.min(width, 520), cw = W - 32 - 12, [i, setI] = useState(0), left = useCountdown(), rm = useReducedMotion();
  const ref = useRef<any>(null), held = useRef(false), cur = useRef(0), n = offers.length;
  // auto-advance: 600ms glide, ~2.9s hold; stops for good once the user touches it
  useEffect(() => {
    if (rm || n < 2) return;
    const t = setInterval(() => { if (held.current) return; const nx = (cur.current + 1) % n; ref.current?.scrollTo({ x: nx * (cw + 12), animated: true }) }, 3500);
    return () => clearInterval(t);
  }, [rm, n, cw]);
  if (!offers.length) return null;
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => { const k = Math.max(0, Math.min(offers.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cw + 12)))); cur.current = k; setI(k) };
  return (
    <View style={{ marginTop: 32 }}>
      <ScrollView ref={ref} onScrollBeginDrag={() => { held.current = true }} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cw + 12} snapToAlignment="start" decelerationRate="fast" onScroll={onEnd} scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {offers.map(o => (
          <Pressable3 key={o.key} accessibilityRole="button" accessibilityLabel={o.title} onPress={o.onPress} style={{ width: cw, minHeight: 112, borderRadius: 20, overflow: 'hidden', padding: 16, justifyContent: 'space-between' }}>
            <LinearGradient colors={o.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <View style={{ position: 'absolute', right: -24, top: -34, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.10)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 8, height: 22, justifyContent: 'center' }}><Txt weight={600} size={11} color="#fff" style={{ lineHeight: 15, letterSpacing: 0.5 }}>{o.tag}</Txt></View>
              {o.countdown ? <Txt weight={600} size={12} color="#FFD166" style={{ lineHeight: 16, fontVariant: ['tabular-nums'] }}>Ends in {left}</Txt> : null}
            </View>
            <View style={{ marginTop: 10 }}>
              <Txt weight={600} size={17} color="#fff" style={{ lineHeight: 24 }}>{o.title}</Txt>
              <Txt size={12} color="rgba(255,255,255,0.86)" style={{ lineHeight: 17, marginTop: 2 }}>{o.sub}</Txt>
            </View>
            <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 28, justifyContent: 'center' }}><Txt weight={600} size={12} color="#5409DA" style={{ lineHeight: 16 }}>{o.cta}</Txt></View>
          </Pressable3>
        ))}
      </ScrollView>
      <Dots n={offers.length} active={i} />
    </View>
  );
}

/** rounded photo tiles from our own rounds (horizontal strip) */
const TILES: { k: keyof typeof IMG; cap: string }[] = [
  { k: 'slide0', cap: 'Foam wash' }, { k: 'slide1', cap: 'At your parking' }, { k: 'slide2', cap: 'Tough on mud' }, { k: 'slide4', cap: 'Spotless finish' }, { k: 'slide5', cap: 'Wheels too' },
];
export function PhotoTiles({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <View style={{ marginTop: 32 }}>
      {title}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {TILES.map((t, i) => (
          <View key={t.k} style={{ width: 132, height: 164, borderRadius: 22, overflow: 'hidden', backgroundColor: '#EDE5FF', marginTop: i % 2 ? 14 : 0, marginBottom: i % 2 ? 0 : 14 }}>
            <Image source={IMG[t.k]} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            <LinearGradient colors={['rgba(26,16,51,0)', 'rgba(26,16,51,0.72)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 }} />
            <Txt weight={600} size={12} color="#fff" style={{ position: 'absolute', left: 10, bottom: 9, lineHeight: 16 }}>{t.cap}</Txt>
          </View>
        ))}
      </ScrollView>
      {children}
    </View>
  );
}

/** hero photos: cross-fade every ~3s (400ms) with a slow 1.0 -> 1.06 zoom, under a light violet gradient (top + bottom only) */
const HERO_PICS: (keyof typeof IMG)[] = ['red-foam', 'slide1', 'slide0'];
export function HeroPhotos({ opacity = 1, style }: { opacity?: number; style?: any }) {
  const rm = useReducedMotion(), [a, setA] = useState(0), z = useSharedValue(0);
  useEffect(() => {
    if (rm) return;
    const t = setInterval(() => { setA(x => (x + 1) % HERO_PICS.length) }, 3000);
    return () => clearInterval(t);
  }, [rm]);
  useEffect(() => { if (rm) return; z.value = 0; z.value = withTiming(1, { duration: 3400, easing: REasing.linear }) }, [a, rm]);
  const zoom = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * z.value }] }));
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity }, style]}>
      {HERO_PICS.map((k, i) => <Pic key={k} k={k} on={i === a} zoom={zoom} rm={rm} />)}
    </View>
  );
}
function Pic({ k, on, zoom, rm }: { k: keyof typeof IMG; on: boolean; zoom: any; rm: boolean }) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => { o.value = rm ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 400 }) }, [on, rm]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, st]}><Reanimated.View style={[{ flex: 1 }, on ? zoom : null]}><Image source={IMG[k]} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></Reanimated.View></Reanimated.View>;
}

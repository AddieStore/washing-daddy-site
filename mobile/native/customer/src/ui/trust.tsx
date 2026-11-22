// "Washers we vouch for" - a swipeable vetting strip with own-drawn illustrations.
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, withSequence, useReducedMotion, Easing } from 'react-native-reanimated';
import Svg, { Rect, Circle, Path, G, Line, Text as SvgText, Defs, LinearGradient as LG, Stop } from 'react-native-svg';
import { Txt } from './kit';

const V = '#5409DA', INK = '#141414', SEC = '#55555C', LAV = '#F3ECFF', GREEN = '#16A34A';
const shadow = { shadowColor: '#1A1033', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 } as const;

/* ---------- illustrations (viewBox 200 x 120) ---------- */
function IdArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 120">
      {/* PAN-style card behind */}
      <G rotation={-6} origin="70, 60">
        <Rect x="14" y="14" width="124" height="78" rx="9" fill="#CFE6FF" />
        <Rect x="14" y="14" width="124" height="16" rx="9" fill="#9CC8F5" />
        <Rect x="14" y="24" width="124" height="6" fill="#9CC8F5" />
        <Rect x="24" y="40" width="30" height="36" rx="4" fill="#fff" opacity={0.85} />
        <Rect x="64" y="42" width="60" height="5" rx="2.5" fill="#7FB1E6" />
        <Rect x="64" y="54" width="44" height="5" rx="2.5" fill="#7FB1E6" />
        <Rect x="64" y="66" width="52" height="5" rx="2.5" fill="#7FB1E6" />
      </G>
      {/* ID card front */}
      <G rotation={4} origin="105, 78">
        <Rect x="52" y="44" width="124" height="70" rx="9" fill="#fff" stroke="#E4DAF8" strokeWidth="1.5" />
        <Rect x="52" y="44" width="124" height="12" rx="9" fill={V} />
        <Rect x="52" y="50" width="124" height="6" fill={V} />
        <Circle cx="76" cy="78" r="12" fill={LAV} />
        <Circle cx="76" cy="74" r="5" fill={V} />
        <Path d="M66 90 a10 8 0 0 1 20 0 z" fill={V} />
        <Rect x="96" y="68" width="62" height="5" rx="2.5" fill="#D5C6F5" />
        <Rect x="96" y="79" width="46" height="5" rx="2.5" fill="#E6DCFA" />
        <Rect x="60" y="100" width="108" height="4" rx="2" fill="#EEE6FC" />
      </G>
      {/* round stamp */}
      <G rotation={-14} origin="164, 34">
        <Circle cx="164" cy="34" r="25" fill="#fff" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="164" cy="34" r="20" fill="none" stroke={GREEN} strokeWidth="1" strokeDasharray="3 2" />
        <SvgText x="164" y="31" fontSize="7" fontWeight="700" fontFamily="sans-serif" fill={GREEN} textAnchor="middle">POLICE</SvgText>
        <SvgText x="164" y="40" fontSize="7" fontWeight="700" fontFamily="sans-serif" fill={GREEN} textAnchor="middle">CHECKED</SvgText>
        <Path d="M157 46 l5 4 l9 -8" stroke={GREEN} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
function TrainArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 120">
      {/* bubbles */}
      {[[40, 30, 7], [58, 18, 4], [30, 52, 4], [150, 22, 6], [170, 40, 4]].map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#fff" stroke="#C9B0F5" strokeWidth="1.5" />)}
      {/* foam bucket */}
      <Path d="M22 62 h68 l-6 46 a6 6 0 0 1 -6 5 h-44 a6 6 0 0 1 -6 -5 z" fill={V} />
      <Path d="M22 62 h68 l-1.5 12 h-65 z" fill="#7A3AF0" />
      <Path d="M18 62 q6 -20 20 -14 q8 -14 22 -4 q14 -8 22 8 q12 0 12 10 z" fill="#fff" stroke="#DCCBFA" strokeWidth="1.5" />
      <Path d="M24 62 q32 -26 64 0" stroke="#fff" strokeWidth="0" fill="none" />
      <Rect x="40" y="82" width="32" height="6" rx="3" fill="#fff" opacity={0.85} />
      {/* spray gun */}
      <Path d="M112 56 h40 a10 10 0 0 1 10 10 v6 h-18 l-4 6 h-28 z" fill="#2A1A55" />
      <Rect x="150" y="60" width="26" height="9" rx="4" fill="#4B3A7C" />
      <Path d="M122 78 l-6 28 a4 4 0 0 0 4 5 h8 a4 4 0 0 0 4 -4 l2 -29 z" fill="#4B3A7C" />
      <Path d="M130 56 l0 -10 h10 l0 10" fill="#7A3AF0" />
      <Path d="M176 62 l10 -6 M178 66 h14 M176 70 l10 6" stroke={V} strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="196" cy="58" r="2" fill="#B58CF8" /><Circle cx="198" cy="66" r="2.5" fill="#B58CF8" /><Circle cx="195" cy="75" r="2" fill="#B58CF8" />
    </Svg>
  );
}
function StarP({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  return <Path d={`M${p.replace(/ /g, ' L')} Z`} fill={fill} />;
}
function CertArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 120">
      <G rotation={-5} origin="100, 60">
        <Rect x="52" y="10" width="96" height="104" rx="10" fill="#fff" stroke="#DCCBFA" strokeWidth="2" />
        <Rect x="80" y="4" width="40" height="16" rx="6" fill={V} />
        <Circle cx="100" cy="9" r="3" fill="#fff" />
        {[34, 56, 78].map((y, i) => (
          <G key={y}>
            <Circle cx="70" cy={y + 5} r="8" fill={i < 2 ? GREEN : '#E6DCFA'} />
            {i < 2 ? <Path d={`M66 ${y + 5} l3 3 l6 -6`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            <Rect x="86" y={y + 2} width={i === 1 ? 44 : 52} height="6" rx="3" fill="#E4D8FA" />
          </G>
        ))}
        <StarP x={78} y={101} s={8} fill="#F5B50A" /><StarP x={100} y={101} s={8} fill="#F5B50A" /><StarP x={122} y={101} s={8} fill="#F5B50A" />
      </G>
      <StarP x={26} y={30} s={9} fill="#F5B50A" /><StarP x={174} y={86} s={7} fill="#B58CF8" /><StarP x={170} y={26} s={6} fill="#F5B50A" />
    </Svg>
  );
}
function LiveArt({ still }: { still: boolean }) {
  const r = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    r.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [still]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - r.value), transform: [{ scale: 0.8 + r.value * 0.6 }] }));
  return (
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: V }, ring]} />
      <Svg width="100%" height="100%" viewBox="0 0 200 120">
        <Circle cx="100" cy="60" r="40" fill={LAV} stroke={V} strokeWidth="2.5" />
        <Path d="M64 100 a36 30 0 0 1 72 0 a40 40 0 0 1 -72 0 z" fill={V} />
        <Circle cx="100" cy="52" r="15" fill="#F6D2B0" />
        <Path d="M84 50 a16 16 0 0 1 32 0 q-8 -6 -16 -4 q-8 -2 -16 4 z" fill="#2A1A55" />
        <Rect x="82" y="40" width="36" height="6" rx="3" fill="#2A1A55" />
        <Circle cx="94" cy="54" r="1.6" fill={INK} /><Circle cx="106" cy="54" r="1.6" fill={INK} />
        <Path d="M95 60 q5 4 10 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Circle cx="130" cy="86" r="14" fill={GREEN} stroke="#fff" strokeWidth="3" />
        <Path d="M123 86 l5 5 l9 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const STEPS = [
  { n: '1', title: '100% verified onboarding', sub: 'ID and police check done', art: (_s: boolean) => <IdArt />, bg: '#fff' },
  { n: '2', title: 'Trained by professionals', sub: 'Foam, spray and finish', art: (_s: boolean) => <TrainArt />, bg: LAV },
  { n: '3', title: 'Certified through an assessment', sub: 'Pass the test, then wash', art: (_s: boolean) => <CertArt />, bg: '#fff' },
  { n: '4', title: 'Ready to go live', sub: 'Only then at your door', art: (s: boolean) => <LiveArt still={s} />, bg: LAV },
];

/* ---------- animated heading + badge ---------- */
function ShieldBadge({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs><LG id="sg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#7A3AF0" /><Stop offset="1" stopColor={V} /></LG></Defs>
      <Path d="M24 3 L41 9 V23 C41 34 34 41 24 45 C14 41 7 34 7 23 V9 Z" fill="url(#sg)" />
      <Path d="M15.5 24 l6 6 l11 -12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VettedSection({ compact = false }: { compact?: boolean }) {
  const { width: W } = useWindowDimensions();
  const still = useReducedMotion();
  const side = compact ? 16 : 20, cw = Math.min(compact ? 188 : 236, Math.round(W * 0.62)), ch = compact ? 200 : 252, gap = 12, step = cw + gap;
  const [page, setPage] = useState(0);
  const fade = useSharedValue(still ? 1 : 0), pop = useSharedValue(still ? 1 : 0), sweep = useSharedValue(still ? 2 : 0), cards = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    fade.value = withTiming(1, { duration: 520, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    pop.value = withDelay(160, withSpring(1, { damping: 9, stiffness: 160, mass: 0.7 }));
    sweep.value = withDelay(650, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }));
    cards.value = withDelay(250, withTiming(1, { duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [still]);
  const hs = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: (1 - fade.value) * 14 }] }));
  const bs = useAnimatedStyle(() => ({ opacity: pop.value > 0.02 ? 1 : 0, transform: [{ scale: pop.value }, { rotate: `${(1 - pop.value) * -20}deg` }] }));
  const ss = useAnimatedStyle(() => ({ opacity: sweep.value > 0 && sweep.value < 1 ? 0.8 : 0, transform: [{ translateX: -40 + sweep.value * 100 }, { rotate: '20deg' }] }));
  const cs = useAnimatedStyle(() => ({ opacity: cards.value, transform: [{ translateY: (1 - cards.value) * 18 }] }));
  const bsz = compact ? 40 : 52;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.max(0, Math.min(STEPS.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (p !== page) setPage(p);
  };
  return (
    <View style={{ marginTop: compact ? 8 : 36, paddingBottom: compact ? 8 : 12 }}>
      <Reanimated.View style={[{ paddingHorizontal: side, flexDirection: 'row', alignItems: 'center', gap: 14 }, hs]}>
        <View style={{ width: bsz, height: bsz, borderRadius: 14, overflow: 'hidden' }}>
          <Reanimated.View style={[{ width: bsz, height: bsz }, bs]}>
            <ShieldBadge size={bsz} />
            <View style={{ position: 'absolute', inset: 0, overflow: 'hidden' } as any} pointerEvents="none">
              <Reanimated.View style={[{ position: 'absolute', top: -10, left: 0, width: 14, height: bsz + 20, backgroundColor: '#fff' }, ss]} />
            </View>
          </Reanimated.View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={700} size={compact ? 18 : 22} color={INK} style={{ lineHeight: compact ? 24 : 28 }}>Washers we vouch for.</Txt>
          <Txt size={13} color={SEC} style={{ lineHeight: 18, marginTop: 2 }}>Every Washing Daddy washer is checked before the first wash.</Txt>
        </View>
      </Reanimated.View>
      <Reanimated.View style={[{ marginTop: compact ? 14 : 20 }, cs]}>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} snapToInterval={step} snapToAlignment="start" decelerationRate="fast"
          onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingHorizontal: side, paddingVertical: 14, gap }}>
          {STEPS.map(s => (
            <View key={s.n} style={{ width: cw, height: ch, borderRadius: 20, backgroundColor: s.bg, overflow: 'hidden', borderWidth: s.bg === '#fff' ? 1 : 0, borderColor: 'rgba(84,9,218,0.08)', ...shadow }}>
              <Txt weight={800} size={compact ? 52 : 68} color="rgba(84,9,218,0.14)" style={{ position: 'absolute', right: 14, top: 4, lineHeight: compact ? 60 : 78 }}>{s.n}</Txt>
              <View style={{ padding: 16, paddingTop: compact ? 14 : 18 }}>
                <Txt weight={700} size={compact ? 15 : 17} color={INK} style={{ lineHeight: compact ? 20 : 23, maxWidth: cw - 70 }}>{s.title}</Txt>
                <Txt size={12} color={V} weight={600} style={{ marginTop: 4, lineHeight: 16 }}>{s.sub}</Txt>
              </View>
              <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8, height: cw * 0.62 > 140 ? 140 : cw * 0.62 }}>{s.art(!!still)}</View>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2 }}>
          {STEPS.map((s, i) => <View key={s.n} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? V : 'rgba(84,9,218,0.2)' }} />)}
        </View>
      </Reanimated.View>
    </View>
  );
}

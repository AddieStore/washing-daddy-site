// "Washers we vouch for" - a swipeable vetting strip with own-drawn illustrations.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, withSequence, useReducedMotion, Easing } from 'react-native-reanimated';
import Svg, { Rect, Circle, Path, G, Line, Text as SvgText, Defs, LinearGradient as LG, Stop } from 'react-native-svg';
import { Txt } from './kit';
import { src } from '../img';

const V = '#5409DA', INK = '#141414', SEC = '#55555C', LAV = '#F3ECFF', GREEN = '#16A34A';
const shadow = { shadowColor: '#1A1033', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 } as const;

/* ---------- card art: real photos of our own washer + crisp documents (viewBox units are px at a 150 x 120 slot) ---------- */
function Qr({ x, y, s }: { x: number; y: number; s: number }) {
  const rows = ['1110101', '1010011', '1110110', '0001101', '1101011', '0110100', '1011101'], c = s / 7;
  return <G>{rows.map((r, j) => r.split('').map((v, i) => v === '1' ? <Rect key={i + '-' + j} x={x + i * c} y={y + j * c} width={c} height={c} fill="#1B2A3A" /> : null))}</G>;
}
/** ID card pair: a blue Aadhaar-style card behind, our partner ID in front with the washer's photo, and a police-verified stamp */
function IdArt() {
  return (
    <View style={{ width: 132, height: 94 }}><View style={{ position: 'absolute', left: 0, top: 0, width: 168, height: 118, transform: [{ translateX: -18 }, { translateY: -12 }, { scale: 0.79 }] }}>
      <Svg width={168} height={118} viewBox="0 0 168 118" style={{ position: 'absolute' }}>
        <G rotation={-5} origin="70, 50">
          <Rect x="14" y="8" width="118" height="76" rx="6" fill="#69B7E0" />
          <Rect x="14" y="8" width="118" height="14" rx="6" fill="#4FA3D4" />
          <Rect x="14" y="16" width="118" height="6" fill="#4FA3D4" />
          <Rect x="20" y="11" width="22" height="3" rx="1.5" fill="#fff" opacity={0.9} />
          <Rect x="50" y="11" width="40" height="3" rx="1.5" fill="#fff" opacity={0.9} />
          <Qr x={104} y={28} s={21} />
          <Rect x="20" y="30" width="60" height="3.5" rx="1.7" fill="#fff" opacity={0.75} />
          <Rect x="20" y="38" width="44" height="3.5" rx="1.7" fill="#fff" opacity={0.6} />
        </G>
        <G rotation={3} origin="100, 70">
          <Rect x="48" y="30" width="112" height="74" rx="6" fill="#fff" stroke="#E3E3EA" strokeWidth="1" />
          <Rect x="48" y="30" width="112" height="14" rx="6" fill={V} />
          <Rect x="48" y="38" width="112" height="6" fill={V} />
          <SvgText x="104" y="40" fontSize="6.4" fontWeight="700" fontFamily="sans-serif" fill="#fff" textAnchor="middle">WASHING DADDY PARTNER</SvgText>
          <Rect x="108" y="50" width="42" height="3.4" rx="1.7" fill="#2B2B33" />
          <Rect x="108" y="58" width="32" height="3" rx="1.5" fill="#B5B5C0" />
          <Rect x="108" y="65" width="38" height="3" rx="1.5" fill="#B5B5C0" />
          <SvgText x="64" y="97" fontSize="6.2" fontWeight="600" fontFamily="sans-serif" fill="#55555C">ID  XXXX XXXX 4821</SvgText>
          <Rect x="104" y="86" width="48" height="2" fill="#D7D7DE" />
        </G>
      </Svg>
      <View style={{ position: 'absolute', left: 58, top: 49, width: 37, height: 45, borderRadius: 4, overflow: 'hidden', backgroundColor: '#E8E8EE', transform: [{ rotate: '3deg' }] }}>
        <Image source={src('washer')!} style={{ width: 37, height: 45 }} resizeMode="cover" />
      </View>
      <Svg width={168} height={118} viewBox="0 0 168 118" style={{ position: 'absolute' }}>
        <G rotation={-12} origin="30, 90">
          <Circle cx="30" cy="90" r="22" fill="#fff" fillOpacity={0.88} stroke="#7E8AA0" strokeWidth="1.6" />
          <Circle cx="30" cy="90" r="17.5" fill="none" stroke="#7E8AA0" strokeWidth="0.8" />
          <SvgText x="30" y="87" fontSize="6.4" fontWeight="800" fontFamily="sans-serif" fill="#5B6781" textAnchor="middle">POLICE</SvgText>
          <SvgText x="30" y="95" fontSize="5.2" fontWeight="700" fontFamily="sans-serif" fill="#5B6781" textAnchor="middle">VERIFIED</SvgText>
          <Path d="M24 100 l4 3.4 l8 -7" stroke={GREEN} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
    </View></View>
  );
}
/** a real photo of our washer at work, filling the right side */
function TrainArt({ h }: { h: number }) {
  return <View style={{ width: 150, height: h, borderTopLeftRadius: 18, overflow: 'hidden', backgroundColor: '#E8E8EE' }}><Image source={src('hero-shirt')!} style={{ width: 150, height: h * 1.25, marginTop: -h * 0.06 }} resizeMode="cover" /></View>;
}
/** certificate, cropped by the card's bottom edge */
function CertArt() {
  return (
    <Svg width={118} height={120} viewBox="0 0 118 120">
      <Rect x="3" y="4" width="112" height="140" rx="3" fill="#FBF8FF" stroke="#E8A8D0" strokeWidth="0" />
      <Rect x="3" y="4" width="112" height="140" rx="3" fill="#FBF8FF" stroke={V} strokeWidth="1.4" />
      <Rect x="8" y="9" width="102" height="130" rx="2" fill="none" stroke="#B79CF0" strokeWidth="0.8" />
      <SvgText x="59" y="26" fontSize="9" fontWeight="800" fontFamily="sans-serif" fill={V} textAnchor="middle">Washing Daddy</SvgText>
      <SvgText x="59" y="36" fontSize="6" fontWeight="600" fontFamily="sans-serif" fill="#2B2B33" textAnchor="middle">Certified Washer</SvgText>
      <Rect x="22" y="44" width="74" height="2.4" rx="1.2" fill="#CFC3E8" />
      <Rect x="28" y="51" width="62" height="2.4" rx="1.2" fill="#CFC3E8" />
      <Rect x="24" y="58" width="70" height="2.4" rx="1.2" fill="#CFC3E8" />
      <Path d="M24 88 q6 -10 10 -2 t9 -2 t8 3" stroke="#3B3B46" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Rect x="22" y="94" width="34" height="1" fill="#9A9AA6" />
      <Path d="M82 92 l-5 22 l8 -4 l8 4 l-5 -22 z" fill="#7A3AF0" />
      <Circle cx="82" cy="88" r="12" fill={V} />
      <Circle cx="82" cy="88" r="9" fill="none" stroke="#fff" strokeWidth="0.9" strokeDasharray="2 1.4" />
      <Path d="M77.5 88 l3 3 l6 -6.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
/** our washer in uniform under a soft violet spotlight */
function LiveArt({ h }: { h: number }) {
  const w = h * (380 / 309);
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Defs><LG id="spot" x1="0.5" y1="0" x2="0.5" y2="1"><Stop offset="0" stopColor="#E6D8FF" stopOpacity="0.95" /><Stop offset="1" stopColor="#E6D8FF" stopOpacity="0" /></LG></Defs>
        <Path d="M38 0 L62 0 L88 100 L12 100 Z" fill="url(#spot)" />
      </Svg>
      <Image source={src('washerCut')!} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}

type Step = { n: string; a: string; b: string; c?: string; art: (h: number) => React.ReactNode; flush?: boolean };
const STEPS: Step[] = [
  { n: '1', a: '100% verified', b: ' during onboarding', art: () => <IdArt /> },
  { n: '2', a: 'Trained and groomed by ', b: 'professionals', art: h => <TrainArt h={h} />, flush: true },
  { n: '3', a: 'Certified', b: ' through an assessment', art: () => <CertArt /> },
  { n: '4', a: 'Ready to go live on ', b: 'Washing Daddy', art: h => <LiveArt h={h} /> },
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
  const side = compact ? 16 : 20, num = 30, cw = Math.min(330, Math.round(W - side - 44 - num)), ch = compact ? 134 : 148, gap = 0, step = cw + num;
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
      <Reanimated.View style={[{ marginTop: compact ? 10 : 14 }, cs]}>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} snapToInterval={step} snapToAlignment="start" decelerationRate="fast"
          onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingLeft: side - num + 12, paddingRight: side, paddingVertical: 14 }}>
          {STEPS.map(s => (
            <View key={s.n} style={{ width: step, height: ch, paddingLeft: num }}>
              <Txt weight={800} size={110} color="#ECEBF2" style={{ position: 'absolute', left: -2, bottom: -14, lineHeight: 120 }}>{s.n}</Txt>
              <View style={{ width: cw, height: ch, borderRadius: 22, backgroundColor: '#fff', overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(26,16,51,0.05)', ...shadow }}>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingLeft: 18, paddingRight: 4 }}>
                  <Txt size={compact ? 15 : 17} color={INK} weight={500} style={{ lineHeight: compact ? 21 : 24 }}>
                    <Txt weight={s.n === '2' || s.n === '4' ? 500 : 700} color={s.n === '2' || s.n === '4' ? INK : V} size={compact ? 15 : 17}>{s.a}</Txt>
                    <Txt weight={s.n === '2' || s.n === '4' ? 700 : 500} color={s.n === '2' || s.n === '4' ? V : INK} size={compact ? 15 : 17}>{s.b}</Txt>
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: s.n === '3' || s.n === '4' ? 'flex-end' : 'center', paddingRight: s.flush ? 0 : 8 }}>{s.art(ch)}</View>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 0 }}>
          {STEPS.map((s, i) => <View key={s.n} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? V : 'rgba(84,9,218,0.2)' }} />)}
        </View>
      </Reanimated.View>
    </View>
  );
}

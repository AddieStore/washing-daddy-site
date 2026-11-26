// RiderTrack: a charming vector city scene of a Washing Daddy rider scooting from the hub to your car (not a live map).
// Design coordinates are 190 tall; compact scales the same scene down. Respects reduced motion (static scene, no loops).
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Line, G as SG, Text as SText } from 'react-native-svg';
import Reanimated, { type SharedValue, useSharedValue, useAnimatedStyle, withTiming, withRepeat, cancelAnimation, useReducedMotion, Easing } from 'react-native-reanimated';
import { C } from '../theme';
import { Txt } from './kit';
import { RiderArt } from './heroRide';
import { useActive } from './active';

type Status = 'upcoming' | 'assigned' | 'on_the_way' | 'in_progress' | 'done' | 'cancelled' | string;
export type RiderTrackProps = {
  progress: number;                 // 0..1 along the road
  eta?: string | number | null;     // ISO string or epoch ms
  status?: Status;
  title?: string;                   // overrides the headline (e.g. a scheduled booking far from its slot)
  subtitle?: string;
  compact?: boolean;
};

const RW = 124, RH = Math.round(RW * 204 / 290) + 2;   // washer character size on the road
const DH = 190, ROAD_Y = 162, VIOLET = C.violet, SAFFRON = C.saffron, INK = '#2B1B4D';
const roadY = (x: number) => ROAD_Y + 4 * Math.sin(x / 48);
const roadSlope = (x: number) => (4 / 48) * Math.cos(x / 48);

export const STAGE: Record<string, string> = { upcoming: 'Finding your washer', assigned: 'Washer assigned', on_the_way: 'Washer on the way', in_progress: 'Washing your car', done: 'Wash completed' };
const etaMs = (eta?: string | number | null) => (eta == null ? NaN : typeof eta === 'number' ? eta : Date.parse(eta));
export const minsLeft = (eta?: string | number | null, now = Date.now()) => { const t = etaMs(eta); return Number.isFinite(t) ? Math.max(0, Math.ceil((t - now) / 60000)) : null; };
const clock = (ms: number) => { const d = new Date(ms + 5.5 * 3600e3), h = d.getUTCHours(), m = d.getUTCMinutes(); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** one tile of skyline, DW wide, standing on y=base */
function Skyline({ w, base, seed, minH, maxH, fill, win, lit }: { w: number; base: number; seed: number; minH: number; maxH: number; fill: string; win: string; lit: number }) {
  const els = useMemo(() => {
    const r = rng(seed), out: React.ReactNode[] = [];
    let x = -6, i = 0;
    while (x < w + 6) {
      const bw = 20 + Math.round(r() * 20), bh = minH + Math.round(r() * (maxH - minH));
      out.push(<Rect key={'b' + i} x={x} y={base - bh} width={bw} height={bh + 2} rx={2} fill={fill} />);
      if (r() > 0.55) out.push(<Rect key={'a' + i} x={x + bw / 2 - 1} y={base - bh - 8} width={2} height={8} fill={fill} />);
      for (let wy = base - bh + 7; wy < base - 8; wy += 9) for (let wx = x + 5; wx < x + bw - 6; wx += 8) {
        const on = r() < lit;
        out.push(<Rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width={3.5} height={4.5} rx={0.8} fill={on ? SAFFRON : win} opacity={on ? 0.95 : 0.5} />);
      }
      x += bw + 2 + Math.round(r() * 4); i++;
    }
    return out;
  }, [w, base, seed, minH, maxH, fill, win, lit]);
  return <>{els}</>;
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <SG transform={`translate(${x} ${y}) scale(${s})`} opacity={0.92}>
      <Rect x={0} y={10} width={46} height={12} rx={6} fill="#fff" />
      <Circle cx={14} cy={10} r={9} fill="#fff" /><Circle cx={27} cy={7} r={11} fill="#fff" />
    </SG>
  );
}

/** a looping 0..1 clock (stays at 0 under reduced motion) */
function useClock(ms: number, on: boolean) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) { cancelAnimation(v); v.value = 0; return; }
    v.value = 0; v.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(v);
  }, [on, ms]);
  return v;
}

function Wheel({ left, t, mv }: { left: number; t: SharedValue<number>; mv: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 720 * mv.value}deg` }] }));
  return (
    <Reanimated.View style={[{ position: 'absolute', left, top: 43, width: 18, height: 18 }, st]}>
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Circle cx={9} cy={9} r={7.5} fill="#fff" stroke={INK} strokeWidth={3} />
        <Line x1={9} y1={2.5} x2={9} y2={15.5} stroke={INK} strokeWidth={1.2} /><Line x1={2.5} y1={9} x2={15.5} y2={9} stroke={INK} strokeWidth={1.2} />
        <Circle cx={9} cy={9} r={2} fill={SAFFRON} />
      </Svg>
    </Reanimated.View>
  );
}

function Rider({ t, mv }: { t: SharedValue<number>; mv: SharedValue<number> }) {
  const flag = useAnimatedStyle(() => { const s = 0.78 + 0.22 * Math.sin(t.value * Math.PI * 6); return { transform: [{ translateX: -(1 - s) * 10 }, { scaleX: s }, { skewY: `${Math.sin(t.value * Math.PI * 4) * 6}deg` }] }; });
  const lines = [0, 1, 2].map(i => useAnimatedStyle(() => { const p = (t.value * 2 + i / 3) % 1; return { opacity: (1 - p) * 0.8 * mv.value, transform: [{ translateX: -p * 30 }] }; }));
  return (
    <View style={{ width: RW, height: RH }}>
      {lines.map((st, i) => <Reanimated.View key={i} style={[{ position: 'absolute', left: -14, top: 34 + i * 12, width: 18 - i * 3, height: 2.5, borderRadius: 2, backgroundColor: '#fff' }, st]} />)}
      {/* the same WD washer character as the Home hero */}
      <View style={{ position: 'absolute', left: -10, top: 0 }}><RiderArt w={RW} spin={t} /></View>
    </View>
  );
}

function Car({ washing, t }: { washing: boolean; t: SharedValue<number> }) {
  const bub = [0, 1, 2, 3].map(i => useAnimatedStyle(() => { const p = (t.value * 1.5 + i / 4) % 1; return { opacity: washing ? Math.sin(p * Math.PI) : 0, transform: [{ translateY: -p * 38 }, { translateX: Math.sin((p + i) * 6) * 5 }] }; }));
  return (
    <View style={{ width: 70, height: 34 }}>
      {bub.map((st, i) => <Reanimated.View key={i} style={[{ position: 'absolute', left: 10 + i * 14, top: 8, width: 8 + (i % 2) * 3, height: 8 + (i % 2) * 3, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#B79CF2' }, st]} />)}
      <Svg width={70} height={34} viewBox="0 0 70 34">
        <Rect x={4} y={30.5} width={62} height={3} rx={1.5} fill="#1A1033" opacity={0.16} />
        <Path d="M3 26 Q3 18 10 17 L20 16 Q25 7 33 7 H44 Q51 7 55 16 L63 18 Q67 19 67 25 V28 H3 Z" fill="#fff" stroke={VIOLET} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M24 16 Q28 10.5 34 10.5 H43 Q48 10.5 51 16 Z" fill="#DCCBFF" />
        <Line x1={38} y1={11} x2={38} y2={16} stroke="#fff" strokeWidth={1.6} />
        <Rect x={61} y={20} width={5} height={3} rx={1.5} fill={SAFFRON} />
        <Circle cx={17} cy={28} r={5.5} fill={INK} /><Circle cx={17} cy={28} r={2.2} fill="#fff" />
        <Circle cx={53} cy={28} r={5.5} fill={INK} /><Circle cx={53} cy={28} r={2.2} fill="#fff" />
      </Svg>
    </View>
  );
}

function Pin({ t }: { t: SharedValue<number> }) {
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.abs(Math.sin(t.value * Math.PI * 2)) * 5 }] }));
  const ring = useAnimatedStyle(() => { const p = (t.value * 1) % 1; return { opacity: 0.55 * (1 - p), transform: [{ scale: 0.6 + p * 1.4 }] }; });
  return (
    <View style={{ width: 40, height: 56, alignItems: 'center' }}>
      <Reanimated.View style={[{ position: 'absolute', bottom: -2, width: 36, height: 12, borderRadius: 18, backgroundColor: VIOLET }, ring]} />
      <Reanimated.View style={bob}>
        <Svg width={30} height={40} viewBox="0 0 30 40">
          <Path d="M15 38 C15 38 3 24 3 14 A12 12 0 0 1 27 14 C27 24 15 38 15 38 Z" fill={VIOLET} />
          <Circle cx={15} cy={14} r={5.5} fill={SAFFRON} />
        </Svg>
      </Reanimated.View>
    </View>
  );
}

function Scene({ W, progress, status }: { W: number; progress: number; status?: Status }) {
  const rm = !!useReducedMotion() || !useActive();
  const inProg = status === 'in_progress' || status === 'done';
  const t = useClock(1000, !rm), slow = useClock(14000, !rm), far = useClock(40000, !rm), cl = useClock(55000, !rm);
  const mv = useSharedValue(inProg ? 0 : 1), pg = useSharedValue(Math.min(1, Math.max(0, progress)));
  useEffect(() => { const m = inProg ? 0 : 1; mv.value = rm ? m : withTiming(m, { duration: 700 }); }, [inProg, rm]);
  useEffect(() => { const p = Math.min(1, Math.max(0, progress)); pg.value = rm ? p : withTiming(p, { duration: 1400, easing: Easing.inOut(Easing.cubic) }); }, [progress, rm]);
  const DW = W;
  const START = 36, END = Math.max(START + 20, DW - 82 - RW + 6);
  const carX = DW - 82, pinX = DW - 46;

  const road = useMemo(() => { let d = ''; for (let x = -10; x <= DW + 10; x += 10) d += `${x === -10 ? 'M' : 'L'}${x} ${roadY(x).toFixed(1)} `; return d; }, [DW]);
  const dash = (o: number) => { let d = ''; for (let x = -10; x <= DW + 10; x += 10) d += `${x === -10 ? 'M' : 'L'}${x} ${(roadY(x) + o).toFixed(1)} `; return d; };

  const farSt = useAnimatedStyle(() => ({ transform: [{ translateX: -far.value * DW }] }));
  const nearSt = useAnimatedStyle(() => ({ transform: [{ translateX: -slow.value * DW }] }));
  const cloudSt = useAnimatedStyle(() => ({ transform: [{ translateX: -cl.value * DW }] }));
  const riderSt = useAnimatedStyle(() => {
    const x = START + pg.value * (END - START);
    const bounce = -Math.abs(Math.sin(t.value * Math.PI * 4)) * 1.6 * mv.value;
    return { transform: [{ translateX: x }, { translateY: ROAD_Y + 4 * Math.sin((x + 38) / 48) + 10 - RH + bounce }, { rotate: `${Math.atan((4 / 48) * Math.cos((x + 38) / 48)) - Math.sin(t.value * Math.PI * 4) * 0.02 * mv.value}rad` }] };
  });
  const sunSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + Math.sin(t.value * Math.PI * 2) * 0.05 }], opacity: 0.35 + Math.sin(t.value * Math.PI * 2) * 0.1 }));

  const tile = (children: React.ReactNode, style: any, key: string) => (
    <Reanimated.View key={key} pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: DW * 2, height: DH }, style]}>
      <Svg width={DW * 2} height={DH}>
        <SG>{children}</SG>
        <SG transform={`translate(${DW} 0)`}>{children}</SG>
      </Svg>
    </Reanimated.View>
  );

  return (
    <View style={{ width: DW, height: DH, overflow: 'hidden' }}>
      <Svg width={DW} height={DH} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#DCCBFF" /><Stop offset="0.65" stopColor="#F3ECFF" /><Stop offset="1" stopColor="#FFF1CF" /></LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={DW} height={DH} fill="url(#sky)" />
      </Svg>
      {/* sun */}
      <Reanimated.View style={[{ position: 'absolute', left: DW * 0.36 - 36, top: 18, width: 72, height: 72, borderRadius: 36, backgroundColor: SAFFRON }, sunSt]} />
      <Svg width={DW} height={DH} style={{ position: 'absolute' }} pointerEvents="none"><Circle cx={DW * 0.36} cy={54} r={19} fill={SAFFRON} /></Svg>
      {tile(<><Cloud x={DW * 0.08} y={24} s={0.9} /><Cloud x={DW * 0.55} y={40} s={1.15} /><Cloud x={DW * 0.84} y={16} s={0.7} /></>, cloudSt, 'cl')}
      {tile(<Skyline w={DW} base={148} seed={7} minH={46} maxH={92} fill="#C9B6F5" win="#E3D7FA" lit={0.08} />, farSt, 'far')}
      {tile(<Skyline w={DW} base={150} seed={21} minH={26} maxH={58} fill="#9B79E6" win="#B79CF2" lit={0.18} />, nearSt, 'near')}
      {/* hub + road + destination (static) */}
      <Svg width={DW} height={DH} style={{ position: 'absolute' }} pointerEvents="none">
        <Rect x={0} y={150} width={DW} height={DH - 150} fill="#EADFFB" />
        <Path d={road} fill="none" stroke="#C6B2EE" strokeWidth={36} strokeLinejoin="round" />
        <Path d={road} fill="none" stroke="#3A2A63" strokeWidth={30} strokeLinejoin="round" />
        <Path d={dash(-13)} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} />
        <Path d={dash(13)} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} />
        <Path d={road} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeDasharray="9 9" />
        {/* hub shop */}
        <Rect x={2} y={118} width={36} height={34} rx={3} fill={VIOLET} />
        <Rect x={2} y={118} width={36} height={8} rx={3} fill={SAFFRON} />
        <Rect x={9} y={134} width={10} height={18} rx={1.5} fill="#fff" opacity={0.9} /><Rect x={23} y={133} width={9} height={8} rx={1.5} fill="#fff" opacity={0.9} />
        <SText x={20} y={125} fontSize={7} fontWeight="700" fill={VIOLET} textAnchor="middle">WD</SText>
      </Svg>
      <View style={{ position: 'absolute', left: carX, top: 158 - 6, }} pointerEvents="none"><Car washing={status === 'in_progress'} t={t} /></View>
      <View style={{ position: 'absolute', left: pinX - 20, top: 84 }} pointerEvents="none"><Pin t={t} /></View>
      <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: RW, height: RH }, riderSt]} pointerEvents="none"><Rider t={t} mv={mv} /></Reanimated.View>
    </View>
  );
}

export function RiderTrack({ progress, eta, status = 'on_the_way', compact, title, subtitle }: RiderTrackProps) {
  const [W, setW] = useState(360), [now, setNow] = useState(Date.now());
  const active = useActive();
  useEffect(() => { if (!active) return; setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i); }, [active]);
  const s = compact ? 120 / DH : 1, DW = Math.max(240, W / s), H = DH * s;
  const m = minsLeft(eta, now), arrived = status === 'in_progress' || status === 'done';
  const headline = title ? title : arrived ? 'Your washer is here' : m == null ? STAGE[status] || 'On the way' : m <= 0 ? 'Arriving now' : `Arriving in ${m} min`;
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const t = etaMs(eta);
  const sub = subtitle != null ? subtitle : arrived ? 'Washing your car right now' : Number.isFinite(t) ? `${STAGE[status] || 'On the way'} · reaches you by ${clock(t)}` : STAGE[status] || '';
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#1A1033', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: H, overflow: 'hidden' }} accessibilityLabel={`${headline}. ${sub}`}>
        <View style={{ width: DW, height: DH, transform: [{ translateX: -(DW - W) / 2 }, { translateY: -(DH - H) / 2 }, { scale: s }] }}>
          <Scene W={DW} progress={progress} status={status} />
        </View>
        {compact ? (
          <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Txt weight={600} size={12} color={VIOLET}>{headline}</Txt>
          </View>
        ) : null}
      </View>
      {compact ? null : (
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: arrived ? '#16a34a' : SAFFRON }} />
            <Txt weight={500} size={12} color="#737373">{(STAGE[status] || 'On the way').toUpperCase()}</Txt>
          </View>
          <Txt weight={600} size={24} style={{ marginTop: 6 }}>{headline}</Txt>
          {sub ? <Txt size={13} color="#525252" style={{ marginTop: 4 }}>{sub}</Txt> : null}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EDE5FF', marginTop: 14, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: VIOLET }} />
          </View>
        </View>
      )}
    </View>
  );
}

export default RiderTrack;

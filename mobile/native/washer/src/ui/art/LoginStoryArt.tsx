// Login story band: three scenes that cross-fade on one Delhi street under a toran of pennants.
//   0 ride  : the washer rides his scooter to the next gate (street, skyline and road dashes slide past)
//   1 wash  : he points the pressure lance at a car, foam pops on the roof, a bucket of suds beside him
//   2 proof : thumbs up next to a photo-proof card with a green tick, a rupee coin pops and floats up
// Flat vector (react-native-svg) + RN Animated only. Reduced motion / `still` freezes every loop and shows the scene at rest.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SText } from 'react-native-svg';
import { C, Cloud, FONT, Loop, ND, RIG_H, RIG_W, RoadDashes, ScooterRig, Skyline, Street, Washer, useLoop, useStill } from './kit';

export const STORY_N = 3;

/** one scene's opacity + a small rise; follows `scene` */
function useScene(i: number, scene: number, rm: boolean) {
  const v = useRef(new Animated.Value(i === scene ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { v.setValue(i === scene ? 1 : 0); return; }
    const a = Animated.timing(v, { toValue: i === scene ? 1 : 0, duration: i === scene ? 520 : 260, delay: i === scene ? 160 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [scene, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };
}

/** the pennant string across the top (the customer app has one too), swaying a hair */
function Toran({ width, rm }: { width: number; rm: boolean }) {
  const sway = useLoop(1900, { rm, reverse: true });
  const n = Math.max(8, Math.round(width / 26));
  const cols = ['#FF9F1C', '#FFFFFF', '#2EC4B6', '#FF6FA3', '#FFBA08'];
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -6, top: 0, width: width + 12, height: 34, transformOrigin: '50% 0%', transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-0.6deg', '0.6deg'] }) }] }}>
      <Svg width={width + 12} height={34}>
        <Path d={`M0 4 Q${(width + 12) / 2} 20 ${width + 12} 4`} stroke="rgba(84,9,218,0.35)" strokeWidth={1.4} fill="none" />
        {Array.from({ length: n }, (_, i) => {
          const t = (i + 0.5) / n, x = t * (width + 12), y = 4 + 16 * (1 - Math.pow(2 * t - 1, 2)) * 0.5;
          return (
            <G key={i}>
              <Path d={`M${x - 7} ${y} L${x + 7} ${y} L${x} ${y + 17}Z`} fill={cols[i % cols.length]} stroke="rgba(84,9,218,0.18)" strokeWidth={0.6} />
              <Circle cx={x} cy={y + 5} r={1.4} fill="rgba(84,9,218,0.35)" />
            </G>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

/** a hatchback, nose to the right: lavender body, deep-violet glass, saffron lamp */
function CarSvg({ w, shine }: { w: number; shine?: boolean }) {
  const h = w * 90 / 220;
  return (
    <Svg width={w} height={h} viewBox="0 0 220 90">
      <Defs><LinearGradient id="lscb" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor={shine ? '#E4D9FF' : '#C9BAF5'} /></LinearGradient></Defs>
      <Ellipse cx={112} cy={86} rx={104} ry={5} fill="#1E0F46" opacity={0.14} />
      <Path d="M6 62 Q6 48 22 45 L56 42 Q70 14 100 12 L142 12 Q170 14 182 42 L204 46 Q216 49 216 62 L216 68 Q216 72 212 72 L10 72 Q6 72 6 68Z" fill="url(#lscb)" />
      <Path d="M70 40 Q78 23 102 21 L124 21 L124 40Z" fill="#5B3FC4" opacity={0.92} /><Path d="M130 21 L144 21 Q162 24 172 40 L130 40Z" fill="#5B3FC4" opacity={0.92} />
      <Path d="M127 22 L127 64" stroke="#B7A6EB" strokeWidth={2} /><Rect x={134} y={46} width={14} height={3.4} rx={1.7} fill="#9C88DB" />
      <Rect x={204} y={50} width={11} height={7} rx={3} fill={C.SAF} /><Rect x={6} y={52} width={7} height={6} rx={2.5} fill="#FF5A5F" />
      {shine ? <Path d="M84 26 L96 26 L82 40 L72 40Z" fill="#fff" opacity={0.7} /> : null}
      {[58, 166].map(cx => <G key={cx}><Circle cx={cx} cy={72} r={17} fill="#1A1033" /><Circle cx={cx} cy={72} r={9} fill="#CFC3F0" /><Circle cx={cx} cy={72} r={3.5} fill="#7B64C9" /></G>)}
    </Svg>
  );
}

/** foam blobs on the car roof and bonnet, popping one after another then resetting */
const FOAM: [number, number, number][] = [[0.34, 0.02, 20], [0.47, -0.04, 24], [0.6, 0.0, 21], [0.72, 0.16, 16], [0.26, 0.3, 17], [0.84, 0.36, 14], [0.5, 0.26, 24], [0.38, 0.44, 15], [0.66, 0.42, 18]];
function FoamBlob({ x, y, r, i, t }: { x: number; y: number; r: number; i: number; t: Animated.Value }) {
  const a = i / FOAM.length * 0.5, b = a + 0.14;
  const s = t.interpolate({ inputRange: [0, a, b, 0.86, 1], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' });
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: r / 2, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E4DAFF', opacity: s, transform: [{ scale: s }] }} />;
}

/** water drops flying from the lance tip to the car */
function Spray({ x0, y0, dx, dy, rm }: { x0: number; y0: number; dx: number; dy: number; rm: boolean }) {
  const t = useLoop(760, { rm });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x0, top: y0 }}>
      {[0, 0.25, 0.5, 0.75].map((o, i) => {
        const p = Animated.modulo(Animated.add(t, o), 1);
        return (
          <Animated.View key={i} style={{ position: 'absolute', width: 7 - (i % 2) * 2, height: 7 - (i % 2) * 2, borderRadius: 4, backgroundColor: i % 2 ? '#BFE3FF' : '#FFFFFF', borderWidth: 1, borderColor: '#9ED0FF',
            opacity: rm ? 0.9 : p.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, dy + 4 * (i % 2)] }) }] }} />
        );
      })}
    </View>
  );
}

/** bucket with suds (viewBox 60 x 64) */
function Bucket({ w, rm }: { w: number; rm: boolean }) {
  const bob = useLoop(1500, { rm, reverse: true });
  return (
    <View style={{ width: w, height: w * 64 / 60 }}>
      <Svg width={w} height={w * 64 / 60} viewBox="0 0 60 64">
        <Ellipse cx={30} cy={60} rx={24} ry={3.4} fill="#1E0F46" opacity={0.12} />
        <Path d="M10 28 L14 58 Q15 61 19 61 L41 61 Q45 61 46 58 L50 28Z" fill={C.SAF} />
        <Path d="M10 28 L12 40 L48 40 L50 28Z" fill="#FFD166" opacity={0.8} />
        <Rect x={21} y={40} width={18} height={9} rx={3} fill="#fff" opacity={0.92} />
        <Text8 />
        <Path d="M9 28 Q30 -6 51 28" stroke={C.DARK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Ellipse cx={30} cy={28} rx={20.5} ry={5} fill="#fff" stroke="#E4DAFF" strokeWidth={1.2} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: w * 0.18, top: -w * 0.18, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}>
        <Svg width={w * 0.7} height={w * 0.34} viewBox="0 0 42 20">
          <Circle cx={10} cy={13} r={8} fill="#fff" stroke="#E4DAFF" strokeWidth={1.2} /><Circle cx={23} cy={9} r={9} fill="#fff" stroke="#E4DAFF" strokeWidth={1.2} />
          <Circle cx={34} cy={14} r={6} fill="#fff" stroke="#E4DAFF" strokeWidth={1.2} />
        </Svg>
      </Animated.View>
    </View>
  );
}
const Text8 = () => <SText x={30} y={47} fontSize={7} fontWeight="700" fill={C.V} textAnchor="middle" fontFamily={FONT}>WD</SText>;

/** photo-proof card: a car photo, a green tick badge and a "BEFORE/AFTER" style strip (viewBox 110 x 92) */
function ProofCard({ w, pop }: { w: number; pop: Animated.Value }) {
  const h = w * 92 / 110;
  return (
    <Animated.View style={{ width: w, height: h, transform: [{ rotate: '-4deg' }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }], opacity: pop }}>
      <Svg width={w} height={h} viewBox="0 0 110 92">
        <Rect x={3} y={5} width={104} height={84} rx={12} fill="#1E0F46" opacity={0.1} />
        <Rect x={2} y={2} width={104} height={84} rx={12} fill="#fff" stroke="#E4DAFF" strokeWidth={1.4} />
        <Rect x={8} y={8} width={92} height={58} rx={8} fill="#F1EAFF" />
        <Circle cx={80} cy={24} r={9} fill={C.SAF} opacity={0.55} />
        <Rect x={8} y={52} width={92} height={14} rx={0} fill="#E3D8FF" /><Rect x={8} y={58} width={92} height={8} rx={0} fill="#D3C2FB" />
        <G transform="translate(18 28) scale(0.34)">
          <Path d="M6 62 Q6 48 22 45 L56 42 Q70 14 100 12 L142 12 Q170 14 182 42 L204 46 Q216 49 216 62 L216 68 Q216 72 212 72 L10 72 Q6 72 6 68Z" fill="#fff" stroke="#B7A6EB" strokeWidth={3} />
          <Path d="M70 40 Q78 23 102 21 L124 21 L124 40Z M130 21 L144 21 Q162 24 172 40 L130 40Z" fill="#5B3FC4" />
          {[58, 166].map(cx => <G key={cx}><Circle cx={cx} cy={72} r={17} fill="#1A1033" /><Circle cx={cx} cy={72} r={8} fill="#CFC3F0" /></G>)}
          <Path d="M150 14 L156 20 L152 26 M158 8 L164 14" stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
        <Rect x={10} y={72} width={44} height={6} rx={3} fill="#E3D8FF" /><Rect x={58} y={72} width={22} height={6} rx={3} fill="#EFE8FF" />
        <Circle cx={92} cy={74} r={13} fill={C.MINT} stroke="#fff" strokeWidth={3} />
        <Path d="M86 74 L90.5 78.5 L98.5 69.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/** a rupee coin that pops, floats up and fades, on a loop */
function Coin({ size, delay, rm }: { size: number; delay: number; rm: boolean }) {
  const t = useLoop(2600, { rm, delay });
  const ph = rm ? 0.35 : undefined;
  const o = ph !== undefined ? 1 : t.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const s = ph !== undefined ? 1 : t.interpolate({ inputRange: [0, 0.12, 0.2, 1], outputRange: [0.2, 1.15, 1, 1] });
  const y = ph !== undefined ? 0 : t.interpolate({ inputRange: [0, 1], outputRange: [10, -34] });
  return (
    <Animated.View style={{ width: size, height: size, opacity: o, transform: [{ translateY: y }, { scale: s }] }}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={16} fill={C.SAF} stroke={C.SAF2} strokeWidth={2} />
        <Circle cx={18} cy={18} r={11.5} fill="none" stroke="#FFE08A" strokeWidth={1.4} />
        <SText x={18} y={24} fontSize={17} fontWeight="700" fill="#7A4A00" textAnchor="middle" fontFamily={FONT}>₹</SText>
      </Svg>
    </Animated.View>
  );
}

export type LoginStoryArtProps = {
  width: number;
  /** band height, default 200 */
  height?: number;
  /** which scene is showing (0 ride, 1 wash, 2 proof) */
  scene?: number;
  dark?: boolean;
  /** freeze all loops (screenshots, low-power) */
  still?: boolean;
};

export const LoginStoryArt = React.memo(function LoginStoryArt({ width, height = 200, scene = 0, dark, still }: LoginStoryArtProps) {
  const rm = useStill(still);
  const kS = height / 232, kc = kS * 0.66, kw = height / 200 * 0.66;
  const roadY = 198 * kS;
  const cx = width / 2;
  const s0 = useScene(0, scene, rm), s1 = useScene(1, scene, rm), s2 = useScene(2, scene, rm);
  const foam = useLoop(3800, { rm: rm || scene !== 1 });
  const pop = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { pop.setValue(1); return; }
    if (scene !== 2) { pop.setValue(0); return; }
    const a = Animated.timing(pop, { toValue: 1, duration: 520, delay: 320, easing: Easing.bezier(0.34, 1.4, 0.64, 1), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [scene, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  const enter = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { enter.setValue(1); return; }
    const a = Animated.timing(enter, { toValue: 1, duration: 800, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [rm]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = !rm && scene === 0;
  // scene geometry
  const carW = Math.min(160, width * 0.41), carH = carW * 90 / 220;
  const carL = cx + 4, carT = roadY + 8 - carH;
  const wsh = { k: kw, l: cx - 150, t: roadY + 5 - 190 * kw };
  const tipX = wsh.l + 158 * kw, tipY = wsh.t + 69 * kw;
  const bucketW = 40 * (height / 200);
  return (
    <View pointerEvents="none" style={{ width, height, overflow: 'hidden' }} accessible accessibilityLabel="Washer riding to a car, washing it, and sending the photo proof">
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="lssky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={dark ? '#2A1E4D' : '#E3D8FF'} /><Stop offset="1" stopColor={dark ? '#1C1534' : '#F7F3FF'} />
        </LinearGradient></Defs>
        <Rect width={width} height={height} fill="url(#lssky)" />
        <Circle cx={width * 0.8} cy={62 * kS} r={36 * kS} fill={C.SAF} opacity={dark ? 0.14 : 0.24} />
        <Circle cx={width * 0.8} cy={62 * kS} r={21 * kS} fill={C.SAF} opacity={dark ? 0.3 : 0.55} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <Loop k={kS} tile={360} ms={60000} h={80} span={width} rm={rm}>{x => <><Cloud x={x + 40} y={50} /><Cloud x={x + 230} y={32} s={0.8} /><Cloud x={x + 310} y={72} s={0.6} /></>}</Loop>
        <Loop k={kS} tile={420} ms={move ? 30000 : 90000} h={200} span={width} rm={rm}>{x => <Skyline x0={x} />}</Loop>
        <Svg width={width} height={height} viewBox={`0 0 ${width / kS} 232`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Rect x={0} y={198} width={width / kS} height={40} fill={C.ROAD} />
          <Rect x={0} y={198} width={width / kS} height={2} fill={C.ROAD2} />
        </Svg>
        <Loop k={kS} tile={400} ms={3200} h={200} span={width} rm={rm || !move}>{x => <Street x0={x} />}</Loop>
        <Loop k={kS} tile={420} ms={3000} h={232} span={width} rm={rm || !move}>{x => <RoadDashes x0={x} />}</Loop>
        {dark ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,12,44,0.42)' }]} /> : null}

        {/* 0: ride */}
        <Animated.View style={[StyleSheet.absoluteFill, s0]}>
          <View style={{ position: 'absolute', left: cx - 56 * kc - 40, top: roadY - 202 * kc }}>
            <Svg width={RIG_W * kc} height={RIG_H * kc} viewBox={`0 0 ${RIG_W} ${RIG_H}`} style={{ position: 'absolute' }}>
              <Path d="M70 202 a110 5 0 0 0 220 0 a110 5 0 0 0 -220 0Z" fill="rgba(30,15,70,0.10)" />
            </Svg>
            <ScooterRig k={kc} mode="ride" rm={rm || scene !== 0} />
          </View>
          <Svg width={26} height={36} viewBox="0 0 26 36" style={{ position: 'absolute', left: width - 52, top: roadY - 44 }}>
            <Path d="M13 34 C13 34 3 21 3 13 a10 10 0 0 1 20 0 C23 21 13 34 13 34 Z" fill={C.V} />
            <Circle cx={13} cy={13} r={4.5} fill={C.SAF} />
          </Svg>
        </Animated.View>

        {/* 1: wash */}
        <Animated.View style={[StyleSheet.absoluteFill, s1]}>
          <View style={{ position: 'absolute', left: wsh.l - bucketW * 0.9, top: roadY + 7 - bucketW * 64 / 60 }}><Bucket w={bucketW} rm={rm || scene !== 1} /></View>
          <View style={{ position: 'absolute', left: wsh.l, top: wsh.t }}>
            <Washer k={wsh.k} pose="lance" rm={rm || scene !== 1} />
          </View>
          <View style={{ position: 'absolute', left: carL, top: carT, width: carW, height: carH }}>
            <CarSvg w={carW} />
            {FOAM.map(([fx, fy, r], i) => <FoamBlob key={i} i={i} t={foam} x={fx * carW - r / 2} y={fy * carH * 0.9 + 2} r={r * carW / 170} />)}
          </View>
          <Spray x0={tipX} y0={tipY} dx={carL + carW * 0.3 - tipX} dy={carT + carH * 0.2 - tipY + 8} rm={rm || scene !== 1} />
        </Animated.View>

        {/* 2: proof */}
        <Animated.View style={[StyleSheet.absoluteFill, s2]}>
          <View style={{ position: 'absolute', left: cx - 150, top: roadY + 5 - 190 * kw }}>
            <Washer k={kw} pose="thumb" rm={rm || scene !== 2} />
          </View>
          <View style={{ position: 'absolute', left: cx - 8, top: roadY - 118 * (height / 200) }}><ProofCard w={118 * (height / 200)} pop={pop} /></View>
          <View style={{ position: 'absolute', left: cx + 96 * (height / 200), top: roadY - 128 * (height / 200) }}><Coin size={32 * (height / 200)} delay={500} rm={rm || scene !== 2} /></View>
          <View style={{ position: 'absolute', left: cx - 26, top: roadY - 112 * (height / 200) }}><Coin size={24 * (height / 200)} delay={1400} rm={rm || scene !== 2} /></View>
        </Animated.View>
        <Toran width={width} rm={rm} />
      </Animated.View>
    </View>
  );
});

// End-of-round celebration: the washer gives a thumbs up beside his kit box and flag, confetti dots fall and twinkle.
import React from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Text as SText } from 'react-native-svg';
import { C, FONT, Layer, ST_H, ST_W, useEnter, useLoop, useStill, Washer } from './kit';

const VB_W = 300, VB_H = 210;
export type DoneArtProps = { width: number; still?: boolean };

const COLORS = [C.V, C.SAF, C.MINT, C.PINK, C.V3, C.SAF3];
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { x: 6 + r(1) * 288, size: 5 + r(2) * 5, color: COLORS[i % COLORS.length], square: i % 3 === 0, ms: 3200 + r(3) * 2200, delay: r(4) * 3000, y0: r(5) * 0.8, rot: (r(6) > 0.5 ? 1 : -1) * (180 + r(7) * 360) };
});
function Piece({ p, k, rm }: { p: (typeof PIECES)[number]; k: number; rm: boolean }) {
  const v = useLoop(p.ms, { rm, delay: p.delay, ease: Easing.linear });
  const s = p.size * k, H = VB_H * k;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: p.x * k, top: 0, width: s, height: p.square ? s * 0.6 : s, borderRadius: p.square ? 1.5 : s / 2, backgroundColor: p.color,
      opacity: rm ? 0.9 : v.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: rm ? p.y0 * H : v.interpolate({ inputRange: [0, 1], outputRange: [-10 * k, H] }) }, { translateX: rm ? 0 : v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10 * k, -6 * k] }) }, { rotate: rm ? '20deg' : v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) }],
    }} />
  );
}
function Star({ k, x, y, s, delay, rm }: { k: number; x: number; y: number; s: number; delay: number; rm: boolean }) {
  const v = useLoop(1300, { rm, delay, reverse: true });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * k, top: y * k, opacity: rm ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] }}>
      <Svg width={s * k} height={s * k} viewBox="0 0 16 16"><Path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4Z" fill={C.SAF} /></Svg>
    </Animated.View>
  );
}

export const DoneArt = React.memo(function DoneArt({ width, still }: DoneArtProps) {
  const rm = useStill(still);
  const k = width / VB_W, enter = useEnter(rm), wk = 0.88 * k, pop = useLoop(1800, { rm, reverse: true });
  return (
    <Animated.View pointerEvents="none" style={[{ width, height: VB_H * k, overflow: 'hidden' }, enter]} accessible accessibilityLabel="Round done, the washer gives a thumbs up">
      <Layer w={VB_W} h={VB_H} k={k}>
        <Circle cx={150} cy={104} r={96} fill="#EEE7FF" /><Circle cx={150} cy={104} r={68} fill="#E4DAFD" />
        <Ellipse cx={150} cy={194} rx={120} ry={7} fill="rgba(30,15,70,0.09)" />
        {/* kit box + flag */}
        <Path d="M236 196 V84" stroke={C.DARK} strokeWidth={2.6} strokeLinecap="round" /><Circle cx={236} cy={83} r={3.2} fill={C.SAF} />
        <Path d="M237 88 C248 84 258 94 274 90 L270 102 L275 113 C260 117 248 109 237 113 Z" fill={C.SAF} />
        <SText x={256} y={104} textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize={9} fill={C.VD}>WD</SText>
        <Rect x={206} y={150} width={60} height={46} rx={8} fill={C.V} /><Rect x={206} y={150} width={60} height={9} rx={4.5} fill={C.V2} /><Rect x={206} y={160} width={60} height={5} fill={C.VD} />
        <Circle cx={236} cy={177} r={11} fill="#fff" />
        <SText x={236} y={181} textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize={10} fill={C.V}>WD</SText>
        {/* bucket */}
        <Path d="M36 168 L66 168 L62 190 C61.6 192.6 60 194 57.4 194 L44.6 194 C42 194 40.4 192.6 40 190 Z" fill={C.SAF} /><Path d="M36 168 L66 168 L65.4 173 L36.6 173 Z" fill={C.SAF2} />
        <Circle cx={41} cy={166} r={5} fill="#fff" /><Circle cx={49} cy={162} r={6.5} fill="#fff" /><Circle cx={58} cy={164} r={5.5} fill="#fff" />
      </Layer>
      <View style={{ position: 'absolute', left: 74 * k, top: (200 - ST_H * 0.88) * k, width: ST_W * wk, height: ST_H * wk }}><Washer k={wk} pose="thumb" rm={rm} /></View>
      <Animated.View style={{ position: 'absolute', left: 168 * k, top: 40 * k, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] }}>
        <Svg width={34 * k} height={34 * k} viewBox="0 0 34 34"><Circle cx={17} cy={17} r={16} fill={C.MINT} /><Path d="M9.5 17.5 L15 23 L25 11.5" stroke="#fff" strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Animated.View>
      <Star k={k} x={50} y={52} s={14} delay={0} rm={rm} /><Star k={k} x={246} y={44} s={11} delay={400} rm={rm} /><Star k={k} x={24} y={118} s={9} delay={800} rm={rm} /><Star k={k} x={272} y={128} s={9} delay={1100} rm={rm} />
      {PIECES.map((p, i) => <Piece key={i} p={p} k={k} rm={rm} />)}
    </Animated.View>
  );
});

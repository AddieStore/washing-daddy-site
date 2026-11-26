// Car-screen header while washing: the washer sprays a car with the pressure lance, foam bubbles float up (animated).
import React from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { C, Cloud, Layer, Skyline, useEnter, useLoop, useStill, Washer, ST_H, ST_W } from './kit';

const VB_W = 360, VB_H = 200;
export type WorkingArtProps = { width: number; height?: number; still?: boolean };

function Bubble({ k, x, y, r, ms, delay, rm }: { k: number; x: number; y: number; r: number; ms: number; delay: number; rm: boolean }) {
  const v = useLoop(ms, { rm, delay, ease: Easing.out(Easing.quad) });
  const s = r * 2 * k;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: (x - r) * k, top: (y - r) * k, width: s, height: s, borderRadius: s / 2, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#CDBBFA',
      opacity: rm ? 0.9 : v.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -46 * k] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6 * k, -2 * k] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }],
    }} />
  );
}
function Drop({ k, from, to, delay, rm }: { k: number; from: [number, number]; to: [number, number]; delay: number; rm: boolean }) {
  const v = useLoop(520, { rm, delay });
  const s = 5 * k;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: from[0] * k, top: from[1] * k, width: s * 1.6, height: s, borderRadius: s, backgroundColor: '#7CC4FF',
      opacity: rm ? 0.8 : v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, (to[0] - from[0]) * k] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, (to[1] - from[1]) * k] }) }, { rotate: '24deg' }],
    }} />
  );
}
function FoamBlob({ k, x, y, r, delay, rm }: { k: number; x: number; y: number; r: number; delay: number; rm: boolean }) {
  const v = useLoop(1600, { rm, delay, reverse: true });
  const s = r * 2 * k;
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: (x - r) * k, top: (y - r) * k, width: s, height: s, borderRadius: s / 2, backgroundColor: '#fff', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }] }} />;
}

export const WorkingArt = React.memo(function WorkingArt({ width, height, still }: WorkingArtProps) {
  const rm = useStill(still);
  const k = width / VB_W, H = height ?? VB_H * k;
  const enter = useEnter(rm);
  const wk = 0.86 * k, gy = 190;               // washer scale, ground line (vb)
  const wx = 6, wy = gy - 190 * 0.86;           // washer box origin in vb
  const sparkle = useLoop(1400, { rm, reverse: true });
  return (
    <View pointerEvents="none" style={{ width, height: H, overflow: 'hidden' }} accessible accessibilityLabel="The washer foam-washing a car">
      <Svg width={width} height={H} viewBox={`0 0 ${VB_W} ${H / k}`} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E3D8FF" /><Stop offset="1" stopColor="#F7F3FF" /></LinearGradient></Defs>
        <Rect width={VB_W} height={H / k} fill="url(#wsky)" />
        <Circle cx={318} cy={34} r={22} fill={C.SAF} opacity={0.25} /><Circle cx={318} cy={34} r={13} fill={C.SAF} opacity={0.55} />
        <Cloud x={30} y={46} s={0.9} o={0.9} /><Cloud x={210} y={30} s={0.7} o={0.9} />
        <G transform="translate(0 -4)"><Skyline x0={-30} /></G>
        <Rect x={0} y={gy + 2} width={VB_W} height={H / k - gy} fill={C.ROAD} />
        <Rect x={0} y={gy + 2} width={VB_W} height={2} fill={C.ROAD2} />
        <Rect x={186} y={198} width={34} height={3.5} rx={1.75} fill="#fff" /><Rect x={256} y={198} width={34} height={3.5} rx={1.75} fill="#fff" /><Rect x={326} y={198} width={34} height={3.5} rx={1.75} fill="#fff" />
        {/* car, nose to the right */}
        <Ellipse cx={252} cy={gy + 3} rx={96} ry={5} fill="rgba(30,15,70,0.12)" />
        <Path d="M158 176 L158 148 C158 140 164 136 172 134 L200 128 C208 112 222 102 240 102 L276 102 C292 102 304 112 312 128 L330 134 C338 136 342 142 342 150 L342 176 Z" fill="#F4F6FB" />
        <Path d="M158 164 H342 V176 H158 Z" fill="#D7DCEA" />
        <Path d="M208 128 C214 114 226 108 240 108 L254 108 L254 128 Z" fill="#8FB8E8" />
        <Path d="M260 108 L276 108 C288 108 298 116 304 128 L260 128 Z" fill="#8FB8E8" />
        <Rect x={253} y={106} width={5} height={24} fill="#F4F6FB" />
        <Path d="M170 150 H336" stroke={C.V} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <Rect x={326} y={140} width={12} height={6} rx={3} fill={C.SAF} /><Rect x={158} y={140} width={8} height={6} rx={3} fill="#FF5A5A" />
        <Rect x={282} y={150} width={14} height={3} rx={1.5} fill="#B9C0D4" />
        {[200, 300].map(x => <G key={x}><Circle cx={x} cy={176} r={17} fill="#1B1230" /><Circle cx={x} cy={176} r={9} fill="#fff" /><Circle cx={x} cy={176} r={3.5} fill="#1B1230" /></G>)}
        {/* bucket by the washer's feet */}
        <Path d="M104 168 L132 168 L129 190 C128.6 192.6 127 194 124.4 194 L111.6 194 C109 194 107.4 192.6 107 190 Z" fill={C.SAF} />
        <Path d="M104 168 L132 168 L131.4 173 L104.6 173 Z" fill={C.SAF2} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width, height: H }, enter]}>
        {/* foam on the car */}
        <FoamBlob k={k} x={236} y={104} r={13} delay={0} rm={rm} /><FoamBlob k={k} x={254} y={98} r={11} delay={300} rm={rm} />
        <FoamBlob k={k} x={274} y={102} r={14} delay={600} rm={rm} /><FoamBlob k={k} x={298} y={120} r={11} delay={200} rm={rm} />
        <FoamBlob k={k} x={216} y={124} r={10} delay={500} rm={rm} /><FoamBlob k={k} x={190} y={134} r={11} delay={100} rm={rm} />
        <FoamBlob k={k} x={246} y={128} r={9} delay={700} rm={rm} /><FoamBlob k={k} x={322} y={134} r={9} delay={400} rm={rm} />
        <FoamBlob k={k} x={170} y={146} r={8} delay={800} rm={rm} />
        <FoamBlob k={k} x={115} y={160} r={9} delay={100} rm={rm} /><FoamBlob k={k} x={127} y={163} r={7} delay={700} rm={rm} />
        <View style={{ position: 'absolute', left: wx * k, top: wy * k, width: ST_W * wk, height: ST_H * wk }}><Washer k={wk} pose="lance" rm={rm} /></View>
        {/* spray from the lance tip (~ vb 140,60) onto the roof and bonnet */}
        <Drop k={k} from={[140, 62]} to={[200, 112]} delay={0} rm={rm} /><Drop k={k} from={[140, 62]} to={[214, 118]} delay={140} rm={rm} />
        <Drop k={k} from={[140, 62]} to={[190, 120]} delay={280} rm={rm} /><Drop k={k} from={[140, 62]} to={[226, 104]} delay={400} rm={rm} />
        {/* rising bubbles */}
        <Bubble k={k} x={196} y={92} r={4.5} ms={2600} delay={0} rm={rm} /><Bubble k={k} x={236} y={88} r={3.2} ms={2200} delay={600} rm={rm} />
        <Bubble k={k} x={272} y={84} r={5.5} ms={3000} delay={300} rm={rm} /><Bubble k={k} x={300} y={100} r={3.6} ms={2400} delay={1000} rm={rm} />
        <Bubble k={k} x={176} y={118} r={3.4} ms={2800} delay={1400} rm={rm} /><Bubble k={k} x={254} y={82} r={2.8} ms={2000} delay={1700} rm={rm} />
        <Bubble k={k} x={118} y={150} r={4} ms={2600} delay={500} rm={rm} />
        {/* sparkle */}
        <Animated.View style={{ position: 'absolute', left: 322 * k, top: 100 * k, opacity: sparkle, transform: [{ scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }}>
          <Svg width={16 * k} height={16 * k} viewBox="0 0 16 16"><Path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4Z" fill={C.SAF} /></Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

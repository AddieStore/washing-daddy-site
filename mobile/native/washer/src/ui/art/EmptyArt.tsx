// Empty states. kind 'jobs': no extra jobs, the washer rests on his kit box with a thermos. kind 'history': nothing here yet, the scooter sleeps.
import React from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { C, Cloud, Layer, RIG_H, RIG_W, ScooterRig, useEnter, useLoop, useStill } from './kit';

const VB_W = 300, VB_H = 200, GY = 176;
export type EmptyArtProps = { kind?: 'jobs' | 'history'; width: number; still?: boolean };

function Steam({ k, x, y, delay, rm }: { k: number; x: number; y: number; delay: number; rm: boolean }) {
  const v = useLoop(2400, { rm, delay, ease: Easing.out(Easing.quad) });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * k, top: y * k, opacity: rm ? 0.7 : v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -30 * k] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 4 * k, -3 * k] }) }] }}>
      <Svg width={10 * k} height={18 * k} viewBox="0 0 10 18"><Path d="M5 17 C0 12 9 8 4 1" stroke="#B9A6EE" strokeWidth={2.2} fill="none" strokeLinecap="round" /></Svg>
    </Animated.View>
  );
}
function Zed({ k, x, y, s, delay, rm }: { k: number; x: number; y: number; s: number; delay: number; rm: boolean }) {
  const v = useLoop(3000, { rm, delay, ease: Easing.out(Easing.quad) });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * k, top: y * k, opacity: rm ? 0.8 : v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -34 * k] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 16 * k] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }] }}>
      <Svg width={s * k} height={s * k} viewBox="0 0 12 12"><Path d="M2 2 H10 L2 10 H10" stroke={C.V} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Animated.View>
  );
}
function Twinkle({ k, x, y, s, delay, rm }: { k: number; x: number; y: number; s: number; delay: number; rm: boolean }) {
  const v = useLoop(1500, { rm, delay, reverse: true });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * k, top: y * k, opacity: rm ? 0.9 : v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] }) }] }}>
      <Svg width={s * k} height={s * k} viewBox="0 0 16 16"><Path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4Z" fill={C.SAF} /></Svg>
    </Animated.View>
  );
}

function Resting({ k, rm }: { k: number; rm: boolean }) {
  const breathe = useLoop(2000, { rm, reverse: true });
  const sip = useLoop(2600, { rm, reverse: true });
  return (
    <>
      <Layer w={VB_W} h={VB_H} k={k}>
        <Ellipse cx={130} cy={GY + 2} rx={92} ry={6} fill="rgba(30,15,70,0.10)" />
        {/* far leg */}
        <Path d="M100 118 L134 122 L136 166" stroke={C.PANT2} strokeWidth={15} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M124 164 h20 a5 5 0 0 1 5 5 v4 h-25 z" fill="#fff" />
        {/* kit box */}
        <Rect x={62} y={120} width={92} height={56} rx={9} fill={C.V} />
        <Rect x={62} y={120} width={92} height={12} rx={6} fill={C.V2} />
        <Rect x={62} y={133} width={92} height={6} fill={C.VD} />
        <Circle cx={108} cy={157} r={13} fill="#fff" />
        <Path d="M99 152 l4 11 l5 -8 l5 8 l4 -11" stroke={C.V} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* near leg */}
        <Path d="M108 116 L148 114 L152 164" stroke={C.PANT} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M140 162 h24 a6 6 0 0 1 6 6 v5 h-30 z" fill="#fff" /><Rect x={140} y={171} width={30} height={2.4} fill="#C9C3D6" />
        {/* bucket + flag pole */}
        <Path d="M186 176 V70" stroke={C.DARK} strokeWidth={2.6} strokeLinecap="round" /><Circle cx={186} cy={69} r={3.2} fill={C.SAF} />
        <Path d="M187 74 C198 70 208 80 222 76 L219 88 L224 98 C210 102 198 94 187 98 Z" fill={C.SAF} />
        <Path d="M203 94 C210 92 216 90 220 90" stroke="none" />
        <Path d="M196 156 L226 156 L222 174 C221.6 176.6 220 178 217.4 178 L204.6 178 C202 178 200.4 176.6 200 174 Z" fill={C.SAF} />
        <Path d="M196 156 L226 156 L225.4 161 L196.6 161 Z" fill={C.SAF2} />
        <Circle cx={201} cy={154} r={5} fill="#fff" /><Circle cx={209} cy={150} r={6.5} fill="#fff" /><Circle cx={218} cy={152} r={5.5} fill="#fff" />
      </Layer>
      <Layer w={VB_W} h={VB_H} k={k} style={{ transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -1.4 * k] }) }] }}>
        <Path d="M80 122 C76 100 80 78 94 70 C106 63 120 70 122 84 L120 122 Z" fill={C.V2} />
        <Path d="M102 66 C112 66 120 72 122 84 L120 122 L108 122 C112 100 110 80 102 66Z" fill="#8048F3" opacity={0.75} />
        <Rect x={78} y={102} width={43} height={4.2} fill="#fff" opacity={0.92} />
        <Rect x={76} y={118} width={46} height={7} rx={2} fill={C.DARK} />
        {/* head, resting, eyes closed */}
        <Rect x={95} y={57} width={10} height={14} fill={C.SKIN2} />
        <Circle cx={101} cy={46} r={16} fill={C.SKIN} />
        <Circle cx={89} cy={48} r={3.2} fill={C.SKIN2} />
        <Path d="M85 44 C84 30 93 25 102 26 C113 27 118 35 118 44 Z" fill={C.V} />
        <Path d="M85.5 42.5 H118" stroke={C.SAF} strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M111 39 L131 41.5 C131 46 127 47 120 46 Z" fill={C.VD} />
        <Path d="M106 49 Q109 51.5 112 49" stroke={C.DARK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M115 50 L118 53 L114.5 54" stroke={C.SKIN2} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M106 56 C109 59 114 59 116 55" stroke="#9A4F2E" strokeWidth={1.7} fill="none" strokeLinecap="round" />
        <Path d="M86 70 C80 82 78 96 82 110" stroke={C.V} strokeWidth={10} fill="none" strokeLinecap="round" />
        <Circle cx={83} cy={113} r={5} fill={C.SKIN} />
      </Layer>
      <Layer w={VB_W} h={VB_H} k={k} style={{ transformOrigin: `${112 * k}px ${76 * k}px`, transform: [{ rotate: sip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) }, { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -1.4 * k] }) }] }}>
        <Path d="M112 76 L128 98 L142 88" stroke={C.V2} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={139} y={62} width={15} height={32} rx={5} fill={C.SAF} />
        <Rect x={139} y={72} width={15} height={5} fill="#fff" opacity={0.85} />
        <Rect x={140.5} y={56} width={12} height={8} rx={3} fill={C.V} />
        <Circle cx={142} cy={88} r={5.5} fill={C.SKIN} />
      </Layer>
      <Steam k={k} x={142} y={40} delay={0} rm={rm} /><Steam k={k} x={149} y={42} delay={900} rm={rm} />
    </>
  );
}

function Sleeping({ k, rm }: { k: number; rm: boolean }) {
  const rk = 0.62 * k, left = (150 - 112 * 0.62) * k, top = (GY - 202 * 0.62) * k;
  return (
    <>
      <Layer w={VB_W} h={VB_H} k={k}>
        <Ellipse cx={150} cy={GY + 2} rx={96} ry={6} fill="rgba(30,15,70,0.10)" />
        <Circle cx={246} cy={40} r={17} fill={C.SAF3} /><Circle cx={254} cy={34} r={15} fill="#ECE4FF" />
      </Layer>
      <View style={{ position: 'absolute', left, top }}><ScooterRig k={rk} mode="sleep" rm /></View>
      <Zed k={k} x={142} y={88} s={9} delay={0} rm={rm} /><Zed k={k} x={142} y={88} s={12} delay={1000} rm={rm} /><Zed k={k} x={142} y={88} s={15} delay={2000} rm={rm} />
      <Twinkle k={k} x={216} y={26} s={10} delay={0} rm={rm} /><Twinkle k={k} x={270} y={64} s={8} delay={500} rm={rm} /><Twinkle k={k} x={60} y={36} s={9} delay={900} rm={rm} />
    </>
  );
}

export const EmptyArt = React.memo(function EmptyArt({ kind = 'jobs', width, still }: EmptyArtProps) {
  const rm = useStill(still);
  const k = width / VB_W, enter = useEnter(rm);
  return (
    <Animated.View pointerEvents="none" style={[{ width, height: VB_H * k }, enter]} accessible accessibilityLabel={kind === 'jobs' ? 'The washer is resting with a thermos, no extra jobs right now' : 'The scooter is sleeping, nothing in history yet'}>
      <Layer w={VB_W} h={VB_H} k={k}>
        <Ellipse cx={150} cy={112} rx={136} ry={80} fill="#EDE6FF" />
        <Ellipse cx={150} cy={128} rx={116} ry={58} fill="#E4DAFD" opacity={0.7} />
        <Cloud x={34} y={58} s={0.8} /><Cloud x={236} y={56} s={0.6} />
      </Layer>
      {kind === 'jobs' ? <Resting k={k} rm={rm} /> : <Sleeping k={k} rm={rm} />}
    </Animated.View>
  );
});

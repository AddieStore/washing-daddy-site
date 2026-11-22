// Flat vector animations, one per kind of service (pressure wash, foam, vacuum, dash, tyre, engine, glass, dry, pass, money, plan, car shine).
// Own art in violet + saffron, one 3 s loop driven by a single shared value, still frame when the phone asks for reduced motion.
import React, { useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, G, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import Reanimated, { type SharedValue, useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, useReducedMotion, Easing } from 'react-native-reanimated';

export type ServiceKind = 'pressure' | 'foam' | 'vacuum' | 'dash' | 'tyre' | 'engine' | 'glass' | 'dry' | 'pass' | 'money' | 'plan' | 'shine';

const V = '#5409DA', VD = '#36058F', VL = '#EFE6FF', VM = '#B79CF2', S = '#FFBA08', INK = '#1A0A33', WATER = '#9CC4FF';

/** 0..1 progress of t inside [a, b] */
const seg = (t: number, a: number, b: number) => { 'worklet'; return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a) };
/** 0 -> 1 -> 0 pulse inside [a, b] */
const pulse = (t: number, a: number, b: number) => { 'worklet'; const p = seg(t, a, b); return p < 0.5 ? p * 2 : (1 - p) * 2 };
type Style = { opacity?: number; transform?: any[] };
type Box = { x: number; y: number; w: number; h: number };
const FULL: Box = { x: 0, y: 0, w: 200, h: 160 };

function L({ t, box = FULL, s, f, children }: { t: SharedValue<number>; box?: Box; s: number; f?: (t: number) => Style; children: ReactNode }) {
  const st = useAnimatedStyle(() => (f ? f(t.value) : {}) as any);
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: box.x * s, top: box.y * s, width: box.w * s, height: box.h * s }, st]}>
      <Svg width={box.w * s} height={box.h * s} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>{children}</Svg>
    </Reanimated.View>
  );
}

const Sparkle = ({ x, y, r = 8, c = S }: { x: number; y: number; r?: number; c?: string }) => (
  <Path d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} fill={c} />
);
const Car = ({ body = V, glass = VL }: { body?: string; glass?: string }) => (
  <G>
    <Ellipse cx={104} cy={140} rx={84} ry={7} fill="rgba(26,10,51,0.10)" />
    <Path d="M18 114 L26 94 Q30 86 42 84 L66 78 Q78 54 100 52 L132 52 Q150 54 160 78 L176 86 Q188 90 188 102 L188 114 Q188 122 180 122 L26 122 Q18 122 18 114Z" fill={body} />
    <Path d="M76 78 Q84 62 100 60 L126 60 Q140 62 148 78Z" fill={glass} />
    <Path d="M112 60 L112 78" stroke={body} strokeWidth={3} />
    <Rect x={174} y={96} width={12} height={7} rx={3} fill={S} />
    <Rect x={20} y={98} width={8} height={6} rx={3} fill="#FF6A6A" />
    <Path d="M30 108 L176 108" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
    {[60, 148].map(x => <G key={x}><Circle cx={x} cy={124} r={17} fill={INK} /><Circle cx={x} cy={124} r={8} fill={VL} /><Circle cx={x} cy={124} r={3} fill={INK} /></G>)}
  </G>
);
const Foam = ({ x, y, r, o = 1 }: { x: number; y: number; r: number; o?: number }) => (
  <G opacity={o}><Circle cx={x} cy={y} r={r} fill="#fff" stroke={VM} strokeWidth={1.5} /><Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill={VL} /></G>
);
const Tick = ({ x, y, c = V }: { x: number; y: number; c?: string }) => <Path d={`M${x - 6} ${y} L${x - 1.5} ${y + 5} L${x + 7} ${y - 5}`} stroke={c} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />;

function Scene({ kind, t, s }: { kind: ServiceKind; t: SharedValue<number>; s: number }) {
  switch (kind) {
    case 'pressure': return (<>
      <L t={t} s={s}><Car /></L>
      <L t={t} s={s}><Rect x={4} y={22} width={26} height={14} rx={6} fill={INK} /><Rect x={26} y={26} width={14} height={6} rx={3} fill={S} /></L>
      {[0, 1, 2, 3].map(i => (
        <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg((t * 2 + i * 0.25) % 1, 0, 1); return { opacity: p < 0.1 ? p * 10 : 1 - Math.max(0, p - 0.7) / 0.3, transform: [{ translateX: p * 62 }, { translateY: p * (30 + i * 6) - i * 4 }] } }}>
          <Line x1={44 + i * 3} y1={28 + i * 3} x2={62 + i * 3} y2={34 + i * 4} stroke={WATER} strokeWidth={3.5} strokeLinecap="round" /><Circle cx={70 + i * 3} cy={37 + i * 4} r={2.5} fill={WATER} />
        </L>))}
      <L t={t} s={s} f={t => { 'worklet'; return { opacity: 0.55 + 0.45 * pulse(t, 0, 1) } }}><Foam x={92} y={56} r={9} /><Foam x={108} y={52} r={7} /><Foam x={124} y={56} r={8} /><Foam x={142} y={68} r={6} /></L>
      {[[150, 40, 9], [172, 70, 7], [84, 36, 6]].map(([x, y, r], i) => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.15 + i * 0.22, 0.55 + i * 0.22); return { opacity: p, transform: [{ scale: 0.4 + p * 0.8 }] } }}><Sparkle x={x} y={y} r={r} /></L>)}
    </>);
    case 'foam': return (<>
      <L t={t} s={s}><Car /></L>
      {[[80, 62, 12], [104, 54, 15], [130, 58, 12], [152, 76, 10], [60, 88, 11], [96, 94, 13], [128, 92, 10], [170, 98, 9], [44, 100, 9], [150, 56, 8]].map(([x, y, r], i) => (
        <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg(t, i * 0.05, 0.45 + i * 0.03), o = 1 - seg(t, 0.88, 1); return { opacity: p * o, transform: [{ scale: 0.3 + 0.7 * p }, { translateY: (1 - p) * -8 }] } }}><Foam x={x} y={y} r={r} /></L>))}
      {[[40, 56, 5], [176, 58, 6], [100, 30, 5]].map(([x, y, r], i) => <L key={'b' + i} t={t} s={s} f={t => { 'worklet'; const p = (t * 1 + i * 0.33) % 1; return { opacity: 0.8 * (1 - p), transform: [{ translateY: -p * 26 }] } }}><Circle cx={x} cy={y + 20} r={r} fill="#fff" stroke={VM} strokeWidth={1.5} /></L>)}
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.5, 0.9); return { opacity: p, transform: [{ scale: 0.5 + p * 0.7 }] } }}><Sparkle x={108} y={40} r={10} /></L>
    </>);
    case 'vacuum': return (<>
      <L t={t} s={s}>
        <Rect x={20} y={104} width={160} height={30} rx={10} fill={VL} />
        <Path d="M36 104 L36 62 Q36 46 52 46 L80 46 Q94 46 94 60 L94 104Z" fill={V} /><Path d="M110 104 L110 80 Q110 66 124 66 L170 66 Q184 66 184 80 L184 104Z" fill={VM} />
        <Rect x={20} y={128} width={160} height={6} rx={3} fill="rgba(26,10,51,0.12)" />
      </L>
      {[0, 1, 2, 3, 4].map(i => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg((t * 1.5 + i * 0.2) % 1, 0, 1); return { opacity: 1 - seg(p, 0.75, 1), transform: [{ translateX: -p * (50 + i * 10) }, { translateY: -p * 6 }] } }}><Circle cx={150 - i * 8} cy={112 + (i % 2) * 8} r={3} fill="#8B6B3E" /></L>)}
      <L t={t} s={s} f={t => { 'worklet'; return { transform: [{ translateX: -Math.sin(t * Math.PI * 4) * 10 }] } }}>
        <Path d="M190 20 Q170 20 160 50 Q150 76 120 96" stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />
        <Path d="M104 96 L128 88 L134 104 L110 112Z" fill={S} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      </L>
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.55, 0.95); return { opacity: p, transform: [{ scale: 0.5 + p * 0.7 }] } }}><Sparkle x={66} y={34} r={9} /><Sparkle x={160} y={50} r={6} c={V} /></L>
    </>);
    case 'dash': return (<>
      <L t={t} s={s}>
        <Path d="M10 120 L10 86 Q10 54 44 48 Q100 36 156 48 Q190 54 190 86 L190 120Z" fill={INK} />
        <Path d="M10 86 Q10 60 40 56 Q100 44 160 56 Q190 60 190 86Z" fill={V} />
        <Circle cx={56} cy={88} r={22} fill={VD} stroke={VM} strokeWidth={3} /><Path d="M56 88 L68 76" stroke={S} strokeWidth={3} strokeLinecap="round" />
        <Rect x={102} y={74} width={58} height={30} rx={8} fill={VL} /><Rect x={110} y={82} width={20} height={4} rx={2} fill={V} /><Rect x={110} y={92} width={34} height={4} rx={2} fill={VM} />
        <Circle cx={176} cy={92} r={5} fill={S} />
      </L>
      <L t={t} s={s} f={t => { 'worklet'; const p = Math.sin(t * Math.PI * 4); return { transform: [{ translateX: p * 46 }, { rotate: p * 8 + 'deg' }] } }}><Rect x={70} y={66} width={46} height={34} rx={10} fill={S} /><Path d="M78 78 Q93 70 108 78 M78 88 Q93 80 108 88" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.7} /></L>
      {[[52, 52, 8], [150, 66, 9], [98, 106, 6]].map(([x, y, r], i) => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.1 + i * 0.25, 0.5 + i * 0.25); return { opacity: p, transform: [{ scale: 0.4 + p * 0.8 }] } }}><Sparkle x={x} y={y} r={r} c="#fff" /></L>)}
    </>);
    case 'tyre': return (<>
      <L t={t} s={s}><Ellipse cx={100} cy={146} rx={56} ry={6} fill="rgba(26,10,51,0.10)" /></L>
      <L t={t} s={s} box={{ x: 40, y: 20, w: 120, h: 120 }} f={t => { 'worklet'; return { transform: [{ rotate: t * 360 + 'deg' }] } }}>
        <Circle cx={100} cy={80} r={58} fill={INK} /><Circle cx={100} cy={80} r={40} fill={VL} stroke={VM} strokeWidth={3} />
        {[0, 1, 2, 3, 4].map(i => <Path key={i} d="M100 80 L100 44" stroke={V} strokeWidth={9} strokeLinecap="round" transform={`rotate(${i * 72} 100 80)`} />)}
        <Circle cx={100} cy={80} r={9} fill={S} />
        {Array.from({ length: 16 }, (_, i) => <Path key={'t' + i} d="M100 24 L100 30" stroke="#3a2a55" strokeWidth={3} strokeLinecap="round" transform={`rotate(${i * 22.5} 100 80)`} />)}
      </L>
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.2, 0.6); return { opacity: p, transform: [{ scale: 0.4 + p * 0.9 }] } }}><Sparkle x={140} y={42} r={13} /></L>
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.55, 0.95); return { opacity: p, transform: [{ scale: 0.4 + p * 0.8 }] } }}><Sparkle x={58} y={50} r={8} c={V} /></L>
    </>);
    case 'engine': return (<>
      <L t={t} s={s}>
        <Ellipse cx={100} cy={140} rx={78} ry={6} fill="rgba(26,10,51,0.10)" />
        <Rect x={22} y={52} width={156} height={84} rx={12} fill={INK} />
        <Rect x={44} y={70} width={78} height={48} rx={8} fill={V} /><Rect x={52} y={78} width={62} height={10} rx={3} fill={VM} /><Rect x={52} y={94} width={62} height={10} rx={3} fill={VM} />
        <Circle cx={150} cy={90} r={17} fill={VD} stroke={S} strokeWidth={4} /><Circle cx={150} cy={90} r={5} fill={S} />
        <Rect x={132} y={116} width={36} height={10} rx={5} fill={VM} />
        <Path d="M22 52 L40 22 L160 22 L178 52Z" fill={VM} opacity={0.55} />
      </L>
      <L t={t} s={s} box={{ x: 132, y: 72, w: 36, h: 36 }} f={t => { 'worklet'; return { transform: [{ rotate: t * 720 + 'deg' }] } }}><Path d="M150 74 L150 106 M134 90 L166 90" stroke={S} strokeWidth={4} strokeLinecap="round" /></L>
      {[0, 1, 2, 3].map(i => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = (t * 1.3 + i * 0.25) % 1; return { opacity: 0.9 * (1 - p), transform: [{ translateY: -p * 40 }, { scale: 0.6 + p * 0.6 }] } }}><Foam x={52 + i * 22} y={66} r={6 + (i % 2) * 2} /></L>)}
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.55, 0.95); return { opacity: p, transform: [{ scale: 0.5 + p * 0.7 }] } }}><Sparkle x={170} y={34} r={11} /></L>
    </>);
    case 'glass': return (<>
      <L t={t} s={s}>
        <Rect x={30} y={22} width={140} height={110} rx={18} fill={V} /><Rect x={42} y={34} width={116} height={86} rx={10} fill={VL} />
        <Path d="M42 108 L100 34 L120 34 L56 120 L42 120Z" fill="rgba(255,255,255,0.55)" />
      </L>
      <L t={t} s={s} box={{ x: 42, y: 34, w: 116, h: 86 }} f={t => { 'worklet'; const p = seg(t, 0.1, 0.7); return { opacity: p > 0 && p < 1 ? 1 : 0, transform: [{ translateX: -60 + p * 120 }, { rotate: '20deg' }] } }}><Rect x={86} y={20} width={14} height={110} fill="#fff" opacity={0.9} /></L>
      <L t={t} s={s} f={t => { 'worklet'; const p = seg(t, 0.1, 0.7); return { transform: [{ translateX: -60 + p * 120 }] } }}><Rect x={86} y={104} width={26} height={14} rx={7} fill={S} /></L>
      {[[148, 44, 11], [58, 54, 8], [120, 100, 7]].map(([x, y, r], i) => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.4 + i * 0.15, 0.8 + i * 0.15); return { opacity: p, transform: [{ scale: 0.4 + p * 0.9 }] } }}><Sparkle x={x} y={y} r={r} c={i === 1 ? V : S} /></L>)}
    </>);
    case 'dry': return (<>
      <L t={t} s={s}><Car /></L>
      {[0, 1, 2].map(i => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg(t, 0.1, 0.8); return { opacity: 1 - seg(t, 0.85, 1), transform: [{ translateX: p * 100 - 10 }] } }}><Circle cx={36 - i * 8} cy={74 + i * 14} r={3} fill={WATER} opacity={0.9 - i * 0.2} /></L>)}
      <L t={t} s={s} f={t => { 'worklet'; const p = seg(t, 0.1, 0.8); return { opacity: 1 - 0.0, transform: [{ translateX: -10 + p * 120 }, { translateY: Math.sin(p * Math.PI * 3) * 6 }, { rotate: Math.sin(p * Math.PI * 3) * 6 + 'deg' }] } }}>
        <Rect x={30} y={56} width={44} height={46} rx={10} fill={S} /><Path d="M38 66 L66 66 M38 78 L66 78 M38 90 L66 90" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      </L>
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.4, 0.95); return { opacity: p, transform: [{ scale: 0.6 + p * 0.6 }] } }}><Sparkle x={110} y={66} r={12} c="#fff" /><Sparkle x={150} y={84} r={8} /><Sparkle x={74} y={96} r={7} /></L>
    </>);
    case 'pass': case 'plan': {
      const n = kind === 'plan' ? 14 : 8, cols = kind === 'plan' ? 7 : 4, pad = kind === 'plan' ? 10 : 22;
      return (<>
        <L t={t} s={s}>
          <Rect x={24} y={20} width={152} height={128} rx={16} fill="#fff" stroke={VM} strokeWidth={2.5} />
          <Path d="M24 36 Q24 20 40 20 L160 20 Q176 20 176 36 L176 52 L24 52Z" fill={V} />
          <Rect x={54} y={10} width={9} height={20} rx={4} fill={S} /><Rect x={137} y={10} width={9} height={20} rx={4} fill={S} />
          {kind === 'plan' ? <Path d="M40 36 L70 36" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} /> : <Path d="M40 36 L84 36" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />}
          {Array.from({ length: n }, (_, i) => { const c = i % cols, r = Math.floor(i / cols), w = (152 - pad * 2) / cols; return <Rect key={i} x={24 + pad + c * w + 2} y={64 + r * (kind === 'plan' ? 32 : 36)} width={w - 4} height={kind === 'plan' ? 26 : 30} rx={7} fill={VL} /> })}
        </L>
        {Array.from({ length: n }, (_, i) => { const c = i % cols, r = Math.floor(i / cols), w = (152 - pad * 2) / cols, cx = 24 + pad + c * w + w / 2, cy = 64 + r * (kind === 'plan' ? 32 : 36) + (kind === 'plan' ? 13 : 15), a = 0.04 + i * (0.5 / n);
          return <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg(t, a, a + 0.08), o = 1 - seg(t, 0.92, 1); return { opacity: p * o, transform: [{ scale: 0.3 + p * 0.7 }] } }}>
            <Circle cx={cx} cy={cy} r={kind === 'plan' ? 10 : 12} fill={i % 3 === 2 ? S : V} /><Tick x={cx} y={cy} c="#fff" /></L> })}
        <L t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.6, 1); return { opacity: p, transform: [{ scale: 0.5 + p * 0.6 }] } }}><Sparkle x={170} y={30} r={11} /></L>
      </>);
    }
    case 'money': return (<>
      <L t={t} s={s}>
        <Ellipse cx={100} cy={146} rx={64} ry={6} fill="rgba(26,10,51,0.10)" />
        <Rect x={30} y={70} width={140} height={72} rx={16} fill={V} /><Rect x={30} y={70} width={140} height={20} rx={10} fill={VD} />
        <Rect x={132} y={96} width={48} height={30} rx={12} fill={S} /><Circle cx={148} cy={111} r={5} fill={INK} />
      </L>
      {[0, 1, 2].map(i => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = seg((t * 1.2 + i * 0.33) % 1, 0, 1); return { opacity: p < 0.1 ? p * 10 : 1 - seg(p, 0.8, 1), transform: [{ translateX: (i - 1) * 8 }, { translateY: p * 60 }, { scaleX: Math.abs(Math.cos(p * Math.PI * 3)) * 0.8 + 0.2 }] } }}>
        <Circle cx={100} cy={16} r={14} fill={S} stroke="#E09B00" strokeWidth={2.5} /><Path d="M94 12 H106 M94 18 H106 M98 8 L106 8" stroke="#B87400" strokeWidth={2.2} strokeLinecap="round" />
      </L>)}
      <L t={t} s={s}><Path d="M30 90 L170 90 L170 142 Q170 142 154 142 L46 142 Q30 142 30 126Z" fill={V} opacity={0} /></L>
      <L t={t} s={s} f={t => { 'worklet'; const p = pulse((t * 1.2) % 1, 0.7, 1); return { opacity: p, transform: [{ scale: 0.5 + p * 0.7 }] } }}><Sparkle x={160} y={60} r={10} /><Sparkle x={42} y={60} r={7} c={V} /></L>
    </>);
    default: return (<>
      <L t={t} s={s} f={t => { 'worklet'; return { transform: [{ translateY: Math.sin(t * Math.PI * 2) * -2 }] } }}><Car /></L>
      <L t={t} s={s} f={t => { 'worklet'; const p = seg(t, 0.15, 0.65); return { opacity: p > 0 && p < 1 ? 0.9 : 0, transform: [{ translateX: -50 + p * 230 }, { rotate: '18deg' }] } }}><Rect x={50} y={30} width={14} height={120} fill="#fff" opacity={0.55} /><Rect x={70} y={30} width={5} height={120} fill="#fff" opacity={0.4} /></L>
      {[[60, 52, 12], [168, 64, 10], [112, 36, 9], [34, 80, 7]].map(([x, y, r], i) => <L key={i} t={t} s={s} f={t => { 'worklet'; const p = pulse(t, 0.1 + i * 0.2, 0.5 + i * 0.2); return { opacity: p, transform: [{ scale: 0.4 + p * 0.9 }, { rotate: p * 40 + 'deg' }] } }}><Sparkle x={x} y={y} r={r} c={i % 2 ? '#fff' : S} /></L>)}
    </>);
  }
}

export function ServiceAnim({ kind = 'shine', size = 220 }: { kind?: ServiceKind; size?: number }) {
  const rm = useReducedMotion(), t = useSharedValue(rm ? 0.55 : 0), s = size / 200;
  useEffect(() => {
    if (rm) { t.value = 0.55; return }
    t.value = 0; t.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [rm, kind]);
  return (
    <View accessible accessibilityRole="image" style={{ width: size, height: size * 0.8 }}>
      <View style={{ position: 'absolute', left: size * 0.08, top: size * 0.06, width: size * 0.84, height: size * 0.68, borderRadius: size * 0.34, backgroundColor: 'rgba(84,9,218,0.07)' }} />
      <Scene kind={kind} t={t} s={s} />
    </View>
  );
}

/** What was booked -> which animation. Looks at ids and names of the first (main) line; falls back to a car shine. */
export function kindOf(r: { kind?: string; title?: string } | null | undefined, lines?: { id?: string; name?: string }[]): ServiceKind {
  if (!r) return 'shine';
  if (r.kind === 'wallet') return 'money';
  if (r.kind === 'plan') return 'plan';
  if (r.kind === 'pass') return 'pass';
  const first = lines && lines[0], id = ((first && first.id) || '').toLowerCase(), txt = (((first && first.name) || '') + ' ' + (r.title || '')).toLowerCase();
  if (id === 'foam' || /foam/.test(txt)) return 'foam';
  if (id === 'vac' || /vacuum|boot|mat/.test(txt)) return 'vacuum';
  if (id === 'dash' || /dash|touchpoint|steering|rubber/.test(txt)) return 'dash';
  if (id === 'tyre' || id === 'alloy' || /tyre|tire|rim|alloy|wheel/.test(txt)) return 'tyre';
  if (id === 'engine' || id === 'battery' || /engine|battery/.test(txt)) return 'engine';
  if (id === 'glass' || id === 'rain' || id === 'headlight' || /glass|windshield|headlight/.test(txt)) return 'glass';
  if (/dry|towel|wax|polish|ceramic|teflon|coat/.test(txt)) return 'dry';
  if (id === 'ext' || id === 'wash' || id === 'deep' || id === 'exclusive' || /pressure|exterior|wash/.test(txt)) return 'pressure';
  return 'shine';
}

/** short human name for the line under the animation: "pressure wash", "foam wash"... */
export const kindName: Record<ServiceKind, string> = { pressure: 'pressure wash', foam: 'foam wash', vacuum: 'vacuum', dash: 'dashboard polish', tyre: 'tyre and rim polish', engine: 'engine bay clean', glass: 'glass care', dry: 'hand finish', pass: 'WD Pass', money: 'WD Money top-up', plan: 'plan', shine: 'car wash' };

// Wash step icons for the day timeline: small flat illustrations with real car details (windows, door line, lights, wheels with
// rims) and one gentle motion each (water drops falling, foam bubbles rising, a polishing pad turning, a wheel spinning...).
// `ink` is the main colour (white on a filled dot, the step colour on a white dot), `acc` the highlight. Reduced motion: still.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, useReducedMotion, cancelAnimation, Easing } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { useActive } from './active';

export type GlyphKind = 'onway' | 'arrived' | 'started' | 'finished' | 'pressure' | 'foam' | 'interior' | 'tyre' | 'detailing' | 'dry' | 'stop' | 'other';

/** 0 -> 1 looping value (ping-pong when `back`); still at 0.5 when motion is off */
function useLoop(ms: number, back = false, delay = 0) {
  const rm = !!useReducedMotion() || !useActive(), v = useSharedValue(0.5);
  useEffect(() => {
    if (rm) { v.value = 0.5; return }
    v.value = 0;
    const go = () => { v.value = withRepeat(back ? withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })) : withTiming(1, { duration: ms, easing: Easing.linear }), -1, false) };
    const t = setTimeout(go, delay);
    return () => { clearTimeout(t); cancelAnimation(v) };
  }, [rm, ms, back, delay]);
  return v;
}

/** the side of a hatchback: body, windows, door line, lights, wheels with rims */
function Car({ ink, acc, y = 0, rim = true }: { ink: string; acc: string; y?: number; rim?: boolean }) {
  return (
    <G transform={`translate(0 ${y})`}>
      <Path d="M3.5 23V18.4c0-1.4.9-2.4 2.3-2.7l3-.6c1.1-2.2 2.7-3.6 5.2-3.6h4.6c2.5 0 4.1 1.4 5.2 3.6l1.9.5c1.5.4 2.3 1.5 2.3 2.8V23z" fill={ink} />
      <Path d="M11.2 14.7c.7-1.4 1.7-2.2 3.2-2.2h2.2v2.2zM18.6 12.5h1.2c1.3 0 2.2.8 2.9 2.2h-4.1z" fill={acc} opacity={0.9} />
      <Path d="M17.6 15v7" stroke={acc} strokeWidth={0.8} opacity={0.7} />
      <Rect x={26.4} y={17.6} width={2.4} height={1.6} rx={0.8} fill="#FFD166" />
      <Rect x={3.2} y={18} width={1.6} height={1.6} rx={0.8} fill="#FF6B6B" />
      <Circle cx={9.5} cy={23.2} r={3.1} fill="#1B1230" stroke={ink} strokeWidth={0.8} />
      <Circle cx={23.5} cy={23.2} r={3.1} fill="#1B1230" stroke={ink} strokeWidth={0.8} />
      {rim ? <><Circle cx={9.5} cy={23.2} r={1.2} fill={acc} /><Circle cx={23.5} cy={23.2} r={1.2} fill={acc} /></> : null}
    </G>
  );
}

const Wrap = ({ s, children }: { s: number; children: React.ReactNode }) => <View style={{ width: s, height: s }}>{children}</View>;
const S32 = ({ children, s }: { children: React.ReactNode; s: number }) => <Svg width={s} height={s} viewBox="0 0 32 32">{children}</Svg>;
const Layer = ({ s, style, children }: { s: number; style: any; children: React.ReactNode }) => (
  <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: s, height: s }, style]}><Svg width={s} height={s} viewBox="0 0 32 32">{children}</Svg></Reanimated.View>
);

export function WashGlyph({ kind, size = 28, ink = '#fff', acc = '#FFD166' }: { kind: GlyphKind; size?: number; ink?: string; acc?: string }) {
  const s = size, a = useLoop(1500), b = useLoop(1900, false, 500), sw = useLoop(1100, true), spin = useLoop(2600), spinFast = useLoop(700);
  const fall = useAnimatedStyle(() => ({ opacity: 1 - a.value * 0.9, transform: [{ translateY: a.value * 5 }] }));
  const fall2 = useAnimatedStyle(() => ({ opacity: 1 - b.value * 0.9, transform: [{ translateY: b.value * 5 }] }));
  const rise = useAnimatedStyle(() => ({ opacity: 1 - a.value * 0.85, transform: [{ translateY: -a.value * 6 }, { translateX: Math.sin(a.value * 6.28) * 1.2 }] }));
  const rise2 = useAnimatedStyle(() => ({ opacity: 1 - b.value * 0.85, transform: [{ translateY: -b.value * 7 }] }));
  const twinkle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * sw.value, transform: [{ scale: 0.8 + 0.3 * sw.value }] }));
  const wipe = useAnimatedStyle(() => ({ transform: [{ translateX: -4 + 8 * sw.value }] }));
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const turnFast = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinFast.value * 360}deg` }] }));
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * sw.value }] }));
  const speed = useAnimatedStyle(() => ({ opacity: 1 - a.value, transform: [{ translateX: -a.value * 5 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - a.value), transform: [{ scale: 0.6 + a.value * 0.9 }] }));

  switch (kind) {
    case 'onway': return <Wrap s={s}>
      <S32 s={s}>
        <Path d="M10 22h9.5l3.5-9h3" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M23 13l-1.4-3.4h3.6" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x={6} y={14.5} width={8} height={4.8} rx={1.4} fill={acc} />
        <Circle cx={15.5} cy={9} r={2.9} fill={ink} /><Path d="M12.8 9.2h5.6" stroke={acc} strokeWidth={0.9} />
        <Path d="M13.4 12.5l-1.4 4.2 5.4 1.4" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={10} cy={24} r={3.6} fill="#1B1230" stroke={ink} strokeWidth={1} /><Circle cx={26} cy={24} r={3.6} fill="#1B1230" stroke={ink} strokeWidth={1} />
      </S32>
      <Layer s={s} style={speed}><Path d="M2 12h4M0 16h5M3 20h3" stroke={acc} strokeWidth={1.4} strokeLinecap="round" /></Layer>
      <Layer s={s} style={turnFast}><Path d="M10 21.4v5.2M7.4 24h5.2M26 21.4v5.2M23.4 24h5.2" stroke={acc} strokeWidth={0.9} /></Layer>
    </Wrap>;
    case 'arrived': return <Wrap s={s}>
      <Layer s={s} style={ring}><Circle cx={16} cy={26.5} r={5} fill="none" stroke={acc} strokeWidth={1.4} /></Layer>
      <Layer s={s} style={bob}><Path d="M16 29s-9-7.8-9-14.6a9 9 0 0 1 18 0C25 21.2 16 29 16 29z" fill={ink} /><G transform="translate(8.6 3.6) scale(0.46)"><Car ink={acc} acc={ink} y={0} rim={false} /></G></Layer>
    </Wrap>;
    case 'started': return <Wrap s={s}>
      <S32 s={s}>
        <Path d="M5 11.5h10c1.4 0 2.2 1 2.2 2.2v1.2H8.4L7 21H4.2L5 11.5z" fill={ink} /><Rect x={14.6} y={10.4} width={5.4} height={2.6} rx={1.2} fill={acc} />
        <Path d="M20 11.7h3.4" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        <Path d="M7.5 17.5h6" stroke={acc} strokeWidth={1} />
      </S32>
      <Layer s={s} style={fall}><Circle cx={26.5} cy={11.7} r={1.3} fill={acc} /><Circle cx={29} cy={14.4} r={1.1} fill={acc} /><Circle cx={26.2} cy={16.8} r={1} fill={acc} /></Layer>
      <Layer s={s} style={fall2}><Circle cx={28.6} cy={10} r={1} fill={acc} /><Circle cx={27} cy={19.6} r={1.2} fill={acc} /><Circle cx={30} cy={17} r={0.9} fill={acc} /></Layer>
    </Wrap>;
    case 'pressure': return <Wrap s={s}>
      <S32 s={s}><Car ink={ink} acc={acc} y={3} /><Path d="M2 8h6.5" stroke={ink} strokeWidth={2} strokeLinecap="round" /><Rect x={7.6} y={6.6} width={3} height={2.8} rx={1} fill={acc} /></S32>
      <Layer s={s} style={fall}><Circle cx={14} cy={7} r={1.2} fill={acc} /><Circle cx={18.5} cy={5.4} r={1.1} fill={acc} /><Circle cx={23} cy={7.6} r={1} fill={acc} /><Path d="M11 8h3" stroke={acc} strokeWidth={1} strokeLinecap="round" /></Layer>
      <Layer s={s} style={fall2}><Circle cx={16} cy={9} r={1} fill={acc} /><Circle cx={21} cy={9.6} r={1.2} fill={acc} /><Circle cx={25.4} cy={6} r={0.9} fill={acc} /></Layer>
    </Wrap>;
    case 'foam': return <Wrap s={s}>
      <S32 s={s}><Car ink={ink} acc={acc} y={2} /><Circle cx={13} cy={12.4} r={2.8} fill="#fff" /><Circle cx={17.4} cy={11.2} r={3.2} fill="#fff" /><Circle cx={22} cy={13} r={2.6} fill="#fff" /><Circle cx={9} cy={15.4} r={2} fill="#fff" /><Circle cx={26} cy={16.4} r={1.8} fill="#fff" /></S32>
      <Layer s={s} style={rise}><Circle cx={8} cy={9} r={1.5} fill="none" stroke={acc} strokeWidth={1} /><Circle cx={24.5} cy={8} r={1.2} fill="none" stroke={acc} strokeWidth={1} /></Layer>
      <Layer s={s} style={rise2}><Circle cx={15} cy={7} r={1.2} fill="none" stroke={acc} strokeWidth={1} /><Circle cx={28} cy={11} r={1} fill="none" stroke={acc} strokeWidth={1} /></Layer>
    </Wrap>;
    case 'interior': return <Wrap s={s}>
      <S32 s={s}>
        <Path d="M3 12.5h26" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx={11} cy={17.6} r={6} fill="none" stroke={ink} strokeWidth={2.2} /><Path d="M11 17.6v6M5.4 15.6l5.6 2 5.6-2" stroke={ink} strokeWidth={1.6} strokeLinecap="round" fill="none" /><Circle cx={11} cy={17.6} r={1.3} fill={acc} />
        <Path d="M23 27v-6c0-1.6 1.2-2.6 2.6-2.6S28 19.4 28 21v6z" fill={ink} opacity={0.9} />
      </S32>
      <Layer s={s} style={bob}><Path d="M19 8c2 0 2.8 1.4 4 1.4s2-1.2 4-1.2" stroke={acc} strokeWidth={1.6} strokeLinecap="round" fill="none" /><Path d="M21 5.6c1.4 0 2 1 3 1s1.4-.8 2.6-.8" stroke={acc} strokeWidth={1.1} strokeLinecap="round" fill="none" /></Layer>
    </Wrap>;
    case 'tyre': return <Wrap s={s}>
      <S32 s={s}><Circle cx={16} cy={16} r={12.4} fill="#1B1230" stroke={ink} strokeWidth={1.6} /><Circle cx={16} cy={16} r={8.2} fill="none" stroke={ink} strokeWidth={0.9} opacity={0.6} /></S32>
      <Layer s={s} style={turn}><Circle cx={16} cy={16} r={5.6} fill={ink} /><Path d="M16 11.2v9.6M11.2 16h9.6M12.6 12.6l6.8 6.8M19.4 12.6l-6.8 6.8" stroke="#1B1230" strokeWidth={1.2} /><Circle cx={16} cy={16} r={1.6} fill={acc} /></Layer>
      <Layer s={s} style={twinkle}><Path d="M25 5l.9 2.1 2.1.9-2.1.9L25 11l-.9-2.1L22 8l2.1-.9z" fill={acc} /></Layer>
    </Wrap>;
    case 'detailing': return <Wrap s={s}>
      <S32 s={s}><Car ink={ink} acc={acc} y={3} /></S32>
      <Layer s={s} style={turn}><Circle cx={14.4} cy={9.6} r={4} fill={acc} opacity={0.95} /><Path d="M11.4 9.6h6M14.4 6.6v6" stroke="#1B1230" strokeWidth={0.8} opacity={0.45} /></Layer>
      <Layer s={s} style={twinkle}><Path d="M25.5 4.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill={acc} /><Path d="M5 5l.7 1.6 1.6.7-1.6.7L5 9.6l-.7-1.6-1.6-.7 1.6-.7z" fill={acc} /></Layer>
    </Wrap>;
    case 'dry': return <Wrap s={s}>
      <S32 s={s}><Car ink={ink} acc={acc} y={3} /></S32>
      <Layer s={s} style={wipe}><Rect x={11} y={6.8} width={10} height={6.6} rx={2} fill={acc} /><Path d="M13 9.2h6M13 11.2h4" stroke="#1B1230" strokeWidth={0.8} opacity={0.4} /></Layer>
      <Layer s={s} style={fall}><Circle cx={25.5} cy={11} r={1} fill={acc} /><Circle cx={7} cy={12} r={1} fill={acc} /></Layer>
    </Wrap>;
    case 'finished': return <Wrap s={s}>
      <S32 s={s}><Car ink={ink} acc={acc} y={2.5} /></S32>
      <Layer s={s} style={twinkle}><Path d="M24 3l1.2 2.8 2.8 1.2-2.8 1.2L24 11l-1.2-2.8L20 7l2.8-1.2z" fill={acc} /><Path d="M6.5 5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill={acc} /></Layer>
      <Layer s={s} style={bob}><Path d="M14 6.6l2 2 3.8-3.8" stroke={acc} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Layer>
    </Wrap>;
    case 'stop': return <Wrap s={s}><S32 s={s}><Path d="M11 4h10l7 7v10l-7 7H11l-7-7V11z" fill={ink} /><Rect x={10} y={14.2} width={12} height={3.6} rx={1.8} fill="#DC2626" /></S32></Wrap>;
    default: return <Wrap s={s}><S32 s={s}><Path d="M7 17l6 6 12-13" stroke={ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></S32></Wrap>;
  }
}

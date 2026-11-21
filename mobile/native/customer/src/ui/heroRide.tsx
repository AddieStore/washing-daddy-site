// Home hero art (no photos): our washer rides the WD scooter with the kit box and the WD flag, on a light street.
// Flat illustration, light background with dark accents. Layers scroll at different speeds (clouds, skyline, posts, road)
// so the rider feels like he is cruising; wheels spin, the flag waves, small puffs leave the exhaust.
// Reduced motion: one still frame.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, withSpring, useReducedMotion, Easing, SharedValue } from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Ellipse, G, Text as SText } from 'react-native-svg';

const VB_W = 360, VB_H = 232;
const V = '#5409DA', V2 = '#6E2CF0', V3 = '#8A55F5', VD = '#2A0A6B', DARK = '#221838', INK = '#120B22', SKIN = '#E7A57A', SAF = '#FFBA08';

/* a horizontally looping layer: draws `tile` twice and slides left by one tile forever */
function Loop({ k, tile, ms, top, h, children, rm, span }: { k: number; tile: number; ms: number; top: number; h: number; children: (x0: number) => React.ReactNode; rm: boolean; span: number }) {
  const x = useSharedValue(0), n = Math.ceil(span / (tile * k)) + 1;
  useEffect(() => { if (!rm) x.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false) }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value * tile * k }] }));
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: top * k, width: tile * n * k, height: h * k }, st]}>
      <Svg width={tile * n * k} height={h * k} viewBox={`0 0 ${tile * n} ${h}`}>{Array.from({ length: n }, (_, i) => children(i * tile))}</Svg>
    </Reanimated.View>
  );
}

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <Path d={`M${x} ${y} h${44 * s} a${8 * s} ${8 * s} 0 0 0 -6 ${-13 * s} a${11 * s} ${11 * s} 0 0 0 -19 ${-5 * s} a${9 * s} ${9 * s} 0 0 0 -16 ${6 * s} a${7 * s} ${7 * s} 0 0 0 -3 ${12 * s} z`} fill="#fff" />
);
function Skyline({ x0 }: { x0: number }) {
  const b = [[0, 122, 34], [34, 96, 46], [80, 136, 26], [106, 112, 38], [150, 140, 24], [174, 88, 40], [214, 120, 30], [244, 104, 52], [296, 132, 28], [324, 92, 36]];
  return <G>{b.map(([x, y, w], i) => <G key={i}>
    <Rect x={x0 + x} y={y} width={w} height={200 - y} fill="#E4D9FF" />
    {i % 2 ? <Rect x={x0 + x + w / 2 - 4} y={y + 10} width={8} height={8} rx={1.5} fill="#F3EEFF" /> : null}
  </G>)}</G>;
}
// street furniture passing by: dark lamp posts and soft round trees
function Street({ x0 }: { x0: number }) {
  const lamp = (x: number) => <G key={'l' + x}>
    <Path d={`M${x0 + x} 198 L${x0 + x} 104 C${x0 + x} 96 ${x0 + x + 6} 92 ${x0 + x + 14} 92 L${x0 + x + 20} 92`} stroke="#3A3152" strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <Rect x={x0 + x + 16} y={89} width={12} height={6} rx={3} fill="#3A3152" />
    <Ellipse cx={x0 + x + 22} cy={97} rx={5} ry={2.5} fill={SAF} opacity={0.9} />
    <Rect x={x0 + x - 3} y={192} width={6} height={6} rx={1.5} fill="#3A3152" />
  </G>;
  const tree = (x: number, r: number) => <G key={'t' + x}>
    <Rect x={x0 + x - 2} y={176} width={4} height={22} rx={2} fill="#3A3152" />
    <Circle cx={x0 + x} cy={170 - r} r={r} fill="#D8C8FF" />
    <Circle cx={x0 + x - r * 0.35} cy={170 - r * 1.2} r={r * 0.55} fill="#E4D8FF" />
  </G>;
  return <G>{lamp(60)}{tree(150, 18)}{tree(178, 12)}{lamp(260)}{tree(340, 16)}</G>;
}
function Road({ x0 }: { x0: number }) {
  return <G>{[0, 1, 2, 3, 4, 5].map(i => <Rect key={i} x={x0 + i * 70 + 12} y={214} width={34} height={3.5} rx={1.75} fill="#fff" />)}</G>;
}

function Wheel({ cx, cy, k, spin }: { cx: number; cy: number; k: number; spin: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const s = 52 * k;
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: (cx - 26) * k, top: (cy - 26) * k, width: s, height: s }, st]}>
      <Svg width={s} height={s} viewBox="0 0 52 52">
        <Circle cx={26} cy={26} r={25} fill="#1B1230" />
        <Circle cx={26} cy={26} r={21} fill="none" stroke="#2E2445" strokeWidth={1.5} />
        <Circle cx={26} cy={26} r={13} fill="#fff" />
        <Circle cx={26} cy={26} r={5} fill="#1B1230" />
        <Path d="M26 14 V19 M14 26 H19 M38 26 H33 M26 38 V33" stroke={V} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Reanimated.View>
  );
}

/* the flag: two wave shapes cross-fade so it ripples in the wind (it trails backwards, to the left) */
function Flag({ k, rm }: { k: number; rm: boolean }) {
  const f = useSharedValue(0);
  useEffect(() => { if (!rm) f.value = withRepeat(withTiming(1, { duration: 320, easing: Easing.inOut(Easing.sin) }), -1, true) }, [rm]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - f.value })), b = useAnimatedStyle(() => ({ opacity: f.value }));
  const box = { position: 'absolute' as const, left: 10 * k, top: 2 * k, width: 58 * k, height: 44 * k };
  const shape = (d: string, hi: string, ty: number) => (
    <Svg width={58 * k} height={44 * k} viewBox="10 2 58 44">
      <Path d={d} fill={SAF} /><Path d={hi} fill="#FFD166" />
      <SText x={40} y={31 + ty} textAnchor="middle" fontFamily="Poppins_700Bold" fontWeight="700" fontSize={12.5} fill={VD}>WD</SText>
    </Svg>
  );
  return <>
    <Reanimated.View pointerEvents="none" style={[box, a]}>{shape('M65 8 C52 3 38 15 16 9 L21 25 L14 40 C36 45 50 33 65 38 Z', 'M65 8 C52 3 38 15 16 9 L18 17 C40 22 52 11 65 16 Z', 0)}</Reanimated.View>
    <Reanimated.View pointerEvents="none" style={[box, b]}>{shape('M65 8 C50 12 36 4 16 12 L20 27 L15 42 C34 36 50 44 65 38 Z', 'M65 8 C50 12 36 4 16 12 L18 19 C38 12 52 20 65 16 Z', 1)}</Reanimated.View>
  </>;
}

/* scooter + rider + kit box, drawn once (wheels and flag are separate layers so they can move) */
function Body() {
  return (
    <G>
      {/* flag pole, behind the box */}
      <Path d="M66 60 L66 5" stroke={DARK} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={66} cy={4} r={3.4} fill={SAF} />
      {/* kit box on the rear rack */}
      <G rotation={-4} origin="98, 88">
        <Rect x={56} y={52} width={86} height={68} rx={9} fill={V} />
        <Rect x={56} y={52} width={86} height={13} rx={6.5} fill={V2} />
        <Rect x={56} y={66} width={86} height={7} fill={VD} />
        <Circle cx={97} cy={96} r={16} fill="#fff" />
        <SText x={97} y={100.6} textAnchor="middle" fontFamily="Poppins_700Bold" fontWeight="700" fontSize={12.5} fill={V}>WD</SText>
        <Rect x={124} y={80} width={10} height={30} rx={5} fill={VD} opacity={0.55} />
        <Path d="M62 113 h74" stroke={VD} strokeWidth={2} opacity={0.35} strokeLinecap="round" />
      </G>
      {/* rear body + side panel */}
      <Path d="M80 166 C80 140 100 124 132 122 L196 122 C210 122 218 132 218 146 L220 158 L244 160 L240 170 L150 172 C148 158 136 150 120 150 C104 150 92 158 90 172 L80 172 Z" fill={DARK} />
      <Path d="M104 132 C112 127 124 126 136 126 L190 126 C200 126 206 132 206 142 L118 150 C108 150 100 142 104 132Z" fill={V} />
      <Path d="M112 134 L196 132" stroke={V3} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={84} cy={150} r={3.5} fill="#FF5A5A" />
      {/* foam bucket hooked on the rack */}
      <Path d="M62 118 C62 108 86 108 86 118" stroke={DARK} strokeWidth={2} fill="none" />
      <Path d="M58 124 L90 124 L86 150 C85.6 153 83.5 155 80.5 155 L67.5 155 C64.5 155 62.4 153 62 150 Z" fill={SAF} />
      <Path d="M58 124 L90 124 L89.3 129 L58.7 129 Z" fill="#E09A00" />
      <Path d="M66 136 L82 136" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Circle cx={63} cy={122} r={5} fill="#fff" /><Circle cx={71} cy={119} r={6.5} fill="#fff" /><Circle cx={80} cy={120} r={5.5} fill="#fff" /><Circle cx={87} cy={122} r={4} fill="#fff" />
      <Circle cx={75} cy={112} r={2.4} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} /><Circle cx={84} cy={108} r={1.6} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} />
      {/* seat */}
      <Path d="M126 118 C128 110 140 108 158 108 L198 110 C206 111 207 119 201 123 L130 124 Z" fill={INK} />
      {/* front fork, leg shield, fender, headlight, bars, mirror */}
      <Path d="M266 98 L270 176" stroke={DARK} strokeWidth={7} strokeLinecap="round" />
      <Path d="M238 170 L252 108 C254 100 262 95 268 98 L274 102 L262 150 L274 170 Z" fill={DARK} />
      <Path d="M248 108 C262 102 276 106 282 116 L292 148 C282 148 270 154 262 166 L250 168 Z" fill={V} />
      <Path d="M254 114 C264 110 273 113 279 121" stroke={V3} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M246 160 C254 146 286 146 296 162 L288 164 C278 154 260 154 254 164 Z" fill={V} />
      <Ellipse cx={289} cy={126} rx={4} ry={6.5} fill={SAF} />
      <Path d="M266 98 L262 76" stroke={DARK} strokeWidth={5} strokeLinecap="round" />
      <Path d="M252 76 L272 72" stroke={DARK} strokeWidth={5} strokeLinecap="round" />
      <Path d="M266 74 L272 58" stroke={DARK} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={274} cy={54} rx={4} ry={5} fill={DARK} />
      {/* legs + shoe */}
      <Path d="M150 98 C172 94 214 98 230 106 C238 111 238 122 231 126 L234 156 L218 156 L214 130 C196 128 168 126 150 120 Z" fill="#2E2645" />
      <Path d="M170 112 C190 112 210 114 224 118" stroke="#40375C" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M214 153 L238 153 C244 153 248 157 248 162 L214 162 Z" fill="#fff" />
      <Rect x={214} y={160} width={34} height={3} fill="#C9C3D6" />
      {/* torso: jacket with reflective stripes */}
      <Path d="M146 106 C142 84 150 60 168 50 C182 42 198 44 206 54 L216 70 C208 78 198 84 190 90 L192 106 Z" fill={V2} />
      <Path d="M168 50 C182 42 198 44 206 54 L216 70 C210 76 204 80 198 84 C196 70 188 56 168 50Z" fill="#8048F3" />
      <Path d="M148 96 C146 84 148 72 154 62 L160 100 Z" fill={V} opacity={0.6} />
      <Path d="M150 80 L190 74" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M156 66 L170 58 M159 71 L173 63" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
      {/* arm to the handlebar */}
      <Path d="M196 58 L224 82 L250 76" stroke={V} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M240 78 L246 77" stroke="#fff" strokeWidth={12} />
      <Circle cx={254} cy={75} r={5.5} fill={SKIN} />
      {/* collar, helmet, face, visor */}
      <Path d="M196 46 C200 40 210 38 214 44 L208 52 Z" fill="#fff" />
      <Circle cx={212} cy={26} r={20} fill={V} />
      <Path d="M196 20 C200 8 214 4 226 10" stroke={V3} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Path d="M194 30 L208 30" stroke={SAF} strokeWidth={3} strokeLinecap="round" />
      <Path d="M220 20 C230 20 236 26 236 34 C236 42 230 46 222 45 Z" fill={SKIN} />
      <Path d="M228 28 L231 28" stroke={DARK} strokeWidth={2} strokeLinecap="round" />
      <Path d="M226 38 C228 40 231 40 233 38" stroke="#9A4F2E" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M214 16 C226 14 238 20 240 30 L240 34" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M216 18 C226 17 236 22 238 30 L226 30 C224 24 220 20 216 18Z" fill="rgba(255,255,255,0.35)" />
      <Path d="M214 44 C218 46 224 46 230 44" stroke={VD} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

/* little exhaust puffs that drift back and fade */
function Puff({ k, i, rm }: { k: number; i: number; rm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => { if (!rm) p.value = withDelay(i * 420, withRepeat(withTiming(1, { duration: 1260, easing: Easing.out(Easing.quad) }), -1, false)) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: p.value < 0.1 ? p.value * 6 : 0.6 * (1 - p.value), transform: [{ translateX: -46 * k * p.value }, { translateY: -6 * k * p.value }, { scale: 0.5 + p.value }] }));
  const s = 12 * k;
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 74 * k, top: 160 * k, width: s, height: s, borderRadius: s / 2, backgroundColor: '#D9CEF0' }, st]} />;
}
/* speed streaks behind the kit box */
function Streak({ k, y, w, d, rm }: { k: number; y: number; w: number; d: number; rm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => { if (!rm) p.value = withDelay(d, withRepeat(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }), -1, false)) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: Math.sin(p.value * Math.PI) * 0.9, transform: [{ translateX: -30 * k * p.value }] }));
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: (54 - w) * k, top: y * k, width: w * k, height: 3 * k, borderRadius: 2, backgroundColor: '#C9B8F5' }, st]} />;
}

export function HeroRide({ width }: { width: number }) {
  const rm = !!useReducedMotion(), k = (width / VB_W) * 0.5, H = VB_H * k, RW = VB_W * k, ox = width / 2 - 158 * k;   // rider at half size, centred, always fully on screen
  const spin = useSharedValue(0), bob = useSharedValue(0), lean = useSharedValue(0), enter = useSharedValue(rm ? 1 : 0);
  useEffect(() => {
    if (rm) return;
    enter.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    spin.value = withRepeat(withTiming(1, { duration: 520, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withSequence(withTiming(1, { duration: 200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 200, easing: Easing.inOut(Easing.sin) })), -1, false);
    lean.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [rm]);
  const ride = useAnimatedStyle(() => ({ opacity: enter.value, transform: [
    { translateX: (1 - enter.value) * -40 + (lean.value * 2 - 1) * 14 * k },
  ] }));
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -1.6 * k * bob.value }, { rotate: `${-0.6 * lean.value}deg` }] }));
  return (
    <View pointerEvents="none" style={{ width, height: H, overflow: 'hidden' }} accessible accessibilityLabel="A Washing Daddy washer riding to your car with the wash kit">
      <Loop k={k} tile={360} ms={48000} top={0} h={80} rm={rm} span={width}>{x0 => <G key={x0}><Cloud x={x0 + 40} y={40} /><Cloud x={x0 + 230} y={22} s={0.8} /><Cloud x={x0 + 300} y={64} s={0.6} /></G>}</Loop>
      <Loop k={k} tile={360} ms={22000} top={0} h={200} rm={rm} span={width}>{x0 => <Skyline key={x0} x0={x0} />}</Loop>
      {/* road */}
      <Svg width={width} height={H} viewBox={`0 0 ${width / k} ${VB_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={198} width={width / k} height={34} fill="#ECE7F5" />
        <Rect x={0} y={198} width={width / k} height={2} fill="#DCD3EC" />
      </Svg>
      <Loop k={k} tile={400} ms={2100} top={0} h={200} rm={rm} span={width}>{x0 => <Street key={x0} x0={x0} />}</Loop>
      <Loop k={k} tile={420} ms={2200} top={0} h={VB_H} rm={rm} span={width}>{x0 => <Road key={x0} x0={x0} />}</Loop>
      {/* rider group */}
      <Reanimated.View style={[{ position: 'absolute', left: ox, top: 0, width: RW, height: H }, ride]}>
        <Svg width={RW} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
          <Ellipse cx={190} cy={202} rx={100} ry={5} fill="rgba(30,15,70,0.10)" />
        </Svg>
        <Streak k={k} y={70} w={28} d={0} rm={rm} />
        <Streak k={k} y={88} w={18} d={300} rm={rm} />
        <Streak k={k} y={104} w={24} d={600} rm={rm} />
        {[0, 1, 2].map(i => <Puff key={i} k={k} i={i} rm={rm} />)}
        <Wheel cx={118} cy={176} k={k} spin={spin} />
        <Wheel cx={270} cy={176} k={k} spin={spin} />
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: RW, height: H }, body]}>
          <Svg width={RW} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`}><Body /></Svg>
          <Flag k={k} rm={rm} />
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}

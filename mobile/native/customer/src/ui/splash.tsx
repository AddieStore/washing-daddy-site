/* The two short screens at app start: the "Washing Daddy" splash (a washer rides through a waking city) and the
   "Fetching location" map (washers close in on your pin). Same drawn style as the login story. */
import { ReactNode, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import Reanimated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { C, F } from '../theme';
import { RiderArt } from './heroRide';
import { Backdrop, Sparkle, usePulse, useLoop, abs } from './loginStory';

const SAFF = '#FFBA08';

/** screen 1: wordmark over a dawn city, the WD Partner rides through, tagline settles under it */
export function Splash({ children, still }: { children?: ReactNode; still?: boolean }) {
  const { width: W, height: H } = useWindowDimensions(), rm = useReducedMotion(), calm = !!(rm || still);
  const a = useSharedValue(calm ? 1 : 0), t = useSharedValue(calm ? 1 : 0), x = useSharedValue(calm ? 0.5 : 0), bob = usePulse(380), spin = useLoop(420);
  useEffect(() => {
    if (calm) return;
    a.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }); t.value = withDelay(320, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    x.value = withTiming(0.5, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, []);
  const w = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: 0.94 + 0.06 * a.value }] }));
  const g = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 6 }] }));
  const rd = useAnimatedStyle(() => ({ opacity: Math.min(1, x.value * 5), transform: [{ translateX: (x.value - 0.5) * W * 1.4 }, { translateY: bob.value * -2 }] }));
  const rw = Math.min(W * 0.62, 250), floor = H * 0.62;
  return (
    <View style={{ flex: 1, backgroundColor: '#4B12C9', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H }}><Backdrop W={W} H={H} tone={1} road /></View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: floor - 190, alignItems: 'center' }}>
        <Reanimated.Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontFamily: F.b600, fontSize: 34, color: '#fff', textAlign: 'center', width: W - 48 }, w]}>Washing Daddy</Reanimated.Text>
        <Reanimated.Text style={[{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,255,255,.85)', marginTop: 6 }, g]}>Car wash at your parking spot</Reanimated.Text>
      </View>
      <Reanimated.View style={[abs((W - rw) / 2, H - 36 - rw * 0.7 + 8, { width: rw }), rd]}><RiderArt w={rw} spin={spin} /></Reanimated.View>
      <Sparkle x={W * 0.18} y={floor - 150} s={14} delay={200} /><Sparkle x={W * 0.82} y={floor - 120} s={18} delay={600} />
      {children}
    </View>
  );
}

function PinSvg({ size = 44 }: { size?: number }) {
  return <Svg width={size} height={size * 1.25} viewBox="0 0 32 40"><Path d="M16 1C8.8 1 3 6.6 3 13.6 3 23 16 39 16 39s13-16 13-25.4C29 6.6 23.2 1 16 1z" fill={C.violet} /><Circle cx={16} cy={14} r={5.5} fill="#fff" /></Svg>;
}
/** a little washer riding in along one street toward the pin */
function Scout({ from, dx, dy, delay, w = 56 }: { from: [number, number]; dx: number; dy: number; delay: number; w?: number }) {
  const p = useSharedValue(0), rm = useReducedMotion();
  useEffect(() => { p.value = rm ? 1 : withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) })) }, []);
  const st = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.15, 1], [0, 1, 1]), transform: [{ translateX: (1 - p.value) * dx }, { translateY: (1 - p.value) * dy }] }));
  return <Reanimated.View style={[abs(from[0], from[1]), st]}><RiderArt w={w} /></Reanimated.View>;
}
/** a believable map, drawn at 400x800 and scaled to cover the screen: parks, a river, blocks of buildings, roads with casings, a roundabout */
function MapArt({ W, H }: { W: number; H: number }) {
  const sc = Math.max(W / 400, H / 800), ox = (W - 400 * sc) / 2, oy = (H - 800 * sc) / 2;
  const blocks: [number, number, number, number][] = [];
  const rr = (n: number) => { let s = n * 7919 + 13; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } };
  const r = rr(5);
  for (let gx = 0; gx < 9; gx++) for (let gy = 0; gy < 17; gy++) { if (r() > 0.22) blocks.push([gx * 48 - 10 + r() * 6, gy * 48 - 8 + r() * 6, 20 + r() * 16, 20 + r() * 16]) }
  const road = (d: string, w = 12, key?: string) => <G key={key}><Path d={d} stroke="#D8D1EC" strokeWidth={w + 3} fill="none" strokeLinecap="round" /><Path d={d} stroke="#FFFFFF" strokeWidth={w} fill="none" strokeLinecap="round" /></G>;
  return (
    <Svg width={W} height={H} viewBox={`${-ox / sc} ${-oy / sc} ${W / sc} ${H / sc}`} style={abs(0, 0)}>
      <Rect x={-200} y={-300} width={800} height={1400} fill="#EEEAF8" />
      {blocks.map((b, i) => <Rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={3} fill={i % 5 === 0 ? '#E3DDF3' : '#E8E3F5'} />)}
      <Path d="M-60 560 C 60 520 120 600 220 560 S 380 500 480 540 L480 640 C 380 600 300 660 200 650 S 40 610 -60 650Z" fill="#CFE4F7" />
      <Path d="M-60 566 C 60 526 120 606 220 566 S 380 506 480 546" stroke="#BBD8F0" strokeWidth={3} fill="none" />
      <Path d="M236 70 Q300 40 372 80 Q404 150 360 200 Q290 230 240 190 Q210 130 236 70Z" fill="#D5EBD5" />
      <Circle cx={300} cy={130} r={20} fill="#C6E3C6" /><Circle cx={268} cy={106} r={10} fill="#C6E3C6" /><Circle cx={340} cy={168} r={12} fill="#C6E3C6" />
      <Path d="M-20 300 Q60 270 150 300 L150 380 Q70 400 -20 372Z" fill="#D5EBD5" /><Circle cx={50} cy={330} r={14} fill="#C6E3C6" />
      {road('M-40 140 C 100 120 220 170 440 130', 14, 'a')}
      {road('M-40 420 C 120 440 250 380 440 420', 16, 'b')}
      {road('M-40 700 C 100 680 260 730 440 690', 12, 'c')}
      {road('M70 -40 C 90 200 40 420 100 840', 14, 'd')}
      {road('M200 -40 C 180 220 250 440 210 840', 18, 'e')}
      {road('M340 -40 C 360 260 300 460 380 840', 12, 'f')}
      {road('M-40 300 L 440 520', 9, 'g')}{road('M150 -40 L 330 840', 8, 'h')}
      <Circle cx={200} cy={290} r={26} fill="#fff" stroke="#D8D1EC" strokeWidth={3} /><Circle cx={200} cy={290} r={13} fill="#D5EBD5" />
      {[[70, 180], [200, 460], [340, 300], [120, 640]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={4} fill="#FFBA08" opacity={0.9} />)}
    </Svg>
  );
}
/** screen 2: city map with the customer's pin; WD Partners close in from the streets while we find where you are */
export function LoaderMap({ stage, place }: { stage: number; place?: string }) {
  const { width: W, height: H } = useWindowDimensions(), ring = useLoop(1300), ring2 = useLoop(1300, 0.5, 650), bob = usePulse(700);
  const cx = W / 2, cy = H * 0.42;
  const r1 = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - ring.value), transform: [{ scale: 0.4 + ring.value * 2.4 }] }));
  const r2 = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - ring2.value), transform: [{ scale: 0.4 + ring2.value * 2.4 }] }));
  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * -5 }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EEEAF8', overflow: 'hidden' }]}>
      <MapArt W={W} H={H} />
      <Scout from={[W * 0.04, H * 0.3]} dx={-200} dy={0} delay={150} />
      <Scout from={[W * 0.64, H * 0.56]} dx={220} dy={0} delay={450} w={50} />
      <Scout from={[W * 0.12, H * 0.64]} dx={-60} dy={220} delay={750} w={46} />
      <Reanimated.View style={[abs(cx - 40, cy - 40, { width: 80, height: 80, borderRadius: 40, backgroundColor: C.violet }), r1]} />
      <Reanimated.View style={[abs(cx - 40, cy - 40, { width: 80, height: 80, borderRadius: 40, backgroundColor: C.violet }), r2]} />
      <View style={abs(cx - 14, cy + 2, { width: 28, height: 8, borderRadius: 4, backgroundColor: 'rgba(84,9,218,0.28)' })} />
      <Reanimated.View style={[abs(cx - 22, cy - 62), pin]}><PinSvg /></Reanimated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: cy + 56, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, borderWidth: 1, borderColor: C.hair, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#1A0A4D', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stage < 2 ? SAFF : '#22C55E' }} />
          <Reanimated.Text style={{ fontFamily: F.b500, fontSize: 14, color: C.ink }}>{stage < 2 ? 'Fetching location…' : place || 'Location found'}</Reanimated.Text>
        </View>
        <Reanimated.Text style={{ fontFamily: F.body, fontSize: 12, color: '#4F4766', marginTop: 10 }}>{stage < 2 ? 'Finding WD Partners near you' : 'WD Partners are close by'}</Reanimated.Text>
      </View>
    </View>
  );
}

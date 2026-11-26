// Pull to refresh with a car-wash scene. <PullToRefresh> is a ScrollView that also takes `onRefresh` (default: refreshAll()).
// Phones: the system RefreshControl starts it. Web: a touch pull-down gesture does the same, so it can be demoed.
// While it runs a violet hatchback sits above the content, soap bubbles rise, foam sits on the roof and a spray band sweeps over the body; at the end
// the foam slides off, a shine glint crosses the paint, it sparkles, says "Taaza ho gaya" and gives a light haptic. Reduced motion: no loops, same panel, same toast.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Platform, RefreshControl, ScrollView, ScrollViewProps, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useReducedMotion } from './Hosts';
import { ui } from './bus';
import { useTheme } from './theme';
import { refreshAll } from '../lib/refresh';
import { t } from '../lib/i18n';

const PANEL_H = 116;
const CAR_W = 172;
const ND = Platform.OS !== 'web';
const MIN_SHOW_MS = 1100;

const BUBBLES = [
  { x: 22, size: 9, delay: 0, dur: 1500 }, { x: 52, size: 6, delay: 400, dur: 1300 }, { x: 80, size: 11, delay: 150, dur: 1700 },
  { x: 108, size: 7, delay: 700, dur: 1400 }, { x: 136, size: 10, delay: 300, dur: 1600 }, { x: 156, size: 6, delay: 900, dur: 1250 },
];

function Bubble({ x, size, delay, dur, run }: { x: number; size: number; delay: number; dur: number; run: boolean }) {
  const { c } = useTheme();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) { v.setValue(0.5); return; }
    v.setValue(0);
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, delay, easing: Easing.out(Easing.quad), useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [run, v, dur, delay]);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, bottom: 40, width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.4, borderColor: c.primary, backgroundColor: c.soft,
      opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -66] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 4, -3] }) }],
    }} />
  );
}

function Spark({ x, y, size, v }: { x: number; y: number; size: number; v: Animated.Value }) {
  const { c } = useTheme();
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={c.primary} />
      </Svg>
    </Animated.View>
  );
}

/* ---------- the car ---------- */
// Drawn in a 172x78 box (viewBox x starts at 14). Layers, back to front: ground shadow + dark wheel arches, spinning wheels, body.
const CAR_H = 78;
const VBX = 14;
const BODY = '#5409DA';
const LAV = '#B391FF';
const MINT = '#4DE0B4';
const DEEP = '#2B0A77';

const CarBack = React.memo(function CarBack() {
  return (
    <Svg width={CAR_W} height={CAR_H} viewBox={`${VBX} 0 ${CAR_W} ${CAR_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id="wdcShadow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#1B1030" stopOpacity="0.34" />
          <Stop offset="1" stopColor="#1B1030" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={72.5} rx={86} ry={4.5} fill="url(#wdcShadow)" />
      <Circle cx={62} cy={58} r={16.5} fill="#120C26" />
      <Circle cx={140} cy={58} r={16.5} fill="#120C26" />
    </Svg>
  );
});

const SPOKES = [0, 72, 144, 216, 288];
const Wheel = React.memo(function Wheel({ cx, spin }: { cx: number; spin: Animated.Value }) {
  return (
    <Animated.View style={{ position: 'absolute', left: cx - VBX - 14, top: 44, width: 28, height: 28, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={28} height={28} viewBox="-14 -14 28 28">
        <Circle r={14} fill="#17122A" />
        <Circle r={9.4} fill="#DCD0FF" stroke="#9D86E0" strokeWidth={1} />
        {SPOKES.map((a) => <Path key={a} d="M0 0 L0 -8.4" stroke="#6B52C0" strokeWidth={2.2} strokeLinecap="round" transform={`rotate(${a})`} />)}
        <Circle r={2.6} fill={MINT} />
      </Svg>
    </Animated.View>
  );
});

const CarBody = React.memo(function CarBody() {
  const arches = 'L156.5 58 A16.5 16.5 0 0 0 123.5 58 L78.5 58 A16.5 16.5 0 0 0 45.5 58 Z';
  return (
    <Svg width={CAR_W} height={CAR_H} viewBox={`${VBX} 0 ${CAR_W} ${CAR_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="wdcBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6A22F2" />
          <Stop offset="0.55" stopColor={BODY} />
          <Stop offset="1" stopColor="#4A06C2" />
        </LinearGradient>
        <LinearGradient id="wdcGlass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2E2558" />
          <Stop offset="1" stopColor="#150F2E" />
        </LinearGradient>
      </Defs>
      {/* body shell: hatch back, roof, raked screen, short bonnet, nose, with the two wheel arches cut out */}
      <Path d={`M22 58 L21 44 Q21 38.5 26 37 L31 35.5 C31 27 33 17 41 12.5 L100 12.5 C108 12.5 113 15 118 21 C122 25 126 29.5 132 33.5 L158 37.5 Q172 39 176 45 L177.5 53 Q178 58 174 58 ${arches}`} fill="url(#wdcBody)" />
      {/* darker rocker panel */}
      <Path d={`M22 58 L21.6 51.5 L177.4 51.5 L177.6 54 Q178 58 174 58 ${arches}`} fill="#3B04A0" opacity={0.5} />
      {/* lavender highlight: roof edge and bonnet */}
      <Path d="M32 31 C32 22 35 15 42 12.5 L100 12.5 C108 12.5 112 15 116 19.5 L121 25.5 C116 20.5 109 17 100 17 L44 17 C40 20 37 24 36 31 Z" fill={LAV} opacity={0.6} />
      <Path d="M133 35 L157 38.3 Q170 40 175 45.5 C163 42.5 150 41 134 38 Z" fill="#B99BFF" opacity={0.55} />
      {/* dark glass with reflection streaks */}
      <Path d="M36 35 C36.5 28 38.5 21.5 44 17 L77 17 L77 35 Z" fill="url(#wdcGlass)" />
      <Path d="M84 35 L84 17 L99 17 C105 17 108.5 19.5 112 24 L123 35 Z" fill="url(#wdcGlass)" />
      <Path d="M46 35 L58 17.5 L65 17.5 L53 35 Z M68 35 L74 26 L76 26 L71 35 Z M89 35 L99 18 L103 18 L93 35 Z" fill="#fff" opacity={0.2} />
      {/* roof rails */}
      <Rect x={46} y={9} width={52} height={2.8} rx={1.4} fill={DEEP} />
      <Rect x={51} y={11.5} width={3.4} height={2} fill={DEEP} />
      <Rect x={90} y={11.5} width={3.4} height={2} fill={DEEP} />
      {/* door seam, handles, mint accent stripe */}
      <Path d="M80.5 35.5 L80.8 55" stroke="#3B04A0" strokeWidth={1.1} opacity={0.75} />
      <Rect x={62} y={38.6} width={9} height={2.4} rx={1.2} fill="#C9B3FF" />
      <Rect x={88} y={38.6} width={9} height={2.4} rx={1.2} fill="#C9B3FF" />
      <Path d="M85 48.5 L117 48.5" stroke={MINT} strokeWidth={2.6} strokeLinecap="round" />
      {/* arch lips, mirror, lights */}
      <Path d="M45.5 58 A16.5 16.5 0 0 1 78.5 58 M123.5 58 A16.5 16.5 0 0 1 156.5 58" stroke={DEEP} strokeWidth={1.4} fill="none" opacity={0.8} />
      <Path d="M121 33.5 L129.5 34.2 Q131.5 34.4 130.6 36.6 L128.5 38.6 L120 38 Z" fill="#4A06C2" />
      <Rect x={21.3} y={38.5} width={6} height={9.5} rx={2.2} fill="#FF5C7A" />
      <Rect x={22.6} y={40} width={1.8} height={6} rx={0.9} fill="#FFC2CD" opacity={0.8} />
      <Path d="M160 40.6 Q168 40.8 175.5 44.6 Q176.6 46.6 176.4 48.8 Q168 48.2 160.6 46.8 Q158.6 43.6 160 40.6 Z" fill="#FFF6D6" />
      <Path d="M162.5 42 Q168 42.4 174 45" stroke="#fff" strokeWidth={1.2} fill="none" />
      <Rect x={172} y={53.2} width={5.5} height={3} rx={1.5} fill="#FFD27A" />
    </Svg>
  );
});

/** Soap foam sitting on the body: one group = a few overlapping blobs in a box (car units). */
type Blob = [number, number, number];
type FoamBox = { x: number; y: number; w: number; h: number; blobs: Blob[]; dx: number; dy: number };
const FOAM: FoamBox[] = [
  { x: 30, y: 2, w: 42, h: 20, dx: -16, dy: 30, blobs: [[38, 14.5, 4.2], [47, 10, 5], [57, 8.5, 5.8], [66, 11, 4.6]] },
  { x: 70, y: 0, w: 56, h: 24, dx: 30, dy: 34, blobs: [[76, 9.5, 5.2], [86, 7.5, 6.2], [97, 9, 5.6], [107, 12, 4.8], [115, 17, 4]] },
  { x: 130, y: 28, w: 46, h: 16, dx: 28, dy: 12, blobs: [[138, 33.5, 3.8], [147, 34.5, 4.6], [157, 36.5, 4], [166, 39.5, 3.2]] },
];

function FoamGroup({ g, foamIn, slide }: { g: FoamBox; foamIn: Animated.Value; slide: Animated.Value }) {
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: g.x - VBX, top: g.y, width: g.w, height: g.h,
      opacity: Animated.multiply(foamIn, slide.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.85, 0] })),
      transform: [
        { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, g.dx] }) },
        { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, g.dy] }) },
        { scale: foamIn.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
      ],
    }}>
      <Svg width={g.w} height={g.h} viewBox={`${g.x} ${g.y} ${g.w} ${g.h}`}>
        {g.blobs.map(([x, y, r], i) => (
          <React.Fragment key={i}>
            <Circle cx={x} cy={y} r={r} fill="#fff" stroke="#CDBBFF" strokeWidth={0.9} />
            <Circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.28} fill="#EDE5FF" />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The scene itself: a side-on hatchback, bubbles, spray band, foam, glint, sparkles. `run` = loops on, `done` = foam off + glint + sparkle once. */
function Scene({ run, done, rm }: { run: boolean; done: boolean; rm: boolean }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const foamIn = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run || rm) { sweep.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.delay(250),
    ]));
    loop.start();
    return () => loop.stop();
  }, [run, rm, sweep]);
  useEffect(() => {
    if (!run || rm) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 650, easing: Easing.linear, useNativeDriver: ND }));
    loop.start();
    return () => { loop.stop(); spin.setValue(0); };
  }, [run, rm, spin]);
  // foam: pops on while washing, slides off at the end, then a glint crosses the clean paint
  useEffect(() => {
    if (run) {
      slide.setValue(0); glint.setValue(0);
      if (rm) foamIn.setValue(1); else Animated.spring(foamIn, { toValue: 1, useNativeDriver: ND, speed: 10, bounciness: 8 }).start();
    } else if (done) {
      if (rm) { foamIn.setValue(1); slide.setValue(1); glint.setValue(1); return; }
      Animated.sequence([
        Animated.timing(slide, { toValue: 1, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: ND }),
        Animated.timing(glint, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]).start();
    } else { foamIn.setValue(0); slide.setValue(0); glint.setValue(0); }
  }, [run, done, rm, foamIn, slide, glint]);
  useEffect(() => {
    if (done) { if (rm) sparkle.setValue(1); else Animated.spring(sparkle, { toValue: 1, useNativeDriver: ND, speed: 12, bounciness: 14 }).start(); }
    else sparkle.setValue(0);
  }, [done, rm, sparkle]);
  return (
    <View style={{ width: CAR_W + 32, height: PANEL_H, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }}>
      <View style={{ width: CAR_W, height: CAR_H, overflow: 'hidden' }}>
        <CarBack />
        <Wheel cx={62} spin={spin} />
        <Wheel cx={140} spin={spin} />
        <CarBody />
        {FOAM.map((g, i) => <FoamGroup key={i} g={g} foamIn={foamIn} slide={slide} />)}
        {/* spray band: a slanted pale strip crossing the body */}
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: -8, left: 0, width: 20, height: CAR_H + 16, backgroundColor: '#fff', opacity: run && !rm ? 0.42 : 0,
          transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, CAR_W + 10] }) }, { rotate: '18deg' }],
        }} />
        {/* shine glint after the foam is gone: one bright streak, then a twinkle on the roof corner */}
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: -8, left: 0, width: 9, height: CAR_H + 16, backgroundColor: '#fff',
          opacity: glint.interpolate({ inputRange: [0, 0.1, 0.65, 0.75, 1], outputRange: [0, 0.75, 0.75, 0, 0] }),
          transform: [{ translateX: glint.interpolate({ inputRange: [0, 0.7], outputRange: [-20, CAR_W + 10], extrapolate: 'clamp' }) }, { rotate: '18deg' }],
        }} />
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: 130 - VBX - 9, top: 27 - 9, width: 18, height: 18,
          opacity: glint.interpolate({ inputRange: [0.55, 0.8, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ scale: glint.interpolate({ inputRange: [0.55, 0.8, 1], outputRange: [0.2, 1.25, 1], extrapolate: 'clamp' }) }, { rotate: glint.interpolate({ inputRange: [0.55, 1], outputRange: ['-40deg', '0deg'], extrapolate: 'clamp' }) }],
        }}>
          <Svg width={18} height={18} viewBox="0 0 20 20"><Path d="M10 0 L11.8 8.2 L20 10 L11.8 11.8 L10 20 L8.2 11.8 L0 10 L8.2 8.2 Z" fill="#fff" stroke="#CDBBFF" strokeWidth={0.8} /></Svg>
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', left: 16, right: 16, top: 0, bottom: 0 }} pointerEvents="none">
        {BUBBLES.map((b, i) => <Bubble key={i} {...b} run={run} />)}
        <Spark x={10} y={34} size={16} v={sparkle} />
        <Spark x={CAR_W - 28} y={18} size={20} v={sparkle} />
        <Spark x={CAR_W / 2 - 4} y={6} size={12} v={sparkle} />
      </View>
    </View>
  );
}

type SV = React.ComponentRef<typeof ScrollView>;
type Props = ScrollViewProps & { onRefresh?: () => Promise<unknown> | void };

/** Drop-in ScrollView with pull-to-refresh. Keeps the ref, props and stickyHeaderIndices the screen already uses. */
export const PullToRefresh = forwardRef<SV, Props>(function PullToRefresh({ onRefresh, children, stickyHeaderIndices, ...rest }, fwd) {
  const rm = useReducedMotion();
  const h = useRef(new Animated.Value(0)).current;
  const hv = useRef(0);
  const ref = useRef<SV>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const [run, setRun] = useState(false);
  const [done, setDone] = useState(false);
  useImperativeHandle(fwd, () => ref.current as SV);
  useEffect(() => { alive.current = true; const id = h.addListener(({ value }) => { hv.current = value; }); return () => { alive.current = false; h.removeListener(id); }; }, [h]);

  const move = useCallback((to: number, ms = 220) => {
    if (rm || ms === 0) { h.setValue(to); return; }
    Animated.timing(h, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [h, rm]);

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setDone(false); setRun(true); move(PANEL_H);
    const t0 = Date.now();
    try { await (onRefresh ? onRefresh() : refreshAll()); } catch { /* a failed refresh still finishes the show */ }
    const wait = MIN_SHOW_MS - (Date.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (!alive.current) { busy.current = false; return; }
    setRun(false); setDone(true);
    ui.toast(t('Taaza ho gaya')); ui.haptic([10, 30, 10]);
    await new Promise((r) => setTimeout(r, 1500));
    if (!alive.current) { busy.current = false; return; }
    move(0, 260);
    setTimeout(() => { if (alive.current) setDone(false); busy.current = false; }, 300);
  }, [move, onRefresh]);

  // web: pull down from the very top with a finger
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node: any = (ref.current as any)?.getScrollableNode?.();
    if (!node?.addEventListener) return;
    let y0: number | null = null, pulling = false;
    const ts = (e: TouchEvent) => { y0 = !busy.current && node.scrollTop <= 0 ? e.touches[0].clientY : null; pulling = false; };
    const tm = (e: TouchEvent) => {
      if (y0 == null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 6 && node.scrollTop <= 0) {
        pulling = true;
        if (e.cancelable) e.preventDefault();
        h.setValue(Math.min(PANEL_H, (dy - 6) * 0.6));
      } else if (!pulling) y0 = dy < -6 ? null : y0;
    };
    const te = () => {
      if (!pulling) { y0 = null; return; }
      pulling = false; y0 = null;
      if (hv.current >= PANEL_H * 0.7) void start(); else move(0, 200);
    };
    node.addEventListener('touchstart', ts, { passive: true });
    node.addEventListener('touchmove', tm, { passive: false });
    node.addEventListener('touchend', te, { passive: true });
    node.addEventListener('touchcancel', te, { passive: true });
    return () => { node.removeEventListener('touchstart', ts); node.removeEventListener('touchmove', tm); node.removeEventListener('touchend', te); node.removeEventListener('touchcancel', te); };
  }, [h, move, start]);

  const sticky = stickyHeaderIndices?.map((i) => i + 1);
  return (
    <ScrollView
      ref={ref}
      {...rest}
      stickyHeaderIndices={sticky}
      refreshControl={Platform.OS === 'web' ? undefined : (
        <RefreshControl refreshing={false} onRefresh={() => { void start(); }} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />
      )}
    >
      <Animated.View pointerEvents="none" style={{ height: h, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', opacity: h.interpolate({ inputRange: [0, PANEL_H * 0.5, PANEL_H], outputRange: [0, 0.6, 1] }) }}>
        <Scene run={run} done={done} rm={rm} />
      </Animated.View>
      {children}
    </ScrollView>
  );
});

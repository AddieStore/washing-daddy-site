// Pull to refresh with a car-wash scene. <PullToRefresh> is a ScrollView that also takes `onRefresh` (default: refreshAll()).
// Phones: the system RefreshControl starts it. Web: a touch pull-down gesture does the same, so it can be demoed.
// While it runs a violet car sits above the content, soap bubbles rise, a spray band sweeps over the body; at the end
// it sparkles, says "Taaza ho gaya" and gives a light haptic. Reduced motion: no loops, same panel, same toast.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Platform, RefreshControl, ScrollView, ScrollViewProps, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from './Hosts';
import { ui } from './bus';
import { useTheme } from './theme';
import { refreshAll } from '../lib/refresh';
import { t } from '../lib/i18n';

const PANEL_H = 104;
const CAR_W = 168;
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
      position: 'absolute', left: x, bottom: 30, width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.4, borderColor: c.primary, backgroundColor: c.soft,
      opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -58] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 4, -3] }) }],
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

/** The scene itself: a side-on car, bubbles, spray band, sparkles. `run` = loops on, `done` = sparkle once. */
function Scene({ run, done }: { run: boolean; done: boolean }) {
  const { c } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) { sweep.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.delay(250),
    ]));
    loop.start();
    return () => loop.stop();
  }, [run, sweep]);
  useEffect(() => {
    if (done) Animated.spring(sparkle, { toValue: 1, useNativeDriver: ND, speed: 12, bounciness: 14 }).start();
    else sparkle.setValue(0);
  }, [done, sparkle]);
  return (
    <View style={{ width: CAR_W + 32, height: PANEL_H, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}>
      <View style={{ width: CAR_W, height: 60, overflow: 'hidden' }}>
        <Svg width={CAR_W} height={60} viewBox="0 0 200 72">
          <Path d="M8 56 L8 44 Q8 37 17 35 L52 31 L72 13 Q76 9 85 9 L125 9 Q134 9 140 15 L154 31 L184 35 Q194 37 194 45 L194 56 Z" fill={c.primary} />
          <Path d="M62 31 L79 16 L101 16 L101 31 Z" fill={c.bg} opacity={0.9} />
          <Path d="M107 31 L107 16 L123 16 Q128 16 132 21 L143 31 Z" fill={c.bg} opacity={0.9} />
          <Circle cx={52} cy={57} r={13} fill={c.fg} />
          <Circle cx={52} cy={57} r={5.5} fill={c.soft} />
          <Circle cx={150} cy={57} r={13} fill={c.fg} />
          <Circle cx={150} cy={57} r={5.5} fill={c.soft} />
        </Svg>
        {/* spray band: a slanted pale strip crossing the body */}
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: -6, left: 0, width: 22, height: 80, backgroundColor: '#fff', opacity: run ? 0.5 : 0,
          transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, CAR_W + 10] }) }, { rotate: '18deg' }],
        }} />
      </View>
      <View style={{ position: 'absolute', left: 16, right: 16, top: 0, bottom: 0 }} pointerEvents="none">
        {BUBBLES.map((b, i) => <Bubble key={i} {...b} run={run} />)}
        <Spark x={26} y={26} size={16} v={sparkle} />
        <Spark x={CAR_W - 34} y={14} size={20} v={sparkle} />
        <Spark x={CAR_W / 2 - 4} y={8} size={12} v={sparkle} />
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
    await new Promise((r) => setTimeout(r, 900));
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
        <Scene run={run} done={done} />
      </Animated.View>
      {children}
    </ScrollView>
  );
});

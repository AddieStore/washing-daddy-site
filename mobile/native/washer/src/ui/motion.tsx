// Small, cheap motion pieces (plain Animated, native driver on phones): an entrance, a float, a pulse,
// rising soap bubbles and a success tick. Every one of them stands still when the phone asks for reduced motion.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { useReducedMotion } from './Hosts';
import { Icon } from './Icons';
import { brand } from './theme';

const ND = Platform.OS !== 'web';

/** Fades and slides its children in once, after `delay` ms. Give it a new `key` to play it again. */
export function Rise({ delay = 0, distance = 18, duration = 520, children, style }: {
  delay?: number; distance?: number; duration?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(a, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (rm) { a.stopAnimation(); a.setValue(1) } }, [rm, a]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A slow up-and-down bob (and an optional small sway), for photo cards and illustrations. */
export function Float({ amp = 5, period = 3200, phase = 0, sway = 0, children, style }: {
  amp?: number; period?: number; phase?: number; sway?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (rm) { a.setValue(0.5); return }
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: period / 2, easing: ease, useNativeDriver: ND }),
      Animated.timing(a, { toValue: 0, duration: period / 2, easing: ease, useNativeDriver: ND }),
    ]));
    const id = setTimeout(() => loop.start(), phase);
    return () => { clearTimeout(id); loop.stop() };
  }, [rm, a, period, phase]);
  const transform: any[] = [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-amp, amp] }) }];
  if (sway) transform.push({ rotate: a.interpolate({ inputRange: [0, 1], outputRange: [`${-sway}deg`, `${sway}deg`] }) });
  return <Animated.View style={[style, { transform }]}>{children}</Animated.View>;
}

/** Rings that grow out of the middle and fade, like a radar ping. Put it behind an icon. */
export function Pulse({ size, color = '#5409DA', rings = 2, period = 2200 }: { size: number; color?: string; rings?: number; period?: number }) {
  const rm = useReducedMotion();
  const vals = useRef(Array.from({ length: rings }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (rm) return;
    const loops = vals.map((v, i) => {
      v.setValue(0);
      const l = Animated.loop(Animated.sequence([
        Animated.delay((period / rings) * i),
        Animated.timing(v, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]));
      l.start();
      return l;
    });
    return () => loops.forEach(l => l.stop());
  }, [rm, vals, period, rings]);
  if (rm) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }],
        }} />
      ))}
    </View>
  );
}

/** Soap bubbles rising inside a box of the given size (the box itself does not clip). */
export function Bubbles({ width, height, count = 7 }: { width: number; height: number; count?: number }) {
  const rm = useReducedMotion();
  const spec = useRef(Array.from({ length: count }, (_, i) => ({
    v: new Animated.Value(0),
    x: ((i * 37) % 100) / 100,           // spread across the width without Math.random (stable between renders)
    r: 6 + ((i * 13) % 4) * 4,
    dur: 2600 + ((i * 29) % 5) * 380,
    delay: i * 340,
  }))).current;
  useEffect(() => {
    if (rm) return;
    const loops = spec.map(b => {
      b.v.setValue(0);
      const l = Animated.loop(Animated.sequence([
        Animated.delay(b.delay),
        Animated.timing(b.v, { toValue: 1, duration: b.dur, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]));
      l.start();
      return l;
    });
    return () => loops.forEach(l => l.stop());
  }, [rm, spec]);
  if (rm) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {spec.map((b, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: b.x * (width - b.r * 2), bottom: 0, width: b.r * 2, height: b.r * 2, borderRadius: b.r,
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)',
          opacity: b.v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 0.9, 0] }),
          transform: [
            { translateY: b.v.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) },
            { translateX: b.v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 8 : -8, 0] }) },
            { scale: b.v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) },
          ],
        }}>
          <View style={{ position: 'absolute', left: b.r * 0.45, top: b.r * 0.35, width: b.r * 0.5, height: b.r * 0.5, borderRadius: b.r, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </Animated.View>
      ))}
    </View>
  );
}

/** A green circle that springs in with a tick. */
export function SuccessTick({ size = 84 }: { size?: number }) {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rm) { a.setValue(1); tick.setValue(1); return }
    Animated.sequence([
      Animated.spring(a, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: ND }),
      Animated.spring(tick, { toValue: 1, speed: 20, bounciness: 14, useNativeDriver: ND }),
    ]).start();
  }, [rm, a, tick]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={size} color={brand.mint} rings={1} period={1400} />
      <Animated.View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: brand.mint, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: a }],
      }}>
        <Animated.View style={{ opacity: tick, transform: [{ scale: tick.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
          <Icon name="check" size={size * 0.5} color="#fff" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Reward motion (plain Animated + react-native-svg): a number that counts up, and a burst of sparkles. Both stand still for reduced motion.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from './Hosts';

const ND = Platform.OS !== 'web';

/** Counts from `from` to `to` (ease-out) and returns the rounded value to draw. Reduced motion: jumps to `to`. */
export function useCountUp(to: number, { from = 0, duration = 900, delay = 0 }: { from?: number; duration?: number; delay?: number } = {}) {
  const rm = useReducedMotion();
  const [v, setV] = useState(rm ? to : from);
  useEffect(() => {
    if (rm) { setV(to); return }
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setV(Math.round(from + (to - from) * value)));
    const anim = Animated.timing(a, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => { anim.stop(); a.removeListener(id) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, rm]);
  return v;
}

const STAR = 'M12 1 C12.6 7.5 16.5 11.4 23 12 C16.5 12.6 12.6 16.5 12 23 C11.4 16.5 7.5 12.6 1 12 C7.5 11.4 11.4 7.5 12 1 Z';

/** Four-point sparkles flying out of the middle of a box, then fading. Play it again by changing `play` (a number > 0). */
export function SparkleBurst({ play, size = 160, count = 12, colors = ['#FFBA08', '#FFD166', '#FFFFFF', '#8A55F5'] }: {
  play: number; size?: number; count?: number; colors?: string[];
}) {
  const rm = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const spec = useRef(Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.25;
    return {
      dx: Math.cos(ang) * size * (0.34 + ((i * 7) % 5) * 0.05), dy: Math.sin(ang) * size * (0.34 + ((i * 3) % 5) * 0.05),
      s: 10 + ((i * 5) % 4) * 4, col: colors[i % colors.length], rot: (i % 2 ? 1 : -1) * 90,
    };
  })).current;
  useEffect(() => {
    if (!play || rm) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [play, rm, t]);
  if (!play || rm) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {spec.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: p.s, height: p.s,
          opacity: t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
            { scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.25, 0.4] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }}>
          <Svg width={p.s} height={p.s} viewBox="0 0 24 24"><Path d={STAR} fill={p.col} /></Svg>
        </Animated.View>
      ))}
    </View>
  );
}

/** A still four-point sparkle, for decoration. */
export function Spark({ size = 14, color = '#FFBA08', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}><Path d={STAR} fill={color} /></Svg>;
}

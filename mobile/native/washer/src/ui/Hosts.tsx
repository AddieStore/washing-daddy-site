import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { onConfetti, onFlash, onToast } from './bus';
import { SheetHost } from './Sheet';
import { F, brand } from './theme';

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setRm(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setRm(v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return rm;
}

/* ---------- Toast ---------- */
function ToastHost({ rm }: { rm: boolean }) {
  const insets = React.useContext(SafeAreaInsetsContext);
  const [msg, setMsg] = useState('');
  const t = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      onToast((m) => {
        setMsg(m);
        if (timer.current) clearTimeout(timer.current);
        Animated.timing(t, { toValue: 1, duration: rm ? 0 : 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
        timer.current = setTimeout(() => {
          Animated.timing(t, { toValue: 0, duration: rm ? 0 : 260, useNativeDriver: true }).start();
        }, 2600);
      }),
    [rm, t],
  );
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        st.toastWrap,
        { bottom: 96 + (insets?.bottom ?? 0), opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
      ]}
    >
      <View style={st.toast}>
        <Text style={st.toastTxt}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

/* ---------- Confetti ---------- */
const COLS = ['#5409DA', '#FFBA08', '#FF6A1A', '#2E8BFF', '#14C08A', '#FFF6E9'];
type Piece = { id: number; x: number; w: number; h: number; col: string; dx: number; up: number; rot: number; delay: number };

function Burst({ strength, onDone }: { strength: number; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: Math.round(120 * strength) }, (_, i) => ({
        id: i,
        x: width / 2 + (Math.random() - 0.5) * 80,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        col: COLS[Math.floor(Math.random() * COLS.length)],
        dx: (Math.random() - 0.5) * width * 1.1,
        up: height * (0.12 + Math.random() * 0.3),
        rot: (Math.random() - 0.5) * 1080,
        delay: Math.random() * 0.12,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const y0 = height * 0.45;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => {
        const d = p.delay;
        const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        // rise to apex then fall past the bottom
        const translateY = t.interpolate({
          inputRange: [0, 0.22 + d, 1],
          outputRange: [0, -p.up, height - y0 + 60],
          easing: Easing.out(Easing.quad),
        } as any);
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
        const opacity = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: y0,
              width: p.w,
              height: p.h,
              backgroundColor: p.col,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

function ConfettiHost({ rm }: { rm: boolean }) {
  const [bursts, setBursts] = useState<{ id: number; k: number }[]>([]);
  const n = useRef(0);
  useEffect(
    () =>
      onConfetti((k) => {
        if (rm) return;
        const id = ++n.current;
        setBursts((b) => [...b, { id, k }]);
      }),
    [rm],
  );
  return (
    <>
      {bursts.map((b) => (
        <Burst key={b.id} strength={b.k} onDone={() => setBursts((x) => x.filter((y) => y.id !== b.id))} />
      ))}
    </>
  );
}

/* ---------- Flash ---------- */
function FlashHost({ rm }: { rm: boolean }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(
    () =>
      onFlash(() => {
        if (rm) return;
        o.setValue(0.9);
        Animated.timing(o, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }),
    [rm, o],
  );
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: o }]} />;
}

export function UiHosts() {
  const rm = useReducedMotion();
  return (
    <>
      <SheetHost />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ToastHost rm={rm} />
        <ConfettiHost rm={rm} />
        <FlashHost rm={rm} />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    backgroundColor: brand.ink,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  toastTxt: { color: brand.cream, fontFamily: F.bold, fontSize: 15, textAlign: 'center' },
});

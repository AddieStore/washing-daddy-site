import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { F, useTheme } from './theme';

export function Sheet({
  visible,
  onClose,
  children,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  /** optional heading drawn under the handle (20/600) */
  title?: string;
}) {
  const { c, dark } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext);
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // While the keyboard is up the sheet already sits above it, so the home-indicator inset must not be added on top (no overshoot).
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // swipe down on the handle area to close (any sheet)
  const drag = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { drag.setValue(Math.max(0, g.dy)) },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 90 || g.vy > 0.8) closeRef.current();
      else Animated.spring(drag, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => { Animated.spring(drag, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start() },
  })).current;
  useEffect(() => { if (visible) drag.setValue(0) }, [visible, drag]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(t, { toValue: 1, speed: 18, bounciness: 0, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(t, { toValue: 0, duration: 220, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [height, 0], extrapolate: 'clamp' });
  const bottomPad = 24 + (kb ? 0 : insets?.bottom ?? 0);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.fill}>
        <Animated.View style={[s.scrim, { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <View style={s.bottom} pointerEvents="box-none">
          <Animated.View
            style={[
              s.sheet,
              {
                backgroundColor: c.sheetBg,
                maxHeight: height * 0.92,
                transform: [{ translateY: Animated.add(translateY, drag) }],
              },
            ]}
          >
            <View {...pan.panHandlers} accessibilityLabel="Neeche kheench ke band karo" style={[{ height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -8 }, Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab', touchAction: 'none' } as any) : null]}>
              <View style={[s.grab, { backgroundColor: c.fg3, opacity: 0.35, marginTop: 0, marginBottom: 0 }]} />
            </View>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
            >
              {title ? <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: c.fg, marginTop: 4, marginBottom: 16 }}>{title}</Text> : null}
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(20,20,20,0.45)' },
  bottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    paddingTop: 8,
  },
  grab: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 4, marginBottom: 16 },
});

/* ---------- imperative host ---------- */
type Render = (close: () => void) => React.ReactNode;
let listener: ((r: Render | null) => void) | null = null;

export const sheet = {
  open(render: Render) {
    listener?.(render);
  },
  close() {
    listener?.(null);
  },
};

export function SheetHost() {
  const [render, setRender] = useState<Render | null>(null);
  const [visible, setVisible] = useState(false);
  const last = useRef<Render | null>(null);

  useEffect(() => {
    listener = (r) => {
      if (r) {
        last.current = r;
        setRender(() => r);
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    return () => {
      listener = null;
    };
  }, []);

  const close = useCallback(() => setVisible(false), []);
  return (
    <Sheet visible={visible} onClose={close}>
      {render ? render(close) : last.current ? last.current(close) : null}
    </Sheet>
  );
}

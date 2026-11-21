import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(t, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const bottomPad = 24 + (kb ? 0 : insets?.bottom ?? 0);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.fill}>
        <Animated.View style={[s.scrim, { opacity: t }]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <View style={s.bottom} pointerEvents="box-none">
          <Animated.View
            style={[
              s.sheet,
              {
                backgroundColor: c.sheetBg,
                maxHeight: height * 0.92,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[s.grab, { backgroundColor: c.fg3, opacity: 0.4 }]} />
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
            >
              {title ? <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 20, lineHeight: 28, color: c.fg, marginBottom: 12 }}>{title}</Text> : null}
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
  scrim: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(23,23,23,0.4)' },
  bottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#1A1033',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
    paddingTop: 10,
  },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 4, marginBottom: 12 },
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from './theme';

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { c, dark } = useTheme();
  const insets = React.useContext(SafeAreaInsetsContext);
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(visible ? 1 : 0)).current;

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
  const bottomPad = 24 + (insets?.bottom ?? 0);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.fill}>
        <Animated.View style={[s.scrim, { opacity: t }]}>
          <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <View style={s.bottom} pointerEvents="box-none">
          <Animated.View
            style={[
              s.sheet,
              {
                backgroundColor: c.sheetBg,
                borderColor: c.line,
                maxHeight: height * 0.92,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[s.grab, { backgroundColor: c.line }]} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
            >
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
  scrim: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(18,7,36,0.55)' },
  bottom: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    overflow: 'hidden',
  },
  grab: { width: 48, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 4, marginBottom: 14 },
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

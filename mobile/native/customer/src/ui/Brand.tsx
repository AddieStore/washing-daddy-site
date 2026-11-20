/* Brand shell shared by sign-in and the permission primer: a violet gradient top and a white sheet with rounded top corners.
   After login the app sits on the same violet-tinted canvas (C.canvas), so the hand-off is one colour family. */
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';
import { FadeUp, useRM } from './motion';
import { src } from '../img';

/** full-bleed violet gradient with two soft glows; put it first inside a flex:1 View */
export function BrandBg() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[C.brandTop, '#4608B8', C.brandDeep]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', right: -90, top: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ position: 'absolute', left: -70, top: 150, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,186,8,0.10)' }} />
    </View>
  );
}

/** white bottom sheet that rises into place once */
export function Sheet({ children, style, onLayout }: { children: ReactNode; style?: StyleProp<ViewStyle>; onLayout?: (e: any) => void }) {
  return (
    <FadeUp distance={56} delay={140} duration={380} style={[{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#1A0650', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 }, style]}>
      <View onLayout={onLayout} style={{ flexGrow: 1 }}>{children}</View>
    </FadeUp>
  );
}

const SLIDE_KEYS = ['slide0', 'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6'] as const;
/** gently drifting strip of the real washer photos (stands still with reduced motion) */
export function PhotoStrip({ width, h = 132 }: { width: number; h?: number }) {
  const rm = useRM(), x = useRef(new Animated.Value(0)).current;
  const cw = Math.round(h * 0.8), gap = 10, set = SLIDE_KEYS.length * (cw + gap);
  useEffect(() => {
    if (rm) return;
    const a = Animated.loop(Animated.timing(x, { toValue: -set, duration: 46000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [rm, set]);
  return (
    <FadeUp delay={120} style={{ width, height: h + 16, overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', gap, paddingLeft: 20, transform: [{ translateX: x }], width: set * 2 + 20 }}>
        {[...SLIDE_KEYS, ...SLIDE_KEYS].map((k, i) => (
          <View key={i} style={{ width: cw, height: h, marginTop: i % 2 ? 16 : 0, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Image source={src(k)!} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </View>
        ))}
      </Animated.View>
    </FadeUp>
  );
}

export const BrandLogo = ({ w = 104 }: { w?: number }) => <Image source={src('logo')!} resizeMode="contain" accessibilityLabel="Washing Daddy" style={{ width: w, height: w * 157 / 260 }} />;

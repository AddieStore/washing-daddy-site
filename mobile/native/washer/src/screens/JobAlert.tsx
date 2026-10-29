// Incoming extra job: a full-screen overlay card (Uber/Swiggy style). Shown while view.jobAlert is set.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, F, brand, ui, useTheme } from '../ui';
import { Money, act, emit, useStore, view } from '../state/store';
import { rupee } from '../lib/time';
import { t } from '../lib/i18n';

export default function JobAlert() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const job = view.jobAlert;
  const a = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!job) { a.setValue(0); return }
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [job, a, pulse]);
  if (!job) return null;

  const dismiss = () => { view.jobAlert = null; emit() };
  const meta = [job.car || job.reg, job.area, job.customer_name].filter(Boolean).join(' · ');
  const accept = () => {
    act.alertAccept();
    router.push('/extra' as any);
    ui.toast(t('Extra tab mein dekho'));
  };
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 600, backgroundColor: 'rgba(18,7,36,0.72)', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Pressable accessibilityLabel="Close" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={dismiss} />
      <Animated.View
        accessibilityRole="alert"
        style={{
          width: '100%', maxWidth: 420, maxHeight: height * 0.9, backgroundColor: c.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30,
          paddingTop: 24, paddingHorizontal: 20, paddingBottom: 24 + insets.bottom,
          opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: brand.gold, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brand.orange, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }} />
          <Text style={{ fontFamily: F.black, fontSize: 13, color: brand.ink2, letterSpacing: 0.3 }}>{t('⚡ Naya kaam aaya!')}</Text>
        </View>
        <Text style={{ fontFamily: F.black, fontSize: 22, color: c.fg, marginBottom: 4 }}>{job.service || t('Extra kaam')}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: c.fg3, marginBottom: 20 }}>{meta}</Text>
        <Text style={{ fontFamily: F.black, fontSize: 28, color: c.ok, marginBottom: 20 }}>{rupee(Money.share(job.price)) + ' ' + t('aapke')}</Text>
        <View style={{ gap: 10 }}>
          <Button label={t('✓ Lo yeh kaam')} variant="gold" onPress={accept} />
          <Button label={t('Nahi karna')} variant="ghost" onPress={() => act.alertPass()} />
        </View>
      </Animated.View>
    </View>
  );
}

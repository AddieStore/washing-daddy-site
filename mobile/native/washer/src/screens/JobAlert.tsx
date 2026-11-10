// Incoming extra job: a full-screen overlay card (Uber/Swiggy style). Shown while view.jobAlert is set.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigNumber, Button, DashCard, F, IconBubble, brand, ui, useTheme } from '../ui';
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
          width: '100%', maxWidth: 420, maxHeight: height * 0.9, backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingTop: 24, paddingHorizontal: 20, paddingBottom: 24 + insets.bottom,
          opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: brand.gold, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brand.orange, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }} />
          <Text style={{ fontFamily: F.black, fontSize: 13, color: brand.ink2, letterSpacing: 0.3 }}>{t('⚡ Naya kaam aaya!')}</Text>
        </View>
        <DashCard style={{ padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBubble icon="plus" size={46} tint={brand.orange} bg="rgba(255,106,26,0.14)" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 16, color: c.fg }}>{job.service || t('Extra kaam')}</Text>
            {meta ? <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 2 }}>{meta}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: '42%' }}>
            <BigNumber value={rupee(Money.share(job.price))} size={30} style={{ color: c.ok }} />
            <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{t('aapke')}</Text>
          </View>
        </DashCard>
        <View style={{ gap: 10 }}>
          <Button label={t('✓ Lo yeh kaam')} variant="gold" onPress={accept} />
          <Button label={t('Nahi karna')} variant="ghost" onPress={() => act.alertPass()} />
        </View>
      </Animated.View>
    </View>
  );
}

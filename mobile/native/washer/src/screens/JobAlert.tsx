// Incoming extra job: a full-screen overlay card (Uber/Swiggy style). Shown while view.jobAlert is set.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, F, Group, ReceiptRow, Row, SheetHeader, ui, useTheme } from '../ui';
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
    <View accessibilityViewIsModal style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 600, backgroundColor: 'rgba(20,20,20,0.5)', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Pressable accessibilityLabel="Close" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={dismiss} />
      <Animated.View
        accessibilityRole="alert"
        style={{
          width: '100%', maxWidth: 420, maxHeight: height * 0.9, backgroundColor: c.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingTop: 24, paddingHorizontal: 16, paddingBottom: 24 + insets.bottom,
          opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        }}
      >
        <View style={{ width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: -12, marginBottom: 16, backgroundColor: c.grey, opacity: 0.35 }} />
        <SheetHeader title={t('Naya kaam aaya!')} action={t('Baad mein')} onAction={dismiss} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }} />
          <Chip tone="violet">{t('Extra kaam')}</Chip>
        </View>
        <Group>
          <Row icon="plus" label={job.service || t('Extra kaam')} sub={meta || undefined} />
          <View style={{ padding: 16 }}>
            <ReceiptRow label={t('aapke')} value={rupee(Money.share(job.price))} total style={{ borderTopWidth: 0, paddingTop: 0, marginTop: 0 }} tone="ok" />
          </View>
        </Group>
        <View style={{ gap: 12, marginTop: 20 }}>
          <Button label={t('Lo yeh kaam')} variant="violet" onPress={accept} />
          <Button label={t('Nahi karna')} variant="ghost" onPress={() => act.alertPass()} />
        </View>
      </Animated.View>
    </View>
  );
}

// Round setup (opened from Profile): drag the cars into the 6 slots, then lock the round. Home shows the saved result read-only.
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DotBg, Footer, useTheme } from '../ui';
import { useStore } from '../state/store';
import { t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { LockBar, RoundTimeline, type ScrollCtl } from '../screens/RoundTimeline';

export default function RoundSetup() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sref = useRef<any>(null), sy = useRef(0);
  const [busy, setBusyState] = useState(false);
  // freeze the scroll view synchronously (setNativeProps), not through a React render that arrives after the scroll view took the touch
  const setBusy = useCallback((b: boolean) => {
    const r = sref.current;
    if (r && typeof r.setNativeProps === 'function') { try { r.setNativeProps({ scrollEnabled: !b }); return } catch { /* fall through */ } }
    setBusyState(b);
  }, []);
  const scroll = useRef<ScrollCtl>({ ref: sref, y: sy }).current;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DotBg />
      <ScreenBar title={t('Apna round set karo')} back />
      <ScrollView ref={sref} scrollEnabled={!busy} onScroll={(e) => { sy.current = e.nativeEvent.contentOffset.y }} scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <RoundTimeline scroll={scroll} onBusy={setBusy} />
        <View style={{ marginHorizontal: -16, marginTop: 'auto' }}><Footer bottomPad={130} /></View>
      </ScrollView>
      <LockBar bottom={insets.bottom + 12} />
    </View>
  );
}

// Round setup (opened from Profile): drag the cars into the 6 slots, then lock the round. Home shows the saved result read-only.
import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ui';
import { useStore } from '../state/store';
import { t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { LockBar, RoundTimeline, type ScrollCtl } from '../screens/RoundTimeline';

export default function RoundSetup() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sref = useRef<any>(null), sy = useRef(0);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollCtl>({ ref: sref, y: sy }).current;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenBar title={t('Apna round set karo')} back />
      <ScrollView ref={sref} scrollEnabled={!busy} onScroll={(e) => { sy.current = e.nativeEvent.contentOffset.y }} scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 150 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <RoundTimeline scroll={scroll} onBusy={setBusy} />
      </ScrollView>
      <LockBar bottom={insets.bottom + 12} />
    </View>
  );
}

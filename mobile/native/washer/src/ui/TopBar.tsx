// Header pieces that read the store: the Duty ON/OFF switch (first thing on screen) and the place chip beside the photo.
// AppHeader (dash.tsx) stays presentational and takes these as nodes.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Icon } from './Icons';
import { Pressy } from './kit';
import { ui } from './bus';
import { F, brand, useTheme } from './theme';
import { act, isOnline, useStore } from '../state/store';
import { openLocationSettings, useLocality } from '../lib/geo';
import { t } from '../lib/i18n';

/** Small "Duty ON / Duty OFF" switch. Same action as before (act.toggleOnline), now the only place for it. */
export function DutyToggle() {
  useStore();
  const { c } = useTheme();
  const on = isOnline();
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [on, a]);
  const label = t(on ? 'Duty ON' : 'Duty OFF');
  return (
    <Pressable
      onPress={() => { ui.haptic(10); act.toggleOnline(); }}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 32 }}
    >
      <Animated.View style={{ width: 40, height: 22, borderRadius: 11, padding: 2, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [c.fg3, brand.mint] }) }}>
        <Animated.View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }} />
      </Animated.View>
      <Text style={{ fontFamily: F.bold, fontSize: 13, letterSpacing: 0.2, color: on ? c.fg : c.fg3 }}>{label}</Text>
    </Pressable>
  );
}

/** Pin + short place name. Loading, denied (tap opens settings) and error (hidden) are all handled here. */
export function LocationChip() {
  const { c } = useTheme();
  const g = useLocality();
  if (g.status === 'error') return null;
  const row = (txt: string, color: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <Icon name="pin" size={13} color={color} />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12.5, color, flexShrink: 1 }}>{txt}</Text>
    </View>
  );
  if (g.status === 'denied') {
    return (
      <Pressy onPress={openLocationSettings} accessibilityLabel={t('Location chalu karo')} scaleTo={0.97} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        {row(t('Location chalu karo'), brand.violet)}
      </Pressy>
    );
  }
  const txt = g.text || (g.status === 'loading' || g.status === 'idle' ? t('Location…') : t('Location'));
  return <View accessibilityLabel={txt}>{row(txt, c.fg3)}</View>;
}

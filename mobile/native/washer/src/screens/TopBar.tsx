// Shared top bar: violet strip with a gold underline (the web app's day theme). Left: logo or back button;
// middle: title; right: any slot. SyncChipLive is the sync chip every screen shows.
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, OnViolet, Pressy, SyncChip, brand, type IconName } from '../ui';
import { syncState, useStore } from '../state/store';
import { t } from '../lib/i18n';
import { openSyncSheet } from './sheets';

const LOGO = require('../../assets/img/logo.webp');

/** Round cream icon button with an ink outline, as on the web top bar. */
export function TopIconBtn({ icon, label, onPress, size = 22 }: { icon: IconName; label: string; onPress?: () => void; size?: number }) {
  return (
    <Pressy onPress={onPress} scaleTo={0.88} accessibilityLabel={label} style={s.iconBtn}>
      <Icon name={icon} size={size} color={brand.ink} />
    </Pressy>
  );
}

export function Logo({ width = 92 }: { width?: number }) {
  return <Image source={LOGO} accessibilityLabel="Washing Daddy" style={{ width, height: (width * 71) / 118, transform: [{ rotate: '-4deg' }] }} resizeMode="contain" />;
}

export function SyncChipLive() {
  useStore();
  const [st, txt] = syncState();
  const state = st === 'offline' ? 'wait' : st;
  return <SyncChip state={state} text={t(txt)} onPress={openSyncSheet} style={s.chip} />;
}

export function TopBar({
  left, onBack, title, right, top, border = true, sync = true,
}: {
  /** 'logo' draws the Washing Daddy logo, 'back' a back button (needs onBack), or pass your own node */
  left?: 'logo' | 'back' | React.ReactNode;
  onBack?: () => void;
  title?: string;
  right?: React.ReactNode;
  /** rendered above the bar (the ticker) */
  top?: React.ReactNode;
  border?: boolean;
  /** draw the live sync chip after `right` */
  sync?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const lnode = left === 'logo' ? <Logo />
    : left === 'back' ? <TopIconBtn icon="back" label={t('Wapas')} onPress={onBack} />
    : left;
  return (
    <OnViolet>
      <View style={[s.wrap, { backgroundColor: brand.violet, borderBottomWidth: border ? 4 : 0 }]}>
        <View style={{ height: insets.top }} />
        {top}
        <View style={s.bar}>
          {lnode}
          {title ? <Text numberOfLines={1} style={s.title}>{title}</Text> : <View style={{ flex: 1 }} />}
          <View style={s.right}>
            {right}
            {sync ? <SyncChipLive /> : null}
          </View>
        </View>
      </View>
    </OnViolet>
  );
}

const s = StyleSheet.create({
  wrap: { borderBottomColor: brand.gold },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, minHeight: 72 },
  title: { flex: 1, minWidth: 0, fontFamily: F.black, fontSize: 17, color: brand.cream },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  iconBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.cream,
    borderWidth: 3, borderColor: brand.ink, shadowColor: brand.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
  },
  chip: { backgroundColor: 'rgba(18,7,36,0.55)', borderColor: 'rgba(255,246,233,0.3)', height: 48 },
});

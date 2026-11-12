// Shared top bar: light page-coloured strip, round white icon buttons (2026 dashboard look). Left: logo or back button;
// middle: title; right: any slot. SyncChipLive is the sync chip every screen shows.
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, Pressy, SyncChip, cardShadow, useTheme, type IconName } from '../ui';
import { syncState, useStore } from '../state/store';
import { t } from '../lib/i18n';
import { openSyncSheet } from './sheets';

const LOGO = require('../../assets/img/logo.webp');

/** Round cream icon button with an ink outline, as on the web top bar. */
export function TopIconBtn({ icon, label, onPress, size = 22 }: { icon: IconName; label: string; onPress?: () => void; size?: number }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} scaleTo={0.88} accessibilityLabel={label} style={[s.iconBtn, { backgroundColor: c.tile2 }, cardShadow(c)]}>
      <Icon name={icon} size={Math.min(size, 18)} color={c.fg} />
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
  const { c } = useTheme();
  const lnode = left === 'logo' ? <Logo />
    : left === 'back' ? <TopIconBtn icon="back" label={t('Wapas')} onPress={onBack} />
    : left;
  return (
    <>
      <View style={[s.wrap, { backgroundColor: c.bg, borderBottomWidth: border ? 1 : 0, borderBottomColor: c.line }]}>
        <View style={{ height: insets.top }} />
        {top}
        <View style={s.bar}>
          {lnode}
          {title ? <Text numberOfLines={1} style={[s.title, { color: c.fg }]}>{title}</Text> : <View style={{ flex: 1 }} />}
          <View style={s.right}>
            {right}
            {sync ? <SyncChipLive /> : null}
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  wrap: {},
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, minHeight: 60 },
  title: { flex: 1, minWidth: 0, fontFamily: F.bold, fontSize: 20, lineHeight: 28 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  chip: { height: 36 },
});

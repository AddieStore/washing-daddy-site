// Shared top bar: light page-coloured strip, round white icon buttons (2026 dashboard look). Left: logo or back button;
// middle: title; right: any slot. SyncChipLive is the sync chip every screen shows.
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, OnViolet, Pressy, SyncChip, VioletBg, cardShadow, useTheme, type IconName } from '../ui';
import { syncState, useStore } from '../state/store';
import { t } from '../lib/i18n';
import { openSyncSheet } from './sheets';

const LOGO = require('../../assets/img/logo.webp');

/** Icon button: round white-15% on the violet bar, a white shadowed square elsewhere. */
export function TopIconBtn({ icon, label, onPress, size = 22 }: { icon: IconName; label: string; onPress?: () => void; size?: number }) {
  const { c, onViolet } = useTheme();
  return (
    <Pressy onPress={onPress} scaleTo={0.92} hitSlop={4} accessibilityLabel={label} style={[s.iconBtn, onViolet ? { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18 } : [{ backgroundColor: c.card }, cardShadow(c)]]}>
      <Icon name={icon} size={Math.min(size, 20)} color={c.fg} />
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
  left, onBack, title, right, top, border = true, sync = true, plain = false, bottomPad = 12,
}: {
  /** 'logo' draws the Washing Daddy logo, 'back' a back button (needs onBack), or pass your own node */
  left?: 'logo' | 'back' | React.ReactNode;
  onBack?: () => void;
  title?: string;
  right?: React.ReactNode;
  /** rendered above the bar (the ticker) */
  top?: React.ReactNode;
  /** kept for old call sites; the violet bar has no border */
  border?: boolean;
  /** draw the live sync chip after `right` */
  sync?: boolean;
  /** the old plain grey strip instead of the violet header block */
  plain?: boolean;
  /** extra space under the bar inside the violet block (use 48 + marginTop -36 on the next block to overlap) */
  bottomPad?: number;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const inner = (
    <>
      <View style={{ height: insets.top }} />
      {top}
      <View style={s.bar}>
        {left === 'logo' ? <Logo /> : left === 'back' ? <TopIconBtn icon="back" label={t('Wapas')} onPress={onBack} /> : left}
        {title ? <Text numberOfLines={1} style={[s.title, { color: c.fg }]}>{title}</Text> : <View style={{ flex: 1 }} />}
        <View style={s.right}>
          {right}
          {sync ? <SyncChipLive /> : null}
        </View>
      </View>
    </>
  );
  if (plain) {
    return <View style={[s.wrap, { backgroundColor: c.bg, borderBottomWidth: border ? 1 : 0, borderBottomColor: c.line }]}>{inner}</View>;
  }
  // Pronto: violet gradient header block with white text (customer Profile header).
  return (
    <View style={[s.wrap, { overflow: 'hidden', paddingBottom: bottomPad }]}>
      <VioletBg />
      <OnViolet>{inner}</OnViolet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {},
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, minHeight: 60 },
  title: { flex: 1, minWidth: 0, fontFamily: F.semi, fontSize: 18, lineHeight: 26 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  chip: { height: 36 },
});

// Bottom tabs: Round, Extra, [raised add-car button], Paisa, Profile, on a white rounded bar.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, R, brand, ui, useTheme, type IconName } from '../../ui';
import { Extra, openReqs, route, useStore } from '../../state/store';
import { t } from '../../lib/i18n';
import { openAddCar } from '../../screens/AddCar';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Round', icon: 'tabRound' },
  { name: 'extra', label: 'Extra', icon: 'tabExtra' },
  { name: 'paisa', label: 'Paisa', icon: 'tabPaisa' },
  { name: 'profile', label: 'Profile', icon: 'tabMe' },
];
const LEFT = TABS.slice(0, 2);
const RIGHT = TABS.slice(2);
const MID = 64; // gap in the bar under the raised centre button
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// White rounded bar: two tabs, a raised round violet "add car" button in the middle, two tabs.
function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;
  const reqs = route().reduce((a, car) => a + openReqs(car.reg).filter((q) => q.status === 'open').length, 0);
  const badge: Record<string, number> = { index: reqs, extra: Extra.shown().length };

  const cell = (tb: (typeof TABS)[number]) => {
    const on = tb.name === active;
    const n = badge[tb.name] || 0;
    const col = on ? c.primary : c.fg3;
    const press = () => {
      ui.haptic(6);
      const rt = state.routes.find((r) => r.name === tb.name);
      if (!rt) return;
      const ev = emitter.emit({ type: 'tabPress', target: rt.key, canPreventDefault: true });
      if (!on && !ev.defaultPrevented) navigateToTab(rt.key);
    };
    return (
      <Pressable key={tb.name} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(tb.label)} style={s.tab}>
        <View style={[s.iconWrap, on && { backgroundColor: dark ? 'rgba(139,92,246,0.24)' : 'rgba(84,9,218,0.12)' }]}>
          <Icon name={tb.icon} size={24} color={col} active={on} />
          {n > 0 ? <View style={s.badge}><Text style={s.badgeTxt}>{n}</Text></View> : null}
        </View>
        <Text style={[s.lbl, { color: on ? c.primary : c.fg3, fontFamily: on ? F.bold : F.medium }]}>{t(tb.label)}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={s.outer}>
      <View style={[s.bar, { backgroundColor: c.tabBg, borderTopColor: c.line, paddingBottom: 10 + insets.bottom, shadowColor: '#000', shadowOpacity: dark ? 0 : 0.06 }]}>
        {LEFT.map(cell)}
        <View style={{ width: MID }} />
        {RIGHT.map(cell)}
      </View>
      <Pressable
        onPress={() => { ui.haptic(10); openAddCar(); }}
        accessibilityRole="button"
        accessibilityLabel={t('Nayi gaadi add karo')}
        style={({ pressed }) => [s.fab, { bottom: 30 + insets.bottom, backgroundColor: c.primary, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      {TABS.map((tb) => <Tabs.Screen key={tb.name} name={tb.name} options={{ title: tb.label }} />)}
    </Tabs>
  );
}

const s = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 8, paddingHorizontal: 8,
    borderTopWidth: 1,
    shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 6, paddingBottom: 0, minHeight: 54 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 10, lineHeight: 14 },
  fab: {
    position: 'absolute', alignSelf: 'center', width: 44, height: 44, borderRadius: R.button + 2, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  badge: { position: 'absolute', top: -6, right: 2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: brand.violet, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: F.bold, fontSize: 10, color: '#fff' },
});

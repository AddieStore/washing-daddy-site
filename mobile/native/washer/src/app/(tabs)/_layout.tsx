// Bottom tabs: Round, Extra, [raised add-car button], Paisa, Profile, on a white rounded bar.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, brand, ui, useTheme, type IconName } from '../../ui';
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
const MID = 84; // gap in the bar under the raised centre button
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// White rounded bar: two tabs, a raised round violet "add car" button in the middle, two tabs.
function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const { c } = useTheme();
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
        <View style={[s.iconWrap, on && { backgroundColor: c.soft }]}>
          <Icon name={tb.icon} size={24} color={col} active={on} />
          {n > 0 ? <View style={s.badge}><Text style={s.badgeTxt}>{n}</Text></View> : null}
        </View>
        <Text style={[s.lbl, { color: col, fontFamily: on ? F.bold : F.body }]}>{t(tb.label)}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={s.outer}>
      <View style={[s.bar, { backgroundColor: c.tabBg, paddingBottom: 8 + insets.bottom, shadowColor: c.shadowColor }]}>
        {LEFT.map(cell)}
        <View style={{ width: MID }} />
        {RIGHT.map(cell)}
      </View>
      <Pressable
        onPress={() => { ui.haptic(10); openAddCar(); }}
        accessibilityRole="button"
        accessibilityLabel={t('Nayi gaadi add karo')}
        style={({ pressed }) => [s.fab, { bottom: 22 + insets.bottom, backgroundColor: c.primary, borderColor: c.bg, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Icon name="plus" size={28} color={brand.gold} />
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
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 14,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 4, paddingBottom: 2, minHeight: 56 },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 11.5 },
  fab: {
    position: 'absolute', alignSelf: 'center', width: 64, height: 64, borderRadius: 32, borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    shadowColor: brand.violet, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  badge: { position: 'absolute', top: -6, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: F.black, fontSize: 10.5, color: '#fff' },
});

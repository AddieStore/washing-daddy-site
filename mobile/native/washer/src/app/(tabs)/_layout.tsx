// Bottom tabs: Round, Extra, [raised add-car button], Paisa, Profile, on a white rounded bar.
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, brand, ui, useReducedMotion, useTheme, type IconName } from '../../ui';
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
const MID = 68; // gap in the bar under the raised centre button
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// One tab: icon over label, same layout selected or not so nothing shifts. Active = brand colour on icon + label only (no pill, no fill).
function TabCell({ tb, on, n, onPress }: { tb: (typeof TABS)[number]; on: boolean; n: number; onPress: () => void }) {
  const { c, dark } = useTheme();
  const rm = useReducedMotion();
  const press = useRef(new Animated.Value(0)).current;
  const down = (v: number) => { if (rm) return; Animated.timing(press, { toValue: v, duration: v ? 90 : 160, useNativeDriver: false }).start() };
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const col = on ? (dark ? '#CDB6FF' : c.primary) : c.fg3;
  return (
    <View style={{ flex: 1, minHeight: 52 }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => down(1)}
        onPressOut={() => down(0)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t(tb.label)}
        hitSlop={{ top: 8, bottom: 8 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View style={[s.cellIn, { transform: [{ scale }] }]}>
          <View style={s.icWrap}>
            <Icon name={tb.icon} size={24} color={col} active={on} />
            {n > 0 ? <View style={[s.badge, { borderColor: c.tabBg }]}><Text style={s.badgeTxt}>{n}</Text></View> : null}
          </View>
          <Text numberOfLines={1} style={[s.lbl, { color: col, fontFamily: on ? F.semi : F.medium }]}>{t(tb.label)}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// White bar: two tabs, a raised round violet "add car" button in the middle, two tabs.
function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;
  const reqs = route().reduce((a, car) => a + openReqs(car.reg).filter((q) => q.status === 'open').length, 0);
  const badge: Record<string, number> = { index: reqs, extra: Extra.shown().length };

  const cell = (tb: (typeof TABS)[number]) => {
    const on = tb.name === active;
    const press = () => {
      ui.haptic(6);
      const rt = state.routes.find((r) => r.name === tb.name);
      if (!rt) return;
      const ev = emitter.emit({ type: 'tabPress', target: rt.key, canPreventDefault: true });
      if (!on && !ev.defaultPrevented) navigateToTab(rt.key);
    };
    return <TabCell key={tb.name} tb={tb} on={on} n={badge[tb.name] || 0} onPress={press} />;
  };

  return (
    <View pointerEvents="box-none" style={s.outer}>
      <View style={[s.bar, { backgroundColor: c.tabBg, borderTopColor: c.line, paddingBottom: 4 + insets.bottom }]}>
        {LEFT.map(cell)}
        <View style={{ width: MID }} />
        {RIGHT.map(cell)}
      </View>
      <Pressable
        onPress={() => { ui.haptic(10); openAddCar(); }}
        accessibilityRole="button"
        accessibilityLabel={t('Nayi gaadi add karo')}
        style={({ pressed }) => [s.fab, { bottom: 18 + insets.bottom, backgroundColor: c.primary, borderColor: c.tabBg, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <Icon name="plus" size={26} color="#FFFFFF" />
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
    width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingHorizontal: 6,
    borderTopWidth: 1,
  },
  cellIn: { alignItems: 'center', gap: 3 },
  icWrap: { width: 40, height: 28, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 11, lineHeight: 14 },
  fab: {
    position: 'absolute', alignSelf: 'center', width: 56, height: 56, borderRadius: 28, borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -4, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, backgroundColor: brand.violet, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: F.bold, fontSize: 10, color: '#fff' },
});

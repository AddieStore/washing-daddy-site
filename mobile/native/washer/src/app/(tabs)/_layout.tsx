// Bottom tabs: Round, Extra, [raised add-car button], Paisa, Profile, on a white rounded bar.
import React, { useEffect, useRef } from 'react';
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
const MID = 76; // gap in the bar under the raised centre button
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// One tab. Selected: a big rounded violet-tint pill with the solid icon and label side by side (like Pronto).
// Others: outline icon over a small label. The cell widens with a spring; tapping gives a press-down feedback.
function TabCell({ tb, on, n, onPress }: { tb: (typeof TABS)[number]; on: boolean; n: number; onPress: () => void }) {
  const { c, dark } = useTheme();
  const rm = useReducedMotion();
  const sel = useRef(new Animated.Value(on ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rm) { sel.setValue(on ? 1 : 0); return }
    Animated.spring(sel, { toValue: on ? 1 : 0, speed: 16, bounciness: 6, useNativeDriver: false }).start();
  }, [on, rm, sel]);
  const down = (v: number) => { if (rm) return; Animated.spring(press, { toValue: v, speed: 40, bounciness: 0, useNativeDriver: false }).start() };
  const flex = sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });
  return (
    <Animated.View style={{ flex, minHeight: 54, justifyContent: 'center' }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => down(1)}
        onPressOut={() => down(0)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t(tb.label)}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View style={[on ? s.pillOn : s.pillOff, on && { backgroundColor: dark ? 'rgba(139,92,246,0.26)' : 'rgba(84,9,218,0.12)' }, { transform: [{ scale }] }]}>
          <View>
            <Icon name={tb.icon} size={on ? 26 : 25} color={on ? c.primary : c.fg3} active={on} />
            {n > 0 ? <View style={s.badge}><Text style={s.badgeTxt}>{n}</Text></View> : null}
          </View>
          <Text numberOfLines={1} style={[on ? s.lblOn : s.lbl, { color: on ? c.primary : c.fg3, fontFamily: on ? F.bold : F.medium }]}>{t(tb.label)}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
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
      <View style={[s.bar, { backgroundColor: c.tabBg, borderTopColor: c.line, paddingBottom: 10 + insets.bottom, shadowColor: '#000', shadowOpacity: dark ? 0 : 0.06 }]}>
        {LEFT.map(cell)}
        <View style={{ width: MID }} />
        {RIGHT.map(cell)}
      </View>
      <Pressable
        onPress={() => { ui.haptic(10); openAddCar(); }}
        accessibilityRole="button"
        accessibilityLabel={t('Nayi gaadi add karo')}
        style={({ pressed }) => [s.fab, { bottom: 22 + insets.bottom, backgroundColor: c.primary, borderColor: c.tabBg, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Icon name="plus" size={28} color="#FFFFFF" />
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
  iconWrap: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  pillOn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 48, paddingHorizontal: 11, borderRadius: 24 },
  pillOff: { alignItems: 'center', gap: 2, paddingTop: 2 },
  lblOn: { fontSize: 12, lineHeight: 16 },
  lbl: { fontSize: 10, lineHeight: 14 },
  fab: {
    position: 'absolute', alignSelf: 'center', width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center',
    shadowColor: brand.violet, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  badge: { position: 'absolute', top: -6, right: 2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: brand.violet, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: F.bold, fontSize: 10, color: '#fff' },
});

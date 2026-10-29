// Bottom tabs: Round, Extra, Paisa, Profile, drawn as the web app's floating pill bar with a sliding indicator.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, brand, ui, useTheme, type IconName } from '../../ui';
import { Extra, openReqs, route, useStore } from '../../state/store';
import { t } from '../../lib/i18n';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Round', icon: 'tabRound' },
  { name: 'extra', label: 'Extra', icon: 'tabExtra' },
  { name: 'paisa', label: 'Paisa', icon: 'tabPaisa' },
  { name: 'profile', label: 'Profile', icon: 'tabMe' },
];
const PAD = 8;
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const cell = w > 0 ? (w - PAD * 2) / TABS.length : 0;
  const active = state.routes[state.index]?.name;
  const idx = Math.max(0, TABS.findIndex((tb) => tb.name === active));
  const placed = useRef(false);

  useEffect(() => {
    if (!cell) return;
    if (!placed.current) { x.setValue(idx * cell); placed.current = true; return; }
    Animated.spring(x, { toValue: idx * cell, useNativeDriver: Platform.OS !== 'web', speed: 14, bounciness: 9 }).start();
  }, [idx, cell, x]);

  const reqs = route().reduce((a, car) => a + openReqs(car.reg).filter((q) => q.status === 'open').length, 0);
  const badge: Record<string, number> = { index: reqs, extra: Extra.shown().length };

  return (
    <View pointerEvents="box-none" style={[s.outer, { paddingBottom: 12 + insets.bottom }]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[s.tabs, { backgroundColor: c.tabBg, borderColor: c.line }]}>
        {cell > 0 ? <Animated.View pointerEvents="none" style={[s.ind, { width: cell, transform: [{ translateX: x }] }]} /> : null}
        {TABS.map((tb, i) => {
          const on = i === idx;
          const n = badge[tb.name] || 0;
          const press = () => {
            ui.haptic(6);
            const rt = state.routes.find((r) => r.name === tb.name);
            if (!rt) return;
            const ev = emitter.emit({ type: 'tabPress', target: rt.key, canPreventDefault: true });
            if (!on && !ev.defaultPrevented) navigateToTab(rt.key);
          };
          return (
            <Pressable key={tb.name} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(tb.label)} style={s.tab}>
              <View style={{ transform: [{ translateY: on ? -1 : 0 }, { scale: on ? 1.1 : 1 }] }}>
                <Icon name={tb.icon} size={25} color={on ? brand.cream : c.fg3} active={on} />
              </View>
              <Text style={[s.lbl, { color: on ? brand.cream : c.fg3 }]}>{t(tb.label)}</Text>
              {n > 0 ? (
                <View style={s.badge}><Text style={s.badgeTxt}>{n}</Text></View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
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
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 12 },
  tabs: {
    width: '100%', maxWidth: 440, flexDirection: 'row', padding: PAD, borderRadius: 30, borderWidth: 1,
    shadowColor: '#1A0A33', shadowOpacity: 0.24, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 12,
  },
  ind: {
    position: 'absolute', left: PAD, top: PAD, bottom: PAD, borderRadius: 22, backgroundColor: brand.violet,
    shadowColor: brand.violet, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 9, paddingBottom: 7, minHeight: 60 },
  lbl: { fontFamily: F.bold, fontSize: 12 },
  badge: { position: 'absolute', top: 2, right: '50%', marginRight: -26, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: F.black, fontSize: 11, color: '#fff' },
});

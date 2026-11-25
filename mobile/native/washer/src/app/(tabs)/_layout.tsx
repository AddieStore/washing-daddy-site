// Bottom tabs: Round, Extra, Paisa, Profile in a floating pill bar (selected = dark pill). "Add car" lives in screen headers (HeaderIconButton + openAddCar).
import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingTabBar, type IconName } from '../../ui';
import { Extra, openReqs, route, useStore } from '../../state/store';
import { t } from '../../lib/i18n';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Round', icon: 'tabRound' },
  { name: 'extra', label: 'Extra', icon: 'tabExtra' },
  { name: 'paisa', label: 'Paisa', icon: 'tabPaisa' },
  { name: 'profile', label: 'Profile', icon: 'tabMe' },
];
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const active = state.routes[state.index]?.name;
  const reqs = route().reduce((a, car) => a + openReqs(car.reg).filter((q) => q.status === 'open').length, 0);
  const badge: Record<string, number> = { index: reqs, extra: Extra.shown().length };
  const select = (name: string) => {
    const rt = state.routes.find((r) => r.name === name);
    if (!rt) return;
    const ev = emitter.emit({ type: 'tabPress', target: rt.key, canPreventDefault: true });
    if (name !== active && !ev.defaultPrevented) navigateToTab(rt.key);
  };
  return <FloatingTabBar active={active} onSelect={select} tabs={TABS.map((tb) => ({ key: tb.name, label: t(tb.label), icon: tb.icon, badge: badge[tb.name] || 0 }))} />;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      {TABS.map((tb) => <Tabs.Screen key={tb.name} name={tb.name} options={{ title: tb.label }} />)}
    </Tabs>
  );
}

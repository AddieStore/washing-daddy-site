// Bottom tabs: Round, Extra, Paisa, Profile in a floating pill bar (selected = dark pill). "Add car" lives in screen headers (HeaderIconButton + openAddCar).
import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingTabBar, type IconName } from '../../ui';
import { Extra, S, openReqs, route, useStore, wFeature } from '../../state/store';
import { t } from '../../lib/i18n';

const FLAG: Record<string, string> = { extra: 'tab_extra', attendance: 'tab_hazri', paisa: 'tab_money' };   // WD HQ switches
const TABS: { name: string; label: string; icon: IconName; tone: string }[] = [
  { name: 'index', tone: '#5409DA', label: 'Round', icon: 'tabRound' },
  { name: 'extra', tone: '#F07A00', label: 'Extra', icon: 'tabExtra' },
  { name: 'attendance', tone: '#E11D74', label: 'Hazri', icon: 'id' },
  { name: 'paisa', tone: '#0E9F6E', label: 'Paisa', icon: 'tabPaisa' },
  { name: 'profile', tone: '#2563EB', label: 'Profile', icon: 'tabMe' },
];
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  useStore();
  const active = state.routes[state.index]?.name;
  const reqs = route().reduce((a, car) => a + openReqs(car.reg).filter((q) => q.status === 'open').length, 0);
  const badge: Record<string, number> = { index: reqs, extra: Extra.shown().length, attendance: S.day?.checkin_at ? 0 : 1 };
  const select = (name: string) => {
    const rt = state.routes.find((r) => r.name === name);
    if (!rt) return;
    const ev = emitter.emit({ type: 'tabPress', target: rt.key, canPreventDefault: true });
    if (name !== active && !ev.defaultPrevented) navigateToTab(rt.key);
  };
  return <FloatingTabBar active={active} onSelect={select} tabs={TABS.filter((tb) => !FLAG[tb.name] || wFeature(FLAG[tb.name])).map((tb) => ({ key: tb.name, label: t(tb.label), icon: tb.icon, tone: tb.tone, badge: badge[tb.name] || 0 }))} />;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      {TABS.map((tb) => <Tabs.Screen key={tb.name} name={tb.name} options={{ title: tb.label }} />)}
    </Tabs>
  );
}

// Bottom tab bar (Pronto style): white bar with a hairline top border; the active tab is a tinted violet pill
// with a filled icon + label, the others an outline icon + grey label. Home / Washes / Plan / Store (Profile opens from the Home header).
import React from 'react';
import { View, Pressable } from 'react-native';
import { C, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Home, HomeFill, Live, WashFill, Plan, PlanFill, Store, StoreFill } from '../ui/icons';
import { useApp, go, Tab, cartCount, car, doc, activeStage } from '../state';
import { Pulse } from './Home';

type IC = (p: { size?: number; color?: string }) => React.ReactElement;
export const TAB_ITEMS: { tab: Tab; label: string; off: IC; on: IC }[] = [
  { tab: 'home', label: 'Home', off: Home, on: HomeFill },
  { tab: 'live', label: 'Washes', off: Live, on: WashFill },
  { tab: 'plan', label: 'Plan', off: Plan, on: PlanFill },
  { tab: 'store', label: 'Store', off: Store, on: StoreFill },
];
/** Height of the bar without the bottom inset; screens keep their scroll padding >= this + inset. */
export const TAB_H = 59;

export default function TabBar() {
  const T = useTheme(), ins = useInsets(), ui = useApp();
  const count = cartCount(), liveNow = activeStage(doc(car()));
  const on = T.day ? C.violet : '#CDB6FF', off = T.day ? '#3B3550' : T.page.fg3, pill = T.day ? C.tint2 : 'rgba(166,123,255,.2)';
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.tabBg, borderTopWidth: 1, borderTopColor: T.day ? '#EFEDF4' : T.page.line, height: TAB_H + Math.max(ins.bottom, 0), paddingBottom: Math.max(ins.bottom, 0), paddingHorizontal: 6, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {TAB_ITEMS.map(({ tab: t, label, off: Off, on: On }) => {
          const active = t === ui.tab, Ic = active ? On : Off;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={() => go(t)} hitSlop={{ top: 8, bottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: active ? 12 : 9, height: 38, borderRadius: 12, backgroundColor: active ? pill : 'transparent' }}>
                <Ic size={23} color={active ? on : off} />
                <Txt weight={active ? 600 : 500} size={13.5} color={active ? on : off} style={{ lineHeight: 18 }}>{label}</Txt>
              </View>
              {t === 'store' && count > 0 ? (
                <View style={{ position: 'absolute', top: -4, right: 2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt weight={700} size={10} color={C.white} style={{ lineHeight: 14 }}>{String(count)}</Txt>
                </View>
              ) : null}
              {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: 2, right: 6 }}><Pulse color={C.orange} size={8} /></View> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

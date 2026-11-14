// Bottom tab bar: white bar with a hairline top border. Icon above a 12px label; the active tab is accent-coloured, the others muted.
// Home / Washes / Plan / Store (Profile opens from the Home header).
import React from 'react';
import { View, Pressable } from 'react-native';
import { C, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Home, Live, Plan, Store } from '../ui/icons';
import { Pulse } from '../ui/motion';
import { useApp, go, Tab, cartCount, car, doc, activeStage } from '../state';

type IC = (p: { size?: number; color?: string }) => React.ReactElement;
export const TAB_ITEMS: { tab: Tab; label: string; off: IC; on: IC }[] = [
  { tab: 'home', label: 'Home', off: Home, on: Home },
  { tab: 'live', label: 'Washes', off: Live, on: Live },
  { tab: 'plan', label: 'Plan', off: Plan, on: Plan },
  { tab: 'store', label: 'Store', off: Store, on: Store },
];
/** Height of the bar without the bottom inset; screens keep their scroll padding >= this + inset. */
export const TAB_H = 56;

export default function TabBar() {
  const T = useTheme(), ins = useInsets(), ui = useApp();
  const count = cartCount(), liveNow = activeStage(doc(car()));
  const on = T.day ? C.violet : '#CDB6FF', off = T.card.fg3;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.tabBg, borderTopWidth: 1, borderTopColor: T.page.line, height: TAB_H + Math.max(ins.bottom, 0), paddingBottom: Math.max(ins.bottom, 0), paddingHorizontal: 8 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
        {TAB_ITEMS.map(({ tab: t, label, off: Off }) => {
          const active = t === ui.tab, col = active ? on : off;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={() => go(t)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <View>
                <Off size={20} color={col} />
                {t === 'store' && count > 0 ? (
                  <View style={{ position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt weight={500} size={12} color={C.white} style={{ lineHeight: 16, fontSize: 10 }}>{String(count)}</Txt>
                  </View>
                ) : null}
                {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: -8, right: -14 }}><Pulse color={C.green} size={5} /></View> : null}
              </View>
              <Txt weight={500} size={12} color={col} style={{ lineHeight: 16 }}>{label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Bottom tab bar: deep violet with a gold top border; the active tab is a gold pill that slides between tabs.
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { C, SP, useTheme } from '../theme';
import { Txt, Hard, useInsets } from '../ui/kit';
import { Home, Live, Drop, Store, User } from '../ui/icons';
import { useApp, go, TABS, Tab, cartCount, car, doc, activeStage } from '../state';
import { Pulse, useReduceMotion } from './Home';

const ICON: Record<Tab, [string, (p: { size?: number; color?: string }) => React.ReactElement]> = {
  home: ['Home', Home], live: ['Live', Live], plan: ['Plan', Drop], store: ['Store', Store], profile: ['Profile', User],
};

export default function TabBar() {
  const T = useTheme(), ins = useInsets(), ui = useApp(), rm = useReduceMotion(), [w, setW] = useState(0), x = useRef(new Animated.Value(0)).current;
  const cell = w / 5, idx = TABS.indexOf(ui.tab), first = useRef(true);
  useEffect(() => {
    if (!w) return;
    if (first.current || rm) { x.setValue(idx * cell); first.current = false; return }
    Animated.spring(x, { toValue: idx * cell, friction: 7, tension: 120, useNativeDriver: true }).start();
  }, [idx, w, rm]);
  const count = cartCount(), liveNow = activeStage(doc(car()));
  const on = T.day ? C.ink : C.cream, off = T.day ? 'rgba(255,246,233,.75)' : T.page.fg3;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.tabBg, borderTopWidth: T.day ? 12 : 1, borderTopColor: T.day ? C.gold : T.page.line, paddingTop: SP.s, paddingHorizontal: SP.m, paddingBottom: SP.s + Math.max(ins.bottom, 4) }}>
      <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row' }}>
        {w ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: cell, paddingHorizontal: 3, transform: [{ translateX: x }] }}>
            <Hard dx={3} dy={3} radius={18} color={T.day ? C.ink : null} reserve={false} style={{ flex: 1 }}>
              <View style={{ flex: 1, borderRadius: 18, backgroundColor: T.day ? C.gold : C.violet, borderWidth: T.day ? 2.5 : 0, borderColor: C.ink }} />
            </Hard>
          </Animated.View>
        ) : null}
        {TABS.map(t => {
          const [label, Ic] = ICON[t], active = t === ui.tab;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(t)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56, paddingVertical: SP.s }}>
              <Ic size={23} color={active ? on : off} />
              <Txt weight={700} size={11} color={active ? on : off} style={{ lineHeight: 14 }}>{label}</Txt>
              {t === 'store' && count > 0 ? (
                <View style={{ position: 'absolute', top: 3, left: '50%', marginLeft: 8, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt weight={800} size={11} color={C.white}>{String(count)}</Txt>
                </View>
              ) : null}
              {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: 9, left: '50%', marginLeft: 12 }}><Pulse color={C.orange} size={8} /></View> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

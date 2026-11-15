// Bottom tab bar (Pronto): white bar, three tabs Home / Washes / Money. The active tab sits on a soft violet pill; the others are muted.
// Plan and Store left the bar; Home links to both ("More from Washing Daddy"). Also hosts the one-time splash/location loader overlay
// (Main renders the bar after the screen, so it is the one place a full-screen overlay can sit above everything).
import React, { useRef, useEffect } from 'react';
import { View, Pressable, Animated, Easing, Platform } from 'react-native';
import { C, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Home, Live, Wallet } from '../ui/icons';
import { Pulse, LocationLoader } from '../ui/motion';
import { useApp, go, Tab, car, doc, activeStage, selectedAddress, addrName, wallet } from '../state';

type IC = (p: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement;
export const TAB_ITEMS: { tab: Tab; label: string; off: IC; on: IC }[] = [
  { tab: 'home', label: 'Home', off: Home as IC, on: Home as IC },
  { tab: 'live', label: 'Washes', off: Live as IC, on: Live as IC },
  { tab: 'money', label: 'Money', off: Wallet as IC, on: Wallet as IC },
];
/** Height of the bar without the bottom inset; screens keep their scroll padding >= this + inset. */
export const TAB_H = 56;

function TabItem({ t, label, Ic, active, liveNow }: { t: Tab; label: string; Ic: IC; active: boolean; liveNow: boolean }) {
  const T = useTheme(), v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: active ? 1 : 0, duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: Platform.OS !== 'web' }).start() }, [active]);
  const on = T.day ? C.violet : '#CDB6FF', off = T.card.fg3, col = active ? on : off;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={() => go(t)} android_ripple={{ color: 'rgba(84,9,218,.08)', borderless: true }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <View style={{ width: 56, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 14, backgroundColor: T.day ? 'rgba(84,9,218,.10)' : 'rgba(205,182,255,.16)', opacity: v, transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }} />
        <Ic size={20} color={col} strokeWidth={active ? 1.8 : 1.5} />
        {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: -2, right: 8 }}><Pulse color={C.green} size={5} /></View> : null}
      </View>
      <Txt weight={active ? 500 : 400} size={12} color={col} style={{ lineHeight: 16 }}>{label}</Txt>
    </Pressable>
  );
}

export default function TabBar() {
  const T = useTheme(), ins = useInsets(), ui = useApp();
  let liveNow: any = null, place = '';
  try { liveNow = activeStage(doc(car())) } catch (e) {}
  try { const a = selectedAddress(); place = a ? addrName(a) + ' · ' + (a.area || '').split(',')[0] : '' } catch (e) {}
  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.tabBg, borderTopWidth: 1, borderTopColor: T.page.line, height: TAB_H + Math.max(ins.bottom, 0), paddingBottom: Math.max(ins.bottom, 0), paddingHorizontal: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
          {TAB_ITEMS.map(({ tab: t, label, off: Ic }) => <TabItem key={t} t={t} label={label} Ic={Ic} active={t === ui.tab} liveNow={!!liveNow} />)}
        </View>
      </View>
      <LocationLoader place={place} />
    </>
  );
}

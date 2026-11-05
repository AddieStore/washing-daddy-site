// The signed-in shell: the current tab's screen above the tab bar, plus full-screen pages pushed over it
// (service page, cart, schedule, refer, profile) that slide in from the right (220ms, the one curve).
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, BackHandler, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme';
import { useApp, closePage, Page } from '../state';
import Home from './Home';
import Live from './Live';
import Plan from './Plan';
import Store from './Store';
import Profile from './Profile';
import TabBar from './TabBar';
import Service from '../pages/Service';
import Cart from '../pages/Cart';
import Schedule from '../pages/Schedule';
import Refer from '../pages/Refer';

const CURVE = Easing.bezier(0.22, 1, 0.36, 1);
function useReduceMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setRm, () => {}); }, []);
  return rm;
}

const SCREEN = { home: Home, live: Live, plan: Plan, store: Store, profile: Profile };

function PageView({ p }: { p: NonNullable<Page> }) {
  if (p.k === 'svc') return <Service id={p.id} />;
  if (p.k === 'cart') return <Cart />;
  if (p.k === 'schedule') return <Schedule />;
  if (p.k === 'refer') return <Refer />;
  return <Profile />;
}

function Pushed({ p, depth }: { p: NonNullable<Page>; depth: number }) {
  const { width } = useWindowDimensions(), rm = useReduceMotion(), x = useRef(new Animated.Value(rm ? 0 : width)).current;
  useEffect(() => { if (!rm) Animated.timing(x, { toValue: 0, duration: 220, easing: CURVE, useNativeDriver: true }).start() }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 + depth, backgroundColor: '#FFFFFF', transform: [{ translateX: x }] }}>
      <PageView p={p} />
    </Animated.View>
  );
}

export default function Main() {
  const ui = useApp(), T = useTheme(), rm = useReduceMotion(), fade = useRef(new Animated.Value(1)).current, Screen = SCREEN[ui.tab];
  useEffect(() => {
    if (rm) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 200, easing: CURVE, useNativeDriver: true }).start();
  }, [ui.tab, rm]);
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => { if (ui.pages.length) { closePage(); return true } return false });
    return () => s.remove();
  }, [ui.pages.length]);
  const key = ui.tab === 'home' || ui.tab === 'live' ? ui.tab : ui.tab + ':' + ui.tabNonce;
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Animated.View key={key} style={{ flex: 1, opacity: fade }}><Screen /></Animated.View>
      <TabBar />
      {ui.pages.map((p, i) => p && <Pushed key={i + ':' + p.k + ('id' in p ? p.id : '')} p={p} depth={i} />)}
    </View>
  );
}

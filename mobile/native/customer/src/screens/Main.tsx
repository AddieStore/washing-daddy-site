// The signed-in shell: the current tab's screen above the tab bar.
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '../theme';
import { useApp } from '../state';
import Home, { useReduceMotion } from './Home';
import Live from './Live';
import Plan from './Plan';
import Store from './Store';
import Profile from './Profile';
import TabBar from './TabBar';

const SCREEN = { home: Home, live: Live, plan: Plan, store: Store, profile: Profile };

export default function Main() {
  const ui = useApp(), T = useTheme(), rm = useReduceMotion(), fade = useRef(new Animated.Value(1)).current, Screen = SCREEN[ui.tab];
  useEffect(() => {
    if (rm) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [ui.tab, rm]);
  // Home and Live scroll themselves to the top when the tab is tapped again; the others are remounted, which does the same
  const key = ui.tab === 'home' || ui.tab === 'live' ? ui.tab : ui.tab + ':' + ui.tabNonce;
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Animated.View key={key} style={{ flex: 1, opacity: fade }}><Screen /></Animated.View>
      <TabBar />
    </View>
  );
}

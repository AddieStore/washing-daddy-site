// Floating tab bar: a detached white capsule with a soft shadow. Home · Washes · [raised round violet "Book" button] · Money · Profile.
// The active tab is a violet pill that SLIDES between cells on a spring (icon + label turn white); all cells stay the same width. The centre button opens "Book a wash": Instant or Schedule.
// Also hosts the one-time splash/location loader overlay (Main renders the bar after the screen).
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, useReducedMotion } from 'react-native-reanimated';
import { C, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Home, Live, Wallet, User, Plus, Zap, Calendar, Chev } from '../ui/icons';
import { Pulse, LocationLoader, TAB_BAR_H, SPRING } from '../ui/motion';
import { useApp, go, Tab, car, doc, activeStage, selectedAddress, addrName, openPage, openSheet, closeSheet, act, svcLines, instantStatus, toast, feature, tabOn } from '../state';
import { SheetTitle } from '../ui/hosts';

type IC = (p: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement;
export const TAB_ITEMS: { tab: Tab; label: string; off: IC; on: IC }[] = [
  { tab: 'home', label: 'Home', off: Home as IC, on: Home as IC },
  { tab: 'live', label: 'Washes', off: Live as IC, on: Live as IC },
  { tab: 'money', label: 'Money', off: Wallet as IC, on: Wallet as IC },
  { tab: 'profile', label: 'Profile', off: User as IC, on: User as IC },
];
/** tabs the live config keeps (appcfg tabs.* and features.wallet) */
const shown = () => TAB_ITEMS.filter(x => x.tab === 'home' || (x.tab === 'live' ? tabOn('washes') : x.tab === 'money' ? tabOn('money') : tabOn('profile')));
const MID = 76, BAR_H = 56, PADX = 8, PILL_H = 30, PILL_W = 54, PILL_TOP = 6;   // pill sits behind the icon only (Material-style indicator): same size on every tab, label stays below   // gap in the bar under the raised centre button
/** Height of the bar without the bottom inset; screens keep their scroll padding >= this + inset. */
export const TAB_H = TAB_BAR_H;

/* Home asks to be scrolled to the services grid (centre button -> Instant wash) */
let gridJump: (() => void) | null = null;
export const onGridJump = (f: (() => void) | null) => { gridJump = f };

function TabCell({ t, label, Ic, on, liveNow }: { t: Tab; label: string; Ic: IC; on: boolean; liveNow: boolean }) {
  const T = useTheme(), rm = useReducedMotion();
  const press = useSharedValue(1);
  // The active pill is ONE shared view in the bar that slides between cells; the cell only recolours its icon + label (white on the pill)
  const sc = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const col = on ? '#FFFFFF' : T.card.fg3, lcol = on ? C.violet : T.card.fg3;
  return (
    <View style={{ flex: 1, height: BAR_H }}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => go(t)} hitSlop={{ top: 8, bottom: 8 }}
        onPressIn={() => { if (!rm) press.value = withSpring(0.9, SPRING.press) }} onPressOut={() => { press.value = rm ? 1 : withSpring(1, SPRING.release) }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Reanimated.View style={[s.cellIn, sc]}>
          <View style={s.icWrap}>
            <Ic size={21} color={col} strokeWidth={on ? 2 : 1.6} />
            {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: -2, right: 4 }}><Pulse color={C.green} size={5} /></View> : null}
          </View>
          <Txt weight={on ? 600 : 500} size={10.5} numberOfLines={1} color={lcol} style={{ lineHeight: 13 }}>{label}</Txt>
        </Reanimated.View>
      </Pressable>
    </View>
  );
}

/** the violet pill behind the active tab: springs to the cell's x (a little overshoot), no pill when the tab is not in the bar */
function SlidePill({ x, w, show }: { x: number; w: number; show: boolean }) {
  const rm = useReducedMotion(), px = useSharedValue(x), o = useSharedValue(show ? 1 : 0), first = React.useRef(true);
  useEffect(() => {
    if (first.current || rm) { px.value = x; first.current = false } else px.value = withSpring(x, { damping: 18, stiffness: 220, mass: 0.7 });
    o.value = rm ? (show ? 1 : 0) : withTiming(show ? 1 : 0, { duration: 160 });
  }, [x, show, rm]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: px.value }] }));
  if (!w) return null;
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: PILL_TOP, width: w, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: C.violet, shadowColor: C.violet, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, st]} />;
}

/* "Book a wash" sheet behind the centre button */
function BookSheet() {
  const st = instantStatus(), n = svcLines().count;
  const opt = (Ic: IC, title: string, sub: string, onPress: () => void, dim?: boolean) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [s.opt, pressed && { backgroundColor: '#F4F2FA', transform: [{ scale: 0.98 }] }]}>
      <View style={[s.optIc, dim && { backgroundColor: '#F0F0F3' }]}><Ic size={24} color={dim ? '#9A9AA3' : C.violet} strokeWidth={1.8} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={16} color={dim ? '#737373' : C.ink}>{title}</Txt>
        <Txt size={13} color="#737373" style={{ marginTop: 2 }}>{sub}</Txt>
      </View>
      <Chev size={18} color="#A3A3A3" strokeWidth={1.6} />
    </Pressable>
  );
  return (
    <View>
      <SheetTitle>Book a wash</SheetTitle>
      <Txt size={14} color="#525252" style={{ marginBottom: 16 }}>At your parking spot. Pay after you add services.</Txt>
      <View style={{ gap: 12 }}>
        {feature('instant') ? opt(Zap as IC, 'Instant wash', st.open ? st.label : st.label + ' · not available now', () => {
          if (!st.open) { toast(st.reason === 'busy' ? st.label : 'Instant service is closed. ' + st.label); return }
          closeSheet(); try { act.setCartMode('instant') } catch (e) {}
          if (n > 0) openPage({ k: 'cart' }); else { go('home'); setTimeout(() => gridJump?.(), 120) }
        }, !st.open) : null}
        {feature('scheduled') ? opt(Calendar as IC, 'Schedule for later', 'Pick a day and time slot', () => { closeSheet(); openPage({ k: 'schedule' }) }) : null}
      </View>
    </View>
  );
}

function CentreButton({ bottom }: { bottom: number }) {
  const rm = useReducedMotion(), p = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: p.value }] }));
  return (
    <Reanimated.View style={[s.fabWrap, { bottom }, st]}>
      <Pressable onPress={() => openSheet(<BookSheet />)} accessibilityRole="button" accessibilityLabel="Book a wash"
        onPressIn={() => { if (!rm) p.value = withSpring(0.9, SPRING.press) }} onPressOut={() => { p.value = rm ? 1 : withSpring(1, SPRING.release) }}
        style={s.fab}>
        <Plus size={28} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>
    </Reanimated.View>
  );
}

export default function TabBar() {
  const T = useTheme(), ins = useInsets(), ui = useApp();
  let liveNow: any = null, place = '';
  try { liveNow = activeStage(doc(car())) } catch (e) {}
  try { const a = selectedAddress(); place = a ? addrName(a) + ' · ' + (a.area || '').split(',')[0] : '' } catch (e) {}
  const pb = Math.max(ins.bottom, 0), items = shown(), half = Math.ceil(items.length / 2), LEFT = items.slice(0, half), RIGHT = items.slice(half), fab = feature('instant') || feature('scheduled');
  const cell = (x: (typeof TAB_ITEMS)[number]) => <TabCell key={x.tab} t={x.tab} label={x.label} Ic={x.off} on={x.tab === ui.tab} liveNow={!!liveNow} />;
  const [bw, setBw] = React.useState(0);
  const cur = items.findIndex(x => x.tab === ui.tab), cellW = bw ? (bw - PADX * 2 - (fab ? MID : 0)) / Math.max(1, items.length) : 0;
  const px = (i: number) => PADX + i * cellW + (fab && i >= half ? MID : 0);
  return (
    <>
      <View pointerEvents="box-none" style={[s.outer, { bottom: pb + 8 }]}>
        {/* floating capsule: solid surface (no translucency over elevation), soft shadow, detached from the screen edges */}
        <View onLayout={e => setBw(e.nativeEvent.layout.width)} style={[s.bar, { backgroundColor: T.day ? '#FFFFFF' : T.tabBg, shadowOpacity: T.day ? 0.16 : 0.4, borderColor: T.day ? C.hairViolet : T.page.line }]}>
          <SlidePill x={px(Math.max(0, cur)) + (cellW - Math.min(PILL_W, cellW - 4)) / 2} w={cellW ? Math.min(PILL_W, cellW - 4) : 0} show={cur >= 0 && !!cellW} />
          {LEFT.map(cell)}
          {fab ? <View style={{ width: MID }} /> : null}
          {RIGHT.map(cell)}
        </View>
        {fab ? <CentreButton bottom={4} /> : null}
      </View>
      <LocationLoader place={place} />
    </>
  );
}

const s = StyleSheet.create({
  outer: { position: 'absolute', left: 16, right: 16, alignSelf: 'center', alignItems: 'center' },
  bar: {
    width: '100%', maxWidth: 420, height: BAR_H, borderRadius: BAR_H / 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: PADX, borderWidth: 1,
    shadowColor: '#1A1033', shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  cellIn: { alignItems: 'center', gap: 1, paddingTop: 1 },
  icWrap: { width: 40, height: 28, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  fab: {
    width: 62, height: 62, borderRadius: 31, borderWidth: 4, borderColor: '#fff', backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.violet, shadowOpacity: 0.42, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(23,23,23,0.08)' },
  optIc: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(84,9,218,0.10)', alignItems: 'center', justifyContent: 'center' },
});

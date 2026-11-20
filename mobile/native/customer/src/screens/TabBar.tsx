// Bottom tab bar, ported from the Partner app (washer app/(tabs)/_layout.tsx): white bar with a top hairline and an upward shadow,
// Home · Washes · [raised round violet "Book" button] · Money · Profile. The selected tab is a violet-tint pill with the icon and
// label side by side; the cell widens on a spring (reanimated). The centre button opens "Book a wash": Instant or Schedule.
// Also hosts the one-time splash/location loader overlay (Main renders the bar after the screen).
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, useReducedMotion } from 'react-native-reanimated';
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
const MID = 76;   // gap in the bar under the raised centre button
/** Height of the bar without the bottom inset; screens keep their scroll padding >= this + inset. */
export const TAB_H = TAB_BAR_H;

/* Home asks to be scrolled to the services grid (centre button -> Instant wash) */
let gridJump: (() => void) | null = null;
export const onGridJump = (f: (() => void) | null) => { gridJump = f };

function TabCell({ t, label, Ic, on, liveNow }: { t: Tab; label: string; Ic: IC; on: boolean; liveNow: boolean }) {
  const T = useTheme(), rm = useReducedMotion();
  const sel = useSharedValue(on ? 1 : 0), press = useSharedValue(1);
  useEffect(() => { sel.value = rm ? (on ? 1 : 0) : withSpring(on ? 1 : 0, { damping: 15, stiffness: 190, mass: 0.8 }); }, [on, rm]);
  const cell = useAnimatedStyle(() => ({ flex: 1 + 0.55 * sel.value }));
  const pill = useAnimatedStyle(() => ({ opacity: sel.value, transform: [{ scaleX: 0.55 + 0.45 * sel.value }, { scaleY: 0.8 + 0.2 * sel.value }] }));
  const sc = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const col = on ? (T.day ? C.violet : '#CDB6FF') : T.card.fg3;
  return (
    <Reanimated.View style={[{ minHeight: 54, justifyContent: 'center' }, cell]}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => go(t)}
        onPressIn={() => { if (!rm) press.value = withSpring(0.9, SPRING.press) }} onPressOut={() => { press.value = rm ? 1 : withSpring(1, SPRING.release) }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Reanimated.View style={[on ? s.pillOn : s.pillOff, sc]}>
          <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, backgroundColor: T.day ? 'rgba(84,9,218,0.11)' : 'rgba(139,92,246,0.26)' }, pill]} />
          <View>
            <Ic size={on ? 24 : 23} color={col} strokeWidth={on ? 2 : 1.6} />
            {t === 'live' && liveNow ? <View style={{ position: 'absolute', top: -6, right: -8 }}><Pulse color={C.green} size={5} /></View> : null}
          </View>
          <Txt weight={on ? 600 : 500} size={on ? 12 : 10} numberOfLines={1} color={col} style={{ lineHeight: on ? 16 : 14 }}>{label}</Txt>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
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
  return (
    <>
      <View pointerEvents="box-none" style={s.outer}>
        <View style={[s.bar, { backgroundColor: T.tabBg, borderTopColor: T.day ? C.hairViolet : T.page.line, height: TAB_H + pb, paddingBottom: 4 + pb, shadowOpacity: T.day ? 0.07 : 0 }]}>
          {LEFT.map(cell)}
          {fab ? <View style={{ width: MID }} /> : null}
          {RIGHT.map(cell)}
        </View>
        {fab ? <CentreButton bottom={pb + 20} /> : null}
      </View>
      <LocationLoader place={place} />
    </>
  );
}

const s = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingHorizontal: 6,
    borderTopWidth: 1, shadowColor: '#1A1033', shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 10,
  },
  pillOn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 12, borderRadius: 22 },
  pillOff: { alignItems: 'center', gap: 1, height: 44, justifyContent: 'center', paddingHorizontal: 6 },
  fabWrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  fab: {
    width: 62, height: 62, borderRadius: 31, borderWidth: 4, borderColor: '#fff', backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.violet, shadowOpacity: 0.42, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(23,23,23,0.08)' },
  optIc: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(84,9,218,0.10)', alignItems: 'center', justifyContent: 'center' },
});

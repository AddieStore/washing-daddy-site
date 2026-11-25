// Top of Home when the customer's spot (selected address, else GPS) is outside every service circle (state.coverage()).
// A calm card: pin with a "soon" badge, the plain statement, one Notify me button, and "Change address" for someone who is
// actually inside an area but picked the wrong address. After Notify me it says they are on the list.
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Reanimated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Txt } from './kit';
import { Pressable3 } from './motion';
import { act, coverage, notifyState, isGuest, toast, NOT_SERVED_TITLE, NOT_SERVED_SUB } from '../state';
import { openAddressPicker } from '../sheets/address';

const V = '#5409DA', INK = '#141414', SUB = '#55555C', OK = '#16a34a';

function PinSoon() {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M12 21s-6.5-6.1-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.9 12 21 12 21z" stroke={V} strokeWidth={1.8} strokeLinejoin="round" />
        <Circle cx={12} cy={9.8} r={2.4} stroke={V} strokeWidth={1.8} />
      </Svg>
      <View style={{ position: 'absolute', right: -4, top: -4, height: 18, paddingHorizontal: 6, borderRadius: 9, backgroundColor: '#FFBA08', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Txt weight={700} size={9} color={INK} style={{ lineHeight: 11 }}>SOON</Txt>
      </View>
    </View>
  );
}

export function CoverageBanner() {
  const c = coverage(), n = notifyState(), [busy, setBusy] = useState(false);
  if (!c.known || c.ok) return null;
  const listed = !!n && Math.abs(n.lat - c.lat) < 0.01 && Math.abs(n.lng - c.lng) < 0.01;
  const notify = async () => {
    if (isGuest()) { act.askLogin(); return }
    setBusy(true);
    try { const r = await act.notifyMe(); toast(r === 'saved' ? "Done. We'll tell you the day we start here." : "Saved. We'll send it as soon as you're online.") }
    catch (e: any) { toast((e && e.message) || "That didn't go through. Try again.") }
    setBusy(false);
  };
  return (
    <Reanimated.View entering={FadeInDown.duration(380)} accessibilityRole="summary"
      style={{ marginBottom: 18, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(84,9,218,0.14)',
        shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <PinSoon />
        <View style={{ flex: 1 }}>
          <Txt weight={700} size={16} color={INK} style={{ lineHeight: 21 }}>{NOT_SERVED_TITLE}{c.label ? ` (${c.label})` : ''}</Txt>
          <Txt size={13} color={SUB} style={{ marginTop: 4, lineHeight: 19 }}>{NOT_SERVED_SUB}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        {listed ? (
          <Reanimated.View entering={FadeIn.duration(260)} style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: '#EAF7EE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={OK} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <Txt weight={600} size={14} color={OK}>You're on the list</Txt>
          </Reanimated.View>
        ) : (
          <View style={{ flex: 1 }}><Pressable3 onPress={notify} disabled={busy} accessibilityRole="button" accessibilityLabel="Notify me when you start in my area" scaleTo={0.97}
            style={{ height: 44, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" stroke="#fff" strokeWidth={1.8} strokeLinejoin="round" /><Path d="M10 20.5a2 2 0 0 0 4 0" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /></Svg>
              <Txt weight={600} size={14} color="#fff">Notify me</Txt>
            </>}
          </Pressable3></View>
        )}
        <Pressable3 onPress={() => openAddressPicker()} accessibilityRole="button" haptics={false} scaleTo={0.97} style={{ height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F4F4F5', justifyContent: 'center' }}>
          <Txt weight={600} size={14} color={INK}>Change address</Txt>
        </Pressable3>
      </View>
    </Reanimated.View>
  );
}

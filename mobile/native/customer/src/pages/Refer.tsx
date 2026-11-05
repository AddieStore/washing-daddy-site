// Refer & earn page (pushed, Pronto look): code card, reward tiers, how it works, sticky share bar.
import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { refCode, inviteLink, act, closePage } from '../state';

const INK = '#1A0A33', GREY = '#6B6580', LINE = '#ECEAF2';
const TIERS = [['CHAMP', '₹100', '1 - 5 completed', '#FFFFFF'], ['STAR', '₹150', '6 - 9 completed', '#FFFFFF'], ['LEGEND', '₹200', '10+ completed', '#FFFFFF']] as const;
const STEPS = ['Share the link with your friend', 'Your friend downloads the app with your link', 'They get ₹200 and you get ₹200 when they pay for their first month'];

const Copy = () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round"><Rect x="9" y="9" width="11" height="11" rx="2.5" /><Path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" strokeLinecap="round" /></Svg>;

function Tier({ n, amt, who, i }: { n: string; amt: string; who: string; i: number }) {
  return (
    <LinearGradient colors={['#5409DA', '#7B3FF0']} style={{ flex: 1, borderRadius: 14, paddingTop: 4, overflow: 'hidden', marginTop: 0 }}>
      <Txt weight={600} size={9} color="#fff" style={{ textAlign: 'center', letterSpacing: 1.6, paddingVertical: 3 }}>{n}</Txt>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, margin: 1.5, marginTop: 0, padding: 8, height: 108 }}>
        <View style={{ position: 'absolute', right: -6, top: 4, width: 70, height: 38, borderRadius: 7, backgroundColor: C.gold, transform: [{ rotate: '-14deg' }], alignItems: 'center', justifyContent: 'center', shadowColor: '#C98A00', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <Txt weight={700} size={17} color="#7A4B00">{amt}</Txt>
        </View>
        <View style={{ flex: 1 }} />
        <Txt weight={700} size={14} color={INK}>{amt}</Txt>
        <Txt weight={600} size={7} color={GREY} style={{ letterSpacing: 0.4 }}>PER REFERRAL</Txt>
        <Txt size={10} color={INK} style={{ marginTop: 3, lineHeight: 13 }}>{who} bookings</Txt>
      </View>
    </LinearGradient>
  );
}

export default function Refer() {
  const ins = useInsets(), code = refCode();
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F5FA' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 14, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12}><Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 12H4M10 6l-6 6 6 6" /></Svg></Pressable>
        <Txt weight={600} size={18} color={INK}>Refer & earn</Txt>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12, paddingBottom: 150 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', paddingTop: 20, alignItems: 'center' }}>
          <Txt size={13.5} color={INK}>Refer a friend to Washing Daddy</Txt>
          <Txt weight={700} size={34} color={C.violet} style={{ lineHeight: 44, marginTop: 2 }}>Get ₹200</Txt>
          <Txt size={13} color={GREY} style={{ textAlign: 'center', paddingHorizontal: 28, lineHeight: 18 }}>Your friend gets ₹200 off their first month with Washing Daddy.</Txt>
          {code ? (
            <Pressable onPress={() => act.copy(code, 'Code copied')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F2F6', borderRadius: 999, paddingHorizontal: 22, height: 40, marginTop: 14 }}>
              <Txt weight={600} size={15} color={INK} style={{ letterSpacing: 0.5 }}>{code}</Txt><Copy />
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F0E3B0' }} /><Txt weight={600} size={9} color="#9A7A00" style={{ letterSpacing: 1.4 }}>REFERRAL REWARDS</Txt><View style={{ flex: 1, height: 1, backgroundColor: '#F0E3B0' }} />
          </View>
          <Txt weight={600} size={13.5} color={INK} style={{ textAlign: 'center', marginTop: 6, paddingHorizontal: 40, lineHeight: 18 }}>Complete more bookings to unlock higher referral rewards</Txt>
          <LinearGradient colors={['#FFFFFF', '#FFF6D0']} style={{ alignSelf: 'stretch', marginTop: 10, paddingHorizontal: 10, paddingBottom: 14, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>{TIERS.map((t, i) => <Tier key={t[0]} n={t[0]} amt={t[1]} who={t[2]} i={i} />)}</View>
          </LinearGradient>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, marginTop: 12, padding: 16 }}>
          <Txt weight={500} size={15} color={INK}>How it works</Txt>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F2F6', alignItems: 'center', justifyContent: 'center' }}><Txt size={13} color={GREY}>{i + 1}</Txt></View>
              <Txt size={12.5} color={GREY} style={{ flex: 1, lineHeight: 17 }}>{s}</Txt>
            </View>
          ))}
        </View>
        <Txt size={10.5} color="#9A94AB" style={{ textAlign: 'center', marginTop: 16 }}>Read our T&Cs to know more.</Txt>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 8 }}>
        <Pressable onPress={() => act.copyRef()} style={({ pressed }) => ({ height: 46, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
          <Txt weight={600} size={16} color="#fff">Share invite link</Txt>
        </Pressable>
        <Pressable onPress={() => act.copy(inviteLink(), 'Invite link copied')} style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
          <Txt weight={600} size={16} color={C.violet}>Find friends to refer</Txt>
        </Pressable>
      </View>
    </View>
  );
}

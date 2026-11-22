// Delete account: "Before you delete your account" (4 info cards), then a confirm step that files the request (act.requestDeletion). OWNER: PROFILE worker.
import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Txt, useInsets } from '../ui/kit';
import { Plan, Wallet, Clock, Receipt, Trash, Check, Back } from '../ui/icons';
import { act, useApp, closePage, toast, deletionBlockers } from '../state';
import { DELETE_INFO } from '../data/reference';
import { PageBar } from './Stub';
import { G, card, PrimaryBtn } from './parts';

const PEACH = '#FFEDE0', ICONS = [Plan, Wallet, Clock, Receipt];

function Hero() {
  return (
    <View style={{ width: 96, height: 96, alignSelf: 'center' }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={48} height={48} viewBox="0 0 70 70"><Circle cx="35" cy="24" r="12" fill="#5409DA" /><Path d="M10 66c0-17 11-25 25-25s25 8 25 25z" fill="#5409DA" /></Svg>
      </View>
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: G.neg, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Trash size={18} color="#fff" strokeWidth={1.5} /></View>
    </View>
  );
}
const Info = ({ i }: { i: number }) => { const I = ICONS[i], [t, s] = DELETE_INFO[i]; return (
  <View style={card({ flex: 1, padding: 12, minHeight: 124 })}>
    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: PEACH, alignItems: 'center', justifyContent: 'center' }}><I size={18} color="#C2410C" strokeWidth={1.5} /></View>
    <Txt weight={500} size={15} style={{ marginTop: 12 }}>{t}</Txt>
    <Txt size={12} color={G.sub} style={{ marginTop: 2, lineHeight: 17 }}>{s}</Txt>
  </View>) };
const Label = ({ children }: { children: string }) => <Txt weight={500} size={12} color={G.mute} style={{ letterSpacing: 0.6, marginTop: 24, marginBottom: 8 }}>{children}</Txt>;

export default function DeleteAccount() {
  useApp();
  const ins = useInsets(), blockers = deletionBlockers(), [step, setStep] = useState(0), [why, setWhy] = useState(''), [sure, setSure] = useState(false), [busy, setBusy] = useState(false);
  const file = async () => { setBusy(true); try { await act.requestDeletion(why) } catch (e: any) { toast(e.message); setBusy(false) } };
  const foot = (b: React.ReactNode) => <View style={{ padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line }}>{b}</View>;
  if (step === 1) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Delete account" onBack={() => setStep(0)} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
          <Txt weight={600} size={22} style={{ lineHeight: 28 }}>Tell us why you are leaving</Txt>
          <Txt size={14} color={G.sub} style={{ marginTop: 6, lineHeight: 20 }}>Optional, but it helps us get better. We remove your data within 30 days of the request.</Txt>
          <TextInput value={why} onChangeText={setWhy} multiline maxLength={300} placeholder="Your reason" placeholderTextColor={G.mute} accessibilityLabel="Reason"
            style={[{ marginTop: 16, minHeight: 96, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(23,23,23,0.16)', padding: 14, fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 22, includeFontPadding: false, color: G.ink, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
          {blockers.length ? <View style={{ marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: '#FEF2F2', gap: 6 }}>{blockers.map(b => <Txt key={b} size={14} color={G.neg}>{b}</Txt>)}</View> : null}
          <Pressable onPress={() => setSure(!sure)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 24 }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: sure ? G.neg : '#A1A1AA', backgroundColor: sure ? G.neg : '#fff', alignItems: 'center', justifyContent: 'center' }}>{sure ? <Check size={16} color="#fff" strokeWidth={2} /> : null}</View>
            <Txt size={14} style={{ flex: 1, lineHeight: 20 }}>I understand this cannot be undone.</Txt>
          </Pressable>
        </ScrollView>
        {foot(<><PrimaryBtn label="Request deletion" onPress={file} busy={busy} disabled={!sure} style={sure ? { backgroundColor: G.neg } : undefined} /><Pressable onPress={closePage} style={{ alignItems: 'center', paddingTop: 14 }}><Txt weight={500} size={14} color={G.sub}>Keep my account</Txt></Pressable></>)}
      </KeyboardAvoidingView>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        <Hero />
        <Txt weight={600} size={22} style={{ textAlign: 'center', marginTop: 16, lineHeight: 28 }}>Before you delete{'\n'}your account</Txt>
        {blockers.length ? <View style={{ marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: '#FFF7ED', gap: 4 }}><Txt weight={500} size={13} color="#C2410C">On your account right now</Txt>{blockers.map(b => <Txt key={b} size={13} color="#9A3412">{b}</Txt>)}</View> : null}
        <Label>RESOLVE BEFORE DELETION</Label>
        <View style={{ flexDirection: 'row', gap: 12 }}><Info i={0} /><Info i={1} /></View>
        <Label>NEEDS ATTENTION</Label>
        <View style={{ flexDirection: 'row', gap: 12 }}><Info i={2} /><Info i={3} /></View>
      </ScrollView>
      {foot(<PrimaryBtn label="Continue" onPress={() => setStep(1)} />)}
    </View>
  );
}

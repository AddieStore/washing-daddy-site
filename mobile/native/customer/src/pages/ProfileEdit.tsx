// Edit profile: first name, last name, mobile (read-only, it is the login), email. OWNER: PROFILE worker.
import React, { useState } from 'react';
import { View, ScrollView, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Txt, useInsets } from '../ui/kit';
import { C } from '../theme';
import { act, useApp, profile, closePage, toast, fmtPhone } from '../state';
import { PageBar } from './Stub';
import { G, PrimaryBtn } from './parts';

/** outlined field whose label floats to the top once focused or filled */
export function FloatField({ label, value, onChange, readOnly, keyboardType, prefix, right, multiline, maxLength, autoCapitalize }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; keyboardType?: any; prefix?: string; right?: React.ReactNode; multiline?: boolean; maxLength?: number; autoCapitalize?: any }) {
  const [f, setF] = useState(false), up = f || !!value || !!prefix;
  return (
    <View style={{ minHeight: 56, borderRadius: 10, borderWidth: f ? 1.5 : 1, borderColor: f ? C.violet : 'rgba(23,23,23,0.16)', backgroundColor: readOnly ? G.raised : '#fff', paddingHorizontal: 14, justifyContent: 'center', marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, paddingTop: up ? 14 : 0, paddingBottom: up ? 4 : 0 }}>
        <Txt size={up ? 11 : 15} color={f ? C.violet : G.mute} style={{ position: 'absolute', left: 0, top: up ? 6 : 0, lineHeight: up ? 14 : 24 }} numberOfLines={1}>{label}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {prefix ? <Txt size={15} color={G.ink} style={{ marginRight: 8 }}>{prefix}</Txt> : null}
          <TextInput value={value} editable={!readOnly} onChangeText={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} keyboardType={keyboardType} maxLength={maxLength} multiline={multiline} autoCapitalize={autoCapitalize}
            accessibilityLabel={label} style={[{ flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: readOnly ? G.mute : G.ink, paddingVertical: 0, minHeight: 24 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
        </View>
      </View>
      {right}
    </View>
  );
}

export default function ProfileEdit() {
  useApp();
  const ins = useInsets(), p = profile(), [first, setFirst] = useState(p.first), [last, setLast] = useState(p.last), [email, setEmail] = useState(p.email), [busy, setBusy] = useState(false);
  const dirty = first.trim() !== p.first || last.trim() !== p.last || email.trim().toLowerCase() !== p.email;
  const save = async () => {
    setBusy(true);
    try { await act.saveProfile({ first, last, email }); toast('Profile updated'); closePage() } catch (e: any) { toast(e.message) } finally { setBusy(false) }
  };
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title="Profile details" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, padding: 16, paddingTop: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: G.raised, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Svg width={96} height={96} viewBox="0 0 70 70"><Circle cx="35" cy="28" r="12" fill="#D4D4D8" /><Path d="M10 70c0-17 11-25 25-25s25 8 25 25z" fill="#D4D4D8" /></Svg>
              </View>
            </View>
            <FloatField label="First name" value={first} onChange={setFirst} maxLength={40} autoCapitalize="words" />
            <FloatField label="Last name" value={last} onChange={setLast} maxLength={40} autoCapitalize="words" />
            <FloatField label="Mobile" value={fmtPhone(p.phone)} readOnly prefix="+91" />
            <FloatField label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={120} />
            <Txt size={12} color={G.mute} style={{ marginTop: -4 }}>Your mobile number is how you sign in, so it cannot be changed here.</Txt>
          </View>
        </ScrollView>
        <View style={{ padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line }}>
          <PrimaryBtn label="Update profile" onPress={save} busy={busy} disabled={!dirty || !first.trim()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

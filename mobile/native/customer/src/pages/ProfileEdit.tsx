// Edit profile: first name, last name, mobile (read-only, it is the login), email. OWNER: PROFILE worker.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Platform, KeyboardAvoidingView, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Txt, useInsets } from '../ui/kit';
import { C } from '../theme';
import { act, useApp, profile, closePage, toast, fmtPhone } from '../state';
import { PageBar } from './Stub';
import { G, PrimaryBtn } from './parts';

/** outlined field: label sits vertically centred when empty and unfocused, and glides to the top (12px, pinned) once focused or filled.
 *  The typed text lives below it (paddingTop 26) so the two never overlap; label, prefix and text share one left edge and one font/line-height. */
const FF_PAD = 14, FF_FONT = 15, FF_LINE = 22;
export function FloatField({ label, value, onChange, readOnly, keyboardType, prefix, right, multiline, maxLength, autoCapitalize }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; keyboardType?: any; prefix?: string; right?: React.ReactNode; multiline?: boolean; maxLength?: number; autoCapitalize?: any }) {
  const [f, setF] = useState(false), up = f || !!value || !!prefix;
  const t = useRef(new Animated.Value(up ? 1 : 0)).current;
  useEffect(() => { Animated.timing(t, { toValue: up ? 1 : 0, duration: 140, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start() }, [up]);
  const txt = { fontFamily: 'Poppins_400Regular', fontSize: FF_FONT, lineHeight: FF_LINE, paddingTop: 26, paddingBottom: 8, paddingHorizontal: 0, margin: 0, includeFontPadding: false } as const;
  return (
    <View style={{ minHeight: 64, borderRadius: 10, borderWidth: f ? 1.5 : 1, borderColor: f ? C.violet : 'rgba(23,23,23,0.16)', backgroundColor: readOnly ? G.raised : '#fff', paddingHorizontal: f ? FF_PAD - 0.5 : FF_PAD - 0, marginBottom: 16, flexDirection: 'row', alignItems: 'stretch' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
        {prefix ? <Text style={[txt, { color: G.ink, marginRight: 8, textAlignVertical: 'top' }]}>{prefix}</Text> : null}
        <TextInput value={value} editable={!readOnly} onChangeText={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} keyboardType={keyboardType} maxLength={maxLength} multiline={multiline} autoCapitalize={autoCapitalize}
          accessibilityLabel={label} style={[txt, { flex: 1, minWidth: 0, color: readOnly ? G.mute : G.ink, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
      </View>
      <Animated.Text pointerEvents="none" numberOfLines={1} style={{ position: 'absolute', left: FF_PAD - (f ? 0.5 : 0), right: FF_PAD, includeFontPadding: false, fontFamily: 'Poppins_400Regular', color: f ? C.violet : G.mute,
        fontSize: t.interpolate({ inputRange: [0, 1], outputRange: [FF_FONT, 12] }), lineHeight: t.interpolate({ inputRange: [0, 1], outputRange: [24, 16] }), top: t.interpolate({ inputRange: [0, 1], outputRange: [19, 10] }) } as any}>{label}</Animated.Text>
      {right ? <View style={{ justifyContent: 'center', paddingLeft: 8 }}>{right}</View> : null}
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

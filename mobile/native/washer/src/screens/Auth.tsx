// Sign-in (v24): the customer app's login language with washer content. App tile + PARTNER pill, a lavender-sky story band (scooter ride, foam wash,
// photo proof + rupee coin; turns by itself, dots to jump) with a Hinglish caption, then a white sheet that rises over it (phone + PIN or phone + SMS OTP; OTP; join; waiting).
// Port of renderAuth + #auth in the web washer app. Art is react-native-svg + RN Animated only (src/ui/art/LoginStoryArt.tsx). Auth logic is untouched.
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, NativeSyntheticEvent, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, Pressy, Rise, SuccessTick, ui, useReducedMotion, useTheme } from '../ui';
import { act, REAL, S, useStore, view } from '../state/store';
import { backend } from '../backend';
import { t } from '../lib/i18n';
import { JOIN_AREAS, OWNER_WA, WASHERS, fmtPhone } from '../lib/data';
import { referralKey } from './Onboarding';
import { LoginStoryArt } from '../ui/art';

const PADX = 24;
const VIOLET = '#5409DA';   // brand violet
const LINE = 'rgba(84,9,218,0.18)';
const OFF = '#E6E0F5';
const OFF_INK = '#6B6483';
const native = Platform.OS !== 'web';
const IMG = {
  icon: require('../../assets/icon.png'),
  washer: require('../../assets/img/login-man.webp'),
  photo: require('../../assets/img/auth-photo.webp'),
};
const NUM = { fontVariant: ['tabular-nums'] } as const;
const BAND = 440;   // height of the lavender sky behind the story

/* ---------------- the lavender top: sky gradient that melts into the white sheet ---------------- */
function BrandBg() {
  const { dark } = useTheme();
  const [w, setW] = useState(390);
  return (
    <View pointerEvents="none" onLayout={e => setW(e.nativeEvent.layout.width)} style={StyleSheet.absoluteFill}>
      <Svg width={w} height={BAND} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="wab" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dark ? '#2A1E4D' : '#E3D8FF'} /><Stop offset="1" stopColor={dark ? '#1C1534' : '#F7F3FF'} />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={BAND} fill="url(#wab)" />
      </Svg>
    </View>
  );
}

/** the Washing Daddy app tile (same mark the customer app puts top-left) */
function AppMark({ size }: { size: number }) {
  return <Image source={IMG.icon} accessibilityRole="header" accessibilityLabel="Washing Daddy" style={{ width: size, height: size, borderRadius: size * 0.26 }} />;
}
function PartnerPill() {
  return (
    <View style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(84,9,218,0.18)' }}>
      <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, color: VIOLET, textTransform: 'uppercase' }}>{t('Partner app')}</Text>
    </View>
  );
}
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressy accessibilityLabel="Back" accessibilityRole="button" onPress={onPress} hitSlop={8} scaleTo={0.92}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(84,9,218,0.18)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="back" size={22} color={VIOLET} />
    </Pressy>
  );
}

/* ---------------- story caption: what the washer gets, one line per scene, with progress dots ---------------- */
const STORY: { t: string; s: string }[] = [
  { t: 'Round shuru, kamai chalu', s: 'Aaj ke saare cars ek list mein. Scooter nikalo, seedha gate pe.' },
  { t: 'Foam lagao, shine karo', s: 'Pressure wash, no pocha. Paani aur power saath mein.' },
  { t: 'Photo bhejo, paisa pao', s: 'Har wash ka photo proof. Roz ka payout app mein dekho.' },
];
function Dot({ on }: { on: boolean }) {
  const { dark } = useTheme();
  const w = useRef(new Animated.Value(on ? 20 : 6)).current;
  useEffect(() => { Animated.timing(w, { toValue: on ? 20 : 6, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() }, [on, w]);
  return <Animated.View style={{ width: w, height: 6, borderRadius: 3, backgroundColor: on ? VIOLET : dark ? 'rgba(255,255,255,0.22)' : 'rgba(84,9,218,0.16)' }} />;
}
function StoryCaption({ scene, onPick }: { scene: number; onPick: (i: number) => void }) {
  const { c } = useTheme();
  const narrow = useWindowDimensions().width < 375;
  return (
    <View>
      <Rise key={scene} distance={8} duration={320} style={{ minHeight: 86 }}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: narrow ? 23 : 26, lineHeight: narrow ? 30 : 33, color: c.fg }}>{t(STORY[scene].t)}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2, marginTop: 4 }}>{t(STORY[scene].s)}</Text>
      </Rise>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {STORY.map((_, i) => (
          <Pressable key={i} onPress={() => onPick(i)} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={`Scene ${i + 1}`} style={{ justifyContent: 'center' }}><Dot on={i === scene} /></Pressable>
        ))}
      </View>
    </View>
  );
}

/** three small trust points under the button */
function TrustRow() {
  const { c, dark } = useTheme();
  const items: { icon: 'rupee' | 'cam' | 'phone'; t: string }[] = [
    { icon: 'rupee', t: 'Roz ka payout dikhta hai' },
    { icon: 'cam', t: 'Photo proof se pakka paisa' },
    { icon: 'phone', t: 'Manager support, WhatsApp pe' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
      {items.map((it, i) => (
        <Rise key={it.t} delay={420 + i * 70} distance={10} style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#F7F3FF' }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: dark ? 'rgba(122,66,240,0.25)' : 'rgba(84,9,218,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              {it.icon === 'rupee'
                ? <Text style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 22, color: dark ? '#B79BFF' : VIOLET }}>₹</Text>
                : <Icon name={it.icon} size={18} color={dark ? '#B79BFF' : VIOLET} />}
            </View>
            <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.fg2, textAlign: 'center' }}>{t(it.t)}</Text>
          </View>
        </Rise>
      ))}
    </View>
  );
}

/* ---------------- sheet pieces ---------------- */
const CardTitle = ({ children }: { children: string }) => {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 30, color: c.fg }}>{children}</Text>;
};
const CardText = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2, marginTop: 2, marginBottom: 16 }}>{children}</Text>;
};
const Err = ({ msg }: { msg: string }) => (msg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: '#dc2626', marginBottom: 12 }}>{msg}</Text> : <View style={{ minHeight: 4 }} />);
const Hint = ({ children, style }: { children: React.ReactNode; style?: object }) => {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: c.fg3, textAlign: 'center', marginTop: 16 }, style]}>{children}</Text>;
};
function TextLink({ label, onPress, color, disabled }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityRole="link" scaleTo={0.97} hitSlop={12}
      style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 14, color: disabled ? c.fg3 : color ?? c.primary }}>{label}</Text>
    </Pressy>
  );
}
const errOf = (e: any) => e?.hi ? t(e.hi) : e?.message || t('Nahi gaya. Internet dekh ke dobara try karo.');

/** Primary button: 56 high, radius 16, violet with a violet glow; lilac when it cannot be used yet (`ready` false still taps, so the helpful error shows) or is busy. */
function Cta({ label, onPress, busy, ready = true, arrow, style }: { label: string; onPress: () => void; busy?: boolean; ready?: boolean; arrow?: boolean; style?: object }) {
  const { c, dark } = useTheme();
  const off = busy || !ready;
  return (
    <Pressy onPress={onPress} disabled={busy} accessibilityLabel={label} scaleTo={0.97}
      style={[{ minHeight: 56, borderRadius: 16, backgroundColor: off ? (dark ? c.tile2 : OFF) : c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
        !off && { shadowColor: VIOLET, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, style]}>
      <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 16, color: off ? (dark ? c.fg3 : OFF_INK) : '#fff', textAlign: 'center', flexShrink: 1 }}>{label}</Text>
      {arrow && !busy ? <Icon name="arrow" size={18} color={off ? (dark ? c.fg3 : OFF_INK) : '#fff'} /> : null}
    </Pressy>
  );
}

/** Label on top, box below: canvas fill, white + 1.5px violet border while it has the cursor (customer Field). */
function Input({ label, style, onFocus, onBlur, ...rest }: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.fg2, marginBottom: 6 }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.fg3}
        accessibilityLabel={label}
        {...rest}
        onFocus={e => { setFocus(true); onFocus?.(e) }}
        onBlur={e => { setFocus(false); onBlur?.(e) }}
        style={[{ width: '100%', minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: focus ? c.primary : 'transparent', backgroundColor: focus ? c.card : c.inputBg, color: c.fg, fontFamily: F.body, fontSize: 16, paddingHorizontal: 16, paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, style]}
      />
    </View>
  );
}
/** The big +91 / PIN box: 60 high, radius 16, 1.5px border that turns violet once something is typed. */
// the light fields lean lavender (like the customer app's); dark mode keeps its own fill
const tintBg = (bg: string) => (bg === '#F4F4F6' ? '#F7F3FF' : bg);
const bigBox = (c: { inputBg: string }, filled: boolean) => ({
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 60, borderRadius: 16, paddingHorizontal: 16,
  backgroundColor: tintBg(c.inputBg), borderWidth: 1.5, borderColor: filled ? VIOLET : LINE, marginBottom: 12,
});

/* ---------------- phone ---------------- */
const Flag = () => (
  <View style={{ width: 26, height: 18, borderRadius: 4, overflow: 'hidden' }}>
    <Svg width={26} height={18} viewBox="0 0 26 18">
      <Rect width={26} height={6} fill="#FF9933" /><Rect y={6} width={26} height={6} fill="#fff" /><Rect y={12} width={26} height={6} fill="#138808" />
      <Circle cx={13} cy={9} r={2.4} fill="none" stroke="#000080" strokeWidth={0.9} />
    </Svg>
  </View>
);
// the +91 phone box (PIN and OTP sign-in both start with it)
function PhoneField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { c } = useTheme();
  return (
    <View style={bigBox(c, !!value)}>
      <Flag />
      <Text style={[{ fontFamily: F.semi, fontSize: 18, color: c.fg }, NUM]}>+91</Text>
      <View style={{ width: 1, height: 24, backgroundColor: LINE }} />
      <TextInput
        value={value}
        onChangeText={x => onChange(x.replace(/\D/g, '').slice(0, 10))}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="tel-national"
        textContentType="telephoneNumber"
        maxLength={10}
        placeholder="98xxxxxxxx"
        placeholderTextColor={c.fg3}
        accessibilityLabel="Phone number"
        style={[{ flex: 1, minWidth: 0, minHeight: 56, fontFamily: F.medium, fontSize: 20, letterSpacing: 0.4, paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false, color: c.fg, fontVariant: ['tabular-nums'] }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
    </View>
  );
}
// 10 digits starting 6-9, or the Hinglish reason it is not
const phoneErr = (v: string) => (v.length !== 10 ? t('10 number ka phone daalo') : !/^[6-9]/.test(v) ? t('Number sahi nahi lag raha.') : '');

// test version only: a hint card with the demo washers to tap instead of typing a number
function TestCard({ text, onPick }: { text: string; onPick: (phone: string) => void }) {
  const { c } = useTheme();
  const lead = text.split('.')[0];
  const rest = text.slice(lead.length + 1).trim();
  return (
    <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: c.inputBg }}>
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: c.fg3 }}>
        <Text style={{ fontFamily: F.semi, color: c.fg }}>{lead + '.'}</Text>{rest ? ' ' + rest : ''}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {Object.values(WASHERS).map(w => (
          <Pressy
            key={w.id}
            scaleTo={0.96}
            accessibilityLabel={w.name}
            onPress={() => { ui.haptic(6); onPick(w.phone) }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 16, borderRadius: 14, backgroundColor: c.card, minHeight: 56, minWidth: 140, flexGrow: 1 }}
          >
            {w.img
              ? <Image source={IMG[w.img]} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.tile2 }} resizeMode="cover" />
              : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 18, color: '#fff' }}>{w.name[0]}</Text></View>}
            <View>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{w.name}</Text>
              <Text style={[{ fontFamily: F.body, fontSize: 12, color: c.fg3 }, NUM]}>{fmtPhone(w.phone)}</Text>
            </View>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

/* ---------------- phone + PIN (the dormant default, no SMS) ---------------- */
function PinStep() {
  const { c } = useTheme();
  const [ph, setPh] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const pinRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const busyRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();

  const tick = () => new Promise<void>(res => { Keyboard.dismiss(); setOk(true); ui.haptic([10, 30, 10]); setTimeout(res, rm ? 300 : 900) });
  const go = async () => {
    if (busyRef.current) return;
    const v = ph.replace(/\D/g, '');
    const pe = phoneErr(v); if (pe) { setErr(pe); return }
    if (!/^\d{4,6}$/.test(pin)) { setErr(t('4 se 6 number ka PIN daalo')); pinRef.current?.focus(); return }
    busyRef.current = true; setBusy(true); setErr('');
    try { await act.pinLogin(v, pin, tick) } catch (e: any) {
      busyRef.current = false; setBusy(false); setOk(false);
      setErr(errOf(e)); ui.haptic([30, 40, 30]);
      shake.setValue(0);
      Animated.sequence([6, -6, 4, -4, 0].map(x => Animated.timing(shake, { toValue: x, duration: 70, useNativeDriver: native }))).start();
      setPin(''); if (e?.code !== 'locked') pinRef.current?.focus();
    }
  };
  return (
    <View>
      <CardTitle>{t('Namaste! 👋')}</CardTitle>
      <CardText>{t('Apna phone number aur PIN daalo. PIN manager deta hai.')}</CardText>
      <PhoneField value={ph} onChange={setPh} onSubmit={() => pinRef.current?.focus()} />
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <View style={bigBox(c, !!pin)}>
          <Text style={{ fontFamily: F.semi, fontSize: 18, color: c.fg }}>PIN</Text>
          <View style={{ width: 1, height: 24, backgroundColor: LINE }} />
          <TextInput
            ref={pinRef}
            value={pin}
            onChangeText={x => setPin(x.replace(/\D/g, '').slice(0, 6))}
            onSubmitEditing={() => { void go() }}
            secureTextEntry
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            textContentType="none"
            maxLength={6}
            editable={!ok}
            placeholder={t('4-6 number')}
            placeholderTextColor={c.fg3}
            accessibilityLabel="PIN"
            style={[{ flex: 1, minWidth: 0, minHeight: 56, fontFamily: pin ? F.semi : F.medium, fontSize: pin ? 20 : 18, letterSpacing: pin ? 4 : 0, paddingVertical: 0, color: c.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
      </Animated.View>
      <Err msg={err} />
      <Cta label={busy ? t('Check ho raha hai…') : t('Andar chalo')} arrow busy={busy} ready={ph.length === 10 && pin.length >= 4} onPress={() => { void go() }} />
      {REAL ? (
        <Hint>{t('Naye washer ho? OTP se login karo, naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <TestCard text={t('Test version. Washer chuno, PIN 1234 daalo.')} onPick={p => { setPh(p); setErr(''); setTimeout(() => pinRef.current?.focus(), 50) }} />
      )}
      {ok ? <OkOverlay text={t('PIN sahi hai!')} /> : null}
    </View>
  );
}

function OkOverlay({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <SuccessTick size={84} />
      <Text style={{ fontFamily: F.semi, fontSize: 22, color: c.fg }}>{text}</Text>
    </View>
  );
}

/* ---------------- phone for the SMS OTP ---------------- */
function PhoneStep() {
  const [ph, setPh] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (raw: string) => {
    if (busy) return;
    const v = raw.replace(/\D/g, '');
    const pe = phoneErr(v); if (pe) { setErr(pe); return }
    setErr(''); setBusy(true);
    try { await act.sendOtp(v) } catch (e: any) { setBusy(false); setErr(errOf(e)) }
  };
  return (
    <View>
      <CardTitle>{t('Aaj ka round shuru karo')}</CardTitle>
      <CardText>{t('Phone number daalo, SMS pe OTP aayega.')}</CardText>
      <PhoneField value={ph} onChange={setPh} onSubmit={() => go(ph)} />
      {busy ? <Hint style={{ marginTop: 0, marginBottom: 8 }}>{t("Google ek check khol sakta hai. 'I'm not a robot' par tap karo aur app mein wapas aao.")}</Hint> : null}
      <Err msg={err} />
      <Cta label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} arrow busy={busy} ready={ph.length === 10} onPress={() => go(ph)} />
      <TrustRow />
      {REAL ? (
        <Hint>{t('Naye washer ho? Apna number daalo. OTP ke baad naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <TestCard text={t('Test version. Washer chuno:')} onPick={p => { setPh(p); void go(p) }} />
      )}
    </View>
  );
}

/* ---------------- otp ---------------- */
// one digit box: 68 high, radius 16, violet border once it has the cursor or a digit
function OtpBox({ on, big, inputRef, ...rest }: React.ComponentProps<typeof TextInput> & { on: boolean; big: boolean; inputRef: (r: React.ComponentRef<typeof TextInput> | null) => void }) {
  const { c } = useTheme();
  const digitOn = !!rest.value;
  return (
    <View style={{ flex: 1, maxWidth: 64, height: 68 }}>
      <TextInput
        ref={inputRef}
        {...rest}
        style={[{
          height: '100%', width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontFamily: F.semi, fontSize: big ? 30 : 26, color: c.fg, padding: 0, paddingVertical: 0,
          borderRadius: 16, borderWidth: 1.5, borderColor: on || digitOn ? VIOLET : LINE, backgroundColor: tintBg(c.inputBg), fontVariant: ['tabular-nums'],
        }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
    </View>
  );
}

function OtpStep() {
  const { c } = useTheme();
  const N = backend.auth.codeLength;
  const [codes, setCodes] = useState<string[]>(() => Array(N).fill(''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [left, setLeft] = useState(30);
  const refs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);
  const busyRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => { const id = setTimeout(() => refs.current[0]?.focus(), 150); return () => clearTimeout(id) }, []);
  // resend countdown
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // the code was accepted: show the tick for a moment, then the store moves on
  const tick = () => new Promise<void>(res => { Keyboard.dismiss(); setOk(true); ui.haptic([10, 30, 10]); setTimeout(res, rm ? 300 : 900) });
  const submit = async (code: string) => {
    if (busyRef.current) return;
    if (code.length < N) { setErr(t(`${N} number ka OTP daalo`)); return }
    busyRef.current = true; setBusy(true); setErr('');
    try { await act.confirmOtp(code, tick) } catch (e: any) {
      busyRef.current = false; setBusy(false); setOk(false);
      setErr(errOf(e)); ui.haptic([30, 40, 30]);
      shake.setValue(0);
      Animated.sequence([6, -6, 4, -4, 0].map(v => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: native }))).start();
      setCodes(Array(N).fill('')); refs.current[0]?.focus();
    }
  };
  const resend = async () => {
    try { await act.sendOtp(view.otpPhone); setLeft(30); setCodes(Array(N).fill('')); setErr(''); refs.current[0]?.focus() } catch (e: any) { setErr(errOf(e)) }
  };
  const change = (i: number, text: string) => {
    const all = text.replace(/\D/g, '');
    if (i === 0 && all.length === N) { setCodes(all.split('')); void submit(all); return }
    const ch = all.slice(-1);
    const next = codes.slice(); next[i] = ch; setCodes(next);
    if (ch && i < N - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) void submit(next.join(''));
  };
  return (
    <View>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: N > 4 ? 8 : 12, marginTop: 4, marginBottom: 16, transform: [{ translateX: shake }] }}>
        {codes.map((digit, i) => (
          <OtpBox
            key={i}
            on={focused === i}
            big={N <= 4}
            inputRef={r => { refs.current[i] = r }}
            value={digit}
            onChangeText={x => change(i, x)}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(f => (f === i ? -1 : f))}
            onKeyPress={(e: NativeSyntheticEvent<{ key: string }>) => { if (e.nativeEvent.key === 'Backspace' && !codes[i] && i) refs.current[i - 1]?.focus() }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={i === 0 ? N : 1}
            autoComplete={i === 0 ? 'sms-otp' : 'off'}
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            selectTextOnFocus
            editable={!ok}
            accessibilityLabel={`OTP digit ${i + 1}`}
          />
        ))}
      </Animated.View>
      <Err msg={err} />
      <View style={{ alignItems: 'center', minHeight: 36, justifyContent: 'center' }}>
        {left > 0
          ? <Text style={[{ fontFamily: F.body, fontSize: 14, color: c.fg3 }, NUM]}>{t('OTP bhejo') + ' · 0:' + String(left).padStart(2, '0')}</Text>
          : <TextLink label={t('OTP bhejo')} onPress={() => { void resend() }} />}
      </View>
      {REAL ? null : (
        <View style={{ marginTop: 8, marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: c.inputBg }}>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: c.fg3 }}>{t('Test mein')} <Text style={{ fontFamily: F.semi, color: c.fg }}>1234</Text>.</Text>
        </View>
      )}
      <Cta label={busy ? t('Check ho raha hai…') : t('Andar chalo')} arrow busy={busy} ready={codes.every(Boolean)} onPress={() => submit(codes.join(''))} />
      {ok ? <OkOverlay text={t('OTP sahi hai!')} /> : null}
    </View>
  );
}

/* ---------------- join ---------------- */
function JoinStep() {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [ref, setRef] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // a code saved during onboarding fills the box
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(referralKey()).then(v => { if (alive && v) setRef(r => r || v) }).catch(() => {});
    return () => { alive = false };
  }, []);
  const go = async () => {
    const nm = name.trim().replace(/\s+/g, ' ');
    if (nm.length < 2) { setErr(t('Apna naam likho')); return }
    if (!area) { setErr(t('Area chuno')); return }
    const code = ref.trim().toUpperCase().replace(/\s+/g, '');
    if (code && !/^WD\d{5}$/.test(code)) { setErr(t('Code aisa hota hai: WD12345. Nahi pata toh khali chhodo')); return }
    setErr(''); setBusy(true);
    try { await act.join(nm, area, code) } catch (e) { console.warn(e); setBusy(false); setErr(t('Nahi gaya. Internet dekh ke dobara try karo.')) }
  };
  const lab = { fontFamily: F.medium, fontSize: 13, color: c.fg2 } as const;
  return (
    <View>
      <Input label={t('Aapka naam')} value={name} onChangeText={setName} maxLength={60} autoComplete="name" placeholder={t('Jaise: Ramesh Kumar')} />
      <Text style={[lab, { marginTop: 16, marginBottom: 8 }]}>{t('Kaunsa area?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {JOIN_AREAS.map(a => {
          const on = a === area;
          return (
            <Pressy key={a} onPress={() => { setArea(a); ui.haptic(6) }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a}
              style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? c.primary : c.inputBg }}>
              <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? '#fff' : c.fg }}>{a}</Text>
            </Pressy>
          );
        })}
      </View>
      <View style={{ marginTop: 16 }}>
        <Input label={t('Dost ka code (agar hai)')} value={ref} onChangeText={setRef} maxLength={7} autoCapitalize="characters" autoComplete="off" autoCorrect={false} placeholder={t('Jaise: WD12345')} />
      </View>
      <View style={{ height: 16 }} />
      <Err msg={err} />
      <Cta label={busy ? t('Bhej raha hoon…') : t('Approval ke liye bhejo')} arrow busy={busy} ready={name.trim().length > 1 && !!area} onPress={go} />
      <View style={{ alignItems: 'center', marginTop: 4 }}><TextLink label={t('Number badlo')} onPress={() => act.backToPhone()} /></View>
    </View>
  );
}

/* ---------------- waiting / blocked / no round ---------------- */
const WAIT_TEXT: Record<string, [string, string]> = {
  wait: ['Approval ka intezaar ⏳', 'Aapki details manager ke paas pahunch gayi. Jaise hi woh approve karenge, app khud khul jayega. App band bhi kar sakte ho.'],
  noround: ['Round abhi set nahi hua', 'Aap approve ho gaye ho, par aapka round abhi set nahi hua. Manager se baat karo.'],
  blocked: ['Account band hai', 'Is number se abhi kaam nahi ho sakta. Manager se baat karo.'],
};
function WaitStep() {
  const { c } = useTheme();
  const p10 = (backend.auth.phone() || '').slice(-10) || S.session?.phone || '';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: 16, paddingHorizontal: 16, backgroundColor: c.inputBg, marginBottom: 16 }}>
        <Icon name="phone" size={20} color={c.primary} />
        <Text style={[{ fontFamily: F.semi, fontSize: 18, color: c.fg }, NUM]}>+91 {fmtPhone(p10)}</Text>
      </View>
      <Cta label={t('Manager ko WhatsApp karo')} onPress={() => { void Linking.openURL('https://wa.me/' + OWNER_WA).catch(() => {}) }} />
      <View style={{ alignItems: 'center', marginTop: 4 }}><TextLink label={t('Log out')} onPress={() => { void act.logout() }} /></View>
    </View>
  );
}

/* ---------------- screen ---------------- */
export default function Auth() {
  useStore();
  const insets = useSafeAreaInsets();
  // Android edge-to-edge: the inset can come back 0 early, so fall back to the status bar height
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const { c, dark } = useTheme();
  const { width: ww, height: wh } = useWindowDimensions();
  const width = Math.min(440, ww);
  const rmAuth = useReducedMotion();
  const step = view.authStep;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const content = useRef<React.ComponentRef<typeof View>>(null);
  const offset = useRef(0);
  // the story: three scenes that turn by themselves (tap a dot to jump)
  const [scene, setScene] = useState(0);
  const lastPick = useRef(0);
  useEffect(() => {
    if (rmAuth || step !== 'phone') return;
    const id = setInterval(() => { if (Date.now() - lastPick.current > 5000) setScene(s => (s + 1) % STORY.length) }, 3800);
    return () => clearInterval(id);
  }, [rmAuth, step]);
  // keyboard up: bring the focused box into view (a little below the top, so the sheet title stays readable)
  useEffect(() => {
    const reveal = () => {
      const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
      if (!input || !content.current) return;
      try {
        input.measureLayout(content.current as any, (_x: number, y: number) => {
          const to = Math.max(0, y - 190);
          if (Math.abs(to - offset.current) > 24) scroll.current?.scrollTo({ y: to, animated: true });
        }, () => {});
      } catch { /* not measurable: leave it */ }
    };
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setTimeout(reveal, Platform.OS === 'ios' ? 120 : 60));
    return () => sub.remove();
  }, []);

  // what the top says for each step (the phone step uses the story captions instead)
  const [wTi, wTx] = WAIT_TEXT[step] || WAIT_TEXT.wait;
  const top: { title?: string; sub?: React.ReactNode; back?: boolean } =
    step === 'otp' ? { back: true, title: t('OTP daalo'), sub: t(`+91 ${fmtPhone(view.otpPhone)} pe SMS bheja.`) }
    : step === 'join' ? { title: t('Swagat hai! 🙌'), sub: t('Naya number hai. Apna naam aur area batao, manager approve karenge.') }
    : step === 'phone' ? {}
    : { title: t(wTi), sub: t(wTx) };
  const phoneStep = step === 'phone';
  // story height scales with the screen: 360x640 phones get a shorter band, tall phones a taller one
  const storyH = phoneStep ? Math.round(Math.max(150, Math.min(210, wh * 0.235))) : 118;

  const form = (
    <Rise key={step + view.otpPhone + (step === 'phone' ? view.loginMode : '')} distance={12} duration={380}>
      {step === 'phone' ? (view.loginMode === 'pin' ? <PinStep /> : <PhoneStep />)
        : step === 'otp' ? <OtpStep key={'otp' + view.otpPhone} />
        : step === 'join' ? <JoinStep />
        : <WaitStep key={step} />}
    </Rise>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.stage, alignItems: 'center' }}>
      {/* edge-to-edge Android does not shrink the window for the keyboard any more, so pad on both platforms */}
      <KeyboardAvoidingView behavior={native ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: c.card }}>
        <BrandBg />
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={64}
          onScroll={e => { offset.current = e.nativeEvent.contentOffset.y }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View ref={content} collapsable={false} style={{ flexGrow: 1 }}>
            {/* lavender top */}
            <View>
              <Rise delay={0} style={{ paddingHorizontal: PADX - 4, paddingTop: topInset + 12, paddingBottom: 12, zIndex: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {top.back ? <BackBtn onPress={() => act.backToPhone()} /> : <AppMark size={44} />}
                  {top.back ? <AppMark size={36} /> : <PartnerPill />}
                </View>
              </Rise>
              <View style={{ marginTop: phoneStep ? -6 : 0 }}><LoginStoryArt width={width} height={storyH} scene={phoneStep ? scene : 0} dark={dark} still={rmAuth} /></View>
              <View style={{ paddingHorizontal: PADX, paddingTop: phoneStep ? 14 : 12, paddingBottom: 40 }}>
                {phoneStep ? (
                  <Rise delay={140}><StoryCaption scene={scene} onPick={i => { lastPick.current = Date.now(); setScene(i) }} /></Rise>
                ) : (
                  <Rise delay={60}>
                    <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 28, lineHeight: 36, color: c.fg }}>{top.title}</Text>
                    <Text style={[{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: c.fg2, marginTop: 4 }, step === 'otp' ? NUM : null]}>{top.sub}</Text>
                    {step === 'otp' ? <View style={{ alignSelf: 'flex-start', marginTop: 2, marginLeft: -8 }}><TextLink label={t('Number badlo')} color={dark ? '#B79BFF' : VIOLET} onPress={() => act.backToPhone()} /></View> : null}
                  </Rise>
                )}
              </View>
            </View>
            {/* white sheet */}
            <Rise delay={220} distance={56} duration={420} style={{ flexGrow: 1, marginTop: -28 }}>
              <View style={{ flexGrow: 1, backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: PADX, paddingTop: 28, paddingBottom: 24 + insets.bottom,
                ...(Platform.OS === 'web' ? ({ boxShadow: dark ? '0px -8px 24px rgba(0,0,0,0.5)' : '0px -8px 24px rgba(84,9,218,0.10)' } as object) : { shadowColor: '#1A0650', shadowOpacity: dark ? 0.5 : 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 10 }) }}>
                {form}
              </View>
            </Rise>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

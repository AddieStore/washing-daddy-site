// Sign-in: the hero, the form (phone + PIN by default, or phone + SMS OTP; join, waiting) and the "washed cars" photo rows.
// Port of renderAuth + #auth in the web washer app. Pronto look (copy of the customer Auth): white page, logo top-left, 30px headline,
// two drifting rows of washed-car photos, then a 52px phone box and a violet button.
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, NativeSyntheticEvent, Platform,
  ScrollView, StatusBar, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, LinkButton, Pressy, Rise, SuccessTick, ui, useReducedMotion, useTheme } from '../ui';
import { act, REAL, S, useStore, view } from '../state/store';
import { backend } from '../backend';
import { t } from '../lib/i18n';
import { JOIN_AREAS, OWNER_WA, WASHERS, fmtPhone } from '../lib/data';
import { referralKey } from './Onboarding';

const GUT = 20;
const VIOLET = '#5409DA';   // brand violet
const native = Platform.OS !== 'web';
const IMG = {
  logo: require('../../assets/img/logo.webp'),
  washer: require('../../assets/img/login-man.webp'),
  photo: require('../../assets/img/auth-photo.webp'),
};
const SLIDES: { src: number; title: string; sub: string }[] = [
  { src: require('../../assets/img/slide1.webp'), title: 'Foam first', sub: 'Loosens the dust before anything touches the paint' },
  { src: require('../../assets/img/slide2.webp'), title: 'Right at your gate', sub: 'Washed where it sleeps' },
  { src: require('../../assets/img/slide3.webp'), title: 'Two on one Thar', sub: 'Big cars get both hands' },
  { src: require('../../assets/img/slide4.webp'), title: 'Even the i8', sub: 'Covered parking is no problem' },
  { src: require('../../assets/img/slide5.webp'), title: 'GH-9 every morning', sub: 'Our busiest round' },
  { src: require('../../assets/img/slide6.webp'), title: 'Wheels too', sub: 'Pressure inside the rims' },
  { src: require('../../assets/img/slide7.webp'), title: 'Same car, one wash', sub: 'It never left its spot' },
];

/* ---------------- header + hero ---------------- */
// the logo file is 260x157 with a little air around the letters
const LOGO_W = 96, LOGO_H = Math.round(LOGO_W * 157 / 260);
const HAIR = 'rgba(23,23,23,0.16)';   // input border on white (customer Auth `line`)
const OFF = '#E4E4E7';                // disabled button (customer Auth `off`)
const NUM = { fontVariant: ['tabular-nums'] } as const;

/** Logo top-left, the PARTNER APP identity as a small violet pill top-right. */
function Header({ top }: { top: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUT, paddingTop: top + 16 }}>
      <Image source={IMG.logo} accessibilityRole="header" accessibilityLabel="Washing Daddy" resizeMode="contain" style={{ width: LOGO_W, height: LOGO_H }} />
      <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: VIOLET }}>
        <Text style={{ fontFamily: F.semi, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, color: '#fff', textTransform: 'uppercase' }}>{t('Partner app')}</Text>
      </View>
    </View>
  );
}

function Hero() {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: GUT, marginTop: 24 }}>
      <View accessibilityRole="header" style={{ maxWidth: 340 }}>
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: c.fg3 }}>Pocha?</Text>
          <View pointerEvents="none" style={{ position: 'absolute', left: '-2%', right: '-2%', top: '52%', height: 3, borderRadius: 2, backgroundColor: VIOLET, transform: [{ rotate: '-3deg' }] }} />
        </View>
        <Text style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: c.fg }}>Pressure wash everyday!</Text>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2, marginTop: 8, maxWidth: 340 }}>{t('Washer app. Round, photo, customer, sab ek jagah.')}</Text>
    </View>
  );
}

/* ---------------- "Hamare washed cars": two rows of photo tiles drifting in opposite directions ---------------- */
const TILE_H = 104, TILE_GAP = 12;
const ROWS: { idx: number[]; w: number[]; speed: number; back?: boolean }[] = [
  { idx: [0, 1, 2, 3], w: [112, 148, 128, 120], speed: 18 },
  { idx: [4, 5, 6, 7], w: [140, 108, 148, 100], speed: 14, back: true },
];
const TILES = [
  { src: IMG.photo, label: 'A Washing Daddy washer pressure-washing a black BMW' },
  ...SLIDES.map(s => ({ src: s.src, label: s.title + '. ' + s.sub })),
];
function MarqueeRow({ idx, w, speed, back, width }: { idx: number[]; w: number[]; speed: number; back?: boolean; width: number }) {
  const rm = useReducedMotion();
  const setW = w.reduce((a, x) => a + x + TILE_GAP, 0);
  const x = useRef(new Animated.Value(back ? -setW : 0)).current;
  useEffect(() => {
    if (rm) { x.setValue(back ? -setW * 0.4 : -setW * 0.3); return }
    x.setValue(back ? -setW : 0);
    const loop = Animated.loop(Animated.timing(x, { toValue: back ? 0 : -setW, duration: (setW / speed) * 1000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [rm, x, setW, speed, back]);
  const set = (k: number) => idx.map((p, i) => (
    <Image key={k + '-' + i} source={TILES[p].src} accessibilityLabel={k ? undefined : TILES[p].label} resizeMode="cover"
      style={{ width: w[i], height: TILE_H, borderRadius: 14, marginRight: TILE_GAP, backgroundColor: '#ECECEF' }} />
  ));
  return (
    <View style={{ width, height: TILE_H, overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', width: setW * 3, transform: [{ translateX: x }] }}>{set(0)}{set(1)}{set(2)}</Animated.View>
    </View>
  );
}
function Marquee({ width }: { width: number }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 24, color: c.fg, paddingHorizontal: GUT, marginBottom: 12 }}>{'Hamare washed cars'}</Text>
      <View style={{ gap: 12 }}>{ROWS.map((r, i) => <MarqueeRow key={i} {...r} width={width} />)}</View>
      <View pointerEvents="none" style={{ position: 'absolute', right: GUT, bottom: 8, backgroundColor: c.card, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 12, alignItems: 'center', boxShadow: '0px 4px 16px rgba(26,16,51,0.18)' } as any}>
        <Text style={{ fontFamily: F.body, fontSize: 11, lineHeight: 14, color: c.fg2 }}>Car wash in</Text>
        <Text style={{ fontFamily: F.black, fontSize: 16, lineHeight: 20, color: VIOLET }}>10 min.</Text>
      </View>
    </View>
  );
}

/* ---------------- form pieces (white page, customer Auth hierarchy) ---------------- */
const CardTitle = ({ children }: { children: string }) => {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 22, lineHeight: 30, color: c.fg }}>{children}</Text>;
};
const CardText = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2, marginTop: 4, marginBottom: 16 }}>{children}</Text>;
};
const Err = ({ msg }: { msg: string }) => (msg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: '#dc2626', marginBottom: 12 }}>{msg}</Text> : <View style={{ minHeight: 4 }} />);
const Hint = ({ children, style }: { children: React.ReactNode; style?: object }) => {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3, textAlign: 'center', marginTop: 12 }, style]}>{children}</Text>;
};
const errOf = (e: any) => e?.hi ? t(e.hi) : e?.message || t('Nahi gaya. Internet dekh ke dobara try karo.');

/** Primary button: 52 high, radius 12, violet; grey when it cannot be used yet (`ready` false still taps, so the helpful error shows) or is busy. */
function Cta({ label, onPress, busy, ready = true, arrow }: { label: string; onPress: () => void; busy?: boolean; ready?: boolean; arrow?: boolean }) {
  const { c, dark } = useTheme();
  const off = busy || !ready;
  const off_bg = dark ? c.tile2 : OFF;
  return (
    <Pressy onPress={onPress} disabled={busy} accessibilityLabel={label} scaleTo={0.97}
      style={{ minHeight: 52, borderRadius: 12, backgroundColor: off ? off_bg : c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 }}>
      <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 15, color: off ? c.fg3 : '#fff', textAlign: 'center', flexShrink: 1 }}>{label}</Text>
      {arrow && !busy ? <Icon name="arrow" size={18} color={off ? c.fg3 : '#fff'} /> : null}
    </Pressy>
  );
}

/** 52px text box, radius 12, hairline border that turns violet with the cursor (same family as the phone box). */
function Input({ style, onFocus, onBlur, ...rest }: React.ComponentProps<typeof TextInput>) {
  const { c, dark } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.fg3}
      {...rest}
      onFocus={e => { setFocus(true); onFocus?.(e) }}
      onBlur={e => { setFocus(false); onBlur?.(e) }}
      style={[{ width: '100%', height: 52, borderRadius: 12, borderWidth: 1, borderColor: focus ? c.accent : (dark ? c.line : HAIR), backgroundColor: c.inputBg, color: c.fg, fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, style]}
    />
  );
}
const boxRow = (c: { inputBg: string; line: string; accent: string }, dark: boolean, focus: boolean) => ({
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, height: 52, borderRadius: 12, paddingHorizontal: 16,
  backgroundColor: c.inputBg, borderWidth: 1, borderColor: focus ? c.accent : (dark ? c.line : HAIR), marginBottom: 12,
});

/* ---------------- phone ---------------- */
// the +91 phone box (PIN and OTP sign-in both start with it)
function PhoneField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { c, dark } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={boxRow(c, dark, focus)}>
      <Text style={[{ fontFamily: F.medium, fontSize: 15, color: c.fg }, NUM]}>+91</Text>
      <TextInput
        value={value}
        onChangeText={x => onChange(x.replace(/\D/g, '').slice(0, 10))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="tel-national"
        textContentType="telephoneNumber"
        maxLength={10}
        placeholder="98xxxxxxxx"
        placeholderTextColor={c.fg3}
        accessibilityLabel="Phone number"
        style={[{ flex: 1, minWidth: 0, height: 50, fontFamily: F.body, fontSize: 15, paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false, color: c.fg, fontVariant: ['tabular-nums'] }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
    </View>
  );
}
// 10 digits starting 6-9, or the Hinglish reason it is not
const phoneErr = (v: string) => (v.length !== 10 ? t('10 number ka phone daalo') : !/^[6-9]/.test(v) ? t('Number sahi nahi lag raha.') : '');

// test version only: tap a demo washer instead of typing his number
function DemoWashers({ onPick }: { onPick: (phone: string) => void }) {
  const { c, dark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
      {Object.values(WASHERS).map(w => (
        <Pressy
          key={w.id}
          scaleTo={0.96}
          accessibilityLabel={w.name}
          onPress={() => { ui.haptic(6); onPick(w.phone) }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 16, borderRadius: 12, backgroundColor: dark ? 'rgba(139,92,246,0.24)' : c.tile2, minHeight: 56, minWidth: 148 }}
        >
          {w.img
            ? <Image source={IMG[w.img]} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.tile2 }} resizeMode="cover" />
            : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 20, color: '#fff' }}>{w.name[0]}</Text></View>}
          <View>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{w.name}</Text>
            <Text style={[{ fontFamily: F.body, fontSize: 12, color: c.fg3 }, NUM]}>{fmtPhone(w.phone)}</Text>
          </View>
        </Pressy>
      ))}
    </View>
  );
}

/* ---------------- phone + PIN (the default sign-in, no SMS) ---------------- */
function PinStep() {
  const { c, dark } = useTheme();
  const [ph, setPh] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [focus, setFocus] = useState(false);
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
        <View style={boxRow(c, dark, focus)}>
          <Text style={{ fontFamily: F.medium, fontSize: 15, color: c.fg }}>PIN</Text>
          <TextInput
            ref={pinRef}
            value={pin}
            onChangeText={x => setPin(x.replace(/\D/g, '').slice(0, 6))}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
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
            style={[{ flex: 1, minWidth: 0, height: 50, fontFamily: pin ? F.semi : F.body, fontSize: pin ? 18 : 15, letterSpacing: pin ? 4 : 0, paddingVertical: 0, color: c.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
      </Animated.View>
      <Err msg={err} />
      <Cta label={busy ? t('Check ho raha hai…') : t('Andar chalo')} arrow busy={busy} ready={ph.length === 10 && pin.length >= 4} onPress={() => { void go() }} />
      {REAL ? (
        <Hint>{t('Naye washer ho? OTP se login karo, naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <>
          <Hint>{t('Test version. Washer chuno, PIN 1234 daalo.')}</Hint>
          <DemoWashers onPick={p => { setPh(p); setErr(''); setTimeout(() => pinRef.current?.focus(), 50) }} />
        </>
      )}
      {ok ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <SuccessTick size={84} />
          <Text style={{ fontFamily: F.semi, fontSize: 22, color: c.fg }}>{t('PIN sahi hai!')}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ---------------- phone for the SMS OTP (secondary) ---------------- */
function PhoneStep() {
  const { c } = useTheme();
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
      <CardTitle>{t('Namaste! 👋')}</CardTitle>
      <CardText>{t('Apna phone number daalo. OTP aayega.')}</CardText>
      <PhoneField value={ph} onChange={setPh} onSubmit={() => go(ph)} />
      {busy ? <Hint style={{ marginTop: 0, marginBottom: 8 }}>{t("Google ek check khol sakta hai. 'I'm not a robot' par tap karo aur app mein wapas aao.")}</Hint> : null}
      <Err msg={err} />
      <Cta label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} arrow busy={busy} ready={ph.length === 10} onPress={() => go(ph)} />
      {REAL ? (
        <Hint>{t('Naye washer ho? Apna number daalo. OTP ke baad naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <>
          <Hint>{t('Test version. Washer chuno:')}</Hint>
          <DemoWashers onPick={p => { setPh(p); void go(p) }} />
        </>
      )}
    </View>
  );
}

/* ---------------- otp ---------------- */
// one digit box: lifts and grows a little when it has the cursor
function OtpBox({ on, big, inputRef, ...rest }: React.ComponentProps<typeof TextInput> & { on: boolean; big: boolean; inputRef: (r: React.ComponentRef<typeof TextInput> | null) => void }) {
  const { c, dark } = useTheme();
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  const rm = useReducedMotion();
  const digitOn = !!rest.value;
  useEffect(() => {
    if (rm) { a.setValue(on ? 1 : 0); return }
    Animated.spring(a, { toValue: on ? 1 : 0, speed: 26, bounciness: 10, useNativeDriver: native }).start();
  }, [on, rm, a]);
  return (
    <Animated.View style={{ flex: 1, maxWidth: 64, height: big ? 60 : 52, transform: [
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
    ] }}>
      <TextInput
        ref={inputRef}
        {...rest}
        style={[{
          height: '100%', width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontFamily: F.semi, fontSize: big ? 24 : 20, color: c.fg, padding: 0, paddingVertical: 0,
          borderRadius: 12, borderWidth: 1, borderColor: on || digitOn ? c.accent : (dark ? c.line : HAIR), backgroundColor: c.inputBg,
        }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
    </Animated.View>
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
  const refs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);
  const busyRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => { const id = setTimeout(() => refs.current[0]?.focus(), 150); return () => clearTimeout(id) }, []);

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
      <CardTitle>{t('OTP daalo')}</CardTitle>
      <CardText>
        {t(`+91 ${fmtPhone(view.otpPhone)} pe SMS bheja.`)}
        {REAL ? '' : <>{' '}{t('Test mein')} <Text style={{ fontFamily: F.semi, color: c.fg }}>1234</Text>.</>}
      </CardText>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', gap: N > 4 ? 8 : 12, marginTop: 4, marginBottom: 16, transform: [{ translateX: shake }] }}>
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
      <Cta label={busy ? t('Check ho raha hai…') : t('Andar chalo')} arrow busy={busy} ready={codes.every(Boolean)} onPress={() => submit(codes.join(''))} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={c.primary} onPress={() => act.backToPhone()} /></View>
      {ok ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <SuccessTick size={84} />
          <Text style={{ fontFamily: F.semi, fontSize: 22, color: c.fg }}>{t('OTP sahi hai!')}</Text>
        </View>
      ) : null}
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
      <CardTitle>{t('Swagat hai! 🙌')}</CardTitle>
      <CardText>{t('Naya number hai. Apna naam aur area batao, manager approve karenge.')}</CardText>
      <Text style={[lab, { marginBottom: 6 }]}>{t('Aapka naam')}</Text>
      <Input value={name} onChangeText={setName} maxLength={60} autoComplete="name" placeholder={t('Jaise: Ramesh Kumar')} />
      <Text style={[lab, { marginTop: 16, marginBottom: 8 }]}>{t('Kaunsa area?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {JOIN_AREAS.map(a => {
          const on = a === area;
          return (
            <Pressy key={a} onPress={() => { setArea(a); ui.haptic(6) }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a}
              style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? c.primary : c.tile2 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? '#fff' : c.fg }}>{a}</Text>
            </Pressy>
          );
        })}
      </View>
      <Text style={[lab, { marginTop: 16, marginBottom: 6 }]}>{t('Dost ka code (agar hai)')}</Text>
      <Input value={ref} onChangeText={setRef} maxLength={7} autoCapitalize="characters" autoComplete="off" autoCorrect={false} placeholder={t('Jaise: WD12345')} />
      <View style={{ height: 12 }} />
      <Err msg={err} />
      <Cta label={busy ? t('Bhej raha hoon…') : t('Approval ke liye bhejo')} arrow busy={busy} ready={name.trim().length > 1 && !!area} onPress={go} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={c.primary} onPress={() => act.backToPhone()} /></View>
    </View>
  );
}

/* ---------------- waiting / blocked / no round ---------------- */
const WAIT_TEXT: Record<string, [string, string]> = {
  wait: ['Approval ka intezaar ⏳', 'Aapki details manager ke paas pahunch gayi. Jaise hi woh approve karenge, app khud khul jayega. App band bhi kar sakte ho.'],
  noround: ['Round abhi set nahi hua', 'Aap approve ho gaye ho, par aapka round abhi set nahi hua. Manager se baat karo.'],
  blocked: ['Account band hai', 'Is number se abhi kaam nahi ho sakta. Manager se baat karo.'],
};
function WaitStep({ step }: { step: string }) {
  const { c } = useTheme();
  const [ti, tx] = WAIT_TEXT[step] || WAIT_TEXT.wait;
  const p10 = (backend.auth.phone() || '').slice(-10) || S.session?.phone || '';
  return (
    <View>
      <CardTitle>{t(ti)}</CardTitle>
      <CardText>{t(tx)}</CardText>
      <Text style={[{ fontFamily: F.medium, fontSize: 14, color: c.fg, marginBottom: 16 }, NUM]}>+91 {fmtPhone(p10)}</Text>
      <Cta label={t('Manager ko WhatsApp karo')} onPress={() => { void Linking.openURL('https://wa.me/' + OWNER_WA).catch(() => {}) }} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Log out')} color={c.primary} onPress={() => { void act.logout() }} /></View>
    </View>
  );
}

/* ---------------- screen ---------------- */
export default function Auth() {
  useStore();
  const insets = useSafeAreaInsets();
  // Android edge-to-edge: the inset can come back 0 early, so fall back to the status bar height
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const { c } = useTheme();
  const { width: ww } = useWindowDimensions();
  const width = Math.min(440, ww);
  const step = view.authStep;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const content = useRef<React.ComponentRef<typeof View>>(null);
  const offset = useRef(0);
  // keyboard up: bring the focused box into view (a little below the top, so the card title stays readable)
  useEffect(() => {
    const reveal = () => {
      const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
      if (!input || !content.current) return;
      try {
        input.measureLayout(content.current as any, (_x: number, y: number) => {
          const to = Math.max(0, y - 140);
          if (Math.abs(to - offset.current) > 24) scroll.current?.scrollTo({ y: to, animated: true });
        }, () => {});
      } catch { /* not measurable: leave it */ }
    };
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setTimeout(reveal, Platform.OS === 'ios' ? 120 : 60));
    return () => sub.remove();
  }, []);
  const form = (
    <Rise key={step + view.otpPhone + (step === 'phone' ? view.loginMode : '')} distance={12} duration={380}>
      {step === 'phone' ? (view.loginMode === 'pin' ? <PinStep /> : <PhoneStep />)
        : step === 'otp' ? <OtpStep key={'otp' + view.otpPhone} />
        : step === 'join' ? <JoinStep />
        : <WaitStep key={step} step={step} />}
    </Rise>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.stage, alignItems: 'center' }}>
      {/* edge-to-edge Android does not shrink the window for the keyboard any more, so pad on both platforms */}
      <KeyboardAvoidingView behavior={native ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: c.card }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={64}
          onScroll={e => { offset.current = e.nativeEvent.contentOffset.y }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View ref={content} collapsable={false} style={{ flexGrow: 1, paddingBottom: 32 + insets.bottom }}>
            <Rise delay={0}><Header top={topInset} /></Rise>
            {step === 'phone' ? (
              <>
                <Rise delay={60}><Hero /></Rise>
                <Rise delay={120}><Marquee width={width} /></Rise>
              </>
            ) : null}
            <Rise delay={step === 'phone' ? 180 : 60} style={{ paddingHorizontal: GUT, marginTop: step === 'phone' ? 32 : 24 }}>{form}</Rise>
            {step !== 'phone' ? <View style={{ marginTop: 32 }}><Marquee width={width} /></View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

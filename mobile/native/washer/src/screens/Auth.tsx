// Sign-in: the poster, the card (phone + PIN by default, or phone + SMS OTP; join, waiting) and the "washed cars" slideshow.
// Port of renderAuth + #auth in the web washer app. 2026 look: violet brand header (logo, poster, photos) on top,
// then the form on a white DashCard over the light lavender page; ticker and slideshow keep the brand colours.
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, NativeScrollEvent, NativeSyntheticEvent, Platform,
  ScrollView, StatusBar, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, DashCard, F, Field, Float, LinkButton, Pressy, Rise, SuccessTick, brand, ui, useReducedMotion, useTheme } from '../ui';
import { act, REAL, S, useStore, view } from '../state/store';
import { backend } from '../backend';
import { t } from '../lib/i18n';
import { JOIN_AREAS, OWNER_WA, WASHERS, fmtPhone } from '../lib/data';
import { referralKey } from './Onboarding';

const GUT = 20;
const INK = '#111114';
const SHOUT = 'Poppins_800ExtraBold';   // Astryx display weight (Poppins 800, uppercase)
const VIOLET = '#5409DA';   // brand violet: header + slideshow background
const LAV = '#FFBA08';   // brand gold: highlight accent on the violet blocks
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

/* ---------------- header + poster ---------------- */
// the logo file is 260x157 with a little air around the letters
const LOGO_W = 104, LOGO_H = Math.round(LOGO_W * 157 / 260);
function Header() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUT, paddingTop: 8, paddingBottom: 4 }}>
      <Text accessibilityRole="header" accessibilityLabel="Washing Daddy" style={{ fontFamily: SHOUT, fontSize: 22, lineHeight: LOGO_H, letterSpacing: -0.5, color: '#fff' }}>
        {'WASHING '}<Text style={{ color: LAV }}>DADDY</Text>
      </Text>
      <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: LAV, borderWidth: 2, borderColor: INK, transform: [{ rotate: '2deg' }] }}>
        <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: INK, textTransform: 'uppercase' }}>{t('Partner app')}</Text>
      </View>
    </View>
  );
}

// three washed-car photos, all 4:5, each clipped inside its own cream frame; they float a little, out of step
const PHOTOS = [
  { src: IMG.photo, label: 'A Washing Daddy washer pressure-washing a black BMW', tilt: -3 },
  { src: SLIDES[0].src, label: SLIDES[0].title, tilt: 2 },
  { src: SLIDES[4].src, label: SLIDES[4].title, tilt: -2 },
];
function PhotoStrip({ width }: { width: number }) {
  const gap = 12;
  const cw = Math.floor((width - GUT * 2 - gap * 2) / 3);
  const ch = Math.round(cw * 5 / 4);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap, marginTop: 18, paddingTop: 8, paddingBottom: 18 }}>
      {PHOTOS.map((p, i) => (
        <View key={i} style={{ transform: [{ rotate: `${p.tilt}deg` }] }}><Float amp={4} period={3400 + i * 500} phase={i * 420}>
          <View style={{ width: cw, height: ch, padding: 3, borderRadius: 18, backgroundColor: '#fff' }}>
            <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#ECECEF' }}>
              <Image source={p.src} accessibilityLabel={p.label} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
            </View>
          </View>
        </Float></View>
      ))}
      <View pointerEvents="none" style={{ position: 'absolute', right: GUT - 6, bottom: 2, transform: [{ rotate: '-6deg' }], backgroundColor: '#fff', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.body, fontSize: 10.5, lineHeight: 12, color: INK }}>Car wash in</Text>
        <Text style={{ fontFamily: SHOUT, fontSize: 19, lineHeight: 21, textTransform: 'uppercase', color: INK }}>10 min.</Text>
      </View>
    </View>
  );
}

function Poster({ width }: { width: number }) {
  // the headline grows with the screen: 34 on a 320 phone, 42 from ~430
  const size = Math.max(30, Math.min(36, Math.round(width * 0.094)));
  const hl = { fontFamily: SHOUT, fontSize: size, lineHeight: Math.round(size * 1.05), letterSpacing: -0.5, textTransform: 'uppercase' } as const;
  return (
    <View style={{ paddingHorizontal: GUT }}>
      <View style={{ marginTop: 10 }} accessibilityRole="header">
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={[hl, { color: 'rgba(255,255,255,0.5)' }]}>Pocha?</Text>
          <View pointerEvents="none" style={{ position: 'absolute', left: '-3%', right: '-3%', top: '50%', height: 4, borderRadius: 2, backgroundColor: LAV, transform: [{ rotate: '-3deg' }] }} />
        </View>
        <Text style={[hl, { color: LAV, paddingRight: 4 }]}>Pressure wash everyday!</Text>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.78)', marginTop: 8 }}>{t('Washer app. Round, photo, customer, sab ek jagah.')}</Text>
    </View>
  );
}

/* ---------------- card pieces (cream, fixed light tokens) ---------------- */
const CardTitle = ({ children }: { children: string }) => {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 28, color: c.fg }}>{children}</Text>;
};
const CardText = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 20, color: c.fg3, marginTop: 2, marginBottom: 16 }}>{children}</Text>;
};
const Err = ({ msg }: { msg: string }) => (msg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.semi, fontSize: 13, color: brand.red, marginBottom: 10 }}>{msg}</Text> : <View style={{ minHeight: 4 }} />);
const Hint = ({ children, style }: { children: React.ReactNode; style?: object }) => {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 10 }, style]}>{children}</Text>;
};
const errOf = (e: any) => e?.hi ? t(e.hi) : e?.message || t('Nahi gaya. Internet dekh ke dobara try karo.');

// same input as the dashboard kit (Field)
const Input = Field;

/* ---------------- phone ---------------- */
// the +91 phone box (PIN and OTP sign-in both start with it)
function PhoneField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 0, paddingLeft: 14, paddingRight: 8, backgroundColor: c.inputBg, borderWidth: 1, borderColor: focus ? c.accent : c.line, marginBottom: 12 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg3 }}>+91</Text>
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
        style={[{ flex: 1, minWidth: 0, height: 48, fontFamily: F.medium, fontSize: 16, letterSpacing: 0.5, paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false, color: c.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
      {Object.values(WASHERS).map(w => (
        <Pressy
          key={w.id}
          scaleTo={0.96}
          accessibilityLabel={w.name}
          onPress={() => { ui.haptic(6); onPick(w.phone) }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: dark ? 'rgba(139,92,246,0.24)' : 'rgba(84,9,218,0.12)', minHeight: 56, minWidth: 140 }}
        >
          {w.img
            ? <Image source={IMG[w.img]} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.tile2 }} resizeMode="cover" />
            : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.hero, fontSize: 20, color: '#fff' }}>{w.name[0]}</Text></View>}
          <View>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>{w.name}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{fmtPhone(w.phone)}</Text>
          </View>
        </Pressy>
      ))}
    </View>
  );
}

/* ---------------- phone + PIN (the default sign-in, no SMS) ---------------- */
function PinStep() {
  const { c } = useTheme();
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingLeft: 14, paddingRight: 8, backgroundColor: c.inputBg, borderWidth: 1, borderColor: focus ? c.accent : c.line, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: c.fg3 }}>PIN</Text>
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
            style={[{ flex: 1, minWidth: 0, fontFamily: pin ? F.bold : F.medium, fontSize: pin ? 18 : 16, letterSpacing: pin ? 4 : 0.5, paddingVertical: pin ? 10 : 11, color: c.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        </View>
      </Animated.View>
      <Err msg={err} />
      <Button label={busy ? t('Check ho raha hai…') : t('Andar chalo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => { void go() }} />
      {REAL ? (
        <Hint style={{ marginTop: 2 }}>{t('Naye washer ho? OTP se login karo, naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <>
          <Hint style={{ marginTop: 2 }}>{t('Test version. Washer chuno, PIN 1234 daalo.')}</Hint>
          <DemoWashers onPick={p => { setPh(p); setErr(''); setTimeout(() => pinRef.current?.focus(), 50) }} />
        </>
      )}
      {ok ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <SuccessTick size={84} />
          <Text style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{t('PIN sahi hai!')}</Text>
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
      <Button label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => go(ph)} />
      {REAL ? (
        <Hint style={{ marginTop: 2 }}>{t('Naye washer ho? Apna number daalo. OTP ke baad naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <>
          <Hint style={{ marginTop: 2 }}>{t('Test version. Washer chuno:')}</Hint>
          <DemoWashers onPick={p => { setPh(p); void go(p) }} />
        </>
      )}
    </View>
  );
}

/* ---------------- otp ---------------- */
// one digit box: lifts and grows a little when it has the cursor
function OtpBox({ on, big, inputRef, ...rest }: React.ComponentProps<typeof TextInput> & { on: boolean; big: boolean; inputRef: (r: React.ComponentRef<typeof TextInput> | null) => void }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) { a.setValue(on ? 1 : 0); return }
    Animated.spring(a, { toValue: on ? 1 : 0, speed: 26, bounciness: 10, useNativeDriver: native }).start();
  }, [on, rm, a]);
  return (
    <Animated.View style={{ flex: 1, maxWidth: 72, height: big ? 64 : 56, transform: [
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
    ] }}>
      <TextInput
        ref={inputRef}
        {...rest}
        style={[{
          height: '100%', width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontFamily: F.black, fontSize: big ? 26 : 22, color: c.fg, padding: 0, paddingVertical: 0,
          borderRadius: big ? 18 : 14, borderWidth: 1.5, borderColor: on ? c.accent : c.line, backgroundColor: c.inputBg,
        }, on ? { boxShadow: '0px 6px 14px rgba(84,9,218,0.22)' } : null, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
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
        {REAL ? '' : <>{' '}{t('Test mein')} <Text style={{ fontFamily: F.black }}>1234</Text>.</>}
      </CardText>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', gap: N > 4 ? 7 : 10, marginTop: 6, marginBottom: 12, transform: [{ translateX: shake }] }}>
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
      <Button label={busy ? t('Check ho raha hai…') : t('Andar chalo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => submit(codes.join(''))} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={c.fg2} onPress={() => act.backToPhone()} /></View>
      {ok ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <SuccessTick size={84} />
          <Text style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{t('OTP sahi hai!')}</Text>
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
  const lab = { fontFamily: F.semi, fontSize: 14, color: c.fg } as const;
  return (
    <View>
      <CardTitle>{t('Swagat hai! 🙌')}</CardTitle>
      <CardText>{t('Naya number hai. Apna naam aur area batao, manager approve karenge.')}</CardText>
      <Text style={[lab, { marginBottom: 6 }]}>{t('Aapka naam')}</Text>
      <Input value={name} onChangeText={setName} maxLength={60} autoComplete="name" placeholder={t('Jaise: Ramesh Kumar')} />
      <Text style={[lab, { marginTop: 14, marginBottom: 8 }]}>{t('Kaunsa area?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {JOIN_AREAS.map(a => {
          const on = a === area;
          return (
            <Pressy key={a} onPress={() => { setArea(a); ui.haptic(6) }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a}
              style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.primary : (c.accent + '1F') }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? '#fff' : (c.primary) }}>{a}</Text>
            </Pressy>
          );
        })}
      </View>
      <Text style={[lab, { marginTop: 14, marginBottom: 6 }]}>{t('Dost ka code (agar hai)')}</Text>
      <Input value={ref} onChangeText={setRef} maxLength={7} autoCapitalize="characters" autoComplete="off" autoCorrect={false} placeholder={t('Jaise: WD12345')} />
      <View style={{ height: 12 }} />
      <Err msg={err} />
      <Button label={busy ? t('Bhej raha hoon…') : t('Approval ke liye bhejo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={go} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={c.fg2} onPress={() => act.backToPhone()} /></View>
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
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginBottom: 16 }}>+91 {fmtPhone(p10)}</Text>
      <Button label={t('Manager ko WhatsApp karo')} variant="violet" onPress={() => { void Linking.openURL('https://wa.me/' + OWNER_WA).catch(() => {}) }} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Log out')} color={c.fg2} onPress={() => { void act.logout() }} /></View>
    </View>
  );
}

/* ---------------- slideshow ---------------- */
function Show({ width }: { width: number }) {
  const { c } = useTheme();
  const slideW = Math.round(width * 0.86);    // large cards, the next one peeks in from the right
  const imgH = Math.round(slideW * 1.15);
  const pad = 10;                             // even padding inside the violet block (block is 12px in from the screen edge)
  const step = slideW + 8;
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const idx = useRef(0);
  const held = useRef(false);
  const [on, setOn] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(SLIDES.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
    idx.current = i; setOn(i);
  };
  useEffect(() => {
    const id = setInterval(() => {
      if (held.current) return;
      const n = (idx.current + 1) % SLIDES.length;
      ref.current?.scrollTo({ x: n * step, animated: true });
    }, 2800);
    return () => clearInterval(id);
  }, [step]);
  return (
    <View style={{ marginTop: 24 }}>
      <Text accessibilityRole="header" style={{ fontFamily: SHOUT, fontSize: 26, lineHeight: 26, letterSpacing: -0.5, textTransform: 'uppercase', color: '#fff', marginBottom: 12, paddingLeft: pad + 4 }}>
        {'Hamare '}<Text style={{ color: LAV }}>washed</Text>{' cars'}
      </Text>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={onScroll}
        onScrollBeginDrag={() => { held.current = true }}
        onTouchStart={() => { held.current = true }}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 4, paddingBottom: 8, gap: 8 }}
      >
        {SLIDES.map(s => (
          <View key={s.title} style={{ width: slideW, borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff' }}>
            <View style={{ width: slideW, height: imgH, overflow: 'hidden', backgroundColor: '#ECECEF' }}>
              <Image source={s.src} accessibilityLabel={s.title} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: slideW, height: imgH }} />
            </View>
            <View style={{ paddingTop: 9, paddingHorizontal: 12, paddingBottom: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, lineHeight: 18, color: INK }}>{s.title}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: 'rgba(17,17,20,0.6)' }}>{s.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {SLIDES.map((s, i) => <View key={s.title} style={{ width: i === on ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === on ? LAV : 'rgba(255,255,255,0.4)' }} />)}
      </View>
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
  return (
    <View style={{ flex: 1, backgroundColor: c.stage, alignItems: 'center' }}>
      {/* edge-to-edge Android does not shrink the window for the keyboard any more, so pad on both platforms */}
      <KeyboardAvoidingView behavior={native ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: c.bg }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={64}
          onScroll={e => { offset.current = e.nativeEvent.contentOffset.y }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View ref={content} collapsable={false} style={{ flexGrow: 1, paddingBottom: 26 + insets.bottom }}>
            {/* strong brand header: violet, rounded at the bottom; the form card overlaps its lower edge */}
            <View style={{ backgroundColor: VIOLET, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: topInset, paddingBottom: 44 }}>
              <Rise delay={0}><Header /></Rise>
              <Rise delay={90}><Poster width={width} /></Rise>
              <Rise delay={180}><PhotoStrip width={width} /></Rise>
            </View>
            <Rise delay={270} style={{ marginHorizontal: 16, marginTop: -30 }}>
              <DashCard style={{ paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16 }}>
                <Rise key={step + view.otpPhone + (step === 'phone' ? view.loginMode : '')} distance={12} duration={380}>
                  {step === 'phone' ? (view.loginMode === 'pin' ? <PinStep /> : <PhoneStep />)
                    : step === 'otp' ? <OtpStep key={'otp' + view.otpPhone} />
                    : step === 'join' ? <JoinStep />
                    : <WaitStep key={step} step={step} />}
                </Rise>
              </DashCard>
            </Rise>
            <View style={{ backgroundColor: VIOLET, borderRadius: 28, marginHorizontal: 12, marginTop: 24, paddingTop: 18, paddingBottom: 18 }}>
              <Show width={width} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

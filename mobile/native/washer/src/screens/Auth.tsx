// Sign-in: violet brand top (logo, PARTNER pill, headline, washer photo ring) with a white sheet rising from the bottom (phone + PIN or phone + SMS OTP; OTP; join; waiting).
// Port of renderAuth + #auth in the web washer app. Redesign 2026-11-21: copy of the customer Auth look (violet gradient top, white radius-24 sheet,
// 56px Cta, 4 big OTP boxes). Gradients are drawn with react-native-svg (no expo-linear-gradient), motion is RN Animated.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, NativeSyntheticEvent, PanResponder, Platform,
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

const PADX = 24;
const VIOLET = '#5409DA';   // brand violet
const SAFFRON = '#FFBA08';
const LINE = 'rgba(84,9,218,0.18)';
const OFF = '#E6E0F5';
const OFF_INK = '#6B6483';
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
const NUM = { fontVariant: ['tabular-nums'] } as const;
const LOGO_W = 104, LOGO_H = Math.round(LOGO_W * 157 / 260);

/* ---------------- brand top: gradient + glows, logo, pill, back ---------------- */
function BrandBg() {
  const [box, setBox] = useState({ w: 390, h: 844 });
  return (
    <View pointerEvents="none" onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={StyleSheet.absoluteFill}>
      <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="wab" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6A1BF2" /><Stop offset="0.5" stopColor="#5409DA" /><Stop offset="1" stopColor="#36058F" />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={box.w} height={box.h} fill="url(#wab)" />
        <Circle cx={box.w + 10} cy={50} r={130} fill="#fff" fillOpacity={0.07} />
        <Circle cx={-10} cy={230} r={85} fill={SAFFRON} fillOpacity={0.1} />
      </Svg>
    </View>
  );
}

function Logo() {
  return <Image source={IMG.logo} accessibilityRole="header" accessibilityLabel="Washing Daddy" resizeMode="contain" style={{ width: LOGO_W, height: LOGO_H }} />;
}
function PartnerPill() {
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' }}>
      <Text style={{ fontFamily: F.semi, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, color: '#fff', textTransform: 'uppercase' }}>{t('Partner app')}</Text>
    </View>
  );
}
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onPress} hitSlop={8}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="back" size={22} color="#fff" />
    </Pressable>
  );
}

/* ---------------- the washer photo ring (customer PhotoStrip, RN Animated) ---------------- */
const N = SLIDES.length;
const wrapD = (d: number) => { let x = d % N; if (x > N / 2) x -= N; else if (x < -N / 2) x += N; return x };
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const POS_IN = Array.from({ length: N * 4 + 1 }, (_, k) => k / 4);

function RingCard({ i, mod, front, cw, h, spacing, onPick }: { i: number; mod: ReturnType<typeof Animated.modulo>; front: number; cw: number; h: number; spacing: number; onPick: (i: number) => void }) {
  const f = (pick: (d: number) => number) => mod.interpolate({ inputRange: POS_IN, outputRange: POS_IN.map(p => pick(wrapD(i - p))) });
  const sc = (d: number) => { const a = Math.abs(d); return 1 - 0.25 * Math.min(a, 1) - 0.06 * clamp01(a - 1) };
  const tx = (d: number) => { const a = Math.abs(d); return (d < 0 ? -1 : 1) * spacing * (Math.min(a, 1) + 0.55 * Math.min(Math.max(a - 1, 0), 2)) };
  const op = (d: number) => { const a = Math.abs(d); return a >= 2.6 ? 0 : 1 - 0.55 * Math.min(a, 1) - 0.3 * Math.min(Math.max(a - 1, 0), 1.6) };
  const rot = mod.interpolate({ inputRange: POS_IN, outputRange: POS_IN.map(p => { const d = wrapD(i - p); return (d < 0 ? -1 : 1) * Math.min(Math.abs(d), 1.2) * 32 + 'deg' }) });
  const z = Math.round(100 - Math.abs(wrapD(i - front)) * 10);
  return (
    <Animated.View style={{ position: 'absolute', top: 0, width: cw, height: h, zIndex: z, opacity: f(op), transform: [{ perspective: 700 }, { translateX: f(tx) }, { scale: f(sc) }, { rotateY: rot }] }}>
      <Pressable onPress={() => onPick(i)} accessibilityRole="image" accessibilityLabel={SLIDES[i].title + '. ' + SLIDES[i].sub}
        style={{ flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Image source={SLIDES[i].src} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#1A0650', opacity: f(d => Math.min(Math.abs(d), 1) * 0.35) }]} />
      </Pressable>
    </Animated.View>
  );
}
/** Drag or fling to turn the ring (infinite, snaps to one centred photo), tap a side photo to bring it front, slow auto-turn. Horizontal drags only. */
function PhotoStrip({ width, h = 132, autoMs = 3000 }: { width: number; h?: number; autoMs?: number }) {
  const rm = useReducedMotion();
  const cw = Math.round(h * 1.05), spacing = Math.min(cw * 0.78, (width - cw) / 2 - 6);
  const pos = useRef(new Animated.Value(0)).current;
  const mod = useMemo(() => Animated.modulo(pos, N), [pos]);
  const cur = useRef(0), start = useRef(0), last = useRef(0), dragging = useRef(false);
  const [front, setFront] = useState(0);
  useEffect(() => {
    const id = pos.addListener(({ value }) => { cur.current = value; setFront(((Math.round(value) % N) + N) % N) });
    return () => pos.removeListener(id);
  }, [pos]);
  const snapTo = (to: number, ms = 420) => { Animated.timing(pos, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() };
  const touch = () => { last.current = Date.now() };
  const pick = (i: number) => {
    touch();
    const d = wrapD(i - cur.current);
    if (Math.abs(d) > 0.01) snapTo(Math.round(cur.current + d));
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { touch(); dragging.current = true; pos.stopAnimation(); start.current = cur.current },
    onPanResponderMove: (_, g) => { pos.setValue(start.current - g.dx / spacing) },
    onPanResponderRelease: (_, g) => { dragging.current = false; touch(); snapTo(Math.round(start.current - (g.dx + g.vx * 180) / spacing), 480) },
    onPanResponderTerminate: () => { dragging.current = false; touch(); snapTo(Math.round(cur.current)) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [spacing]);
  useEffect(() => {
    if (rm) return;
    const id = setInterval(() => {
      if (dragging.current || Date.now() - last.current < 4500) return;
      snapTo(Math.round(cur.current) + 1, 700);
    }, autoMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rm, autoMs]);
  return (
    <Rise delay={120} style={{ width, height: h + 8 }}>
      <View {...pan.panHandlers} onTouchStart={touch} style={{ width, height: h + 8, alignItems: 'center', paddingTop: 4 }}>
        <View style={{ width: cw, height: h }}>
          {SLIDES.map((_, i) => <RingCard key={i} i={i} mod={mod} front={front} cw={cw} h={h} spacing={spacing} onPick={pick} />)}
        </View>
      </View>
    </Rise>
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
const bigBox = (c: { inputBg: string }, filled: boolean) => ({
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 60, borderRadius: 16, paddingHorizontal: 16,
  backgroundColor: c.inputBg, borderWidth: 1.5, borderColor: filled ? VIOLET : LINE, marginBottom: 12,
});

/* ---------------- phone ---------------- */
// the +91 phone box (PIN and OTP sign-in both start with it)
function PhoneField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const { c } = useTheme();
  return (
    <View style={bigBox(c, !!value)}>
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
      <CardTitle>{t('Namaste! 👋')}</CardTitle>
      <CardText>{t('Apna phone number daalo. OTP aayega.')}</CardText>
      <PhoneField value={ph} onChange={setPh} onSubmit={() => go(ph)} />
      {busy ? <Hint style={{ marginTop: 0, marginBottom: 8 }}>{t("Google ek check khol sakta hai. 'I'm not a robot' par tap karo aur app mein wapas aao.")}</Hint> : null}
      <Err msg={err} />
      <Cta label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} arrow busy={busy} ready={ph.length === 10} onPress={() => go(ph)} />
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
          borderRadius: 16, borderWidth: 1.5, borderColor: on || digitOn ? VIOLET : LINE, backgroundColor: c.inputBg, fontVariant: ['tabular-nums'],
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
  const { c } = useTheme();
  const { width: ww } = useWindowDimensions();
  const width = Math.min(440, ww);
  const step = view.authStep;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const content = useRef<React.ComponentRef<typeof View>>(null);
  const offset = useRef(0);
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

  // what the violet top says for each step
  const [wTi, wTx] = WAIT_TEXT[step] || WAIT_TEXT.wait;
  const top: { title?: string; sub?: React.ReactNode; back?: boolean } =
    step === 'otp' ? { back: true, title: t('OTP daalo'), sub: t(`+91 ${fmtPhone(view.otpPhone)} pe SMS bheja.`) }
    : step === 'join' ? { title: t('Swagat hai! 🙌'), sub: t('Naya number hai. Apna naam aur area batao, manager approve karenge.') }
    : step === 'phone' ? {}
    : { title: t(wTi), sub: t(wTx) };

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
      <KeyboardAvoidingView behavior={native ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: '#36058F' }}>
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
            {/* violet top */}
            <View style={{ paddingHorizontal: PADX - 4, paddingTop: topInset + 16 }}>
              <Rise delay={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {top.back ? <BackBtn onPress={() => act.backToPhone()} /> : <Logo />}
                  {top.back ? <Logo /> : <PartnerPill />}
                </View>
              </Rise>
              {step === 'phone' ? (
                <Rise delay={60} style={{ marginTop: 20 }}>
                  <View accessibilityRole="header" style={{ paddingHorizontal: 4 }}>
                    <View style={{ alignSelf: 'flex-start' }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 30, lineHeight: 38, color: 'rgba(255,255,255,0.62)' }}>Pocha?</Text>
                      <View pointerEvents="none" style={{ position: 'absolute', left: '-2%', right: '-2%', top: '54%', height: 3, borderRadius: 2, backgroundColor: SAFFRON, transform: [{ rotate: '-3deg' }] }} />
                    </View>
                    <Text style={{ fontFamily: F.bold, fontSize: 30, lineHeight: 38, color: '#fff' }}>Pressure wash <Text style={{ color: SAFFRON }}>everyday!</Text></Text>
                    <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.86)', marginTop: 6, maxWidth: 340 }}>{t('Washer app. Round, photo, customer, sab ek jagah.')}</Text>
                  </View>
                </Rise>
              ) : (
                <Rise delay={60} style={{ marginTop: 20, paddingHorizontal: 4 }}>
                  <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 30, lineHeight: 38, color: '#fff' }}>{top.title}</Text>
                  <Text style={[{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.86)', marginTop: 6 }, step === 'otp' ? NUM : null]}>{top.sub}</Text>
                  {step === 'otp' ? <View style={{ alignSelf: 'flex-start', marginTop: 4, marginLeft: -8 }}><TextLink label={t('Number badlo')} color={SAFFRON} onPress={() => act.backToPhone()} /></View> : null}
                </Rise>
              )}
              {step === 'phone' ? <View style={{ marginTop: 20, marginBottom: 8, marginHorizontal: -(PADX - 4) }}><PhotoStrip width={width} /></View> : <View style={{ height: 24 }} />}
            </View>
            {/* white sheet */}
            <Rise delay={140} distance={48} duration={380} style={{ flexGrow: 1 }}>
              <View style={{ flexGrow: 1, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: PADX, paddingTop: 28, paddingBottom: 24 + insets.bottom, ...(Platform.OS === 'web' ? ({ boxShadow: '0px -8px 24px rgba(26,6,80,0.28)' } as any) : { shadowColor: '#1A0650', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 }) }}>
                {form}
              </View>
            </Rise>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

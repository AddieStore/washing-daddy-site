// Sign-in: the poster, the card (phone, OTP, join, waiting) and the "washed cars" slideshow.
// Port of renderAuth + #auth in the web washer app. 2026 look: violet brand header (logo, poster, photos) on top,
// then the form on a white DashCard over the light lavender page; ticker and slideshow keep the brand colours.
import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, NativeScrollEvent, NativeSyntheticEvent, Platform,
  ScrollView, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, DashCard, F, Field, Float, LinkButton, Pressy, Rise, SuccessTick, brand, ui, useReducedMotion, useTheme } from '../ui';
import { act, REAL, S, useStore, view } from '../state/store';
import { backend } from '../backend';
import { t } from '../lib/i18n';
import { JOIN_AREAS, OWNER_WA, WASHERS, fmtPhone } from '../lib/data';
import { referralKey } from './Onboarding';

const GUT = 20;
const native = Platform.OS !== 'web';
const IMG = {
  logo: require('../../assets/img/logo.webp'),
  washer: require('../../assets/img/washer.webp'),
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
const TICKER = ['No more pocha', 'Sirf pressure wash', 'Car wash in 10 min', 'Paschim Vihar'];

/* ---------------- ticker band ---------------- */
function Ticker() {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: 14000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [w, x]);
  const set = (key: string, measure?: boolean) => (
    <View key={key} style={{ flexDirection: 'row' }} onLayout={measure ? e => setW(e.nativeEvent.layout.width) : undefined}>
      {TICKER.map(s => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: F.shout, fontSize: 15, letterSpacing: 0.9, textTransform: 'uppercase', color: brand.ink, paddingVertical: 7 }}>{s}</Text>
          <Text style={{ color: brand.violet, marginHorizontal: 18, fontSize: 13 }}>★</Text>
        </View>
      ))}
    </View>
  );
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ backgroundColor: brand.gold, borderTopWidth: 3, borderBottomWidth: 3, borderColor: brand.ink, overflow: 'hidden', transform: [{ rotate: '-1.5deg' }], marginHorizontal: -8 }}>
      <Animated.View style={{ flexDirection: 'row', width: 4000, transform: [{ translateX: x }] }}>
        {set('a', true)}{set('b')}{set('c')}{set('d')}
      </Animated.View>
    </View>
  );
}

/* ---------------- header + poster ---------------- */
// the logo file is 260x157 with a little air around the letters
const LOGO_W = 104, LOGO_H = Math.round(LOGO_W * 157 / 260);
function Header() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUT, paddingTop: 8, paddingBottom: 4 }}>
      <Image source={IMG.logo} accessibilityLabel="Washing Daddy" resizeMode="contain" style={{ width: LOGO_W, height: LOGO_H, marginLeft: -3 }} />
      <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: brand.gold, borderWidth: 2, borderColor: brand.ink, transform: [{ rotate: '2deg' }] }}>
        <Text style={{ fontFamily: F.black, fontSize: 12, letterSpacing: 1.2, color: brand.ink, textTransform: 'uppercase' }}>{t('Partner app')}</Text>
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
          <View style={{ width: cw, height: ch, padding: 4, borderRadius: 18, backgroundColor: brand.cream, boxShadow: `0px 5px 0px ${brand.ink}` }}>
            <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: brand.cream2 }}>
              <Image source={p.src} accessibilityLabel={p.label} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
            </View>
          </View>
        </Float></View>
      ))}
      <View pointerEvents="none" style={{ position: 'absolute', right: GUT - 6, bottom: 2, transform: [{ rotate: '-6deg' }], backgroundColor: brand.gold, borderWidth: 2.5, borderColor: brand.ink, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.body, fontSize: 10.5, lineHeight: 12, color: brand.ink }}>Car wash in</Text>
        <Text style={{ fontFamily: F.shout, fontSize: 19, lineHeight: 21, color: brand.ink }}>10 min.</Text>
      </View>
    </View>
  );
}

function Poster({ width }: { width: number }) {
  // the headline grows with the screen: 34 on a 320 phone, 42 from ~430
  const size = Math.max(32, Math.min(42, Math.round(width * 0.098)));
  const hl = { fontFamily: F.shout, fontSize: size, lineHeight: Math.round(size * 1.02), textTransform: 'uppercase' } as const;
  return (
    <View style={{ paddingHorizontal: GUT }}>
      <View style={{ marginTop: 10 }} accessibilityRole="header">
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={[hl, { color: 'rgba(255,246,233,0.55)' }]}>Pocha?</Text>
          <View pointerEvents="none" style={{ position: 'absolute', left: '-3%', right: '-3%', top: '50%', height: 5, borderRadius: 3, backgroundColor: brand.gold, transform: [{ rotate: '-3deg' }] }} />
        </View>
        <Text style={[hl, { color: brand.gold, paddingRight: 4, textShadowColor: brand.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }]}>Pressure wash everyday!</Text>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: brand.cream, marginTop: 8 }}>{t('Washer app. Round, photo, customer, sab ek jagah.')}</Text>
    </View>
  );
}

/* ---------------- card pieces (cream, fixed light tokens) ---------------- */
const CardTitle = ({ children }: { children: string }) => {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: c.fg }}>{children}</Text>;
};
const CardText = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 13.5, lineHeight: 20, color: c.fg2, marginTop: 4, marginBottom: 16 }}>{children}</Text>;
};
const Err = ({ msg }: { msg: string }) => (msg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 13.5, color: brand.red, marginBottom: 10 }}>{msg}</Text> : <View style={{ minHeight: 4 }} />);
const Hint = ({ children, style }: { children: React.ReactNode; style?: object }) => {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 10 }, style]}>{children}</Text>;
};
const errOf = (e: any) => e?.hi ? t(e.hi) : e?.message || t('Nahi gaya. Internet dekh ke dobara try karo.');

// same input as the dashboard kit (Field)
const Input = Field;

/* ---------------- phone ---------------- */
function PhoneStep() {
  const { c } = useTheme();
  const [ph, setPh] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);

  const go = async (raw: string) => {
    if (busy) return;
    const v = raw.replace(/\D/g, '');
    if (v.length !== 10) { setErr(t('10 number ka phone daalo')); return }
    if (!/^[6-9]/.test(v)) { setErr(t('Number sahi nahi lag raha.')); return }
    setErr(''); setBusy(true);
    try { await act.sendOtp(v) } catch (e: any) { setBusy(false); setErr(errOf(e)) }
  };
  return (
    <View>
      <CardTitle>{t('Namaste! 👋')}</CardTitle>
      <CardText>{t('Apna phone number daalo. OTP aayega.')}</CardText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 2, paddingLeft: 16, paddingRight: 8, backgroundColor: c.inputBg, borderWidth: 2, borderColor: focus ? c.accent : c.line, marginBottom: 12 }}>
        <Text style={{ fontFamily: F.black, fontSize: 18, color: c.fg2 }}>+91</Text>
        <TextInput
          value={ph}
          onChangeText={x => setPh(x.replace(/\D/g, '').slice(0, 10))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onSubmitEditing={() => go(ph)}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          maxLength={10}
          placeholder="98xxxxxxxx"
          placeholderTextColor={c.fg3}
          accessibilityLabel="Phone number"
          style={[{ flex: 1, minWidth: 0, fontFamily: F.bold, fontSize: 18, letterSpacing: 0.7, paddingVertical: 12, color: c.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
      </View>
      <Err msg={err} />
      <Button label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => go(ph)} />
      {REAL ? (
        <Hint>{t('Naye washer ho? Apna number daalo. OTP ke baad naam bharo, manager approve karenge.')}</Hint>
      ) : (
        <>
          <Hint>{t('Test version. Washer chuno:')}</Hint>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {Object.values(WASHERS).map(w => (
              <Pressy
                key={w.id}
                scaleTo={0.96}
                accessibilityLabel={w.name}
                onPress={() => { setPh(w.phone); ui.haptic(6); void go(w.phone) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: c.soft, minHeight: 56, minWidth: 140 }}
              >
                {w.img
                  ? <Image source={IMG[w.img]} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: brand.gold }} resizeMode="cover" />
                  : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: brand.gold, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.hero, fontSize: 20, color: brand.violet }}>{w.name[0]}</Text></View>}
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>{w.name}</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.fg3 }}>{fmtPhone(w.phone)}</Text>
                </View>
              </Pressy>
            ))}
          </View>
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
    <Animated.View style={{ flex: 1, maxWidth: 72, aspectRatio: 1, transform: [
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
    ] }}>
      <TextInput
        ref={inputRef}
        {...rest}
        style={[{
          flex: 1, textAlign: 'center', fontFamily: F.black, fontSize: big ? 30 : 24, color: c.fg, padding: 0,
          borderRadius: big ? 18 : 14, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: c.inputBg,
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
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
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
              style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.primary : c.soft }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? '#fff' : c.softInk }}>{a}</Text>
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
  const slideW = Math.min(220, width * 0.56);
  const step = slideW + 12;
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
      <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 26, lineHeight: 26, textTransform: 'uppercase', color: brand.cream, marginBottom: 12, paddingLeft: GUT }}>
        {'Hamare '}<Text style={{ color: brand.gold }}>washed</Text>{' cars'}
      </Text>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={onScroll}
        onScrollBeginDrag={() => { held.current = true }}
        onTouchStart={() => { held.current = true }}
        contentContainerStyle={{ paddingHorizontal: GUT, paddingTop: 4, paddingBottom: 8, gap: 12 }}
      >
        {SLIDES.map(s => (
          <View key={s.title} style={{ width: slideW, borderRadius: 22, overflow: 'hidden', backgroundColor: brand.cream, shadowColor: brand.ink2, shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 14 }, elevation: 6 }}>
            <Image source={s.src} accessibilityLabel={s.title} resizeMode="cover" style={{ width: '100%', aspectRatio: 4 / 5 }} />
            <View style={{ paddingTop: 9, paddingHorizontal: 12, paddingBottom: 11 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, lineHeight: 16, color: brand.ink }}>{s.title}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 11.5, lineHeight: 14, color: 'rgba(26,10,51,0.6)' }}>{s.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {SLIDES.map((s, i) => <View key={s.title} style={{ width: i === on ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === on ? brand.gold : 'rgba(255,246,233,0.4)' }} />)}
      </View>
    </View>
  );
}

/* ---------------- screen ---------------- */
export default function Auth() {
  useStore();
  const insets = useSafeAreaInsets();
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
            <View style={{ backgroundColor: brand.violet, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top, paddingBottom: 44 }}>
              <Rise delay={0}><Header /></Rise>
              <Rise delay={90}><Poster width={width} /></Rise>
              <Rise delay={180}><PhotoStrip width={width} /></Rise>
            </View>
            <Rise delay={270} style={{ marginHorizontal: 16, marginTop: -30 }}>
              <DashCard style={{ paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16 }}>
                <Rise key={step + view.otpPhone} distance={12} duration={380}>
                  {step === 'phone' ? <PhoneStep />
                    : step === 'otp' ? <OtpStep key={'otp' + view.otpPhone} />
                    : step === 'join' ? <JoinStep />
                    : <WaitStep key={step} step={step} />}
                </Rise>
              </DashCard>
            </Rise>
            <View style={{ marginTop: 30 }}><Ticker /></View>
            <View style={{ backgroundColor: brand.violet, borderRadius: 28, marginHorizontal: 12, marginTop: 6, paddingTop: 2, paddingBottom: 18 }}>
              <Show width={width} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

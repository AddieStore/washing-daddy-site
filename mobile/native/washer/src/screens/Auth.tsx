// Sign-in: the poster, the card (phone, OTP, join, waiting) and the "washed cars" slideshow.
// Port of renderAuth + #auth in the web washer app. The card is always cream (it sits on violet).
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, KeyboardAvoidingView, Linking, NativeScrollEvent, NativeSyntheticEvent, Platform,
  ScrollView, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, F, LinkButton, Pressy, brand, lightTokens, ui } from '../ui';
import { act, REAL, S, useStore, view } from '../state/store';
import { backend } from '../backend';
import { t } from '../lib/i18n';
import { JOIN_AREAS, OWNER_WA, WASHERS, fmtPhone } from '../lib/data';

const L = lightTokens;
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
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ backgroundColor: brand.gold, borderBottomWidth: 3, borderBottomColor: brand.ink, overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', width: 4000, transform: [{ translateX: x }] }}>
        {set('a', true)}{set('b')}{set('c')}{set('d')}
      </Animated.View>
    </View>
  );
}

/* ---------------- poster ---------------- */
function Poster() {
  return (
    <View style={{ paddingTop: 14, paddingHorizontal: GUT, paddingBottom: 20 }}>
      <Image source={IMG.logo} accessibilityLabel="Washing Daddy" resizeMode="contain" style={{ width: 112, height: 68, transform: [{ rotate: '-4deg' }] }} />
      <View style={{ marginTop: 12 }} accessibilityRole="header">
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={[hl, { color: 'rgba(255,246,233,0.55)' }]}>Pocha?</Text>
          <View pointerEvents="none" style={{ position: 'absolute', left: '-2%', right: '-2%', top: '52%', height: 5, backgroundColor: brand.gold, transform: [{ rotate: '-3deg' }] }} />
        </View>
        <Text style={[hl, { color: brand.gold, textShadowColor: brand.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 }]}>Pressure wash everyday!</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: brand.cream }}>{t('Washer app. Round, photo, customer, sab ek jagah.')}</Text>
        <View style={{ width: '36%', marginRight: 8, transform: [{ rotate: '3deg' }] }}>
          <View style={{ borderWidth: 6, borderColor: brand.cream, borderRadius: 18, backgroundColor: brand.cream, shadowColor: brand.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 } }}>
            <Image source={IMG.photo} accessibilityLabel="A Washing Daddy washer pressure-washing a black BMW" style={{ width: '100%', aspectRatio: 420 / 525, borderRadius: 12 }} />
          </View>
          <View style={{ position: 'absolute', right: -10, bottom: -12, transform: [{ rotate: '-6deg' }], backgroundColor: brand.gold, borderWidth: 2.5, borderColor: brand.ink, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 9, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.body, fontSize: 10.5, lineHeight: 11, color: brand.ink }}>Car wash in</Text>
            <Text style={{ fontFamily: F.shout, fontSize: 20, lineHeight: 21, color: brand.ink }}>10 min.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const hl = { fontFamily: F.shout, fontSize: 42, lineHeight: 37, textTransform: 'uppercase' } as const;

/* ---------------- card pieces (cream, fixed light tokens) ---------------- */
const CardTitle = ({ children }: { children: string }) => (
  <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 28, lineHeight: 28, textTransform: 'uppercase', letterSpacing: 0.3, color: L.fg }}>{children}</Text>
);
const CardText = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: '#3B2C55', marginTop: 6, marginBottom: 14 }}>{children}</Text>
);
const Err = ({ msg }: { msg: string }) => (msg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 13.5, color: brand.red, marginBottom: 10 }}>{msg}</Text> : <View style={{ minHeight: 4 }} />);
const Hint = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={[{ fontFamily: F.body, fontSize: 12.5, color: L.fg3, textAlign: 'center', marginTop: 10 }, style]}>{children}</Text>
);
const errOf = (e: any) => e?.hi ? t(e.hi) : e?.message || t('Nahi gaya. Internet dekh ke dobara try karo.');

function Input(p: React.ComponentProps<typeof TextInput> & { box?: object }) {
  const [focus, setFocus] = useState(false);
  const { box, style, ...rest } = p;
  return (
    <TextInput
      placeholderTextColor={L.fg3}
      {...rest}
      onFocus={e => { setFocus(true); rest.onFocus?.(e) }}
      onBlur={e => { setFocus(false); rest.onBlur?.(e) }}
      style={[{
        width: '100%', fontFamily: F.semi, fontSize: 17, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2.5,
        borderColor: focus ? brand.violet : brand.ink, backgroundColor: '#fff', color: L.fg,
      }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, box, style]}
    />
  );
}

/* ---------------- phone ---------------- */
function PhoneStep() {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingVertical: 4, paddingLeft: 16, paddingRight: 8, backgroundColor: '#fff', borderWidth: 2.5, borderColor: focus ? brand.violet : brand.ink, marginBottom: 12 }}>
        <Text style={{ fontFamily: F.black, fontSize: 18, color: '#3B2C55' }}>+91</Text>
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
          placeholderTextColor={L.fg3}
          accessibilityLabel="Phone number"
          style={[{ flex: 1, minWidth: 0, fontFamily: F.bold, fontSize: 18, letterSpacing: 0.7, paddingVertical: 12, color: L.fg }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        />
      </View>
      <Err msg={err} />
      <Button label={busy ? t('Bhej raha hoon…') : t('OTP bhejo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => go(ph)} />
      {REAL ? (
        <Hint>{t('Naye washer ho? Apna number daalo. OTP ke baad naam bharo, owner approve karenge.')}</Hint>
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
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, borderWidth: 2.5, borderColor: brand.ink, backgroundColor: '#fff', minHeight: 56, minWidth: 140 }}
              >
                {w.img
                  ? <Image source={IMG[w.img]} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: brand.gold }} resizeMode="cover" />
                  : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: brand.gold, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.hero, fontSize: 20, color: brand.violet }}>{w.name[0]}</Text></View>}
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: L.fg }}>{w.name}</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 12, color: L.fg3 }}>{fmtPhone(w.phone)}</Text>
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
function OtpStep() {
  const N = backend.auth.codeLength;
  const [codes, setCodes] = useState<string[]>(() => Array(N).fill(''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(-1);
  const refs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);
  const busyRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => { const id = setTimeout(() => refs.current[0]?.focus(), 150); return () => clearTimeout(id) }, []);

  const submit = async (code: string) => {
    if (busyRef.current) return;
    if (code.length < N) { setErr(t(`${N} number ka OTP daalo`)); return }
    busyRef.current = true; setBusy(true); setErr('');
    try { await act.confirmOtp(code) } catch (e: any) {
      busyRef.current = false; setBusy(false);
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
      <Animated.View style={{ flexDirection: 'row', gap: N > 4 ? 7 : 10, marginTop: 6, marginBottom: 12, transform: [{ translateX: shake }] }}>
        {codes.map((c, i) => (
          <TextInput
            key={i}
            ref={r => { refs.current[i] = r }}
            value={c}
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
            accessibilityLabel={`OTP digit ${i + 1}`}
            style={[{
              flex: 1, maxWidth: 72, aspectRatio: 1, textAlign: 'center', fontFamily: F.black, fontSize: N > 4 ? 24 : 30, color: L.fg,
              borderRadius: N > 4 ? 14 : 18, borderWidth: 2.5, borderColor: focused === i ? brand.violet : brand.ink, backgroundColor: '#fff', padding: 0,
              transform: focused === i ? [{ translateY: -2 }] : undefined,
            }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
          />
        ))}
      </Animated.View>
      <Err msg={err} />
      <Button label={busy ? t('Check ho raha hai…') : t('Andar chalo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={() => submit(codes.join(''))} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={L.fg2} onPress={() => act.backToPhone()} /></View>
    </View>
  );
}

/* ---------------- join ---------------- */
function JoinStep() {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [ref, setRef] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const nm = name.trim().replace(/\s+/g, ' ');
    if (nm.length < 2) { setErr(t('Apna naam likho')); return }
    if (!area) { setErr(t('Area chuno')); return }
    const code = ref.trim().toUpperCase().replace(/\s+/g, '');
    if (code && !/^WD\d{5}$/.test(code)) { setErr(t('Code aisa hota hai: WD12345. Nahi pata toh khali chhodo')); return }
    setErr(''); setBusy(true);
    try { await act.join(nm, area, code) } catch (e) { console.warn(e); setBusy(false); setErr(t('Nahi gaya. Internet dekh ke dobara try karo.')) }
  };
  const lab = { fontFamily: F.bold, fontSize: 14, color: L.fg } as const;
  return (
    <View>
      <CardTitle>{t('Swagat hai! 🙌')}</CardTitle>
      <CardText>{t('Naya number hai. Apna naam aur area batao, owner approve karenge.')}</CardText>
      <Text style={[lab, { marginBottom: 6 }]}>{t('Aapka naam')}</Text>
      <Input value={name} onChangeText={setName} maxLength={60} autoComplete="name" placeholder={t('Jaise: Ramesh Kumar')} />
      <Text style={[lab, { marginTop: 14, marginBottom: 8 }]}>{t('Kaunsa area?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {JOIN_AREAS.map(a => {
          const on = a === area;
          return (
            <Pressy key={a} onPress={() => { setArea(a); ui.haptic(6) }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={a}
              style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2.5, borderColor: on ? brand.violet : brand.ink, backgroundColor: on ? brand.violet : '#fff' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? '#fff' : L.fg }}>{a}</Text>
            </Pressy>
          );
        })}
      </View>
      <Text style={[lab, { marginTop: 14, marginBottom: 6 }]}>{t('Dost ka code (agar hai)')}</Text>
      <Input value={ref} onChangeText={setRef} maxLength={7} autoCapitalize="characters" autoComplete="off" autoCorrect={false} placeholder={t('Jaise: WD12345')} />
      <View style={{ height: 12 }} />
      <Err msg={err} />
      <Button label={busy ? t('Bhej raha hoon…') : t('Approval ke liye bhejo')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={go} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={L.fg2} onPress={() => act.backToPhone()} /></View>
    </View>
  );
}

/* ---------------- waiting / blocked / no round ---------------- */
const WAIT_TEXT: Record<string, [string, string]> = {
  wait: ['Approval ka intezaar ⏳', 'Aapki details owner ke paas pahunch gayi. Jaise hi woh approve karenge, app khud khul jayega. App band bhi kar sakte ho.'],
  noround: ['Round abhi set nahi hua', 'Aap approve ho gaye ho, par aapka round abhi set nahi hua. Owner se baat karo.'],
  blocked: ['Account band hai', 'Is number se abhi kaam nahi ho sakta. Owner se baat karo.'],
};
function WaitStep({ step }: { step: string }) {
  const [ti, tx] = WAIT_TEXT[step] || WAIT_TEXT.wait;
  const p10 = (backend.auth.phone() || '').slice(-10) || S.session?.phone || '';
  return (
    <View>
      <CardTitle>{t(ti)}</CardTitle>
      <CardText>{t(tx)}</CardText>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: L.fg3, textAlign: 'center', marginBottom: 16 }}>+91 {fmtPhone(p10)}</Text>
      <Button label={t('Owner ko WhatsApp karo')} variant="violet" onPress={() => { void Linking.openURL('https://wa.me/' + OWNER_WA).catch(() => {}) }} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Log out')} color={L.fg2} onPress={() => { void act.logout() }} /></View>
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
    <View style={{ marginTop: 30 }}>
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
  const { width: ww } = useWindowDimensions();
  const width = Math.min(440, ww);
  const step = view.authStep;
  return (
    <View style={{ flex: 1, backgroundColor: brand.ink2, alignItems: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: brand.violet }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ height: insets.top }} />
          <Ticker />
          <Poster />
          <View style={{ backgroundColor: L.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 24, paddingHorizontal: GUT, paddingBottom: 26 }}>
            {step === 'phone' ? <PhoneStep key="phone" />
              : step === 'otp' ? <OtpStep key={'otp' + view.otpPhone} />
              : step === 'join' ? <JoinStep key="join" />
              : <WaitStep key={step} step={step} />}
          </View>
          <View style={{ paddingBottom: 26 + insets.bottom }}><Show width={width} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

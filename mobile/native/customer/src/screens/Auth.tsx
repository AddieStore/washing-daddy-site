/* Sign-in poster and flow: phone -> code -> (new numbers) about -> plan. Ported from renderAuth() in customer/index.html. */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { C, F, SP, R, HIT } from '../theme';
import { Btn, Card, Chips, Dots, Field, Gap, Hard, Opt, Page, Ticker, Txt, useInsets, PAD } from '../ui/kit';
import { OTP_N, REAL, act, fmtPhone } from '../state';
import { src, RATIO } from '../img';
import { AREAS, PLANS, SLIDES, PlanId } from '../data/reference';
import { inr } from '../data/dates';

type Step = 'phone' | 'otp' | 'about' | 'plan';
const msg = (e: any) => (e && e.message) || "That didn't go through. Try again.";
const TICKER = ['No more pocha', 'Only pressure wash', 'Monthly from ₹999', 'Car wash in 10 min'];
const GAP = SP.m;

function Err({ text }: { text: string }) {
  return text ? <Txt weight={600} size={13} color={C.red} style={{ marginBottom: SP.m, lineHeight: 18 }}>{text}</Txt> : null;
}
const H2 = ({ children }: { children: string }) => <Txt font="shout" size={28} upper style={{ lineHeight: 30, letterSpacing: 0.3 }}>{children}</Txt>;
const P = ({ children }: { children: React.ReactNode }) => <Txt weight={400} size={14} color="#3B2C55" style={{ marginTop: SP.s, marginBottom: SP.xl, lineHeight: 20 }}>{children}</Txt>;
const Hint = ({ children }: { children: React.ReactNode }) => <Txt size={12} color="rgba(26,10,51,.6)" style={{ marginTop: SP.l, lineHeight: 18 }}>{children}</Txt>;
const B = ({ children }: { children: React.ReactNode }) => <Txt weight={700} size={12} color="#3B2C55">{children}</Txt>;
function Link({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: any }) {
  return <Pressable onPress={onPress} disabled={disabled} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={style}><Txt weight={700} size={12} color={disabled ? 'rgba(26,10,51,.5)' : C.violet} style={disabled ? undefined : { textDecorationLine: 'underline' }}>{label}</Txt></Pressable>;
};
const StepDots = ({ n }: { n: 1 | 2 }) => (
  <View style={{ flexDirection: 'row', gap: 6, marginBottom: SP.l }}>
    {[1, 2].map(i => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= n ? C.violet : 'rgba(26,10,51,.14)' }} />)}
  </View>
);

export default function Auth() {
  const ins = useInsets(), win = useWindowDimensions(), W = Math.min(win.width, 440), phW = Math.round((W - PAD * 2) * .36) - 20;
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');          // 10 digits
  const [shown, setShown] = useState('');          // as typed ("98765 04210")
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string[]>(Array(OTP_N).fill(''));
  const [foc, setFoc] = useState(-1);
  const [left, setLeft] = useState(30);
  const [su, setSu] = useState({ name: '', area: '', model: '', plate: '', plan: 'std' as PlanId });
  const boxes = useRef<({ focus: () => void } | null)[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const scroll = useRef<any>(null), cardY = useRef(0);
  const working = useRef(false);

  const toCard = () => setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, cardY.current - 12), animated: true }), 60);
  useEffect(() => { if (step !== 'phone') toCard(); setErr(''); }, [step]);

  // resend countdown
  useEffect(() => {
    if (step !== 'otp' || left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [step, left]);
  useEffect(() => { if (step === 'otp') { const t = setTimeout(() => boxes.current[0]?.focus(), 300); return () => clearTimeout(t) } }, [step]);

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const onPhone = (t: string) => {
    let d = t.replace(/\D/g, ''); if (d.length > 10) d = d.slice(-10);
    setPhone(d); setShown(d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d); setErr('');
  };
  const sendCode = async () => {
    if (!phoneOk) { setErr('Enter a 10-digit mobile number.'); return }
    setBusy(true);
    try { await act.sendOtp(phone); setCode(Array(OTP_N).fill('')); setLeft(30); setStep('otp') } catch (e) { setErr(msg(e)) }
    setBusy(false);
  };

  const verify = async (c: string[]) => {
    if (working.current || c.join('').length < OTP_N) return;
    working.current = true; setBusy(true);
    try {
      const r = await act.verifyOtp(phone, c.join(''));
      if (r === 'new') setStep('about');
    } catch (e) {
      setErr(msg(e)); setCode(Array(OTP_N).fill(''));
      shake.setValue(0);
      Animated.sequence([10, -10, 8, -8, 4, 0].map(v => Animated.timing(shake, { toValue: v, duration: 60, useNativeDriver: true }))).start();
      boxes.current[0]?.focus();
    }
    working.current = false; setBusy(false);
  };
  const fill = (digits: string) => {
    const c = Array(OTP_N).fill('').map((_, j) => digits[j] || '');
    setCode(c); setErr('');
    if (digits.length >= OTP_N) verify(c); else boxes.current[Math.min(digits.length, OTP_N - 1)]?.focus();
  };
  const onBox = (i: number, t: string) => {
    const d = t.replace(/\D/g, '');
    if (d.length > 1) return fill(d.slice(0, OTP_N));            // paste or SMS autofill
    const c = code.slice(); c[i] = d; setCode(c); setErr('');
    if (d && i < OTP_N - 1) boxes.current[i + 1]?.focus();
    if (c.join('').length === OTP_N) verify(c);
  };
  const resend = async () => {
    try { await act.resendOtp(phone); setLeft(30); setCode(Array(OTP_N).fill('')); setErr(''); boxes.current[0]?.focus() } catch (e) { setErr(msg(e)) }
  };

  const toPlan = () => {
    const n = su.name.trim(), m = su.model.trim(), p = su.plate.trim();
    const miss = !n ? 'your name' : !su.area ? 'your area' : !m ? 'your car' : !p ? 'the registration number' : '';
    if (miss) { setErr('Add ' + miss + ' to continue.'); return }
    setSu({ ...su, name: n, model: m, plate: p.toUpperCase() }); setStep('plan');
  };
  const finish = async () => {
    setBusy(true); setErr('');
    try { await act.signup(su) } catch (e) { setErr(msg(e)); setBusy(false) }   // on success the app switches by itself
  };

  /* ---------- the card ---------- */
  const six = OTP_N > 4;
  let card;
  if (step === 'phone') card = (
    <>
      <H2>Sign in with your phone</H2>
      <P>Use the number your washer has. We'll send a {OTP_N}-digit code by SMS.</P>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, borderRadius: R.card, borderWidth: 2.5, borderColor: C.ink, backgroundColor: '#fff', paddingVertical: 6, paddingLeft: SP.l, paddingRight: 7 }}>
        <Txt weight={700} size={16} color="#3B2C55">+91</Txt>
        <TextInput value={shown} onChangeText={onPhone} onFocus={toCard} onSubmitEditing={sendCode} inputMode="numeric" keyboardType="number-pad" maxLength={16} autoComplete="tel-national" textContentType="telephoneNumber"
          placeholder="98765 04210" placeholderTextColor="rgba(26,10,51,.3)" accessibilityLabel="Mobile number"
          style={{ flex: 1, minWidth: 0, fontFamily: F.b600, fontSize: 18, letterSpacing: 0.7, color: C.ink, paddingVertical: 8, outlineStyle: 'none' } as any} />
        <Btn label="Get code" busy={busy ? 'Sending…' : false} disabled={!phoneOk} onPress={sendCode} small full={false} />
      </View>
      {err ? <View style={{ marginTop: SP.m }}><Err text={err} /></View> : null}
      {REAL ? <Hint>New to Washing Daddy? Use your number and we'll set you up after the code.</Hint>
        : <Hint><B>Test version.</B> 98765 04210 opens a sample customer with two cars. Any other number takes you through sign-up as a new customer.</Hint>}
    </>
  );
  else if (step === 'otp') card = (
    <>
      <H2>Enter the code</H2>
      <P>Sent to +91 {fmtPhone(phone)}. <Link label="Change" onPress={() => { setStep('phone'); setErr('') }} /></P>
      <Animated.View style={{ flexDirection: 'row', gap: six ? 7 : 10, justifyContent: 'space-between', marginBottom: SP.l, transform: [{ translateX: shake }] }}>
        {code.map((d, i) => (
          <TextInput key={i} ref={(r: any) => { boxes.current[i] = r }} value={d} onChangeText={t => onBox(i, t)} onFocus={() => { setFoc(i); toCard() }} onBlur={() => setFoc(-1)}
            onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) { const c = code.slice(); c[i - 1] = ''; setCode(c); boxes.current[i - 1]?.focus() } }}
            inputMode="numeric" keyboardType="number-pad" textContentType={i ? undefined : 'oneTimeCode'} autoComplete={i ? 'off' : 'sms-otp'} maxLength={OTP_N} selectTextOnFocus editable={!busy}
            accessibilityLabel={`Digit ${i + 1}`}
            style={{ flex: 1, maxWidth: 64, aspectRatio: 1, textAlign: 'center', padding: 0, fontFamily: F.b700, fontSize: six ? 22 : 26, color: C.ink, backgroundColor: '#fff', borderWidth: 2.5, borderColor: foc === i ? C.violet : C.ink, borderRadius: R.ctl, transform: [{ translateY: foc === i ? -2 : 0 }], outlineStyle: 'none' } as any} />
        ))}
      </Animated.View>
      <Err text={err} />
      <Btn label="Verify" variant="violet" style={{ marginTop: SP.s }} busy={busy ? 'Checking…' : false} disabled={code.join('').length < OTP_N} onPress={() => verify(code)} />
      <Hint>Didn't get it? <Link label={left > 0 ? `Resend in ${left}s` : 'Resend code'} disabled={left > 0} onPress={resend} />{REAL ? null : <>{'\n'}<B>Test code: 1234</B></>}</Hint>
    </>
  );
  else if (step === 'about') card = (
    <>
      <StepDots n={1} />
      <H2>Welcome to Washing Daddy</H2>
      <P>New number. Tell us where your car sleeps and we'll start tomorrow morning.</P>
      <Field label="Your name" value={su.name} onChangeText={name => { setSu({ ...su, name }); setErr('') }} placeholder="Full name" autoComplete="name" textContentType="name" autoCapitalize="words" />
      <Txt weight={700} size={11} upper color={C.violet} style={{ letterSpacing: 1.5, marginTop: SP.hair }}>Area</Txt>
      <Chips items={AREAS} value={su.area} onChange={area => { setSu({ ...su, area }); setErr('') }} />
      <Field label="Car" value={su.model} onChangeText={model => { setSu({ ...su, model }); setErr('') }} placeholder="e.g. Creta, Nexon, City" autoCapitalize="words" />
      <Field label="Registration number" value={su.plate} onChangeText={plate => { setSu({ ...su, plate }); setErr('') }} placeholder="DL 8C AB 1234" autoCapitalize="characters" autoCorrect={false} />
      <Err text={err} />
      <Btn label="Choose a plan" variant="violet" onPress={toPlan} style={{ marginTop: SP.s }} />
    </>
  );
  else card = (
    <>
      <StepDots n={2} />
      <H2>{`Pick a plan for your ${su.model}`}</H2>
      <P>Pay after the first wash. Change any time. WD Pro and above can pause up to a week a month.</P>
      {PLANS.filter(p => !p.old).map(p => (
        <Opt key={p.id} on={su.plan === p.id} onPress={() => setSu({ ...su, plan: p.id })} title={p.name} price={inr(p.price)}
          text={p.rows.slice(1, 4).map(r => r[0] + ' ' + r[1].toLowerCase()).join(' · ')} />
      ))}
      <Err text={err} />
      <Btn label="Start tomorrow morning" busy={busy ? 'Setting up…' : false} onPress={finish} style={{ marginTop: SP.s }} />
      <Link label="Back" onPress={() => setStep('about')} style={{ alignSelf: 'center', marginTop: SP.l }} />
    </>
  );

  /* ---------- the poster ---------- */
  const poster = (
    <View style={{ paddingTop: SP.xl, paddingBottom: SP.xl }}>
      <Image source={src('logo')!} style={{ width: 112, height: 112 / RATIO.logo, transform: [{ rotate: '-4deg' }] }} />
      <View style={{ marginTop: SP.l }}>
        <View style={{ alignSelf: 'flex-start', marginBottom: SP.hair }}>
          <Txt font="shout" size={46} upper color="rgba(255,246,233,.55)" style={{ lineHeight: 41 }}>Pocha?</Txt>
          <View style={{ position: 'absolute', left: '-2%', right: '-2%', top: '52%', height: 5, backgroundColor: C.gold, transform: [{ rotate: '-3deg' }] }} />
        </View>
        <Txt font="shout" size={46} upper color={C.gold} style={{ lineHeight: 41, textShadowColor: C.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 }}>Pressure wash everyday!</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.l, marginTop: SP.xl }}>
        <Txt weight={500} size={15} color={C.cream} style={{ flex: 1, lineHeight: 22 }}>A washer comes to where your car is parked, foams it, pressure-rinses it and dries it by hand. Daily.</Txt>
        <View style={{ width: '36%', marginRight: 8, transform: [{ rotate: '3deg' }] }}>
          <Hard dx={6} dy={6} radius={18} color={C.ink} reserve={false}>
            <View style={{ borderWidth: 6, borderColor: C.cream, borderRadius: 18, backgroundColor: C.cream }}>
              <Image source={src('authphoto')!} style={{ width: phW, height: phW / RATIO.authphoto, borderRadius: 12 }} />
            </View>
          </Hard>
          <View style={{ position: 'absolute', right: -10, bottom: -12, transform: [{ rotate: '-6deg' }], backgroundColor: C.gold, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 9, alignItems: 'center' }}>
            <Txt weight={700} size={10.5} color={C.ink} style={{ lineHeight: 11 }}>Car wash in</Txt>
            <Txt font="shout" size={20} color={C.ink}>10 min.</Txt>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Page pad={0} top={0} scroll={false} header={<View style={{ backgroundColor: C.gold, paddingTop: ins.top }}><Ticker items={TICKER} /></View>}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: SP.xl + Math.max(ins.bottom, SP.s) }}>
          <View style={{ width: W, paddingHorizontal: PAD }}>
            {poster}
            <View onLayout={e => { cardY.current = e.nativeEvent.layout.y }}>
              <Card pad={SP.card}>{card}</Card>
            </View>
          </View>
          <Show W={W} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

/* "Cars we washed": slideshow that advances every 2.8 s until the user touches it */
function Show({ W }: { W: number }) {
  const sw = Math.min(W * 0.56, 220), step = sw + GAP, [on, setOn] = useState(0);
  const rail = useRef<any>(null), cur = useRef(0), held = useRef(false), rm = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => { rm.current = v }).catch(() => {});
    const t = setInterval(() => {
      if (held.current) return;
      const n = (cur.current + 1) % SLIDES.length;
      rail.current?.scrollTo({ x: n * step, animated: !rm.current });
    }, 2800);
    return () => clearInterval(t);
  }, [step]);
  return (
    <View style={{ width: W, marginTop: SP.section + SP.s }}>
      <Txt font="shout" size={26} upper color={C.cream} style={{ paddingHorizontal: PAD, marginBottom: SP.l }}>Cars we <Txt font="shout" size={26} color={C.gold}>washed</Txt></Txt>
      <ScrollView ref={rail} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast" scrollEventThrottle={16}
        onScrollBeginDrag={() => { held.current = true }} onTouchStart={() => { held.current = true }}
        onScroll={e => { const i = Math.max(0, Math.min(SLIDES.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))); cur.current = i; setOn(i) }}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: SP.hair, paddingBottom: SP.s, gap: GAP }}>
        {SLIDES.map(s => (
          <View key={s.img} style={{ width: sw, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.cream }}>
            <Image source={src(s.img)!} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
            <View style={{ paddingTop: SP.m, paddingHorizontal: SP.m, paddingBottom: SP.m }}>
              <Txt weight={700} size={13} color={C.ink} style={{ lineHeight: 16 }}>{s.t}</Txt>
              <Txt weight={500} size={11.5} color="rgba(26,10,51,.6)">{s.s}</Txt>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: SP.m }}>
        {SLIDES.map((_, i) => <View key={i} style={{ width: i === on ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === on ? C.gold : 'rgba(255,246,233,.4)' }} />)}
      </View>
    </View>
  );
}

/* Sign-in poster and flow: phone -> code -> (new numbers) about -> plan. Ported from renderAuth() in customer/index.html. */
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, SP, InkContext, creamInk } from '../theme';
import { Chips, Field, Opt, Txt, useInsets, PAD } from '../ui/kit';
import { Chev, Check } from '../ui/icons';
import { OTP_N, REAL, act, fmtPhone, pendingRef, setPendingRef, validInvite, useApp } from '../state';
import { Plate } from '../ui/Plate';
import { src, RATIO } from '../img';
import { AREAS, sellablePlans, fromPrice, DEFAULT_PLAN, SLIDES, PlanId } from '../data/reference';
import { inr } from '../data/dates';

type Step = 'phone' | 'otp' | 'about' | 'plan';
const msg = (e: any) => (e && e.message) || "That didn't go through. Try again.";
const L = { ink: C.ink, grey: '#6B6580', line: 'rgba(26,10,51,.14)', tint: '#F6F1FF', tint2: '#EFE8FD', violet: C.violet, off: '#E3E1E8' };

function Err({ text }: { text: string }) {
  return text ? <Txt weight={600} size={13} color={C.red} style={{ marginBottom: SP.m, lineHeight: 18 }}>{text}</Txt> : null;
}
const H2 = ({ children }: { children: string }) => <Txt weight={700} size={24} color={L.ink} style={{ lineHeight: 31, textAlign: 'center' }}>{children}</Txt>;
const P = ({ children, left }: { children: React.ReactNode; left?: boolean }) => <Txt size={14} color={L.grey} style={{ marginTop: SP.s, marginBottom: SP.xl, lineHeight: 21, textAlign: left ? 'left' : 'center' }}>{children}</Txt>;
const Hint = ({ children }: { children: React.ReactNode }) => <Txt size={12} color={L.grey} style={{ marginTop: SP.l, lineHeight: 18, textAlign: 'center' }}>{children}</Txt>;
const B = ({ children }: { children: React.ReactNode }) => <Txt weight={600} size={12} color={L.ink}>{children}</Txt>;
function Link({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: any }) {
  return <Pressable onPress={onPress} disabled={disabled} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={style}><Txt weight={600} size={12.5} color={disabled ? L.grey : L.violet} style={disabled ? undefined : { textDecorationLine: 'underline' }}>{label}</Txt></Pressable>;
};
// full-width violet button, grey while it cannot be used (as Pronto's Continue)
function Cta({ label, onPress, disabled, busy, style }: { label: string; onPress?: () => void; disabled?: boolean; busy?: string | boolean; style?: any }) {
  const off = !!disabled || !!busy;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" style={({ pressed }) => [{ minHeight: 54, borderRadius: 14, backgroundColor: disabled ? L.off : L.violet, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : busy ? 0.8 : 1 }, style]}>
      <Txt weight={600} size={17} color={disabled ? '#fff' : '#fff'}>{typeof busy === 'string' ? busy : label}</Txt>
    </Pressable>
  );
}
const StepDots = ({ n }: { n: 1 | 2 }) => (
  <View style={{ flexDirection: 'row', gap: 6, marginBottom: SP.l }}>
    {[1, 2].map(i => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= n ? L.violet : L.tint2 }} />)}
  </View>
);
const BackBtn = ({ onPress }: { onPress: () => void }) => (
  <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onPress} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ transform: [{ rotate: '180deg' }] }}><Chev size={22} color={L.ink} /></View>
  </Pressable>
);
const PHOTOS = ['slide0', 'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6'] as const;
// two rows of rounded photo bubbles bleeding off the sides, fading out at the bottom
function Bubbles({ W }: { W: number }) {
  const h = 104, rows = [[0, 1, 2, 3], [4, 5, 6, 0]], ws = [[96, 150, 130, 120], [140, 108, 150, 100]], off = [-30, -70];
  return (
    <View style={{ width: W, marginTop: SP.l, height: h * 2 + 32, overflow: 'hidden' }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10, marginLeft: off[ri], marginTop: ri ? 12 : 0, width: W * 2 }}>
          {r.map((k, i) => <Image key={i} source={src(PHOTOS[k])!} resizeMode="cover" style={{ width: ws[ri][i], height: h, borderRadius: 44 }} />)}
        </View>
      ))}
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', '#fff']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 }} />
    </View>
  );
}

export default function Auth() {
  const ins = useInsets(), win = useWindowDimensions(), W = Math.min(win.width, 440);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');          // 10 digits
  const [shown, setShown] = useState('');          // as typed ("98765 04210")
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string[]>(Array(OTP_N).fill(''));
  const [foc, setFoc] = useState(-1);
  const [left, setLeft] = useState(30);
  const [wa, setWa] = useState(true);          // "get updates on WhatsApp" (display only)
  const [su, setSu] = useState({ name: '', area: '', model: '', plate: '', plan: DEFAULT_PLAN as PlanId });
  const [inv, setInv] = useState(pendingRef());   // optional invite code, prefilled from a link the friend sent
  const [showInv, setShowInv] = useState(!!pendingRef()), [tapped, setTapped] = useState(false);
  const { v: appV } = useApp();
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
  const own = /^\d{10}$/.test(phone) ? 'WD' + phone.slice(-6) : '';
  const OWN = "That's your own code. Use one from a friend.";
  // a code that arrives by link while this screen is open fills the box
  useEffect(() => { const r = pendingRef(); if (r && r !== inv && (!inv || validInvite(inv))) { setInv(r); setShowInv(true) } }, [appV]);
  // typing keeps the saved code in step: valid -> saved at once (applies at the first plan payment), anything else -> cleared
  const onInv = (t: string) => {
    const c = t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInv(c); setErr('');
    if (validInvite(c) && c !== own) setPendingRef(c); else setPendingRef('');
  };
  const inviteBox = (
    <View>
      <Field label={step === 'about' ? 'Do you have an invite code? (optional)' : 'Invite code (optional)'} value={inv} onChangeText={onInv} onFocus={toCard} placeholder="WD123456" autoCapitalize="characters" autoCorrect={false}
        autoFocus={tapped && step === 'phone'} maxLength={8} accessibilityLabel="Invite code" boxStyle={{ marginBottom: 0 }} />
      {validInvite(inv) ? (inv === own
        ? <Txt weight={600} size={12} color={C.red} style={{ marginTop: SP.s, lineHeight: 18 }}>{OWN}</Txt>
        : <Txt weight={600} size={12} color="#0E9F6E" style={{ marginTop: SP.s, lineHeight: 18 }}>₹200 off your first month</Txt>) : null}
    </View>
  );
  const onPhone = (t: string) => {
    let d = t.replace(/\D/g, ''); if (d.length > 10) d = d.slice(-10);
    setPhone(d); setShown(d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d); setErr('');
  };
  const sendCode = async () => {
    if (!phoneOk) { setErr('Enter a 10-digit mobile number.'); return }
    if (inv && inv === own) { setErr(OWN); return }
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
    const code = inv.trim().toUpperCase();
    if (code && !validInvite(code)) { setErr('That invite code should look like WD123456. Fix it or clear it.'); return }
    if (code && !setPendingRef(code)) { setErr(OWN); return }
    if (!code) setPendingRef('');
    setSu({ ...su, name: n, model: m, plate: p.toUpperCase() }); setStep('plan');
  };
  const finish = async () => {
    setBusy(true); setErr('');
    try { await act.signup(su) } catch (e) { setErr(msg(e)); setBusy(false) }   // on success the app switches by itself
  };

  /* ---------- the card ---------- */
  const six = OTP_N > 4;
  const phoneField = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 14, borderWidth: 1.5, borderColor: phone ? L.violet : L.line, backgroundColor: '#fff', paddingHorizontal: SP.l }}>
      <Txt weight={600} size={16} color={L.ink}>+91</Txt>
      <TextInput value={shown} onChangeText={onPhone} onFocus={toCard} onSubmitEditing={sendCode} inputMode="numeric" keyboardType="number-pad" maxLength={16} autoComplete="tel-national" textContentType="telephoneNumber"
        placeholder="Enter mobile number" placeholderTextColor="rgba(26,10,51,.4)" accessibilityLabel="Mobile number"
        style={{ flex: 1, minWidth: 0, fontFamily: F.b500, fontSize: 16, color: C.ink, paddingVertical: 12, outlineStyle: 'none' } as any} />
    </View>
  );
  let card;
  if (step === 'phone') card = (
    <>
      <Txt weight={700} size={21} color={L.ink} style={{ textAlign: 'center', marginBottom: SP.l }}>Log in or Sign up</Txt>
      {phoneField}
      <Pressable onPress={() => setWa(!wa)} accessibilityRole="checkbox" accessibilityState={{ checked: wa }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SP.m, minHeight: 36 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: wa ? L.violet : '#fff', borderWidth: wa ? 0 : 1.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center' }}>{wa ? <Check size={13} color="#fff" strokeWidth={3} /> : null}</View>
        <Txt weight={500} size={13.5} color={L.ink}>Get updates on WhatsApp</Txt>
      </Pressable>
      {showInv
        ? <View style={{ marginTop: SP.m }}>{inviteBox}</View>
        : <Link label="I have an invite code" onPress={() => { setShowInv(true); setTapped(true) }} style={{ alignSelf: 'flex-start', marginTop: SP.s }} />}
      {err ? <View style={{ marginTop: SP.m }}><Err text={err} /></View> : null}
      <Cta label="Continue" busy={busy ? 'Sending…' : false} disabled={!phoneOk} onPress={sendCode} style={{ marginTop: SP.l }} />
      <Txt size={11} color={L.grey} style={{ textAlign: 'center', marginTop: SP.m, lineHeight: 16 }}>By continuing, you agree to our Terms of Service & Privacy Policy</Txt>
      {REAL ? <Hint>New to Washing Daddy? Use your number and we'll set you up after the code.</Hint>
        : <Hint><B>Test version.</B> 98765 04210 opens a sample customer with two cars. Any other number takes you through sign-up as a new customer.</Hint>}
    </>
  );
  else if (step === 'otp') card = (
    <>
      <Txt weight={700} size={26} color={L.ink} style={{ lineHeight: 34, marginTop: SP.l }}>Enter the OTP sent to{'\n'}+91 {fmtPhone(phone)}</Txt>
      <Link label="Change number" onPress={() => { setStep('phone'); setErr('') }} style={{ alignSelf: 'flex-start', marginTop: SP.s, marginBottom: SP.xl }} />
      <Animated.View style={{ flexDirection: 'row', gap: six ? 8 : 12, justifyContent: 'space-between', marginBottom: SP.l, transform: [{ translateX: shake }] }}>
        {code.map((d, i) => (
          <TextInput key={i} ref={(r: any) => { boxes.current[i] = r }} value={d} onChangeText={t => onBox(i, t)} onFocus={() => { setFoc(i); toCard() }} onBlur={() => setFoc(-1)}
            onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) { const c = code.slice(); c[i - 1] = ''; setCode(c); boxes.current[i - 1]?.focus() } }}
            inputMode="numeric" keyboardType="number-pad" textContentType={i ? undefined : 'oneTimeCode'} autoComplete={i ? 'off' : 'sms-otp'} maxLength={OTP_N} selectTextOnFocus editable={!busy}
            accessibilityLabel={`Digit ${i + 1}`}
            style={{ flex: 1, maxWidth: 56, aspectRatio: 1, textAlign: 'center', padding: 0, fontFamily: F.b700, fontSize: six ? 22 : 26, color: C.ink, backgroundColor: '#fff', borderWidth: foc === i ? 2 : 1.5, borderColor: foc === i || d ? L.violet : L.line, borderRadius: 12, outlineStyle: 'none' } as any} />
        ))}
      </Animated.View>
      <Err text={err} />
      {busy ? <Txt weight={600} size={13} color={L.violet} style={{ textAlign: 'center' }}>Checking…</Txt> : null}
      <View style={{ alignItems: 'center', marginTop: SP.l }}>
        {left > 0 ? <Txt size={14} color={L.grey}>{`Resend SMS in ${left}s`}</Txt> : <Link label="Resend SMS" onPress={resend} />}
      </View>
      {REAL ? null : <Hint><B>Test code: 1234</B></Hint>}
      <Cta label="Verify" busy={busy ? 'Checking…' : false} disabled={code.join('').length < OTP_N} onPress={() => verify(code)} style={{ marginTop: SP.xl }} />
    </>
  );
  else if (step === 'about') card = (
    <>
      <StepDots n={1} />
      <H2>Welcome to Washing Daddy</H2>
      <P>New number. Tell us where your car sleeps and we'll start tomorrow morning.</P>
      <Field label="Your name" value={su.name} onChangeText={name => { setSu({ ...su, name }); setErr('') }} placeholder="Full name" autoComplete="name" textContentType="name" autoCapitalize="words" />
      <Txt weight={600} size={12} color={L.violet} style={{ marginTop: SP.hair }}>Area</Txt>
      <Chips items={AREAS} value={su.area} onChange={area => { setSu({ ...su, area }); setErr('') }} />
      <Field label="Car" value={su.model} onChangeText={model => { setSu({ ...su, model }); setErr('') }} placeholder="e.g. Creta, Nexon, City" autoCapitalize="words" />
      <Plate reg={su.plate} width="82%" style={{ alignSelf: 'center', marginBottom: SP.l }} />
      <Field label="Registration number" value={su.plate} onChangeText={plate => { setSu({ ...su, plate }); setErr('') }} placeholder="DL 8C AB 1234" autoCapitalize="characters" autoCorrect={false} />
      <View style={{ marginBottom: SP.l }}>{inviteBox}</View>
      <Err text={err} />
      <Cta label="Choose a plan" onPress={toPlan} style={{ marginTop: SP.s }} />
    </>
  );
  else card = (
    <>
      <StepDots n={2} />
      <H2>{`Pick a plan for your ${su.model}`}</H2>
      <P>Pay after the first wash. Change any time. WD Pro and above can pause up to a week a month.</P>
      {sellablePlans().map(p => (
        <Opt key={p.id} on={su.plan === p.id} onPress={() => setSu({ ...su, plan: p.id })} title={p.name} price={inr(p.price)}
          text={p.rows.slice(1, 4).map(r => r[0] + ' ' + r[1].toLowerCase()).join(' · ')} />
      ))}
      <Err text={err} />
      <Cta label="Start tomorrow morning" busy={busy ? 'Setting up…' : false} onPress={finish} style={{ marginTop: SP.s }} />
      <Link label="Back" onPress={() => setStep('about')} style={{ alignSelf: 'center', marginTop: SP.l }} />
    </>
  );

  /* ---------- the violet header block (phone step) / plain bar (other steps) ---------- */
  const hero = (
    <LinearGradient colors={['#3A06A0', '#5409DA']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ paddingTop: ins.top + SP.m, paddingBottom: 36, paddingHorizontal: PAD, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 40 }}>
        <Image source={src('logo')!} resizeMode="contain" accessibilityLabel="Washing Daddy" style={{ width: 96, height: 96 / RATIO.logo }} />
      </View>
      <Txt weight={700} size={28} color="#fff" style={{ textAlign: 'center', lineHeight: 36, marginTop: SP.l, maxWidth: 300 }}>Get a sparkling car in minutes!</Txt>
      <Txt size={13.5} color="rgba(255,255,255,.8)" style={{ textAlign: 'center', marginTop: SP.s, maxWidth: 290 }}>A washer comes to where your car is parked. No pocha, only pressure wash.</Txt>
    </LinearGradient>
  );
  const bar = (
    <View style={{ paddingTop: ins.top + SP.s, paddingHorizontal: PAD - 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <BackBtn onPress={() => { if (step === 'otp') { setStep('phone'); setErr('') } else if (step === 'plan') setStep('about'); else { setStep('phone'); setErr('') } }} />
      {step === 'otp' ? <Txt weight={600} size={17} color={L.ink}>OTP verification</Txt> : <Image source={src('logo')!} resizeMode="contain" style={{ width: 72, height: 72 / RATIO.logo }} />}
    </View>
  );

  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: SP.xl + Math.max(ins.bottom, SP.s) }}>
            <View style={{ width: W }}>
              {step === 'phone' ? <>{hero}<Bubbles W={W} /></> : bar}
              <View onLayout={e => { cardY.current = e.nativeEvent.layout.y }} style={{ paddingHorizontal: PAD, marginTop: step === 'phone' ? SP.s : SP.l }}>{card}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </InkContext.Provider>
  );
}

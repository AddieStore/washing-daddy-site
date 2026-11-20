/* Sign-in poster and flow: phone -> code -> (new numbers) about -> plan. Ported from renderAuth() in customer/index.html. */
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { C, F, SP, InkContext, creamInk } from '../theme';
import { Chips, Field, Txt, useInsets, PAD } from '../ui/kit';
import { Pressable3, FadeUp } from '../ui/motion';
import { BrandBg, BrandLogo, PhotoStrip, Sheet } from '../ui/Brand';
import { Back, Check } from '../ui/icons';
import { OTP_N, REAL, act, fmtPhone, pendingRef, setPendingRef, validInvite, useApp, legalPages } from '../state';
import { openLegalSheet } from '../pages/LegalDoc';
import { Plate } from '../ui/Plate';
import { AREAS, sellablePlans, DEFAULT_PLAN, PlanId } from '../data/reference';
import { inr } from '../data/dates';

type Step = 'phone' | 'otp' | 'about' | 'plan';
const msg = (e: any) => (e && e.message) || "That didn't go through. Try again.";
const L = { ink: '#1A1033', grey: '#4F4766', muted: '#6B6483', line: 'rgba(84,9,218,0.16)', hair: 'rgba(84,9,218,0.10)', raised: C.canvas, violet: C.violet, off: '#E6E0F5', red: '#dc2626', ok: '#16a34a' };
const NUM = { fontVariant: ['tabular-nums'] } as const;

function Err({ text }: { text: string }) {
  return text ? <Txt weight={500} size={13} color={L.red} style={{ marginBottom: SP.m, lineHeight: 18 }}>{text}</Txt> : null;
}
const Hint = ({ children }: { children: React.ReactNode }) => <Txt size={12} color={L.muted} style={{ marginTop: SP.l, lineHeight: 17, padding: SP.m, borderRadius: 12, backgroundColor: L.raised, overflow: 'hidden' }}>{children}</Txt>;
const B = ({ children }: { children: React.ReactNode }) => <Txt weight={600} size={12} color={L.ink}>{children}</Txt>;
function Link({ label, onPress, disabled, style, color }: { label: string; onPress: () => void; disabled?: boolean; style?: any; color?: string }) {
  return <Pressable3 onPress={onPress} disabled={disabled} haptics={false} scaleTo={0.97} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={style}><Txt weight={600} size={14} color={disabled ? L.muted : color || L.violet}>{label}</Txt></Pressable3>;
};
// full-width brand button, soft lilac while it cannot be used
function Cta({ label, onPress, disabled, busy, style }: { label: string; onPress?: () => void; disabled?: boolean; busy?: string | boolean; style?: any }) {
  const off = !!disabled || !!busy;
  return (
    <Pressable3 onPress={onPress} disabled={off} accessibilityRole="button" style={[{ minHeight: 56, borderRadius: 16, backgroundColor: disabled ? L.off : L.violet, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.85 : 1 }, !disabled && { shadowColor: C.violet, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, style]}>
      <Txt weight={600} size={16} color={disabled ? L.muted : '#fff'}>{typeof busy === 'string' ? busy : label}</Txt>
    </Pressable3>
  );
}
// "Step 1 of 2" with a two-segment bar, on the violet top
const StepBar = ({ n }: { n: 1 | 2 }) => (
  <View style={{ marginBottom: SP.m }}>
    <Txt weight={600} size={12} color={C.saffron} style={{ letterSpacing: 0.8, marginBottom: SP.s }}>{`STEP ${n} OF 2`}</Txt>
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2].map(i => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= n ? C.saffron : 'rgba(255,255,255,0.28)' }} />)}
    </View>
  </View>
);
const BackBtn = ({ onPress }: { onPress: () => void }) => (
  <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
    <Back size={22} color="#fff" strokeWidth={1.8} />
  </Pressable>
);
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
  const scroll = useRef<any>(null);
  const working = useRef(false);

  const toCard = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);   // keeps the sheet's field above the keyboard
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); setErr(''); }, [step]);

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
        ? <Txt weight={500} size={12} color={L.red} style={{ marginTop: SP.s, lineHeight: 16 }}>{OWN}</Txt>
        : <Txt weight={500} size={12} color={L.ok} style={[{ marginTop: SP.s, lineHeight: 16 }, NUM]}>₹200 off your first month</Txt>) : null}
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

  /* ---------- the sheet content ---------- */
  const six = OTP_N > 4;
  const [pf, setPf] = useState(false);
  const phoneField = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: 16, borderWidth: 1.5, borderColor: pf || phone ? L.violet : 'transparent', backgroundColor: pf ? '#fff' : L.raised, paddingHorizontal: SP.l, ...(pf ? { shadowColor: C.violet, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } } : null) }}>
      <Txt weight={600} size={18} color={L.ink} style={NUM}>+91</Txt>
      <View style={{ width: 1, height: 24, backgroundColor: L.line }} />
      <TextInput value={shown} onChangeText={onPhone} onFocus={() => { setPf(true); toCard() }} onBlur={() => setPf(false)} onSubmitEditing={sendCode} inputMode="numeric" keyboardType="number-pad" maxLength={16} autoComplete="tel-national" textContentType="telephoneNumber"
        placeholder="Mobile number" placeholderTextColor={L.muted} accessibilityLabel="Mobile number"
        style={{ flex: 1, minWidth: 0, fontFamily: F.b500, fontSize: 20, letterSpacing: 0.4, color: L.ink, paddingVertical: 14, fontVariant: ['tabular-nums'], outlineStyle: 'none' } as any} />
    </View>
  );
  let card;
  if (step === 'phone') card = (
    <>
      <Txt weight={700} size={22} color={L.ink} style={{ lineHeight: 30 }}>Log in or sign up</Txt>
      <Txt size={14} color={L.grey} style={{ lineHeight: 20, marginTop: 2, marginBottom: SP.l }}>Enter your mobile number. We'll text you a code.</Txt>
      {phoneField}
      <Pressable onPress={() => setWa(!wa)} accessibilityRole="checkbox" accessibilityState={{ checked: wa }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SP.s, minHeight: 44 }}>
        <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: wa ? L.violet : '#fff', borderWidth: wa ? 0 : 1.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center' }}>{wa ? <Check size={15} color="#fff" strokeWidth={2.2} /> : null}</View>
        <Txt size={14} color={L.ink}>Get updates on WhatsApp</Txt>
      </Pressable>
      {showInv
        ? <View style={{ marginTop: SP.s }}>{inviteBox}</View>
        : <Link label="I have an invite code" onPress={() => { setShowInv(true); setTapped(true) }} style={{ alignSelf: 'flex-start', marginTop: SP.hair, minHeight: 28 }} />}
      {err ? <View style={{ marginTop: SP.m }}><Err text={err} /></View> : null}
      <Cta label="Continue" busy={busy ? 'Sending…' : false} disabled={!phoneOk} onPress={sendCode} style={{ marginTop: SP.l }} />
      {legalPages('signup').length ? (
        <Txt size={12} color={L.muted} style={{ textAlign: 'center', marginTop: SP.m, lineHeight: 17 }}>By continuing, you agree to our {legalPages('signup').map((d, i, l) => (
          <Txt key={d.id} size={12} color={L.muted}>{i ? (i === l.length - 1 ? ' and ' : ', ') : ''}<Txt size={12} color={L.violet} style={{ textDecorationLine: 'underline' }} onPress={() => openLegalSheet(d.id)}>{d.title}</Txt></Txt>
        ))}</Txt>
      ) : null}
      {REAL ? <Hint>New here? Use your number and we'll set you up after the code</Hint>
        : <Hint><B>Test version.</B> 98765 04210 opens a sample customer with two cars. Any other number takes you through sign-up as a new customer</Hint>}
    </>
  );
  else if (step === 'otp') card = (
    <>
      <Animated.View style={{ flexDirection: 'row', gap: six ? 8 : 12, justifyContent: 'space-between', marginTop: SP.s, marginBottom: SP.l, transform: [{ translateX: shake }] }}>
        {code.map((d, i) => {
          const on = foc === i;
          return (
            <TextInput key={i} ref={(r: any) => { boxes.current[i] = r }} value={d} onChangeText={t => onBox(i, t)} onFocus={() => { setFoc(i); toCard() }} onBlur={() => setFoc(-1)}
              onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) { const c = code.slice(); c[i - 1] = ''; setCode(c); boxes.current[i - 1]?.focus() } }}
              inputMode="numeric" keyboardType="number-pad" textContentType={i ? undefined : 'oneTimeCode'} autoComplete={i ? 'off' : 'sms-otp'} maxLength={OTP_N} selectTextOnFocus editable={!busy}
              accessibilityLabel={`Digit ${i + 1}`}
              style={[{ flex: 1, maxWidth: 64, height: 68, textAlign: 'center', padding: 0, fontFamily: F.b600, fontSize: six ? 26 : 30, color: L.ink, fontVariant: ['tabular-nums'], backgroundColor: on ? '#fff' : L.raised, borderWidth: 1.5, borderColor: on || d ? L.violet : 'transparent', borderRadius: 16, outlineStyle: 'none' } as any,
                on && { shadowColor: C.violet, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }]} />
          );
        })}
      </Animated.View>
      <Err text={err} />
      {busy ? <Txt weight={600} size={13} color={L.violet} style={{ textAlign: 'center' }}>Checking…</Txt> : null}
      <View style={{ alignItems: 'center', marginTop: SP.s, minHeight: 28 }}>
        {left > 0 ? <Txt size={14} color={L.muted} style={NUM}>{`Resend SMS in ${left}s`}</Txt> : <Link label="Resend SMS" onPress={resend} />}
      </View>
      {REAL ? null : <Hint><B>Test code: 1234</B></Hint>}
      <Cta label="Verify" busy={busy ? 'Checking…' : false} disabled={code.join('').length < OTP_N} onPress={() => verify(code)} style={{ marginTop: SP.l }} />
    </>
  );
  else if (step === 'about') card = (
    <>
      <Field label="Your name" value={su.name} onChangeText={name => { setSu({ ...su, name }); setErr('') }} placeholder="Full name" autoComplete="name" textContentType="name" autoCapitalize="words" />
      <Txt weight={500} size={13} color={L.grey} style={{ marginTop: SP.hair }}>Area</Txt>
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
      {sellablePlans().map(p => {
        const on = su.plan === p.id;
        return (
          <Pressable3 key={p.id} onPress={() => setSu({ ...su, plan: p.id })} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ marginBottom: SP.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, padding: SP.l, borderRadius: 18, borderWidth: 2, borderColor: on ? L.violet : 'transparent', backgroundColor: on ? '#fff' : L.raised, ...(on ? { shadowColor: C.violet, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } } : null) }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? L.violet : L.muted, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: L.violet }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight={600} size={16} color={L.ink}>{p.name}</Txt>
                <Txt size={12} color={L.muted} style={{ marginTop: 2, lineHeight: 16 }}>{p.rows.filter(r => r[1] !== '—').slice(0, 2).map(r => r[1] + ' ' + r[0].toLowerCase()).join(' · ')}</Txt>
              </View>
              <Txt weight={700} size={16} color={L.ink} style={NUM}>{inr(p.price)}</Txt>
            </View>
          </Pressable3>
        );
      })}
      <Err text={err} />
      <Cta label="Start tomorrow morning" busy={busy ? 'Setting up…' : false} onPress={finish} style={{ marginTop: SP.s }} />
    </>
  );

  /* ---------- the violet top: hero on the phone step, a compact header (back, progress, big title) on the rest ---------- */
  const goBack = () => { if (step === 'plan') setStep('about'); else { setStep('phone'); setErr('') } };
  const T1 = ({ children }: { children: React.ReactNode }) => <Txt weight={700} size={30} color="#fff" style={{ lineHeight: 38 }}>{children}</Txt>;
  const T2 = ({ children }: { children: React.ReactNode }) => <Txt size={15} color="rgba(255,255,255,0.86)" style={{ lineHeight: 22, marginTop: SP.s }}>{children}</Txt>;
  let top;
  if (step === 'phone') top = (
    <View style={{ paddingTop: ins.top + SP.l }}>
      <FadeUp style={{ paddingHorizontal: PAD + 4 }}>
        <BrandLogo w={96} />
        <Txt weight={700} size={32} color="#fff" style={{ lineHeight: 40, marginTop: SP.l }}>Your car, washed{'\n'}<Txt weight={700} size={32} color={C.saffron}>every morning.</Txt></Txt>
        <Txt size={15} color="rgba(255,255,255,0.86)" style={{ lineHeight: 22, marginTop: SP.s, maxWidth: 330 }}>A washer comes to where it's parked. Pressure wash only, no pocha.</Txt>
      </FadeUp>
      <View style={{ marginTop: SP.l, marginBottom: SP.m }}><PhotoStrip width={W} h={100} /></View>
    </View>
  );
  else top = (
    <View style={{ paddingTop: ins.top + SP.m, paddingHorizontal: PAD + 4, paddingBottom: SP.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.l }}>
        <BackBtn onPress={goBack} />
        <BrandLogo w={72} />
      </View>
      <FadeUp key={step}>
        {step === 'about' ? <StepBar n={1} /> : step === 'plan' ? <StepBar n={2} /> : null}
        {step === 'otp' ? <><T1>Enter the code</T1><T2>{`We sent a ${OTP_N}-digit code to`}</T2>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <Txt weight={600} size={17} color="#fff" style={NUM}>+91 {fmtPhone(phone)}</Txt>
            <Link label="Change" color={C.saffron} onPress={() => { setStep('phone'); setErr('') }} />
          </View></>
          : step === 'about' ? <><T1>Tell us about your car</T1><T2>New number. Tell us where your car sleeps and we'll start tomorrow morning</T2></>
          : <><T1>{`Pick a plan for your ${su.model}`}</T1><T2>Pay after the first wash. Change any time. WD Pro and above can pause up to a week a month</T2></>}
      </FadeUp>
    </View>
  );

  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: C.brandDeep }}>
        <BrandBg />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}>
            <View style={{ width: W, flexGrow: 1 }}>
              {top}
              <Sheet style={{ marginTop: SP.s, flexGrow: 1 }}>
                <View style={{ paddingHorizontal: PAD + 4, paddingTop: SP.xl, paddingBottom: SP.xl + Math.max(ins.bottom, SP.s) }}>
                  <FadeUp key={step} distance={10} duration={260}>{card}</FadeUp>
                </View>
              </Sheet>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </InkContext.Provider>
  );
}

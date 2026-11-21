/* Sign-in poster and flow: phone -> code -> (new numbers) about -> plan. Ported from renderAuth() in customer/index.html. */
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { C, F, SP, InkContext, creamInk } from '../theme';
import Reanimated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Field, Txt, useInsets, PAD } from '../ui/kit';
import { Pressable3, FadeUp, Splash } from '../ui/motion';
import { BrandBg, BrandLogo, Sheet } from '../ui/Brand';
import { LoginStory } from '../ui/loginStory';
import { Cta, PhoneField, OtpBox } from '../ui/welcome';
import { Back, Check, Zap, Calendar } from '../ui/icons';
import { OTP_N, REAL, act, fmtPhone, pendingRef, setPendingRef, validInvite, useApp, legalPages, onAutoSignIn } from '../state';
import { openLegalSheet } from '../pages/LegalDoc';
import { Plate } from '../ui/Plate';
import { sellablePlans, DEFAULT_PLAN, PlanId, fromPrice } from '../data/reference';
import { AddressEntry, emptyAddr, addrLocated, type AddrDraft } from '../ui/AddressEntry';
import { inr } from '../data/dates';

type Step = 'phone' | 'otp' | 'about' | 'choose' | 'car' | 'plan';
type Mode = 'instant' | 'monthly';
const msg = (e: any) => (e && e.message) || "That didn't go through. Try again.";
const L = { ink: '#1A1033', grey: '#4F4766', muted: '#6B6483', line: 'rgba(84,9,218,0.16)', hair: 'rgba(84,9,218,0.10)', raised: C.canvas, violet: C.violet, off: '#E6E0F5', red: '#dc2626', ok: '#16a34a' };
const NUM = { fontVariant: ['tabular-nums'] } as const;
let introDone = false;   // the violet splash cross-fades into the collage once per app start

function Err({ text }: { text: string }) {
  return text ? <Txt weight={500} size={13} color={L.red} style={{ marginBottom: SP.m, lineHeight: 18 }}>{text}</Txt> : null;
}
const Hint = ({ children }: { children: React.ReactNode }) => <Txt size={12} color={L.muted} style={{ marginTop: SP.l, lineHeight: 17, padding: SP.m, borderRadius: 12, backgroundColor: L.raised, overflow: 'hidden' }}>{children}</Txt>;
const B = ({ children }: { children: React.ReactNode }) => <Txt weight={600} size={12} color={L.ink}>{children}</Txt>;
function Link({ label, onPress, disabled, style, color }: { label: string; onPress: () => void; disabled?: boolean; style?: any; color?: string }) {
  return <Pressable3 onPress={onPress} disabled={disabled} haptics={false} scaleTo={0.97} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={style}><Txt weight={600} size={14} color={disabled ? L.muted : color || L.violet}>{label}</Txt></Pressable3>;
};
// "Step 2 of 4" with a segmented bar, on the violet top
const StepBar = ({ n, total }: { n: number; total: number }) => (
  <View style={{ marginBottom: SP.m }}>
    <Txt weight={600} size={12} color={C.saffron} style={{ letterSpacing: 0.8, marginBottom: SP.s }}>{`STEP ${n} OF ${total}`}</Txt>
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, k) => k + 1).map(i => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= n ? C.saffron : 'rgba(255,255,255,0.28)' }} />)}
    </View>
  </View>
);
// the two big "how do you want your car washed" cards
// Opaque fill and no Android elevation: a see-through tint over an elevated card made Android draw the shadow box through it
// (the grey inner rectangle on the selected card in build 23).
function ModeCard({ on, title, text, tag, icon, onPress }: { on: boolean; title: string; text: string; tag: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable3 onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} scaleTo={0.975} style={{ marginBottom: SP.m }}>
      <View style={{ padding: SP.l + 2, borderRadius: 22, borderWidth: 2, borderColor: on ? L.violet : L.hair, backgroundColor: on ? '#F4EEFF' : '#fff', shadowColor: C.violet, shadowOpacity: on ? 0.22 : 0.06, shadowRadius: on ? 16 : 10, shadowOffset: { width: 0, height: 5 }, elevation: Platform.OS === 'android' ? 0 : (on ? 4 : 1) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: on ? L.violet : 'rgba(84,9,218,0.09)', alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? L.violet : L.line, backgroundColor: on ? L.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={15} color="#fff" strokeWidth={2.4} /> : null}</View>
        </View>
        <Txt weight={700} size={20} color={L.ink} style={{ marginTop: SP.m, lineHeight: 26 }}>{title}</Txt>
        <Txt size={14} color={L.grey} style={{ marginTop: 2, lineHeight: 20 }}>{text}</Txt>
        <Txt weight={600} size={13} color={L.violet} style={[{ marginTop: SP.m }, NUM]}>{tag}</Txt>
      </View>
    </Pressable3>
  );
}
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
  const [su, setSu] = useState({ name: '', model: '', plate: '', plan: DEFAULT_PLAN as PlanId });
  const [mode, setMode] = useState<Mode | null>(null);
  const [addr, setAddr] = useState<AddrDraft | null>(null);
  const [inv, setInv] = useState(pendingRef());   // optional invite code, prefilled from a link the friend sent
  const [showInv, setShowInv] = useState(!!pendingRef()), [tapped, setTapped] = useState(false);
  const { v: appV } = useApp();
  const [intro, setIntro] = useState(!introDone), intro0 = useRef(!introDone).current;
  useEffect(() => { introDone = true; setIntro(false) }, []);
  const boxes = useRef<({ focus: () => void } | null)[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const scroll = useRef<any>(null);
  const working = useRef(false);
  // Android draws edge to edge, so the window does not always shrink for the keyboard and the number box ended up under it.
  // Measure how much of the screen the keyboard covers (0 when the window did resize), pad the sheet by that much and scroll
  // the field into view once the keyboard is fully out (doing it on focus is what used to knock the keyboard down).
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      // read the window size after the keyboard is out: when Android did resize the window, the keyboard covers nothing
      // and we add nothing (adding it anyway is what pushed the screen too far up in build 23)
      setTimeout(() => {
        const cover = Math.max(0, Math.round(Dimensions.get('window').height - e.endCoordinates.screenY));
        setKb(Platform.OS === 'android' ? Math.min(cover, e.endCoordinates.height) : 0);
        setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 40);
      }, 120);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove() };
  }, []);

  // Android: never restyle or scroll the page while a field is gaining focus. A focus-time re-layout made the keyboard open and close at once on
  // build 21 (phone step). The window resizes for the keyboard by itself; only the longer sign-up steps nudge the sheet up, after the keyboard is out.
  const toCard = () => { if (step === 'phone') return; setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 350) };
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
  // the phone read the SMS and signed in by itself: show the boxes as filled and carry on
  useEffect(() => {
    if (step !== 'otp') return;
    return onAutoSignIn(() => { if (working.current) return; const c = Array(OTP_N).fill('•'); setCode(c); verify(c) });
  }, [step, phone]);
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

  const toChoose = () => {
    if (!su.name.trim()) { setErr('Add your name to continue.'); return }
    const code = inv.trim().toUpperCase();
    if (code && !validInvite(code)) { setErr('That invite code should look like WD123456. Fix it or clear it.'); return }
    if (code && !setPendingRef(code)) { setErr(OWN); return }
    if (!code) setPendingRef('');
    setSu({ ...su, name: su.name.trim() }); setStep('choose');
  };
  const pick = (m: Mode) => { if (mode === m && step !== 'choose') return; setMode(m); setErr(''); setTimeout(() => setStep('car'), 260) };
  const missing = () => {
    const a = addr || emptyAddr();
    return !su.name.trim() ? 'your name' : !su.model.trim() ? 'your car model' : !su.plate.trim() ? 'the registration number' : !a.flat.trim() && !addrLocated(a) ? 'your address' : !addrLocated(a) ? 'your location (search or pick on the map)' : !a.flat.trim() ? 'your flat or house number' : '';
  };
  const finish = async () => {
    const miss = missing(); if (miss) { setErr('Add ' + miss + ' to continue.'); return }
    if (mode === 'monthly' && !su.plan) { setErr('Pick a plan to continue.'); return }
    const a = addr!;
    setBusy(true); setErr('');
    try {
      await act.signup({ name: su.name.trim(), model: su.model.trim(), plate: su.plate.trim().toUpperCase(), mode: mode || 'instant', plan: mode === 'monthly' ? su.plan : null,
        address: { flat: a.flat.trim(), street: a.street.trim(), area: a.area.trim(), lat: a.lat, lng: a.lng } });
    } catch (e) { setErr(msg(e)); setBusy(false) }   // on success the app switches by itself
  };
  const toPlan = () => { const miss = missing(); if (miss) { setErr('Add ' + miss + ' to continue.'); return } setErr(''); setStep('plan') };

  /* ---------- the sheet content ---------- */
  const six = OTP_N > 4;
  const phoneField = <PhoneField value={shown} onChangeText={onPhone} onSubmit={sendCode} valid={phoneOk} />;
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
        {code.map((d, i) => (
          <OtpBox key={i} inputRef={(r: any) => { boxes.current[i] = r }} value={d} focused={foc === i} small={six} onChangeText={t => onBox(i, t)} onFocus={() => { setFoc(i); toCard() }} onBlur={() => setFoc(-1)}
            onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) { const c = code.slice(); c[i - 1] = ''; setCode(c); boxes.current[i - 1]?.focus() } }}
            inputMode="numeric" keyboardType="number-pad" textContentType={i ? undefined : 'oneTimeCode'} autoComplete={i ? 'off' : 'sms-otp'} maxLength={OTP_N} selectTextOnFocus editable={!busy}
            accessibilityLabel={`Digit ${i + 1}`} />
        ))}
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
      <View style={{ marginBottom: SP.l }}>{inviteBox}</View>
      <Err text={err} />
      <Cta label="Continue" disabled={!su.name.trim()} onPress={toChoose} style={{ marginTop: SP.s }} />
    </>
  );
  else if (step === 'choose') card = (
    <>
      <ModeCard on={mode === 'instant'} onPress={() => pick('instant')} title="Instant / one-time" text="A wash when you need it. Today, or a slot you pick." tag="Pay per wash, no commitment" icon={<Zap size={24} color={mode === 'instant' ? '#fff' : L.violet} strokeWidth={1.7} />} />
      <ModeCard on={mode === 'monthly'} onPress={() => pick('monthly')} title="Monthly plan" text="A daily wash at your parking, every morning." tag={`From ${inr(fromPrice())} / month`} icon={<Calendar size={24} color={mode === 'monthly' ? '#fff' : L.violet} strokeWidth={1.7} />} />
    </>
  );
  else if (step === 'car') card = (
    <>
      <Field label="Car" value={su.model} onChangeText={model => { setSu({ ...su, model }); setErr('') }} placeholder="e.g. Creta, Nexon, City" autoCapitalize="words" />
      <Plate reg={su.plate} width="82%" style={{ alignSelf: 'center', marginBottom: SP.l }} />
      <Field label="Registration number" value={su.plate} onChangeText={plate => { setSu({ ...su, plate }); setErr('') }} placeholder="DL 8C AB 1234" autoCapitalize="characters" autoCorrect={false} />
      <View style={{ marginBottom: SP.l }}><AddressEntry value={addr} onChange={a => { setAddr(a); setErr('') }} /></View>
      <Err text={err} />
      {mode === 'monthly'
        ? <Cta label="Choose a plan" onPress={toPlan} style={{ marginTop: SP.s }} />
        : <Cta label="Start using Washing Daddy" busy={busy ? 'Setting up…' : false} onPress={finish} style={{ marginTop: SP.s }} />}
    </>
  );
  else card = (
    <>
      {sellablePlans().map(p => {
        const on = su.plan === p.id, rows = p.rows.filter(r => r[1] !== '—');
        return (
          <Pressable3 key={p.id} onPress={() => { setSu({ ...su, plan: p.id }); setErr('') }} accessibilityRole="button" accessibilityState={{ selected: on }} scaleTo={0.98} style={{ marginBottom: SP.m }}>
            <Reanimated.View layout={LinearTransition.duration(260)} style={{ padding: SP.l, borderRadius: 18, borderWidth: 2, borderColor: on ? L.violet : 'transparent', backgroundColor: on ? '#fff' : L.raised, ...(on ? { shadowColor: C.violet, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : null) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? L.violet : L.muted, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: L.violet }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt weight={600} size={16} color={L.ink}>{p.name}</Txt>
                  {on ? null : <Txt size={12} color={L.muted} style={{ marginTop: 2, lineHeight: 16 }}>{rows.slice(0, 2).map(r => r[1] + ' ' + r[0].toLowerCase()).join(' · ')}</Txt>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt weight={700} size={16} color={L.ink} style={NUM}>{inr(p.price)}</Txt>
                  <Txt size={11} color={L.muted}>per month</Txt>
                </View>
              </View>
              {on ? (
                <Reanimated.View entering={FadeIn.duration(260)} style={{ marginTop: SP.m, paddingTop: SP.m, borderTopWidth: 1, borderTopColor: L.hair, gap: 8 }}>
                  {rows.map(r => (
                    <View key={r[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Check size={16} color={L.ok} strokeWidth={2.2} />
                      <Txt size={14} color={L.grey} style={{ flex: 1 }}>{r[0]}</Txt>
                      <Txt weight={600} size={14} color={L.ink}>{r[1]}</Txt>
                    </View>
                  ))}
                </Reanimated.View>
              ) : null}
            </Reanimated.View>
          </Pressable3>
        );
      })}
      <Err text={err} />
      <Cta label="Start tomorrow morning" busy={busy ? 'Setting up…' : false} onPress={finish} style={{ marginTop: SP.s }} />
    </>
  );

  /* ---------- the violet top: hero on the phone step, a compact header (back, progress, big title) on the rest ---------- */
  const goBack = () => { setErr(''); if (step === 'plan') setStep('car'); else if (step === 'car') setStep('choose'); else if (step === 'choose') setStep('about'); else setStep('phone') };
  const storyH = Math.max(140, Math.min(200, Math.round(win.height * 0.24)));
  const total = mode === 'instant' ? 3 : 4, nOf = (step === 'about' ? 1 : step === 'choose' ? 2 : step === 'car' ? 3 : 4);
  const T1 = ({ children }: { children: React.ReactNode }) => <Txt weight={700} size={30} color="#fff" style={{ lineHeight: 38 }}>{children}</Txt>;
  const T2 = ({ children }: { children: React.ReactNode }) => <Txt size={15} color="rgba(255,255,255,0.86)" style={{ lineHeight: 22, marginTop: SP.s }}>{children}</Txt>;
  let top;
  if (step === 'phone') top = (
    <View style={{ paddingTop: ins.top + SP.l }}>
      <FadeUp style={{ paddingHorizontal: PAD + 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandLogo w={96} />
          <Pressable onPress={() => act.continueAsGuest()} accessibilityRole="button" accessibilityLabel="Skip login and look around" hitSlop={10}
            style={({ pressed }) => ({ paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' })}>
            <Txt weight={600} size={14} color="#fff">Skip</Txt>
          </Pressable>
        </View>
      </FadeUp>
      <View style={{ marginTop: SP.m }}><LoginStory W={W} H={storyH} /></View>
    </View>
  );
  else top = (
    <View style={{ paddingTop: ins.top + SP.m, paddingHorizontal: PAD + 4, paddingBottom: SP.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.l }}>
        <BackBtn onPress={goBack} />
        <BrandLogo w={72} />
      </View>
      <FadeUp key={step}>
        {step === 'about' || step === 'choose' || step === 'car' || step === 'plan' ? <StepBar n={nOf} total={total} /> : null}
        {step === 'otp' ? <><T1>Enter the code</T1><T2>{`We sent a ${OTP_N}-digit code to`}</T2>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <Txt weight={600} size={17} color="#fff" style={NUM}>+91 {fmtPhone(phone)}</Txt>
            <Link label="Change" color={C.saffron} onPress={() => { setStep('phone'); setErr('') }} />
          </View><View style={{ marginTop: SP.l, marginHorizontal: -(PAD + 4) }}><LoginStory W={W} H={Math.round(storyH * 0.8)} /></View></>
          : step === 'about' ? <><T1>What should we call you?</T1><T2>Your name helps your washer say hello</T2></>
          : step === 'choose' ? <><T1>How do you want your car washed?</T1><T2>You can change this any time</T2></>
          : step === 'car' ? <><T1>Tell us about your car</T1><T2>{mode === 'monthly' ? "And where it sleeps, so we can start tomorrow morning" : 'And where to find it when you book a wash'}</T2></>
          : <><T1>{`Pick a plan for your ${su.model}`}</T1><T2>Pay after the first wash. Change any time. WD Pro and above can pause up to a week a month</T2></>}
      </FadeUp>
    </View>
  );

  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: C.brandDeep }}>
        <BrandBg />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: kb }}>
            <View style={{ width: W, flexGrow: 1 }}>
              {top}
              {step === 'phone' ? <View style={{ flex: 1, minHeight: 56 }} /> : null}
              <Sheet delay={intro ? 1100 : 140} style={step === 'phone' ? { marginTop: SP.s } : { marginTop: SP.s, flexGrow: 1 }}>
                <View style={{ paddingHorizontal: PAD + 4, paddingTop: SP.xl, paddingBottom: SP.xl + Math.max(ins.bottom, SP.s) }}>
                  <FadeUp key={step} distance={10} duration={260}>{card}</FadeUp>
                </View>
              </Sheet>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {intro ? <Reanimated.View pointerEvents="none" exiting={FadeOut.delay(300).duration(500)} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}><Splash still /></Reanimated.View> : null}
      </View>
    </InkContext.Provider>
  );
}

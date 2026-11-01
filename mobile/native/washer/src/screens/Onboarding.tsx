// First-run onboarding: once per phone number, right after the OTP and before join / wait / the round.
// Language -> location (+ "Allow all the time" on Android) -> notifications -> battery (Android) -> partner steps.
// Permission screens have no Skip, but a "no" never blocks: the washer is told what will not work and goes on.
// In demo mode and on the web preview every permission call is skipped and the flow just moves on.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Image, Linking, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bubbles, Button, F, Field, Float, Icon, LinkButton, Pressy, Pulse, Rise, brand, lightTokens, sheet, ui, useReducedMotion, useTheme,
  type IconName,
} from '../ui';
import { act, onboardPhone, REAL, S, useStore, watchDocs, type LangPref } from '../state/store';
import { setupWashAlerts } from '../lib/washAlerts';
import { t } from '../lib/i18n';
import { LANGS } from '../lib/langs';
import { DocsPanel, docsSummary } from './DocsUpload';

const L = lightTokens;
const GUT = 20;
const ND = Platform.OS !== 'web';
// real permission prompts only in the installed live app; demo and the web preview just move on
const PERMS = REAL && Platform.OS !== 'web';
const WASHER_IMG = require('../../assets/img/washer.webp');

/** Where the referral code typed in onboarding is kept (this phone only, per washer number; no backend yet). */
export const referralKey = () => 'wd-referral:' + onboardPhone();

type StepKey = 'lang' | 'loc' | 'notif' | 'battery' | 'partner';

/* ---------------- shared pieces ---------------- */
const Title = ({ children }: { children: string }) => (
  <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 30, lineHeight: 32, textTransform: 'uppercase', letterSpacing: 0.3, color: L.fg }}>{children}</Text>
);
const Body = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={[{ fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: '#3B2C55', marginTop: 8 }, style]}>{children}</Text>
);
function Note({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'info' }) {
  const warn = tone === 'warn';
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: warn ? 'rgba(232,56,79,0.09)' : 'rgba(84,9,218,0.08)', borderWidth: 1.5, borderColor: warn ? 'rgba(232,56,79,0.35)' : 'rgba(84,9,218,0.25)' }}>
      <Icon name={warn ? 'warn' : 'help'} size={20} color={warn ? brand.red : brand.violet} />
      <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: L.fg }}>{children}</Text>
    </View>
  );
}

/** One onboarding screen: an illustration on violet, then the cream panel with the words and the buttons at the bottom. */
function Frame({ art, title, text, body, actions, sheetLook }: {
  art: React.ReactNode; title: string; text: string; body?: React.ReactNode; actions: React.ReactNode; sheetLook?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const artH = Math.round(Math.max(170, Math.min(270, height * 0.3)));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: artH, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{art}</View>
      <View style={{ flex: 1, backgroundColor: L.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: sheetLook ? 10 : 26, paddingHorizontal: GUT, paddingBottom: 18 + insets.bottom }}>
        {sheetLook ? <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: L.line, alignSelf: 'center', marginBottom: 16 }} /> : null}
        <Rise delay={80}>
          <Title>{title}</Title>
          <Body>{text}</Body>
          {body}
        </Rise>
        <View style={{ flex: 1, minHeight: 20 }} />
        <Rise delay={180}>{actions}</Rise>
      </View>
    </View>
  );
}

/** A gold disc with an ink rim: the middle of every illustration. */
function Disc({ size = 116, children }: { size?: number; children?: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.gold, borderWidth: 3, borderColor: brand.ink, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 6px 0px ${brand.ink}` }}>
      {children}
    </View>
  );
}
/** A small cream tag that floats beside an illustration. */
function Tag({ children, style, phase = 0 }: { children: React.ReactNode; style: object; phase?: number }) {
  return (
    <View style={[{ position: 'absolute' }, style]}>
      <Float amp={5} period={2800} phase={phase}>
        <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: brand.cream, borderWidth: 2, borderColor: brand.ink }}>
          <Text style={{ fontFamily: F.black, fontSize: 14, color: brand.ink }}>{children}</Text>
        </View>
      </Float>
    </View>
  );
}

/* ---------------- illustrations ---------------- */
function LangArt() {
  return (
    <View style={{ width: 240, height: 170, alignItems: 'center', justifyContent: 'center' }}>
      <Float amp={4} period={3600}><Disc><Icon name="globe" size={56} color={brand.ink} /></Disc></Float>
      <Tag style={{ left: 8, top: 14 }}>अ आ</Tag>
      <Tag style={{ right: 10, top: 30 }} phase={500}>Aa</Tag>
      <Tag style={{ left: 18, bottom: 10 }} phase={900}>ਪੰ</Tag>
      <Tag style={{ right: 20, bottom: 4 }} phase={1300}>த</Tag>
    </View>
  );
}
function LocArt() {
  return (
    <View style={{ width: 240, height: 170, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={150} />
      <Float amp={6} period={2400}><Disc size={108}><Icon name="pin" size={52} color={brand.ink} /></Disc></Float>
      <Tag style={{ right: 0, top: 12 }} phase={400}>{t('🚗 2 min door')}</Tag>
    </View>
  );
}
function NotifArt() {
  return (
    <View style={{ width: 240, height: 170, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={146} color={brand.cream} period={1800} />
      <Disc size={108}><Float amp={1.5} period={700} sway={12}><Text style={{ fontSize: 50, lineHeight: 60 }}>🔔</Text></Float></Disc>
      <Tag style={{ left: 0, top: 10 }} phase={300}>{t('🔊 Awaaz alert')}</Tag>
      <Tag style={{ right: 0, bottom: 8 }} phase={900}>{t('⚡ Extra kaam')}</Tag>
    </View>
  );
}
function BatteryArt() {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { a.setValue(1); return }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      Animated.delay(900),
      Animated.timing(a, { toValue: 0.35, duration: 0, useNativeDriver: ND }),
    ]));
    l.start();
    return () => l.stop();
  }, [rm, a]);
  const H = 112;
  return (
    <View style={{ width: 240, height: 170, alignItems: 'center', justifyContent: 'center' }}>
      <Float amp={4} period={3000}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 26, height: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: brand.ink }} />
          <View style={{ width: 70, height: H, borderRadius: 16, borderWidth: 4, borderColor: brand.ink, backgroundColor: brand.cream, overflow: 'hidden', boxShadow: `0px 6px 0px ${brand.ink}` }}>
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H, backgroundColor: brand.mint, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [H * 0.8, 0] }) }] }} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 34 }}>⚡</Text></View>
          </View>
        </View>
      </Float>
      <Tag style={{ left: 0, top: 20 }} phase={500}>{t('Background ✓')}</Tag>
    </View>
  );
}
function WasherArt({ size }: { size: number }) {
  return (
    <View style={{ width: size + 80, height: size + 30, alignItems: 'center', justifyContent: 'center' }}>
      <Bubbles width={size + 80} height={size + 30} count={9} />
      <Float amp={6} period={2600} sway={2}>
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.gold, borderWidth: 3, borderColor: brand.ink, overflow: 'hidden', boxShadow: `0px 6px 0px ${brand.ink}` }}>
          <Image source={WASHER_IMG} accessibilityLabel={t('Washing Daddy washer')} resizeMode="cover" style={{ position: 'absolute', left: 0, top: size * 0.06, width: '100%', height: '100%' }} />
        </View>
      </Float>
      <View style={{ position: 'absolute', right: 6, bottom: 4 }}>
        <Float amp={4} period={2200} phase={600}><Text style={{ fontSize: 30 }}>🧽</Text></Float>
      </View>
    </View>
  );
}

/* ---------------- 1. language ---------------- */
function LangStep({ next }: { next: () => void }) {
  const cur: LangPref = S.lang_pref || S.lang || 'hinglish';
  return (
    <Frame
      art={<LangArt />}
      title={t('Apni bhasha chuniye')}
      text={t('App kis bhasha mein chahiye? Baad mein Profile se badal sakte hain.')}
      body={
        <>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 16 }}>
            {LANGS.map(l => {
              const on = l.code === cur;
              return (
                <View key={l.code} style={{ width: '48.5%' }}><Pressy scaleTo={0.95} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={l.label + ', ' + l.sub}
                  onPress={() => { ui.haptic(6); act.setLangPref(l.code) }}
                  style={{ minHeight: 66, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, borderWidth: 2.5, borderColor: on ? brand.violet : brand.ink, backgroundColor: on ? brand.violet : '#fff', justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bold, fontSize: 17, color: on ? brand.cream : L.fg }}>{l.label}</Text>
                    {on ? <Icon name="check" size={16} color={brand.gold} /> : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 11.5, color: on ? 'rgba(255,246,233,0.8)' : L.fg3 }}>{t(l.sub)}</Text>
                </Pressy></View>
              );
            })}
          </View>
        </>
      }
      actions={<Button label={t('Aage badhein')} iconRight="arrow" variant="violet" onPress={() => { if (!S.lang_pref) act.setLangPref(cur); next() }} />}
    />
  );
}

/* ---------------- 2. location ---------------- */
async function requestBackground() {
  try { const Location = await import('expo-location'); await Location.requestBackgroundPermissionsAsync() } catch (e) { console.warn('background location', e) }
}
function SheetText({ title, text }: { title: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 22, lineHeight: 28, color: c.fg, letterSpacing: -0.3 }}>{title}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: c.fg2, marginTop: 6 }}>{text}</Text>
    </View>
  );
}
function BgSheet({ onGo }: { onGo: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.tile, borderWidth: 2, borderColor: brand.violet }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 6, borderColor: brand.violet }} />
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>Allow all the time</Text>
        </View>
      </View>
      <SheetText title={t("Ab 'Allow all the time' chuniye")} text={t("Agle page pe Location mein 'Allow all the time' chuniye. Isse app band hone par bhi customer aapko raaste mein dekh payenge.")} />
      <Button label={t('Theek hai, settings kholo')} iconRight="arrow" variant="violet" onPress={onGo} />
    </View>
  );
}
function LocStep({ next }: { next: () => void }) {
  const [phase, setPhase] = useState<'ask' | 'bg' | 'denied'>('ask');
  const [busy, setBusy] = useState(false);
  const askBg = () => sheet.open(close => <BgSheet onGo={() => { close(); void requestBackground().then(next) }} />);
  const ask = async () => {
    if (busy) return;
    if (!PERMS) { next(); return }
    setBusy(true);
    try {
      const Location = await import('expo-location');
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') { setPhase('denied'); return }
      if (Platform.OS !== 'android') { next(); return }
      const b = await Location.getBackgroundPermissionsAsync();
      if (b.status === 'granted') { next(); return }
      setPhase('bg'); askBg();
    } catch (e) { console.warn('location permission', e); setPhase('denied') }
    finally { setBusy(false) }
  };
  return (
    <Frame
      art={<LocArt />}
      title={t('Location chalu karein')}
      text={t('Jab aap customer ki gaadi ki taraf jaate hain, customer aapko map pe raaste mein dekh paata hai. Isliye location chahiye.')}
      body={phase === 'denied' ? <Note>{t('Location band hai. Customer aapko raaste mein nahi dekh payenge. Baad mein phone ki Settings se chalu kar sakte hain.')}</Note> : null}
      actions={phase === 'denied' ? (
        <>
          <Button label={t('Phir bhi aage badhein')} iconRight="arrow" variant="violet" onPress={next} />
          <View style={{ alignItems: 'center' }}><LinkButton label={t('Settings kholein')} color={L.fg2} onPress={() => { Linking.openSettings().catch(() => {}) }} /></View>
        </>
      ) : phase === 'bg' ? (
        <Button label={t("'Allow all the time' chuniye")} iconRight="arrow" variant="violet" onPress={askBg} />
      ) : (
        <Button label={busy ? t('Ek second…') : t('Location allow karein')} icon={busy ? undefined : 'pin'} variant="violet" disabled={busy} onPress={ask} />
      )}
    />
  );
}

/* ---------------- 3. notifications ---------------- */
function NotifStep({ next }: { next: () => void }) {
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    if (busy) return;
    if (!PERMS) { next(); return }
    setBusy(true);
    const ok = await setupWashAlerts();   // notifications + exact alarms
    setBusy(false);
    if (ok) next(); else setDenied(true);
  };
  return (
    <Frame
      art={<NotifArt />}
      title={t('Alerts chalu karein')}
      text={t('Wash ke har step pe awaaz mein bataya jayega, aur naya extra kaam aate hi alert aayega. Phone band ho tab bhi.')}
      body={denied ? <Note>{t('Notification band hai, isliye awaaz alerts aur extra kaam ke alerts kaam nahi karenge. Baad mein phone ki Settings se chalu kar sakte hain.')}</Note> : null}
      actions={denied ? (
        <>
          <Button label={t('Phir bhi aage badhein')} iconRight="arrow" variant="violet" onPress={next} />
          <View style={{ alignItems: 'center' }}><LinkButton label={t('Settings kholein')} color={L.fg2} onPress={() => { Linking.openSettings().catch(() => {}) }} /></View>
        </>
      ) : (
        <Button label={busy ? t('Ek second…') : t('Alerts allow karein')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={ask} />
      )}
    />
  );
}

/* ---------------- 4. battery (Android only) ---------------- */
function BatteryStep({ next }: { next: () => void }) {
  const allow = async () => {
    // same page as the profile tab's "Awaaz alerts pakke chalein" row
    if (PERMS) await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings().catch(() => {}));
    next();
  };
  return (
    <Frame
      sheetLook
      art={<BatteryArt />}
      title={t('Battery ki fikar nahi')}
      text={t('Washing Daddy app background mein chalega, lekin aapki battery khatam nahi karega')}
      body={<Note tone="info">{t('Agle page pe WD Partner chuniye aur "Don\'t optimise" ya "No restrictions" kar dijiye, taaki awaaz alerts time pe aayein.')}</Note>}
      actions={<Button label={t('Allow')} icon="check" variant="violet" onPress={allow} />}
    />
  );
}

/* ---------------- 5. partner steps ---------------- */
type Tone = 'ok' | 'wait' | 'todo' | 'off';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(20,192,138,0.18)', fg: '#0b8a62' },
  wait: { bg: 'rgba(255,186,8,0.28)', fg: '#8a6200' },
  todo: { bg: 'rgba(255,106,26,0.15)', fg: '#c94d0c' },
  off: { bg: 'rgba(26,10,51,0.07)', fg: 'rgba(26,10,51,0.56)' },
};
function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  const c = TONES[tone];
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', marginTop: 8, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: c.bg }}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 17, color: c.fg }}>{label}</Text>
    </View>
  );
}
function StepCard({ n, title, sub, chip, done, muted, onPress }: {
  n: number; title: string; sub: string; chip: { label: string; tone: Tone }; done?: boolean; muted?: boolean; onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? brand.mint : muted ? 'rgba(26,10,51,0.08)' : brand.ink }}>
        {done ? <Icon name="check" size={20} color="#fff" /> : <Text style={{ fontFamily: F.black, fontSize: 17, color: muted ? L.fg3 : brand.gold }}>{n}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: muted ? L.fg3 : L.fg }}>{title}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: L.fg3 }}>{sub}</Text>
        <StatusChip {...chip} />
      </View>
      {onPress ? <Icon name="arrow" size={20} color={L.fg3} /> : null}
    </>
  );
  const st = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, padding: 14, borderRadius: 20, backgroundColor: muted ? 'rgba(255,255,255,0.55)' : '#fff',
    borderWidth: 2, borderColor: muted ? L.line : done ? brand.mint : brand.ink, borderStyle: muted ? ('dashed' as const) : ('solid' as const),
  };
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.98} accessibilityLabel={title + '. ' + chip.label} style={st}>{inner}</Pressy>;
  return <View accessible accessibilityLabel={title + '. ' + chip.label} style={st}>{inner}</View>;
}

function openDocsSheet() { sheet.open(close => <DocsSheet close={close} />) }
function DocsSheet({ close }: { close: () => void }) {
  return (
    <View>
      <SheetText title={t('Aadhaar aur PAN')} text={t('Dono taraf Aadhaar aur PAN ki saaf photo ya PDF bhejo. Team check karke verify karegi.')} />
      <DocsPanel reopen={openDocsSheet} />
      <View style={{ height: 14 }} />
      <Button label={t('Theek hai')} variant="violet" onPress={close} />
    </View>
  );
}
function ReferralSheet({ close, onSaved, initial }: { close: () => void; onSaved: (c: string) => void; initial: string }) {
  const { c } = useTheme();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const save = async () => {
    const code = v.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^WD\d{5}$/.test(code)) { setErr(t('Code aisa hota hai: WD12345')); ui.haptic(14); return }
    try { await AsyncStorage.setItem(referralKey(), code) } catch { /* stays for this session */ }
    onSaved(code); ui.haptic([10, 30, 10]); ui.toast(t('Code save ho gaya, bonus jaldi milega')); close();
  };
  return (
    <View>
      <SheetText title={t('Referral code daalein')} text={t('Kisi dost ne Washing Daddy ke baare mein bataya? Unka code daalein.')} />
      <Field value={v} onChangeText={x => { setV(x); setErr('') }} autoFocus maxLength={7} autoCapitalize="characters" autoComplete="off" autoCorrect={false}
        placeholder={t('Jaise: WD12345')} onSubmitEditing={save} accessibilityLabel={t('Referral code daalein')} />
      {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 13.5, color: brand.red, marginTop: 8 }}>{err}</Text> : null}
      <View style={{ height: 14 }} />
      <Button label={t('Code save karein')} variant="violet" onPress={save} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Band karo')} color={c.fg2} onPress={close} /></View>
    </View>
  );
}

function PartnerStep() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(referralKey()).then(v => { if (alive && v) setCode(v) }).catch(() => {});
    watchDocs();   // so the chip shows what is already uploaded
    return () => { alive = false };
  }, []);
  useStore();
  const { label: docLabel, tone } = docsSummary();
  const finish = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try { await act.finishOnboarding(); ui.haptic([20, 50, 20]); ui.confetti(0.5) }
    catch (e: any) { setBusy(false); setErr(e?.hi ? t(e.hi) : t('Nahi gaya. Internet dekh ke dobara try karo.')) }
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: 'center', paddingTop: 4 }}><WasherArt size={128} /></View>
      <View style={{ flex: 1, backgroundColor: L.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 24, paddingHorizontal: GUT, paddingBottom: 18 + insets.bottom }}>
        <Rise delay={60}>
          <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 28, lineHeight: 31, textTransform: 'uppercase', color: L.fg }}>{t('Washing Daddy partner banein, sirf 3 aasaan steps mein')}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: L.fg3, marginTop: 4 }}>{t('Become a Washing Daddy partner in 3 easy steps')}</Text>
        </Rise>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Rise delay={140}>
            <StepCard n={1} done title={t('Kaam ki settings')} sub={t('Bhasha aur permissions')} chip={{ label: t('Ho gaya'), tone: 'ok' }} />
          </Rise>
          <Rise delay={220}>
            <StepCard n={2} title={t('Profile')} sub={t('Aadhaar aur PAN ki details')} chip={{ label: docLabel, tone }}
              onPress={openDocsSheet} />
          </Rise>
          <Rise delay={300}>
            <StepCard n={3} muted title={t('Joining fee bharein')} sub={t('Partner joining fee')} chip={{ label: t('Washing duty ke liye lagu nahi'), tone: 'off' }} />
          </Rise>
        </View>
        <Rise delay={380}>
          <Pressy scaleTo={0.98} accessibilityLabel={t('Referral code daalein')}
            onPress={() => sheet.open(close => <ReferralSheet close={close} initial={code} onSaved={setCode} />)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(84,9,218,0.07)', borderWidth: 1.5, borderColor: 'rgba(84,9,218,0.25)' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: code ? brand.mint : brand.violet }}>
              <Icon name={(code ? 'check' : 'user') as IconName} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: L.fg }}>{t('Referral code daalein')}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12.5, color: L.fg3 }}>{code ? code + ' · ' + t('Code save ho gaya, bonus jaldi milega') : t('Kisi dost ne bheja? Unka code yahan')}</Text>
            </View>
            <Icon name="plus" size={18} color={brand.violet} />
          </Pressy>
        </Rise>
        <View style={{ flex: 1, minHeight: 18 }} />
        {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 13.5, color: brand.red, marginBottom: 10 }}>{err}</Text> : null}
        <Rise delay={440}>
          <Button label={busy ? t('Ek second…') : t('Aage badhein')} iconRight={busy ? undefined : 'arrow'} variant="violet" disabled={busy} onPress={finish} />
          {err ? <View style={{ alignItems: 'center' }}><LinkButton label={t('Number badlo')} color={L.fg2} onPress={() => act.backToPhone()} /></View> : null}
        </Rise>
      </View>
    </View>
  );
}

/* ---------------- progress ---------------- */
function Progress({ i, n, onBack }: { i: number; n: number; onBack?: () => void }) {
  const p = useRef(new Animated.Value(i)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) { p.setValue(i); return }
    Animated.timing(p, { toValue: i, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [i, rm, p]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUT, paddingTop: 10, paddingBottom: 6, minHeight: 56 }}>
      {onBack ? (
        <Pressy onPress={onBack} scaleTo={0.9} accessibilityLabel={t('Peeche')} hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,246,233,0.14)' }}>
          <Icon name="back" size={22} color={brand.cream} />
        </Pressy>
      ) : <View style={{ width: 40, height: 40 }} />}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: n, now: i + 1 }} style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: n }, (_, k) => (
          <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,246,233,0.22)', overflow: 'hidden' }}>
            <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: brand.gold, width: p.interpolate({ inputRange: [k - 1, k], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
          </View>
        ))}
      </View>
      <Text style={{ fontFamily: F.black, fontSize: 13, color: brand.cream, minWidth: 30, textAlign: 'right' }}>{i + 1}/{n}</Text>
    </View>
  );
}

/* ---------------- screen ---------------- */
export default function Onboarding() {
  useStore();   // the language can change on the first screen
  const insets = useSafeAreaInsets();
  const steps = useMemo<StepKey[]>(() => ['lang', 'loc', 'notif', ...(Platform.OS === 'android' ? ['battery' as const] : []), 'partner'], []);
  const [i, setI] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const go = (d: number) => {
    setI(x => Math.max(0, Math.min(steps.length - 1, x + d)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  // Android back: one screen back instead of closing the app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (i > 0) { go(-1); return true } return false });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  const key = steps[i];
  const next = () => go(1);
  return (
    <View style={{ flex: 1, backgroundColor: brand.ink2, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: brand.violet }}>
        <View style={{ height: insets.top }} />
        <Progress i={i} n={steps.length} onBack={i > 0 ? () => go(-1) : undefined} />
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <Rise key={key} distance={24} duration={420} style={{ flex: 1 }}>
            {key === 'lang' ? <LangStep next={next} />
              : key === 'loc' ? <LocStep next={next} />
              : key === 'notif' ? <NotifStep next={next} />
              : key === 'battery' ? <BatteryStep next={next} />
              : <PartnerStep />}
          </Rise>
        </ScrollView>
      </View>
    </View>
  );
}

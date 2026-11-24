// First-run onboarding: once per phone number, right after the OTP and before join / wait / the round.
// Language -> location (+ "Allow all the time" on Android) -> notifications -> battery (Android) -> partner steps.
// Permission screens have no Skip, but a "no" never blocks: the washer is told what will not work and goes on.
// In demo mode and on the web preview every permission call is skipped and the flow just moves on.
// Customer Permissions look: violet brand top with a big circular illustration and a headline with one saffron word,
// a white radius-24 sheet rising from the bottom with the choices, the 56px violet Cta and the links.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  F, Field, Float, Icon, Pressy, Pulse, Rise, brand, cardShadow, sheet, ui, useReducedMotion, useTheme,
  type IconName,
} from '../ui';
import { act, onboardPhone, REAL, S, useStore, watchDocs, type LangPref } from '../state/store';
import { setupWashAlerts } from '../lib/washAlerts';
import { t } from '../lib/i18n';
import { LANGS } from '../lib/langs';
import { Cta, DocsPanel, docsSummary } from './DocsUpload';
/** Ask for 'Allow all the time' location. Off: the app only uses location while it is open (matches the manifest). */
const BG_LOCATION = false;

const SAFFRON = '#FFBA08';
const LINE = 'rgba(84,9,218,0.18)';
const ND = Platform.OS !== 'web';
// real permission prompts only in the installed live app; demo and the web preview just move on
const PERMS = REAL && Platform.OS !== 'web';
const WASHER_IMG = require('../../assets/img/washer.webp');

/** Where the referral code typed in onboarding is kept (this phone only, per washer number; no backend yet). */
export const referralKey = () => 'wd-referral:' + onboardPhone();

type StepKey = 'lang' | 'loc' | 'notif' | 'battery' | 'partner';

/* ---------------- shared pieces ---------------- */
/** Violet gradient + soft glows behind the whole screen (customer BrandBg, drawn with react-native-svg). */
function BrandBg() {
  const { dark } = useTheme();
  const [box, setBox] = useState({ w: 390, h: 844 });
  return (
    <View pointerEvents="none" onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={StyleSheet.absoluteFill}>
      <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="wob" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dark ? '#241A40' : '#E3D8FF'} /><Stop offset="1" stopColor={dark ? '#1A1330' : '#F7F3FF'} />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={box.w} height={box.h} fill="url(#wob)" />
        <Circle cx={box.w + 10} cy={50} r={130} fill="#5409DA" fillOpacity={0.05} />
      </Svg>
    </View>
  );
}
const SheetText = ({ title, text }: { title: string; text: string }) => {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 28, color: c.fg }}>{title}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2, marginTop: 4 }}>{text}</Text>
    </View>
  );
};
function TextLink({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} accessibilityRole="link" scaleTo={0.97} hitSlop={12}
      style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 15, color: color ?? c.primary }}>{label}</Text>
    </Pressy>
  );
}
function Note({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'info' }) {
  const { c } = useTheme();
  const warn = tone === 'warn';
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: warn ? 'rgba(220,38,38,0.08)' : c.inputBg }}>
      <Icon name={warn ? 'warn' : 'help'} size={20} color={warn ? brand.red : c.primary} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: c.fg }}>{children}</Text>
    </View>
  );
}

/** Headline with one saffron word: `hl` when the (translated) title still contains it, otherwise the last word. */
function Headline({ title, hl, size = 30 }: { title: string; hl?: string; size?: number }) {
  const { c } = useTheme();
  const at = hl && title.includes(hl) ? title.indexOf(hl) : title.lastIndexOf(' ') + 1;
  const len = hl && title.includes(hl) ? hl.length : title.length - at;
  const base = { fontFamily: F.bold, fontSize: size, lineHeight: Math.round(size * 1.27), textAlign: 'center' as const };
  return (
    <Text accessibilityRole="header" accessibilityLabel={title} style={[base, { color: c.fg }]}>
      {title.slice(0, at)}<Text style={{ color: c.primary }}>{title.slice(at, at + len)}</Text>{title.slice(at + len)}
    </Text>
  );
}

/** One onboarding screen: violet top (illustration, headline, words), white sheet with the choices and the buttons. */
function Frame({ art, title, hl, text, body, actions, headSize, compact }: {
  art: React.ReactNode; title: string; hl?: string; text: string; body?: React.ReactNode; actions: React.ReactNode; headSize?: number; compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, minHeight: compact ? 0 : 200, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 0, paddingBottom: compact ? 16 : 24 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>{art}</View>
        <Rise delay={80} style={{ marginTop: 12, alignItems: 'center' }}>
          <Headline title={title} hl={hl} size={headSize} />
          <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: c.fg3, textAlign: 'center', marginTop: 8, maxWidth: 340 }}>{text}</Text>
        </Rise>
      </View>
      <Rise delay={140} distance={48} duration={380}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: compact ? 20 : 24, paddingBottom: Math.max(insets.bottom, 12) + 16,
          ...(Platform.OS === 'web' ? ({ boxShadow: '0px -6px 20px rgba(84,9,218,0.10)' } as any) : { shadowColor: '#5409DA', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 12 }) }}>
          {body}
          {actions}
        </View>
      </Rise>
    </View>
  );
}

/** The middle of every illustration: a white disc inside a soft translucent ring (customer Permissions). */
function Disc({ size = 116, children }: { size?: number; children?: React.ReactNode }) {
  const r = size + 36;
  return (
    <View style={{ width: r, height: r, borderRadius: r / 2, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}
/** A small white tag that floats beside an illustration. */
function Tag({ children, style, phase = 0 }: { children: React.ReactNode; style: object; phase?: number }) {
  return (
    <View style={[{ position: 'absolute' }, style]}>
      <Float amp={5} period={2800} phase={phase}>
        <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff', ...(Platform.OS === 'web' ? ({ boxShadow: '0px 4px 14px rgba(26,6,80,0.25)' } as any) : { shadowColor: '#1A0650', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }) }}>
          <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 20, color: '#1A1033' }}>{children}</Text>
        </View>
      </Float>
    </View>
  );
}

/* ---------------- illustrations ---------------- */
function LangArt() {
  return (
    <View style={{ width: 260, height: 132, alignItems: 'center', justifyContent: 'center' }}>
      <Float amp={4} period={3600}><Disc size={72}><Icon name="globe" size={38} color={brand.violet} /></Disc></Float>
      <Tag style={{ left: 8, top: 8 }}>अ आ</Tag>
      <Tag style={{ right: 10, top: 24 }} phase={500}>Aa</Tag>
      <Tag style={{ left: 18, bottom: 6 }} phase={900}>ਪੰ</Tag>
      <Tag style={{ right: 20, bottom: 0 }} phase={1300}>த</Tag>
    </View>
  );
}
function LocArt() {
  return (
    <View style={{ width: 260, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={176} color="#FFFFFF" />
      <Float amp={6} period={2400}><Disc size={108}><Icon name="pin" size={52} color={brand.violet} /></Disc></Float>
      <Tag style={{ right: 0, top: 22 }} phase={400}>{t('🚗 2 min door')}</Tag>
    </View>
  );
}
function NotifArt() {
  return (
    <View style={{ width: 260, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={176} color="#FFFFFF" period={1800} />
      <Disc size={108}><Float amp={1.5} period={700} sway={12}><Text style={{ fontSize: 50, lineHeight: 60 }}>🔔</Text></Float></Disc>
      <Tag style={{ left: 0, top: 20 }} phase={300}>{t('🔊 Awaaz alert')}</Tag>
      <Tag style={{ right: 0, bottom: 18 }} phase={900}>{t('⚡ Extra kaam')}</Tag>
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
  const H = 80;
  return (
    <View style={{ width: 260, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Float amp={4} period={3000}>
        <Disc size={132}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 20, height: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: brand.violet }} />
          <View style={{ width: 52, height: H, borderRadius: 14, borderWidth: 4, borderColor: brand.violet, backgroundColor: '#fff', overflow: 'hidden' }}>
            <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H, backgroundColor: brand.mint, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [H * 0.8, 0] }) }] }} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>⚡</Text></View>
          </View>
        </View>
        </Disc>
      </Float>
      <Tag style={{ left: 0, top: 30 }} phase={500}>{t('Background ✓')}</Tag>
    </View>
  );
}
function WasherArt({ size }: { size: number }) {
  return (
    <View style={{ width: size + 80, height: size + 30, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse size={size + 6} color="#FFFFFF" />
      <Float amp={6} period={2600} sway={2}>
        <View style={{ width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ECECEF', overflow: 'hidden', borderWidth: 3, borderColor: '#fff' }}>
          <Image source={WASHER_IMG} accessibilityLabel={t('Washing Daddy washer')} resizeMode="cover" style={{ position: 'absolute', left: 0, top: size * 0.06, width: '100%', height: '100%' }} />
        </View>
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
  const { c } = useTheme();
  const cur: LangPref = S.lang_pref || S.lang || 'hinglish';
  return (
    <Frame
      compact
      art={<LangArt />}
      title={t('Apni bhasha chuniye')}
      text={t('App kis bhasha mein chahiye? Baad mein Profile se badal sakte hain.')}
      body={
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 16 }}>
          {LANGS.map(l => {
            const on = l.code === cur;
            return (
              <View key={l.code} style={{ width: '48.5%' }}><Pressy scaleTo={0.96} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={l.label + ', ' + l.sub}
                onPress={() => { ui.haptic(6); act.setLangPref(l.code) }}
                style={[{ minHeight: 60, paddingVertical: 8, paddingLeft: 14, paddingRight: 10, borderRadius: 16, backgroundColor: c.card, borderWidth: 1.5, borderColor: on ? c.primary : LINE, flexDirection: 'row', alignItems: 'center', gap: 8 }, cardShadow(c)]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, color: c.fg }}>{l.label}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{t(l.sub)}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? c.primary : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={14} color="#fff" /> : null}
                </View>
              </Pressy></View>
            );
          })}
        </View>
      }
      actions={<Cta label={t('Aage badhein')} arrow onPress={() => { if (!S.lang_pref) act.setLangPref(cur); next() }} />}
    />
  );
}

/* ---------------- 2. location ---------------- */
async function requestBackground() {
  try { const Location = await import('expo-location'); await Location.requestBackgroundPermissionsAsync() } catch (e) { console.warn('background location', e) }
}
function BgSheet({ onGo }: { onGo: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.inputBg, borderWidth: 2, borderColor: brand.violet }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 6, borderColor: brand.violet }} />
          <Text style={{ fontFamily: F.semi, fontSize: 15, color: c.fg }}>Allow all the time</Text>
        </View>
      </View>
      <SheetText title={t("Ab 'Allow all the time' chuniye")} text={t("Agle page pe Location mein 'Allow all the time' chuniye. Isse app band hone par bhi customer aapko raaste mein dekh payenge.")} />
      <Cta label={t('Theek hai, settings kholo')} arrow onPress={onGo} />
    </View>
  );
}
function LocStep({ next }: { next: () => void }) {
  const { c: c2 } = useTheme();
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
      // Play release: no background location (the tracking is not built, and Play needs a declaration + video for it)
      if (Platform.OS !== 'android' || !BG_LOCATION) { next(); return }
      const b = await Location.getBackgroundPermissionsAsync();
      if (b.status === 'granted') { next(); return }
      setPhase('bg'); askBg();
    } catch (e) { console.warn('location permission', e); setPhase('denied') }
    finally { setBusy(false) }
  };
  return (
    <Frame
      art={<LocArt />}
      title={t('Location chalu karein')} hl="Location"
      text={t('Jab aap customer ki gaadi ki taraf jaate hain, customer aapko map pe raaste mein dekh paata hai. Isliye location chahiye.')}
      body={phase === 'denied' ? <Note>{t('Location band hai. Customer aapko raaste mein nahi dekh payenge. Baad mein phone ki Settings se chalu kar sakte hain.')}</Note> : null}
      actions={phase === 'denied' ? (
        <>
          <Cta label={t('Phir bhi aage badhein')} arrow onPress={next} />
          <TextLink label={t('Settings kholein')} color={c2.primary} onPress={() => { Linking.openSettings().catch(() => {}) }} />
        </>
      ) : phase === 'bg' ? (
        <Cta label={t("'Allow all the time' chuniye")} arrow onPress={askBg} />
      ) : (
        <Cta label={busy ? t('Ek second…') : t('Location allow karein')} icon="pin" busy={busy} onPress={ask} />
      )}
    />
  );
}

/* ---------------- 3. notifications ---------------- */
function NotifStep({ next }: { next: () => void }) {
  const { c: c2 } = useTheme();
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
      title={t('Alerts chalu karein')} hl="Alerts"
      text={t('Wash ke har step pe awaaz mein bataya jayega, aur naya extra kaam aate hi alert aayega. Phone band ho tab bhi.')}
      body={denied ? <Note>{t('Notification band hai, isliye awaaz alerts aur extra kaam ke alerts kaam nahi karenge. Baad mein phone ki Settings se chalu kar sakte hain.')}</Note> : null}
      actions={denied ? (
        <>
          <Cta label={t('Phir bhi aage badhein')} arrow onPress={next} />
          <TextLink label={t('Settings kholein')} color={c2.primary} onPress={() => { Linking.openSettings().catch(() => {}) }} />
        </>
      ) : (
        <Cta label={busy ? t('Ek second…') : t('Alerts allow karein')} arrow busy={busy} onPress={ask} />
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
      art={<BatteryArt />}
      title={t('Battery ki fikar nahi')} hl="Battery"
      text={t('Washing Daddy app background mein chalega, lekin aapki battery khatam nahi karega')}
      body={<Note tone="info">{t('Agle page pe WD Partner chuniye aur "Don\'t optimise" ya "No restrictions" kar dijiye, taaki awaaz alerts time pe aayein.')}</Note>}
      actions={<Cta label={t('Allow')} icon="check" onPress={allow} />}
    />
  );
}

/* ---------------- 5. partner steps ---------------- */
type Tone = 'ok' | 'wait' | 'todo' | 'off';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(22,163,74,0.12)', fg: '#15803d' },
  wait: { bg: 'rgba(84,9,218,0.08)', fg: '#5409DA' },
  todo: { bg: 'rgba(84,9,218,0.08)', fg: '#5409DA' },
  off: { bg: 'rgba(17,17,20,0.06)', fg: '#6B6483' },
};
function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  const c = TONES[tone];
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', marginTop: 6, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.bg }}>
      <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: c.fg }}>{label}</Text>
    </View>
  );
}
/** A row card on the white sheet: canvas fill, round number / check tile, chevron when it opens something. */
function StepCard({ n, title, sub, chip, done, muted, onPress }: {
  n: number; title: string; sub: string; chip: { label: string; tone: Tone }; done?: boolean; muted?: boolean; onPress?: () => void;
}) {
  const { c } = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: muted ? 0.7 : 1 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.ok : muted ? 'rgba(84,9,218,0.08)' : c.primary }}>
        {done ? <Icon name="check" size={20} color="#fff" /> : <Text style={[{ fontFamily: F.bold, fontSize: 16, color: muted ? c.fg3 : '#fff' }, { fontVariant: ['tabular-nums'] }]}>{n}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 16, color: muted ? c.fg3 : c.fg }}>{title}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3 }}>{sub}</Text>
        <StatusChip {...chip} />
      </View>
      {onPress ? <Icon name="chevron" size={20} color={c.fg3} /> : null}
    </View>
  );
  const box = { padding: 12, borderRadius: 16, backgroundColor: c.inputBg } as const;
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.98} accessibilityLabel={title + '. ' + chip.label} style={box}>{inner}</Pressy>;
  return <View accessible accessibilityLabel={title + '. ' + chip.label} style={box}>{inner}</View>;
}

function openDocsSheet() { sheet.open(close => <DocsSheet close={close} />) }
function DocsSheet({ close }: { close: () => void }) {
  return (
    <View>
      <SheetText title={t('Aadhaar aur PAN')} text={t('Dono taraf Aadhaar aur PAN ki saaf photo ya PDF bhejo. Team check karke verify karegi.')} />
      <DocsPanel reopen={openDocsSheet} />
      <View style={{ height: 14 }} />
      <Cta label={t('Theek hai')} onPress={close} />
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
      {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.medium, fontSize: 13, color: '#dc2626', marginTop: 8 }}>{err}</Text> : null}
      <View style={{ height: 14 }} />
      <Cta label={t('Code save karein')} onPress={save} />
      <View style={{ alignItems: 'center' }}><TextLink label={t('Band karo')} onPress={close} /></View>
    </View>
  );
}

function PartnerStep() {
  const { c } = useTheme();
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
  const openRef = () => sheet.open(close => <ReferralSheet close={close} initial={code} onSaved={setCode} />);
  return (
    <Frame
      compact
      headSize={22}
      art={<WasherArt size={72} />}
      title={t('Washing Daddy partner banein, sirf 3 aasaan steps mein')} hl="partner"
      text={t('Become a Washing Daddy partner in 3 easy steps')}
      body={
        <View style={{ gap: 10, marginBottom: 16 }}>
          <Rise delay={200}>
            <StepCard n={1} done title={t('Kaam ki settings')} sub={t('Bhasha aur permissions')} chip={{ label: t('Ho gaya'), tone: 'ok' }} />
          </Rise>
          <Rise delay={260}>
            <StepCard n={2} title={t('Profile')} sub={t('Aadhaar aur PAN ki details')} chip={{ label: docLabel, tone }}
              onPress={openDocsSheet} />
          </Rise>
          <Rise delay={320}>
            <StepCard n={3} muted title={t('Joining fee bharein')} sub={t('Partner joining fee')} chip={{ label: t('Washing duty ke liye lagu nahi'), tone: 'off' }} />
          </Rise>
          <Rise delay={380}>
            <Pressy scaleTo={0.98} accessibilityLabel={t('Referral code daalein')} onPress={openRef}
              style={{ padding: 14, borderRadius: 16, backgroundColor: c.inputBg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: code ? c.ok : 'rgba(84,9,218,0.08)' }}>
                  <Icon name={(code ? 'check' : 'gift') as IconName} size={20} color={code ? '#fff' : c.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 15, color: c.fg }}>{t('Referral code daalein')}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{code ? code + ' · ' + t('Code save ho gaya, bonus jaldi milega') : t('Kisi dost ne bheja? Unka code yahan')}</Text>
                </View>
                <Icon name="chevron" size={20} color={c.fg3} />
              </View>
            </Pressy>
          </Rise>
        </View>
      }
      actions={
        <>
          {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.medium, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{err}</Text> : null}
          <Cta label={busy ? t('Ek second…') : t('Aage badhein')} arrow busy={busy} onPress={finish} />
          {err ? <TextLink label={t('Number badlo')} onPress={() => act.backToPhone()} /> : null}
        </>
      }
    />
  );
}

/* ---------------- progress ---------------- */
/** Back button, one thin saffron bar that fills as the steps go, and "2/5", all on the violet top. */
function Progress({ i, n, onBack }: { i: number; n: number; onBack?: () => void }) {
  const { c } = useTheme();
  const p = useRef(new Animated.Value(i + 1)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) { p.setValue(i + 1); return }
    Animated.timing(p, { toValue: i + 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [i, rm, p]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, minHeight: 60 }}>
      {onBack ? (
        <Pressable accessibilityLabel={t('Peeche')} accessibilityRole="button" onPress={onBack} hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(84,9,218,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} color={c.primary} />
        </Pressable>
      ) : <View style={{ width: 44, height: 44 }} />}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: n, now: i + 1 }} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(84,9,218,0.14)', overflow: 'hidden' }}>
        <Animated.View style={{ height: 4, borderRadius: 2, backgroundColor: c.primary, width: p.interpolate({ inputRange: [0, n], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg, minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{i + 1}/{n}</Text>
    </View>
  );
}

/* ---------------- screen ---------------- */
export default function Onboarding() {
  useStore();   // the language can change on the first screen
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: c.stage, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: c.card }}>
        <BrandBg />
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

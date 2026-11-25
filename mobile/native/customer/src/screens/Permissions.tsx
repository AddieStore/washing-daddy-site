/* One-time welcome after the first sign-in: "Setting things up for you…", the notifications primer, then why we use location and the system
   dialog (location step is skipped when it was already decided). Photos and camera are asked on use. */
import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { C, SP, InkContext, creamInk } from '../theme';
import { Txt, useInsets, PAD } from '../ui/kit';
import { Pressable3, FadeUp, loaderT0 } from '../ui/motion';
import { SetupScreen, NotifPrimer } from '../ui/welcomeNotif';
import { GenericArt } from '../art/generic';
import { BrandBg, Sheet } from '../ui/Brand';
import { Check } from '../ui/icons';

const KEY = 'wd-perm-primer-v2';
const INK = '#1A1033', SEC = '#4F4766';
const seen = () => AsyncStorage.setItem(KEY, '1').catch(() => {});

/** true only once: never shown again after it was answered */
export async function needsPrimer(): Promise<boolean> {
  try { return !(await AsyncStorage.getItem(KEY)) } catch { return false }
}
async function locUndecided() {
  try { const p = await Location.getForegroundPermissionsAsync(); return !p.granted && p.canAskAgain } catch { return false }
}
// no notifications module is bundled: Android 13+ asks through RN itself, elsewhere the tap just moves on
async function askNotifications() {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
  } catch {}
}

const WHY = [
  ['Your pin at the door', 'We drop the map pin where you are parked.'],
  ['Only while you use it', 'Never in the background, never shared.'],
  ['Your choice', 'You can add your address by hand instead.'],
];

export default function Permissions({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<'setup' | 'notif' | 'loc'>('setup');
  const [busy, setBusy] = useState(false);
  // the spinner screen is the "arriving" beat: it waits for the location loader overlay (which sits above it) to fade, then shows ~1s
  useEffect(() => {
    const end = Math.max(Date.now() + 1000, loaderT0 ? loaderT0 + 2700 + 1000 : 0);
    const t = setTimeout(() => setStage('notif'), end - Date.now());
    return () => clearTimeout(t);
  }, []);
  const done = async () => { await seen(); onDone() };
  const toLoc = async () => { if (await locUndecided()) setStage('loc'); else done() };
  const allowNotif = async () => { setBusy(true); await askNotifications(); setBusy(false); toLoc() };
  const wrap = (k: string, el: React.ReactNode) => (
    <InkContext.Provider value={creamInk}>
      <Animated.View key={k} entering={FadeIn.duration(320)} style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: C.page }]}>{el}</Animated.View>
    </InkContext.Provider>
  );
  if (stage === 'setup') return wrap('setup', <SetupScreen />);
  if (stage === 'notif') return wrap('notif', <NotifPrimer onAllow={allowNotif} onSkip={toLoc} busy={busy} />);
  return <LocationPrimer onDone={done} />;
}
function LocationPrimer({ onDone: done }: { onDone: () => void }) {
  const ins = useInsets();
  const allow = async () => {
    try { await Location.requestForegroundPermissionsAsync() } catch {}
    done();
  };
  return (
    <InkContext.Provider value={creamInk}>
      <Animated.View entering={FadeIn.duration(320)} style={[StyleSheet.absoluteFill, { backgroundColor: C.page, zIndex: 100, alignItems: 'center' }]}>
        <View style={{ flex: 1, width: '100%', maxWidth: 440 }}>
          <View style={{ flex: 1, paddingHorizontal: PAD + 4, paddingTop: ins.top + SP.xl, justifyContent: 'center' }}>
            <FadeUp style={{ alignItems: 'center' }}>
              <View style={{ width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(84,9,218,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><GenericArt size={120} icon="car" accent={C.violet} /></View>
              </View>
            </FadeUp>
            <FadeUp delay={80}>
              <Txt weight={700} size={30} color={INK} style={{ lineHeight: 38, textAlign: 'center', marginTop: SP.xl }}>Find you <Txt weight={700} size={30} color={C.violet}>faster</Txt></Txt>
              <Txt size={15} color={SEC} style={{ lineHeight: 22, textAlign: 'center', marginTop: SP.s }}>Allow location so our washer can reach your parking spot without a phone call.</Txt>
            </FadeUp>
          </View>
          <Sheet style={{ shadowOpacity: 0.08 }}>
            <View style={{ paddingHorizontal: PAD + 4, paddingTop: SP.xl, paddingBottom: Math.max(ins.bottom, SP.l) + SP.l }}>
              {WHY.map((w, i) => (
                <View key={w[0]} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: SP.m }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center' }}><Check size={18} color={C.violet} strokeWidth={2} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt weight={600} size={15} color={INK}>{w[0]}</Txt>
                    <Txt size={13} color={SEC} style={{ marginTop: 2, lineHeight: 18 }}>{w[1]}</Txt>
                  </View>
                </View>
              ))}
              <Pressable3 onPress={allow} accessibilityRole="button" style={{ minHeight: 56, borderRadius: 16, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center', marginTop: SP.l, shadowColor: C.violet, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
                <Txt weight={600} size={16} color="#fff">Allow location</Txt>
              </Pressable3>
              <Pressable3 onPress={done} accessibilityRole="button" haptics={false} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: SP.s }}>
                <Txt weight={600} size={15} color={C.violet}>Not now</Txt>
              </Pressable3>
            </View>
          </Sheet>
        </View>
      </Animated.View>
    </InkContext.Provider>
  );
}

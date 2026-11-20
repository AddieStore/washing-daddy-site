/* One-time primer after the first sign-in: why we use location, then the system dialog. Photos and camera are asked on use. */
import { Platform, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { C, SP, InkContext, creamInk } from '../theme';
import { Txt, useInsets, PAD } from '../ui/kit';
import { Pressable3, FadeUp } from '../ui/motion';
import { GenericArt } from '../art/generic';
import { BrandBg, Sheet } from '../ui/Brand';
import { Check } from '../ui/icons';

const KEY = 'wd-perm-primer-v1';
const INK = '#1A1033', SEC = '#4F4766';
const seen = () => AsyncStorage.setItem(KEY, '1').catch(() => {});

/** true only once: never shown again after it was answered, and skipped when location is already decided */
export async function needsPrimer(): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(KEY)) return false;
    const p = await Location.getForegroundPermissionsAsync();
    if (p.granted || !p.canAskAgain) { await seen(); return false }
    return true;
  } catch { return false }
}

const WHY = [
  ['Your pin at the door', 'We drop the map pin where you are parked.'],
  ['Only while you use it', 'Never in the background, never shared.'],
  ['Your choice', 'You can add your address by hand instead.'],
];

export default function Permissions({ onDone }: { onDone: () => void }) {
  const ins = useInsets();
  const done = async () => { await seen(); onDone() };
  const allow = async () => {
    try { await Location.requestForegroundPermissionsAsync() } catch {}
    done();
  };
  return (
    <InkContext.Provider value={creamInk}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.brandDeep, zIndex: 100, alignItems: 'center' }]}>
        <BrandBg />
        <View style={{ flex: 1, width: '100%', maxWidth: 440 }}>
          <View style={{ flex: 1, paddingHorizontal: PAD + 4, paddingTop: ins.top + SP.xl, justifyContent: 'center' }}>
            <FadeUp style={{ alignItems: 'center' }}>
              <View style={{ width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><GenericArt size={120} icon="car" accent={C.violet} /></View>
              </View>
            </FadeUp>
            <FadeUp delay={80}>
              <Txt weight={700} size={30} color="#fff" style={{ lineHeight: 38, textAlign: 'center', marginTop: SP.xl }}>Find you <Txt weight={700} size={30} color={C.saffron}>faster</Txt></Txt>
              <Txt size={15} color="rgba(255,255,255,0.86)" style={{ lineHeight: 22, textAlign: 'center', marginTop: SP.s }}>Allow location so our washer can reach your parking spot without a phone call.</Txt>
            </FadeUp>
          </View>
          <Sheet>
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
      </View>
    </InkContext.Provider>
  );
}

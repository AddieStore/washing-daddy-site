/* One-time primer after the first sign-in: why we use location, then the system dialog. Photos and camera are asked on use. */
import { Platform, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { C, SP, InkContext, creamInk } from '../theme';
import { Txt, useInsets, PAD } from '../ui/kit';
import { Pressable3, FadeUp } from '../ui/motion';
import { GenericArt } from '../art/generic';

const KEY = 'wd-perm-primer-v1';
const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5';
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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', zIndex: 100, alignItems: 'center' }]}>
        <View style={{ flex: 1, width: '100%', maxWidth: 440, paddingHorizontal: PAD, paddingTop: ins.top + SP.section, paddingBottom: Math.max(ins.bottom, SP.l) + SP.l }}>
          <View style={{ flex: 1 }}>
            <FadeUp style={{ alignItems: 'center' }}><GenericArt size={150} icon="car" accent={C.violet} /></FadeUp>
            <FadeUp delay={80}>
              <Txt weight={500} size={24} color={INK} style={{ lineHeight: 32, textAlign: 'center', marginTop: SP.xl }}>Find you faster</Txt>
              <Txt size={14} color={SEC} style={{ lineHeight: 20, textAlign: 'center', marginTop: SP.s }}>Allow location so our washer can reach your parking spot without a phone call.</Txt>
            </FadeUp>
            <FadeUp delay={160} style={{ marginTop: SP.xl, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: '#fff', overflow: 'hidden' }}>
              {WHY.map((w, i) => (
                <View key={w[0]} style={{ padding: SP.l, borderTopWidth: i ? 1 : 0, borderTopColor: LINE, backgroundColor: i % 2 ? '#fff' : RAISED }}>
                  <Txt weight={500} size={14} color={INK}>{w[0]}</Txt>
                  <Txt size={12} color={MUTED} style={{ marginTop: 2, lineHeight: 16 }}>{w[1]}</Txt>
                </View>
              ))}
            </FadeUp>
          </View>
          <Pressable3 onPress={allow} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={500} size={15} color="#fff">Allow location</Txt>
          </Pressable3>
          <Pressable3 onPress={done} accessibilityRole="button" haptics={false} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: SP.s }}>
            <Txt weight={500} size={14} color={C.violet}>Not now</Txt>
          </Pressable3>
        </View>
      </View>
    </InkContext.Provider>
  );
}

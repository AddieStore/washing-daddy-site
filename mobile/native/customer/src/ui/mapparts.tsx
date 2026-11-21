// Map + address pieces (W3): the centre pin that lifts while the map is dragged and drops with a bounce, the dark tooltip bubble,
// the "Current location" pill, the confirm-sheet distance warning, and the form field with a violet focus glow.
import React, { ReactNode, useEffect, useState } from 'react';
import { View, TextInput, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, cancelAnimation, useReducedMotion, interpolate } from 'react-native-reanimated';
import { Txt } from './kit';
import { Pressable3 } from './motion';
import { Locate, Pin, Home, User } from './icons';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, F } from '../theme';

const INK = '#171717', SUB = '#525252', MUTE = '#737373', LINE = 'rgba(23,23,23,0.12)';
const BUBBLE = '#171717';

/** Centre pin: lifts 16px (shadow shrinks and fades) while `moving`, drops with a bounce when the map rests. Bubble text follows the state. */
export function MapPin({ moving, title, hint = 'Move pin to your exact location', lead }: { moving: boolean; title: string; hint?: string; lead?: string }) {
  const rm = useReducedMotion(), lift = useSharedValue(moving ? 1 : 0), pop = useSharedValue(0);
  useEffect(() => {
    if (rm) { lift.value = moving ? 1 : 0; return }
    lift.value = moving ? withSpring(1, { damping: 16, stiffness: 380, mass: 0.6 }) : withSpring(0, { damping: 6, stiffness: 300, mass: 0.7 });
    if (!moving) pop.value = withSpring(1, { damping: 9, stiffness: 300, mass: 0.6 }, () => { pop.value = 0 });
  }, [moving]);
  const halo = useSharedValue(0);
  useEffect(() => { cancelAnimation(halo); halo.value = 0; if (!moving && !rm) halo.value = withRepeat(withTiming(1, { duration: 1000 }), -1, false) }, [moving]);
  const haloSt = useAnimatedStyle(() => ({ opacity: moving ? 0 : 0.35 * (1 - halo.value), transform: [{ scale: 0.6 + halo.value }] }));
  const pinSt = useAnimatedStyle(() => ({ transform: [{ translateY: -18 * lift.value }, { scaleY: 1 + 0.06 * lift.value }] }));
  const shSt = useAnimatedStyle(() => ({ opacity: interpolate(lift.value, [0, 1], [0.28, 0.1]), transform: [{ scaleX: interpolate(lift.value, [0, 1], [1, 0.55]) }] }));
  const bubSt = useAnimatedStyle(() => ({ transform: [{ translateY: -18 * lift.value }, { scale: 1 + 0.04 * pop.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Reanimated.View style={[{ position: 'absolute', left: '50%', marginLeft: -22, top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: C.violet }, haloSt]} />
      <Reanimated.View style={[{ position: 'absolute', left: '50%', marginLeft: -11, top: '50%', marginTop: -4, width: 22, height: 8, borderRadius: 11, backgroundColor: '#000' }, shSt]} />
      <View style={{ position: 'absolute', left: '50%', marginLeft: -110, width: 220, bottom: '50%', marginBottom: -2, alignItems: 'center' }}>
        <Reanimated.View style={[{ alignItems: 'center' }, bubSt]}>
          <View style={{ backgroundColor: BUBBLE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', maxWidth: 220 }}>
            {moving ? <Txt weight={500} size={12} color="#fff">{hint}</Txt>
              : <>{lead ? <Txt size={11} color="rgba(255,255,255,0.7)">{lead}</Txt> : null}<Txt weight={500} size={12} color="#fff" numberOfLines={1}>{title}</Txt></>}
          </View>
          <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: BUBBLE }} />
        </Reanimated.View>
        <Reanimated.View style={pinSt}><Pin size={42} color={C.violet} strokeWidth={1.6} /></Reanimated.View>
      </View>
    </View>
  );
}

/** "Current location" pill, bottom-right above the sheet */
export function LocatePill({ onPress, busy, label = 'Current location', style }: { onPress: () => void; busy?: boolean; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable3 onPress={onPress} accessibilityLabel={label} scaleTo={0.95}
      style={[{ position: 'absolute', right: 16, bottom: 36, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: 'rgba(84,9,218,0.25)', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, style]}>
      <Locate size={18} color={C.violet} strokeWidth={1.6} /><Txt weight={500} size={13} color={C.violet}>{busy ? 'Finding you…' : label}</Txt>
    </Pressable3>
  );
}

/** "Your current location is 2.1 km away" */
export const farText = (m: number) => `Your current location is ${m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1) + ' km'} away`;
export function FarNote({ meters }: { meters: number | null }) {
  const rm = useReducedMotion(), v = useSharedValue(0), on = meters != null && meters > 300;
  useEffect(() => { v.value = rm ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 220 }) }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, maxHeight: v.value * 44, marginBottom: v.value * 10 }));
  return <Reanimated.View style={[{ overflow: 'hidden' }, st]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFF4D6' }}>
      <Locate size={15} color="#8A5A00" strokeWidth={1.6} /><Txt size={12} color="#8A5A00" style={{ flex: 1 }}>{meters != null ? farText(meters) : ''}</Txt>
    </View>
  </Reanimated.View>;
}

/** outlined field: label on top, typed text below; focus = violet border + soft violet glow (animated) */
export function GlowField({ label, value, onChange, readOnly, keyboardType, prefix, right, maxLength, autoCapitalize, hint, style }:
  { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; keyboardType?: any; prefix?: string; right?: ReactNode; maxLength?: number; autoCapitalize?: any; hint?: string; style?: StyleProp<ViewStyle> }) {
  const rm = useReducedMotion(), f = useSharedValue(0), [on, setOn] = useState(false);
  const set = (b: boolean) => { setOn(b); f.value = rm ? (b ? 1 : 0) : withTiming(b ? 1 : 0, { duration: 160 }) };
  const box = useAnimatedStyle(() => ({ borderColor: f.value > 0.5 ? C.violet : LINE, shadowOpacity: 0.28 * f.value, shadowRadius: 2 + 8 * f.value }));
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Txt weight={500} size={12} color={on ? C.violet : SUB} style={{ marginBottom: 6 }}>{label}</Txt>
      <Reanimated.View style={[{ minHeight: 50, borderRadius: 12, borderWidth: 1.5, backgroundColor: readOnly ? '#F4F4F5' : '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', shadowColor: C.violet, shadowOffset: { width: 0, height: 0 } },
        box]}>
        {prefix ? <Txt size={15} color={INK} style={{ marginRight: 8 }}>{prefix}</Txt> : null}
        <TextInput value={value} editable={!readOnly} onChangeText={onChange} onFocus={() => set(true)} onBlur={() => set(false)} keyboardType={keyboardType} maxLength={maxLength} autoCapitalize={autoCapitalize}
          accessibilityLabel={label} placeholderTextColor={MUTE}
          style={[{ flex: 1, minWidth: 0, fontFamily: F.b500, fontSize: 15, color: readOnly ? MUTE : INK, paddingVertical: 12, includeFontPadding: false, textAlignVertical: 'center' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
        {right}
      </Reanimated.View>
      {hint ? <Txt size={12} color={MUTE} style={{ marginTop: 6 }}>{hint}</Txt> : null}
    </View>
  );
}

/** Save-as chip with icon; selected = violet outline + tint, springs on press */
export function SaveChip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon: ReactNode }) {
  return (
    <Pressable3 onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: on ? 1.5 : 1, borderColor: on ? C.violet : LINE, backgroundColor: on ? 'rgba(84,9,218,0.08)' : '#fff' }}>
      {icon}<Txt weight={on ? 600 : 500} size={14} color={on ? C.violet : INK}>{label}</Txt>
    </Pressable3>
  );
}

/** briefcase icon for "Work" (icons.tsx is not ours) */
export function Briefcase({ size = 18, color = INK, strokeWidth = 1.6 }: { size?: number; color?: string; strokeWidth?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="7" width="18" height="13" rx="2.5" /><Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" /></Svg>;
}
export const labelIcon = (l: string, color: string) => l === 'Home' ? <Home size={18} color={color} strokeWidth={1.6} /> : l === 'Work' ? <Briefcase size={18} color={color} /> : l === 'Parents' ? <User size={18} color={color} strokeWidth={1.6} /> : <Pin size={18} color={color} strokeWidth={1.6} />;

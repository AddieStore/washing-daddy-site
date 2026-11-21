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

/** Centre pin, drawn like a real pin (a lollipop): a violet label, a thin stem, and a ring dot that marks the exact spot.
    While the map is dragged the head lifts 10px off the ground (the ground shadow stays and shrinks), the label reads
    "Move pin to your exact location"; when the map rests it drops with a small bounce and the label shows the place name.
    A soft violet halo breathes under the dot while at rest. */
export function MapPin({ moving, title, hint = 'Move pin to your exact location', lead, off }: { moving: boolean; title: string; hint?: string; lead?: string; off?: boolean }) {
  const rm = useReducedMotion(), lift = useSharedValue(moving ? 1 : 0), halo = useSharedValue(0);
  useEffect(() => {
    lift.value = rm ? (moving ? 1 : 0) : moving ? withSpring(1, { damping: 18, stiffness: 360, mass: 0.6 }) : withSpring(0, { damping: 9, stiffness: 320, mass: 0.6 });
    cancelAnimation(halo); halo.value = 0;
    if (!moving && !rm) halo.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [moving]);
  const tone = off ? '#8E8E96' : C.violet;
  const haloSt = useAnimatedStyle(() => ({ opacity: moving ? 0 : 0.22 * (1 - halo.value), transform: [{ scale: 0.4 + 1.1 * halo.value }] }));
  const headSt = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * lift.value }] }));
  const shSt = useAnimatedStyle(() => ({ opacity: interpolate(lift.value, [0, 1], [0.18, 0.1]), transform: [{ scaleX: interpolate(lift.value, [0, 1], [1, 0.6]) }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* halo + ground shadow sit exactly on the map point */}
      <Reanimated.View style={[{ position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: tone }, haloSt]} />
      <Reanimated.View style={[{ position: 'absolute', left: '50%', top: '50%', marginLeft: -7, marginTop: -2.5, width: 14, height: 5, borderRadius: 7, backgroundColor: '#000' }, shSt]} />
      <View style={{ position: 'absolute', left: '50%', marginLeft: -130, width: 260, bottom: '50%', marginBottom: -7, alignItems: 'center' }}>
        <Reanimated.View style={[{ alignItems: 'center' }, headSt]}>
          <View style={{ backgroundColor: tone, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 240, alignItems: 'center',
            shadowColor: tone, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
            {moving ? <Txt weight={500} size={12} color="#fff">{hint}</Txt>
              : <>{lead ? <Txt size={10} color="rgba(255,255,255,0.75)">{lead}</Txt> : null}<Txt weight={500} size={12} color="#fff" numberOfLines={1}>{title}</Txt></>}
          </View>
          <View style={{ width: 2, height: 16, backgroundColor: tone, borderBottomLeftRadius: 1, borderBottomRightRadius: 1 }} />
          {/* ring dot: white centre, violet ring; its centre is the exact point when resting */}
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3.5, borderColor: tone, marginTop: -1 }} />
        </Reanimated.View>
      </View>
    </View>
  );
}

/** "Current location" chip, bottom-right above the sheet: plain white, soft shadow, no outline */
export function LocatePill({ onPress, busy, label = 'Current location', style }: { onPress: () => void; busy?: boolean; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable3 onPress={onPress} accessibilityLabel={label} scaleTo={0.96}
      style={[{ position: 'absolute', right: 16, bottom: 36, height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6,
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 3 }, style]}>
      <Locate size={16} color={C.violet} strokeWidth={1.8} /><Txt weight={500} size={12} color={INK}>{busy ? 'Finding you…' : label}</Txt>
    </Pressable3>
  );
}

/** "Your current location is 2.1 km away" */
export const farText = (m: number) => `Your current location is ${m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1) + ' km'} away`;
/** a thin violet-tint strip that slides in on top of the confirm sheet */
export function FarNote({ meters, text }: { meters: number | null; text?: string }) {
  const rm = useReducedMotion(), v = useSharedValue(0), on = !!text || (meters != null && meters > 300);
  useEffect(() => { v.value = rm ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 200 }) }, [on]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, maxHeight: v.value * 34 }));
  return <Reanimated.View style={[{ overflow: 'hidden' }, st]}>
    <View style={{ height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4EFFF' }}>
      <Txt weight={500} size={12} color={C.violet}>{text || (meters != null ? farText(meters) : '')}</Txt>
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

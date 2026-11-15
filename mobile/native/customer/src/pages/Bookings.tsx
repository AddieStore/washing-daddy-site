// Bookings: Upcoming / Previous, empty state, cards with services, price, saved, duration, washer and an editable star rating.
// The Washes tab (screens/Live.tsx) renders <BookingsBody tab />; the `bookings` page wraps it with a back bar. OWNER: BOOKINGS worker.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView, RefreshControl, Animated, Easing, Platform } from 'react-native';
import Svg, { Rect, Path, Circle as SCircle } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Help as HelpIc, Pin } from '../ui/icons';
import { FadeUp } from '../ui/motion';
import { useApp, act, bookingsView, jobTitle, canRate, openPage, closePage, toast, Job } from '../state';
import { sheets } from '../sheets';
import { inr, fmt, iso, TODAY } from '../data/dates';
import { slotLabel } from '../state';
import { G, card, Tap, TNUM, PAGE_BG } from './parts';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, useReducedMotion } from 'react-native-reanimated';
import { Stars, durText, washerImg, washerSub, STATUS_TEXT, dayLabel, openRateSheet } from '../sheets/bookings';

const ND = Platform.OS !== 'web';
const slotText = (j: Job) => (j.slot ? (/^\d\d:\d\d$/.test(j.slot) ? slotLabel(j.slot) : j.slot) : j.mode === 'instant' ? 'Instant' : '');
export const ACTIVE: Job['status'][] = ['assigned', 'on_the_way', 'in_progress'];
/** washer is (or will be) travelling: the live map applies */
export const trackable = (j: Job) => ACTIVE.includes(j.status) || (j.mode === 'instant' && j.status === 'upcoming');

/* ---------- skeleton (opacity pulse while the list loads) ---------- */
function Bone({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: any }) {
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }), Animated.timing(v, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND })])); a.start(); return () => a.stop(); }, []);
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: '#EDEDEF', opacity: v }, style]} />;
}
export function ListSkeleton() {
  return (
    <View style={{ gap: 16, marginTop: 20 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ marginLeft: 24 }}>
          <Bone w={70} h={12} style={{ marginBottom: 8 }} />
          <View style={card({ padding: 16 })}>
            <Bone w="62%" h={18} /><Bone w="45%" h={12} style={{ marginTop: 10 }} />
            <View style={{ marginTop: 14, backgroundColor: G.raised, borderRadius: 10, padding: 8, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Bone w={48} h={48} r={6} /><View style={{ gap: 8 }}><Bone w={110} h={14} /><Bone w={70} h={10} /></View></View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ---------- empty state: a violet calendar, no stock art ---------- */
function EmptyArt() {
  return (
    <Svg width={132} height={132} viewBox="0 0 132 132">
      <Rect x={20} y={28} width={92} height={86} rx={16} fill="#F1EAFE" />
      <Rect x={20} y={28} width={92} height={26} rx={16} fill={C.violet} />
      <Rect x={20} y={42} width={92} height={12} fill={C.violet} />
      <Rect x={40} y={16} width={8} height={22} rx={4} fill="#fff" stroke={C.violet} strokeWidth={3} />
      <Rect x={84} y={16} width={8} height={22} rx={4} fill="#fff" stroke={C.violet} strokeWidth={3} />
      <SCircle cx={66} cy={84} r={20} fill="#fff" stroke={C.violet} strokeWidth={4} />
      <Path d="M57 84l7 7 12-14" stroke={C.violet} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/* ---------- one booking card ---------- */
export function JobCard({ j, onPress }: { j: Job; onPress: () => void }) {
  const prev = !['upcoming', 'assigned', 'on_the_way', 'in_progress'].includes(j.status), done = j.status === 'done', gone = j.status === 'cancelled';
  const tone = gone ? G.neg : done ? G.pos : C.violet;
  return (
    <Tap onPress={onPress} style={card({ padding: 16 })}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Txt weight={500} size={17} style={{ flex: 1 }}>{jobTitle(j)}</Txt>
        {!done ? <View style={{ backgroundColor: gone ? 'rgba(220,38,38,0.08)' : 'rgba(84,9,218,0.08)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 1 }}><Txt weight={500} size={12} color={tone}>{STATUS_TEXT[j.status]}</Txt></View> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
        <Txt size={13} color={G.sub} style={TNUM}>{inr(j.total)}</Txt>
        {j.saved > 0 && !gone ? <Txt size={13} color={G.pos} style={TNUM}>{`  •  ${inr(j.saved)} saved`}</Txt> : null}
        <Txt size={13} color={G.sub} style={TNUM}>{`  •  ${durText(j.mins)}`}</Txt>
      </View>
      {j.washer || !gone ? (
        <View style={{ marginTop: 12, backgroundColor: G.raised, borderRadius: 10, padding: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {j.washer ? <Image source={washerImg(j)} resizeMode="cover" accessibilityLabel={`Photo of ${j.washer.name}`} style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: '#fff' }} /> : <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Pin size={20} color={G.mute} strokeWidth={1.5} /></View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={14} numberOfLines={1}>{j.washer ? j.washer.name : 'Washer not assigned yet'}</Txt>
              <Txt size={12} color={G.mute} style={{ marginTop: 2 }} numberOfLines={1}>{j.washer ? washerSub(j) : 'We assign one before your slot'}</Txt>
            </View>
          </View>
          {done ? (
            <View style={{ borderTopWidth: 1, borderColor: G.line, marginTop: 8, paddingTop: 8, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={13} color={G.sub}>Service rating</Txt>
              <Stars n={j.stars || 0} size={22} gap={6} onPick={n => (canRate(j) ? openRateSheet(j.id, n) : toast('You can rate once the wash is done'))} />
            </View>
          ) : trackable(j) ? (
            <Tap onPress={() => sheets.track(j.id)} style={{ borderTopWidth: 1, borderColor: G.line, marginTop: 8, paddingTop: 8, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={13} color={G.sub}>Washer</Txt><Txt weight={500} size={13} color={C.violet}>Track live</Txt>
            </Tap>
          ) : null}
        </View>
      ) : (
        <Txt size={12} color={G.mute} style={{ marginTop: 8 }}>{j.pay === 'refunded' ? `${inr(j.total)} refunded to WD Money` : 'Cancelled'}</Txt>
      )}
    </Tap>
  );
}

/* ---------- the list with its Upcoming / Previous switch ---------- */
/* Upcoming / Previous switch: the violet thumb springs across */
function SegSwitch({ value, onChange }: { value: 'up' | 'prev'; onChange: (v: 'up' | 'prev') => void }) {
  const [w, setW] = useState(0), rm = useReducedMotion(), x = useSharedValue(value === 'up' ? 0 : 1);
  useEffect(() => { x.value = rm ? (value === 'up' ? 0 : 1) : withSpring(value === 'up' ? 0 : 1, { damping: 17, stiffness: 220, mass: 0.8 }) }, [value, rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w / 2 - 4) }] }));
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 999, padding: 4, height: 48, shadowColor: '#1A1033', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      {w ? <Reanimated.View style={[{ position: 'absolute', left: 4, top: 4, bottom: 4, width: w / 2 - 4, borderRadius: 999, backgroundColor: C.violet }, st]} /> : null}
      {([['up', 'Upcoming'], ['prev', 'Previous']] as const).map(([k, l]) => (
        <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: value === k }} accessibilityLabel={l} onPress={() => onChange(k)} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
          <Txt weight={value === k ? 600 : 500} size={14} color={value === k ? '#fff' : G.sub}>{l}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

export function BookingsBody({ tab: isTab }: { tab?: boolean }) {
  const ui = useApp(), ins = useInsets(), ref = useRef<any>(null), { upcoming, previous } = bookingsView();
  const [seg, setSeg] = useState<'up' | 'prev'>('up'), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }); }, [ui.tabNonce]);
  const list = seg === 'up' ? upcoming : previous;
  const refresh = async () => { setRefreshing(true); try { await act.refresh(); } catch (e: any) { toast(e.message || 'Could not refresh'); } setRefreshing(false); };
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <View style={{ paddingTop: isTab ? Math.max(ins.top, 24) : ins.top + 8, paddingBottom: 8, paddingHorizontal: isTab ? 16 : 8, flexDirection: 'row', alignItems: 'center', minHeight: 64 }}>
        {isTab ? null : <Tap label="Back" onPress={closePage} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Back size={18} color={G.ink} strokeWidth={1.5} /></Tap>}
        <Txt weight={600} size={isTab ? 22 : 17} style={{ flex: 1 }}>My bookings</Txt>
        <Tap label="Help" onPress={() => openPage({ k: 'help' })} style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: G.line, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', marginRight: isTab ? 0 : 8 }}>
          <HelpIc size={18} color={G.mute} strokeWidth={1.5} /><Txt weight={500} size={14}>Help</Txt>
        </Tap>
      </View>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.violet} colors={[C.violet]} />} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: isTab ? 128 : 48 }}>
        <SegSwitch value={seg} onChange={setSeg} />
        {loading ? <ListSkeleton /> : list.length ? (
          <View style={{ marginTop: 8 }}>
            <View pointerEvents="none" style={{ position: 'absolute', left: 7, top: 22, bottom: 24, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,23,23,0.18)' }} />
            {list.map((j, i) => (
              <FadeUp key={seg + j.id} index={i}>
                <View style={{ marginTop: 16, marginBottom: 8, marginLeft: 24 }}>
                  <View style={{ position: 'absolute', left: -24, top: 2, width: 15, height: 15, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: j.status === 'cancelled' ? '#D4D4D8' : C.violet }} />
                  <Txt weight={500} size={13}>{dayLabel(j.date)}</Txt>
                  <Txt size={12} color={G.mute} style={TNUM}>{slotText(j) || ' '}</Txt>
                </View>
                <View style={{ marginLeft: 24 }}><JobCard j={j} onPress={() => openPage({ k: 'booking', id: j.id })} /></View>
              </FadeUp>
            ))}
          </View>
        ) : (
          <FadeUp><View style={{ alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 }}>
            <EmptyArt />
            <Txt weight={500} size={17} style={{ marginTop: 16 }}>No bookings found</Txt>
            <Txt size={13} color={G.sub} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>{seg === 'up' ? 'Book a car wash from Home and it shows up here.' : 'Your finished washes show up here.'}</Txt>
          </View></FadeUp>
        )}
      </ScrollView>
    </View>
  );
}

export default function Bookings() { return <BookingsBody />; }

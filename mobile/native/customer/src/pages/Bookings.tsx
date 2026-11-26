// Bookings: Upcoming / Previous, empty state, cards with services, price, saved, duration, washer and an editable star rating.
// The Washes tab (screens/Live.tsx) renders <BookingsBody tab />; the `bookings` page wraps it with a back bar. OWNER: BOOKINGS worker.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView, RefreshControl, Animated, Easing, Platform } from 'react-native';
import Svg, { Rect, Path, Circle as SCircle } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Footer } from '../ui/Footer';
import { Back, Help as HelpIc, Pin } from '../ui/icons';
import { FadeUp, Shimmer } from '../ui/motion';
import { JobRider, showsRider, showsCode, StartCode } from '../ui/JobRider';
import { carryNote, washNotices, A, car, doc, history7, liveHead, activeStage, feature, useApp, act, bookingsView, jobTitle, canRate, openPage, closePage, toast, Job } from '../state';
import { sheets } from '../sheets';
import { dayPhotos } from '../sheets/DaySheet';
import { src as imgSrc } from '../img';
import { inr, fmt, iso, TODAY, ampm } from '../data/dates';
import { slotLabel } from '../state';
import { G, card, Tap, TNUM, PAGE_BG } from './parts';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, cancelAnimation, useReducedMotion } from 'react-native-reanimated';
import { Stars, durText, washerImg, washerSub, STATUS_TEXT, dayLabel, openRateSheet } from '../sheets/bookings';
import { useActive } from '../ui/active';

const ND = Platform.OS !== 'web';
const slotText = (j: Job) => (j.slot ? (/^\d\d:\d\d$/.test(j.slot) ? slotLabel(j.slot) : j.slot) : j.mode === 'instant' ? 'Instant' : '');
export const ACTIVE: Job['status'][] = ['assigned', 'on_the_way', 'in_progress'];
/** washer is (or will be) travelling: the live map applies */
export const trackable = (j: Job) => ACTIVE.includes(j.status) || (j.mode === 'instant' && j.status === 'upcoming');

/* ---------- skeleton (opacity pulse while the list loads) ---------- */
function Bone({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: any }) { return <Shimmer width={w} height={h} radius={r} style={style} /> }
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
        {j.pay === 'pending' || j.pay === 'failed' || j.pay === 'cancelled' ? <View style={{ backgroundColor: j.pay === 'pending' ? 'rgba(255,186,8,0.22)' : 'rgba(220,38,38,0.08)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 1 }}><Txt weight={500} size={12} color={j.pay === 'pending' ? '#8A5A00' : G.neg}>{j.pay === 'pending' ? 'Payment pending' : j.pay === 'failed' ? 'Payment failed' : 'Payment cancelled'}</Txt></View> : null}
        {!done ? <View style={{ backgroundColor: gone ? 'rgba(220,38,38,0.08)' : 'rgba(84,9,218,0.08)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 1 }}><Txt weight={500} size={12} color={tone}>{STATUS_TEXT[j.status]}</Txt></View> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
        <Txt size={13} color={G.sub} style={TNUM}>{inr(j.total)}</Txt>
        {j.saved > 0 && !gone ? <Txt size={13} color={G.pos} style={TNUM}>{`  •  ${inr(j.saved)} saved`}</Txt> : null}
        <Txt size={13} color={G.sub} style={TNUM}>{`  •  ${durText(j.mins)}`}</Txt>
      </View>
      {done && j.photo && imgSrc(j.photo) ? <PhotoStrip items={[{ src: imgSrc(j.photo), label: 'After' }]} /> : null}
      {j.washer || !gone ? (
        <View style={{ marginTop: 12, backgroundColor: G.raised, borderRadius: 10, padding: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {j.washer ? <Image source={washerImg(j)} resizeMode="cover" accessibilityLabel={`Photo of ${j.washer.name}`} style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: '#fff' }} /> : <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Pin size={20} color={G.mute} strokeWidth={1.5} /></View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={14} numberOfLines={1}>{j.washer ? j.washer.name : 'Washer not assigned yet'}</Txt>
              <Txt size={12} color={G.mute} style={{ marginTop: 2 }} numberOfLines={1}>{j.washer ? washerSub(j) : 'We assign one before your slot'}</Txt>
            </View>
          </View>
          {done && feature('ratings') ? (
            <View style={{ borderTopWidth: 1, borderColor: G.line, marginTop: 8, paddingTop: 8, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={13} color={G.sub}>Service rating</Txt>
              <Stars n={j.stars || 0} size={22} gap={6} onPick={n => (canRate(j) ? openRateSheet(j.id, n) : toast('You can rate once the wash is done'))} />
            </View>
          ) : showsRider(j) ? (
            <View style={{ marginTop: 10 }}><JobRider j={j} compact />{showsCode(j) ? <StartCode j={j} compact /> : null}</View>
          ) : null}
        </View>
      ) : (
        <Txt size={12} color={G.mute} style={{ marginTop: 8 }}>{j.pay === 'refunded' ? `${inr(j.total)} refunded to WD Money` : 'Cancelled'}</Txt>
      )}
    </Tap>
  );
}

/* ---------- the list with its Upcoming / Previous (/ Daily) switch ---------- */
type Seg = 'up' | 'prev' | 'daily';
/* the violet thumb springs across; N equal cells, thumb inset 4px on every side */
function SegSwitch({ value, onChange, items }: { value: Seg; onChange: (v: Seg) => void; items: readonly (readonly [Seg, string])[] }) {
  const n = items.length, idx = Math.max(0, items.findIndex(i => i[0] === value));
  const [w, setW] = useState(0), rm = useReducedMotion(), x = useSharedValue(idx), cell = Math.max(0, (w - 8) / n);
  useEffect(() => { x.value = rm ? idx : withSpring(idx, { damping: 17, stiffness: 220, mass: 0.8 }) }, [idx, rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * cell }] }));
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 999, padding: 4, height: 48, shadowColor: '#1A1033', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      {w ? <Reanimated.View style={[{ position: 'absolute', left: 4, top: 4, bottom: 4, width: cell, borderRadius: 999, backgroundColor: C.violet }, st]} /> : null}
      {items.map(([k, l]) => (
        <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: value === k }} accessibilityLabel={l} onPress={() => onChange(k)} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
          <Txt weight={value === k ? 600 : 500} size={14} color={value === k ? '#fff' : G.sub}>{l}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- Daily: the washer's morning work on the selected car, newest first ---------- */
type DailyRow = { date: string; status: 'done' | 'skipped' | 'scheduled' | 'live'; label: string; washer?: string; time?: string; mins?: number | null; tasks?: string; photos?: number; litres?: number | null; note?: string };
/** monthly plan on the selected car (instant-only customers never see Daily) */
export const hasMonthlyPlan = () => { const a = A(); return !!a && a.mode !== 'instant' && a.cars.length > 0 && !!car()?.plan };
function dailyRows(): DailyRow[] {
  const c = car(), d = doc(c), rows: DailyRow[] = [];
  const live = activeStage(d), st: DailyRow['status'] = live ? 'live' : d.status === 'done' ? 'done' : d.status === 'skipped' ? 'skipped' : 'scheduled';
  if (!d.notStarted && !(d.status === 'scheduled' && d.first)) {
    rows.push({ date: d.date, status: st, label: liveHead(c).big, washer: d.washer?.name || c.washer, time: d.finished_at ? ampm(d.finished_at) : undefined, mins: d.minutes, tasks: d.tasks.filter(t => t.done).map(t => t.label).join(', '), photos: d.photos?.length || 0, litres: d.water_litres, note: d.status === 'skipped' ? [d.skip_reason, carryNote(c, d)].filter(Boolean).join('. ') || undefined : undefined });
  }
  // earlier mornings: history7 rows are [date, "Washer · 6:38 AM · 11 min" | skip reason, tasks]
  history7(c).forEach(([dt, title, sub]) => {
    const m = title.match(/^(.*) · (\d{1,2}:\d\d [AP]M) · (\d+) min$/);
    rows.push(m ? { date: iso(dt), status: 'done', label: 'Washed', washer: m[1], time: m[2], mins: +m[3], tasks: sub }
      : { date: iso(dt), status: 'skipped', label: 'No wash', note: title });
  });
  return rows;
}
function LivePulse() {
  const p = useSharedValue(0), active = useActive();
  useEffect(() => { if (!active) return; p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false); return () => cancelAnimation(p) }, [active]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.4 }] }));
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }, ring]} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} />
    </View>
  );
}
/** the washer's replies (seen / done / re-wash status) and the one-tap rating for today's wash */
function WashNotices() {
  const list = washNotices();
  if (!list.length) return null;
  return <View style={{ marginTop: 16, gap: 12 }}>{list.map((n, i) => (
    <View key={i} style={card({ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: n.tint, alignItems: 'center', justifyContent: 'center' }}><Txt size={16}>{n.icon}</Txt></View>
      <View style={{ flex: 1 }}><Txt weight={500} size={15}>{n.title}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 18 }}>{n.sub}</Txt></View>
      <Tap label={n.btn} onPress={n.act} style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: 'center' }}><Txt weight={600} size={14} color={C.violet}>{n.btn}</Txt></Tap>
    </View>))}</View>;
}
/** the photos of a wash, fanned on the card in the bottom-right corner: up to 3 portrait cards, After on top (straight), Before back-left, others back-right */
function PhotoStrip({ items, total }: { items: { src: any; label: string }[]; total?: number }) {
  if (!items.length) return null;
  const n = total ?? items.length, extra = n > 3 ? n : 0;
  const [before, after, other] = items.length === 1 ? [undefined, items[0], undefined] : [items[0], items[1], items[2]];
  const W = 148, H = 134, FW = 88, FH = 117, BW = 78, BH = 104;
  const cards = [
    other && { p: other, w: BW, h: BH, left: W - BW - 2, bottom: 22, rot: 10, z: 1 },
    before && { p: before, w: BW, h: BH, left: 4, bottom: 14, rot: -12, z: 2 },
    after && { p: after, w: FW, h: FH, left: 34, bottom: 0, rot: before ? 2 : 0, z: 3 },
  ].filter(Boolean) as { p: { src: any; label: string }; w: number; h: number; left: number; bottom: number; rot: number; z: number }[];
  return (
    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: H + 8 }}>
      <View style={{ flexShrink: 1, paddingBottom: 6, paddingRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Txt size={13}>📷</Txt><Txt weight={600} size={13} numberOfLines={1}>{`${n} photo${n > 1 ? 's' : ''}`}</Txt></View>
        <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>tap to view</Txt>
      </View>
      <View accessibilityLabel={`${n} photos`} style={{ width: W, height: H }}>
        {cards.map(({ p, w, h, left, bottom, rot, z }) => (
          <View key={p.label + z} style={{ position: 'absolute', left, bottom, width: w, height: h, borderRadius: 14, overflow: 'hidden', borderWidth: 3, borderColor: '#fff', backgroundColor: G.raised, zIndex: z,
            transform: [{ rotate: rot + 'deg' }], shadowColor: '#1A1033', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 + z }}>
            <Image source={p.src} resizeMode="cover" accessibilityLabel={p.label + ' photo'} style={{ width: '100%', height: '100%' }} />
            {z === 3 ? <View style={{ position: 'absolute', left: 5, bottom: 5, borderRadius: 7, paddingHorizontal: 6, height: 18, backgroundColor: 'rgba(20,20,20,0.6)', justifyContent: 'center' }}><Txt weight={600} size={10} color="#fff" style={{ lineHeight: 13 }}>{p.label}</Txt></View> : null}
          </View>))}
        {extra ? <View style={{ position: 'absolute', right: 0, top: 0, zIndex: 10, minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: C.violet, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 12 }}><Txt weight={700} size={11} color="#fff" style={{ lineHeight: 14 }}>{extra}</Txt></View> : null}
      </View>
    </View>
  );
}
function DailyCard({ r }: { r: DailyRow }) {
  const live = r.status === 'live', done = r.status === 'done', skip = r.status === 'skipped';
  const tone = skip ? G.mute : done ? G.pos : C.violet, badge = live ? 'Live now' : done ? 'Done' : skip ? (r.note?.startsWith('Wash could not') ? 'Stopped' : 'Skipped') : 'Scheduled';
  const isToday = r.date === iso(TODAY);
  const thumbs = r.status === 'skipped' || r.status === 'scheduled' ? [] : dayPhotos(r.date);
  const facts = [r.washer, r.time ? `Finished ${r.time}` : '', r.mins ? `${r.mins} min` : '', r.litres ? `${r.litres} L water` : ''].filter(Boolean);
  return (
    <Tap onPress={() => (isToday && r.photos ? sheets.proof() : sheets.day(r.date))} style={card({ padding: 16, ...(live ? { borderWidth: 1.5, borderColor: C.violet } : null) })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {live ? <LivePulse /> : null}
        <Txt weight={500} size={17} style={{ flex: 1 }}>{isToday ? 'Today' : dayLabel(r.date)}</Txt>
        <View style={{ backgroundColor: live ? 'rgba(84,9,218,0.08)' : done ? 'rgba(22,163,74,0.1)' : G.raised, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}><Txt weight={500} size={12} color={tone}>{badge}</Txt></View>
      </View>
      <Txt size={13} color={G.sub} style={{ marginTop: 4 }}>{r.note || r.label}</Txt>
      {facts.length ? <Txt size={12} color={G.mute} style={{ marginTop: 8, ...TNUM }}>{facts.join('  •  ')}</Txt> : null}
      {r.tasks ? <Txt size={12} color={G.mute} style={{ marginTop: 4 }} numberOfLines={2}>{r.tasks}</Txt> : null}
      <PhotoStrip items={thumbs} />
    </Tap>
  );
}

export function BookingsBody({ tab: isTab }: { tab?: boolean }) {
  const ui = useApp(), ins = useInsets(), ref = useRef<any>(null), { upcoming, previous } = bookingsView();
  const plan = hasMonthlyPlan(), [seg0, setSeg] = useState<Seg>('up'), seg: Seg = seg0 === 'daily' && !plan ? 'up' : seg0, [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }); }, [ui.tabNonce]);
  const list = seg === 'prev' ? previous : upcoming, daily = seg === 'daily' ? dailyRows() : [];
  const items = (plan ? [['up', 'Upcoming'], ['prev', 'Previous'], ['daily', 'Daily']] : [['up', 'Upcoming'], ['prev', 'Previous']]) as readonly (readonly [Seg, string])[];
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
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.violet} colors={[C.violet]} />} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: isTab ? 0 : 48 }}>
        <SegSwitch value={seg} onChange={setSeg} items={items} />
        {loading ? <ListSkeleton /> : seg === 'daily' ? (
          daily.length ? <><WashNotices /><View style={{ marginTop: 16, gap: 12 }}>{daily.map((r, i) => <FadeUp key={'d' + r.date} index={i}><DailyCard r={r} /></FadeUp>)}</View></> : (
            <FadeUp><View style={{ alignItems: 'center', paddingTop: 72, paddingHorizontal: 32 }}>
              <EmptyArt />
              <Txt weight={500} size={17} style={{ marginTop: 16 }}>No daily washes yet</Txt>
              <Txt size={13} color={G.sub} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>Your daily washes will show up here from tomorrow morning</Txt>
            </View></FadeUp>)
        ) : list.length ? (
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
        {isTab ? <Footer bg={PAGE_BG} bleed={16} /> : null}
      </ScrollView>
    </View>
  );
}

export default function Bookings() { return <BookingsBody />; }

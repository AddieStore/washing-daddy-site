// Plans: one card per plan, stacked one under another, all in the same calm style. Tap a card to select it.
// The sticky "Start" button lives in PlanCta, which the screen places above the tab bar.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, LayoutAnimation, useWindowDimensions, Platform, UIManager } from 'react-native';
import { C } from '../../theme';
import { Txt, type } from '../kit';
import { Pressable3 } from '../motion';
import { Chev } from '../icons';
import { PLANS, sellablePlans } from '../../data/reference';
import type { Plan } from '../../data/reference';
import { PAUSE_MAX } from '../../data/model';
import { inr } from '../../data/dates';

const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', V = C.violet, TINT = '#F6F2FF';
const ORDER = ['std', 'pro', 'exc', 'res'];
const canPausePlan = (p: Plan) => p.id !== 'std' && p.id !== 'legacy';
if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
const NUM = { fontVariant: ['tabular-nums'] } as const;

// '2× / week' -> 'twice a week', 'Daily' -> 'every day', '1× / month' -> 'once a month'
const NTH: Record<string, string> = { '1': 'once', '2': 'twice' };
function freq(v: string): string {
  const m = v.match(/^(\d+)\s*×\s*\/\s*(week|month)$/i);
  if (m) return `${NTH[m[1]] || m[1] + '×'} a ${m[2].toLowerCase()}`;
  if (/^daily$/i.test(v)) return 'every day';
  return v.charAt(0).toLowerCase() + v.slice(1);
}
const row = (p: Plan, k: string) => (p.rows.find(r => r[0] === k) || ['', ''])[1];

// One plain line under the plan name, built from the plan's own rows
export function benefit(p: Plan): string {
  const foam = row(p, 'Foam wash'), int = row(p, 'Interior');
  if (p.f.foam >= 7 && p.f.int >= 7) return 'Daily wash, interior and foam, every morning';
  if (p.f.foam >= 4) return `Daily morning wash, foam ${freq(foam)}`;
  if (p.f.foam >= 2) return `Daily morning wash, foam ${freq(foam)}`;
  return int && int !== '—' ? 'Daily morning wash at your parking spot' : 'Daily morning wash';
}

// What is included, straight from the plan rows, plus the perks every plan has and the pause rule
export function features(p: Plan): { t: string; on: boolean }[] {
  const out = p.rows.filter(([, v]) => v && v !== '—').map(([k, v]) => {
    if (k === 'Pressure wash') return { t: 'Pressure wash every morning', on: true };
    if (k === 'Car perfume') return { t: `Car perfume, free (${v.replace(/^Free,?\s*/i, '')})`, on: true };
    if (k === 'On-demand wash') return { t: `On-demand wash, ${v.replace(/^(\d+) a month$/, '$1 a month')}`, on: true };
    return { t: `${k}, ${freq(v)}`, on: true };
  });
  out.push({ t: 'Photo of every wash', on: true });
  out.push(canPausePlan(p) ? { t: `Pause up to ${PAUSE_MAX} days a month`, on: true } : { t: 'Pausing starts from WD Pro', on: false });
  return out;
}

const KEY = ['Pressure wash', 'Interior', 'Foam wash'];
const keyRows = (p: Plan) => KEY.map(k => [k, row(p, k)] as [string, string]);
const GAP = 12, SIDE = 28;

const PlanCard = React.memo(function PlanCard({ p, i, cur, w, x, step, onPress }: { p: Plan; i: number; cur: boolean; w: number; x: Animated.Value; step: number; onPress: (i: number) => void }) {
  const r = [(i - 1) * step, i * step, (i + 1) * step];
  const scale = x.interpolate({ inputRange: r, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
  const opacity = x.interpolate({ inputRange: r, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
  return (
    <Animated.View style={{ width: w, opacity, transform: [{ scale }] }}>
      <Pressable3 onPress={() => onPress(i)} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${p.name}, ${inr(p.price)} per month`}
        style={{ borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(84,9,218,0.12)', padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 }}>
          <Txt {...type.h2} color={INK}>{p.name}</Txt>
          {cur ? <View style={{ borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: 'rgba(84,9,218,0.10)' }}><Txt weight={600} size={11} color={V}>Current</Txt></View> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
          <Txt weight={700} size={38} color={INK} style={[NUM, { lineHeight: 44 }]}>{inr(p.price)}</Txt>
          <Txt {...type.caption} color={MUTED}>per month</Txt>
        </View>
        <Txt {...type.body} color={SEC} numberOfLines={1} style={{ marginTop: 4 }}>{benefit(p)}</Txt>
        <View style={{ height: 1, backgroundColor: LINE, marginVertical: 12 }} />
        <View style={{ gap: 10 }}>
          {keyRows(p).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt {...type.body} color={SEC}>{k}</Txt>
              <Txt {...type.label} color={v === '—' ? MUTED : INK}>{v === '—' ? 'Not included' : v}</Txt>
            </View>
          ))}
        </View>
      </Pressable3>
    </Animated.View>
  );
});

function Details({ p }: { p: Plan }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [p.id]);
  const toggle = () => { LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')); setOpen(o => !o); };
  const rows = p.rows.filter(([, v]) => v && v !== '—');
  return (
    <View style={{ marginHorizontal: 16, marginTop: 8 }}>
      <Pressable3 onPress={toggle} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Txt weight={600} size={14} color={V}>{open ? 'Hide details' : 'See everything included'}</Txt>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Chev size={16} color={V} strokeWidth={2} /></View>
      </Pressable3>
      {open ? (
        <View style={{ backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: LINE, paddingHorizontal: 18, paddingVertical: 6, marginTop: 4 }}>
          <Txt weight={600} size={12} color={MUTED} style={{ letterSpacing: 0.6, marginTop: 12 }}>{p.name.toUpperCase()}</Txt>
          {rows.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, borderTopWidth: i ? 1 : 0, borderTopColor: LINE }}>
              <Txt {...type.body} color={SEC}>{k}</Txt>
              <Txt {...type.label} color={INK} style={{ flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{v}</Txt>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, borderTopWidth: 1, borderTopColor: LINE }}>
            <Txt {...type.body} color={SEC}>Pause</Txt>
            <Txt {...type.label} color={canPausePlan(p) ? INK : MUTED}>{canPausePlan(p) ? `Up to ${PAUSE_MAX} days a month` : 'From WD Pro'}</Txt>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Swipeable plan cards (next card peeks, snaps to centre, selection follows the centred card) with dots and a details toggle
export function PlanPicker({ sel, setSel, curId }: { sel: Plan['id']; setSel: (id: Plan['id']) => void; curId: string; cta?: string; onCta?: () => void; lead?: boolean }) {
  const { width } = useWindowDimensions();
  const sell = sellablePlans().map(p => p.id as string);
  const plans = useMemo(() => ORDER.map(id => PLANS.find(p => p.id === id)).filter((p): p is Plan => !!p && (sell.includes(p.id) || p.id === curId)), [curId]);
  const cw = Math.min(width - 56, 360), step = cw + GAP, side = (width - cw) / 2;
  const x = useRef(new Animated.Value(0)).current, sv = useRef<any>(null), idx = useRef(-1), snapT = useRef<any>(null);
  useEffect(() => { idx.current = start; const t = setTimeout(() => sv.current?.scrollTo({ x: start * step, animated: false }), 0); return () => { clearTimeout(t); clearTimeout(snapT.current); }; }, [step]);
  const start = Math.max(0, plans.findIndex(p => p.id === sel));
  const go = (i: number) => sv.current?.scrollTo({ x: i * step, animated: true });
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true, listener: (e: any) => {
    const i = Math.max(0, Math.min(plans.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (i !== idx.current) { idx.current = i; setSel(plans[i].id); }
    if (Platform.OS === 'web') { clearTimeout(snapT.current); const o = e.nativeEvent.contentOffset.x; snapT.current = setTimeout(() => { if (Math.abs(o - i * step) > 1) go(i); }, 140); }
  } });
  const cur = Math.max(0, plans.findIndex(p => p.id === sel));
  return (
    <View>
      <Animated.ScrollView ref={sv as any} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} snapToAlignment="start" decelerationRate="fast"
        disableIntervalMomentum directionalLockEnabled scrollEventThrottle={16} onScroll={onScroll}
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, paddingVertical: 4 }}>
        {plans.map((p, i) => <PlanCard key={p.id} p={p} i={i} cur={curId === p.id} w={cw} x={x} step={step} onPress={go} />)}
      </Animated.ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14, height: 10 }}>
        {plans.map((p, i) => <View key={p.id} style={{ width: i === cur ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === cur ? V : 'rgba(84,9,218,0.22)' }} />)}
      </View>
      <Details p={plans[cur]} />
    </View>
  );
}

// Sticky bottom bar: the selected plan and price on the button, one calm reassurance line under it
export function PlanCta({ label, onPress, bottom }: { label: string; onPress: () => void; bottom: number }) {
  const narrow = useWindowDimensions().width < 380;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom }}>
      <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: LINE, shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
        <Pressable3 onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 52, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Txt weight={600} size={narrow ? 14 : 16} color={C.white} style={NUM} numberOfLines={1}>{label}</Txt>
        </Pressable3>
        <Txt size={12} color={MUTED} style={{ marginTop: 8, textAlign: 'center', lineHeight: 17 }}>Billed monthly by autopay. Cancel any time.</Txt>
      </View>
    </View>
  );
}

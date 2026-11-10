// The round as a timeline: a pool of cars with no slot, then 6 slots (5:30 to 11:00). The washer drags a car card
// (grip handle, or press-and-hold the card) into a slot / between cards, or uses the "Slot" sheet and the up/down
// arrows. Then locks the round. Core RN only (PanResponder + Animated), so it works with touch and with a mouse.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, F, Icon, Pressy, SuccessTick, brand, sheet, ui, useReducedMotion, useTheme } from '../ui';
import { Route, S, W, act, carBy, planName, route, useStore } from '../state/store';
import { STATUS } from '../lib/data';
import { SLOTS, SLOT_COUNT, lists, place, slotRange } from '../lib/slots';
import { hm12, short12, t12 } from '../lib/time';
import { t } from '../lib/i18n';
import { SheetTitle } from './sheets';

const CARD_H = 84, GAP = 8, ZHEAD = 42, ZPAD = 10, EMPTY_H = 54, ZGAP = 12, SIDE = 8, EDGE = 90;
const ND = false;   // layout props animate, so no native driver here
const web = Platform.OS === 'web';
const NOT_DRAG: any = web ? { touchAction: 'none', userSelect: 'none', cursor: 'grab' } : null;

const slotLabel = (i: number) => `${short12(hm12(SLOTS[i].from))} – ${short12(hm12(SLOTS[i].to))}`;
const movable = (reg: string) => { const w = W(reg); return !w || w.status === 'scheduled' };

type Zone = { key: number; top: number; height: number; regs: string[] };   // key -1 is the pool
type Model = { zones: Zone[]; pos: Record<string, number>; zoneOf: Record<string, number>; total: number };

function build(order: string[], slots: Record<string, number>, drag?: { reg: string; zone: number; index: number }): Model {
  let o = order, sl = slots;
  if (drag) { const p = place(order, slots, drag.reg, drag.zone < 0 ? null : drag.zone, drag.index); o = p.order; sl = p.slots }
  const l = lists(o, sl), zones: Zone[] = [], pos: Record<string, number> = {}, zoneOf: Record<string, number> = {};
  let y = 0;
  [-1, ...Array.from({ length: SLOT_COUNT }, (_, i) => i)].forEach(k => {
    const regs = k < 0 ? l.pool : l.slots[k];
    const body = regs.length ? regs.length * (CARD_H + GAP) - GAP : EMPTY_H;
    const z = { key: k, top: y, height: ZHEAD + body + ZPAD, regs };
    regs.forEach((r, j) => { pos[r] = y + ZHEAD + j * (CARD_H + GAP); zoneOf[r] = k });
    zones.push(z); y += z.height + ZGAP;
  });
  return { zones, pos, zoneOf, total: y - ZGAP };
}

export type ScrollCtl = { ref: React.MutableRefObject<any>; y: { current: number } };

/* ---------------- check-in ---------------- */
export function CheckInCard() {
  useStore();
  const { c } = useTheme();
  const at = S.day?.checkin_at;
  if (at) {
    return (
      <View accessibilityRole="text" style={[st.checked, { backgroundColor: c.tile, borderColor: brand.mint }]}>
        <SuccessTick size={34} />
        <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg, flex: 1 }}>{t('Hub pahunch gaye')} · {t12(at)}</Text>
      </View>
    );
  }
  if (S.day?.started) return null;
  return <Button variant="mint" label={t('Hub pahunch gaya')} icon="pin" onPress={() => { void act.checkIn(); }} />;
}

/* ---------------- slot picker sheet ---------------- */
function openSlotSheet(reg: string) {
  sheet.open(close => <SlotSheet reg={reg} close={close} />);
}
function SlotSheet({ reg, close }: { reg: string; close: () => void }) {
  useStore();
  const { c } = useTheme();
  const car = carBy(reg), cur = Route.slotOf(reg), lay = Route.layout();
  const pick = (s: number | null) => { if (act.moveCar(reg, s)) close() };
  const Row = ({ label, sub, on, onPress, first }: { label: string; sub?: string; on: boolean; onPress: () => void; first?: boolean }) => (
    <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={`${label}${sub ? ', ' + sub : ''}`} accessibilityState={{ selected: on }}
      style={[st.srow, !first && { borderTopWidth: 1, borderTopColor: c.line }, on && { backgroundColor: c.tile2 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{sub}</Text> : null}
      </View>
      {on ? <Icon name="check" size={22} color={brand.mint} /> : null}
    </Pressy>
  );
  return (
    <View>
      <SheetTitle title={t('Slot chuno')} sub={car ? `${car.plate} · ${car.model}` : undefined} />
      <View style={{ borderRadius: 22, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        {SLOTS.map((s, i) => (
          <Row key={i} first={i === 0} on={cur === i} label={slotLabel(i)} onPress={() => pick(i)}
            sub={t(`Slot ${i + 1} · ${lay.slots[i].length} gaadi`)} />
        ))}
        <Row on={cur == null} label={t('Slot mein nahi (pool)')} onPress={() => pick(null)} />
      </View>
    </View>
  );
}

/* ---------------- one car card ---------------- */
type Ctl = {
  active: string | null; start(reg: string, pageY: number): void; move(pageY: number): void; end(): void;
  lastTop: number; setBusy(b: boolean): void; dragTop: Animated.Value;
};

function IconBtn({ rot, label, disabled, onPress }: { rot: number; label: string; disabled?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} disabled={disabled} accessibilityLabel={label} hitSlop={4}
      style={[st.ib, { backgroundColor: c.tile2, borderColor: c.line, opacity: disabled ? 0.35 : 1 }]}>
      <View style={{ transform: [{ rotate: `${rot}deg` }] }}><Icon name="arrow" size={16} color={c.fg} /></View>
    </Pressy>
  );
}

function CarCard({ reg, target, zone, idx, count, locked, dragging, ctl }: {
  reg: string; target: number; zone: number; idx: number; count: number; locked: boolean; dragging: boolean; ctl: React.MutableRefObject<Ctl>;
}) {
  const { c, dark } = useTheme();
  const rm = useReducedMotion();
  const car = carBy(reg), wd = W(reg), can = movable(reg) && !locked;
  const y = useRef(new Animated.Value(target)).current, sc = useRef(new Animated.Value(1)).current;
  const was = useRef(false), first = useRef(true), drag = useRef<Animated.Value | null>(null);
  const armed = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), x0 = useRef(0), y0 = useRef(0);
  const live = useRef({ can }); live.current.can = can;

  useEffect(() => {
    if (dragging) { was.current = true; Animated.spring(sc, { toValue: 1.03, useNativeDriver: ND, speed: 30, bounciness: 6 }).start(); return }
    if (first.current || rm) { first.current = false; y.setValue(target); sc.setValue(1); was.current = false; return }
    if (was.current) {
      was.current = false; y.setValue(ctl.current.lastTop); sc.setValue(1.05);
      Animated.spring(sc, { toValue: 1, useNativeDriver: ND, speed: 14, bounciness: 14 }).start();
    }
    Animated.spring(y, { toValue: target, useNativeDriver: ND, speed: 18, bounciness: 7 }).start();
  }, [dragging, target, rm, y, sc, ctl]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, []);

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } if (armed.current) { armed.current = false; if (!ctl.current.active) ctl.current.setBusy(false) } };
  const grant = (e: any) => { ctl.current.start(reg, e.nativeEvent.pageY) };
  const move = (_: any, g: any) => { if (g.moveY) ctl.current.move(g.moveY) };
  const done = () => { clear(); ctl.current.end() };
  const arm = (x: number, yy: number) => {
    if (timer.current || armed.current || !live.current.can) return;
    x0.current = x; y0.current = yy;
    timer.current = setTimeout(() => { timer.current = null; armed.current = true; ctl.current.setBusy(true); ui.haptic(10) }, 380);   // stop the scroll view before it takes the touch
  };
  const slack = (x: number, yy: number) => { if (timer.current && Math.abs(yy - y0.current) + Math.abs(x - x0.current) > 10) clear() };
  // the grip: takes the touch at once, also in the capture phase so the ScrollView cannot steal it
  const handle = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.can,
    onStartShouldSetPanResponderCapture: () => live.current.can,
    onMoveShouldSetPanResponder: () => live.current.can,
    onMoveShouldSetPanResponderCapture: () => live.current.can,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: grant, onPanResponderMove: move, onPanResponderRelease: done, onPanResponderTerminate: done,
  })).current;
  // the card: press and hold ~0.4 s (finger still), then move
  const body = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e) => { clear(); arm(e.nativeEvent.pageX, e.nativeEvent.pageY); return false },
    onMoveShouldSetPanResponder: (e) => { if (armed.current) return true; slack(e.nativeEvent.pageX, e.nativeEvent.pageY); return false },
    onMoveShouldSetPanResponderCapture: () => armed.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: grant, onPanResponderMove: move, onPanResponderRelease: done, onPanResponderTerminate: done,
  })).current;
  // touch events reach the card even when a child or the ScrollView owns the gesture: they arm / cancel the hold
  const touch = can ? {
    onTouchStart: (e: any) => arm(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onTouchMove: (e: any) => slack(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onTouchEnd: () => { if (!ctl.current.active) clear() },
    onTouchCancel: () => { if (!ctl.current.active) clear() },
  } : {};

  if (!car) return null;
  const late = Route.isLate(reg), due = zone >= 0 ? short12(hm12(SLOTS[zone].to)) : '';
  const eta = locked && zone >= 0 ? Route.slotEta(reg) : null;
  const top: any = dragging ? ctl.current.dragTop : y;
  const shadow = dragging ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 12 } : null;
  const dim = !movable(reg);
  const pill = wd ? STATUS[wd.status] : 'Baaki';
  return (
    <Animated.View
      {...(can ? body.panHandlers : {})}
      {...touch}
      accessibilityLabel={`${car.plate} ${car.model}`}
      style={[st.card, { top, backgroundColor: c.tile, borderColor: dragging ? brand.violet : late ? brand.red : c.line, zIndex: dragging ? 50 : 1, opacity: dim ? 0.7 : 1, transform: [{ scale: sc }] }, shadow, web && dragging ? ({ cursor: 'grabbing' } as any) : null]}>
      <View {...(can ? handle.panHandlers : {})} accessibilityLabel={t('Pakad ke khischo')} style={[st.grip, NOT_DRAG]}>
        {can ? [0, 1, 2].map(i => <View key={i} style={{ flexDirection: 'row', gap: 3 }}>
          <View style={[st.dot, { backgroundColor: c.fg3 }]} /><View style={[st.dot, { backgroundColor: c.fg3 }]} /></View>)
          : <Text style={{ fontSize: 14 }}>🔒</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }} pointerEvents="none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={st.plate}><Text numberOfLines={1} style={st.plateTxt}>{car.plate}</Text></View>
          {late ? <View style={st.late}><Text style={st.lateTxt}>{t('Late')}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 15, color: c.fg }}>{car.model}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12, color: late ? brand.red : c.fg3 }}>
          {late ? t(`${due} tak due tha`) : `${car.house} · ${planName(car)}`}
        </Text>
      </View>
      <View style={st.side}>
        {can ? (
          <>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <IconBtn rot={-90} label={t('Upar karo')} disabled={zone < 0 || idx <= 0} onPress={() => act.moveCar(reg, zone, idx - 1)} />
              <IconBtn rot={90} label={t('Neeche karo')} disabled={zone < 0 || idx >= count - 1} onPress={() => act.moveCar(reg, zone, idx + 1)} />
            </View>
            <Pressy onPress={() => openSlotSheet(reg)} accessibilityLabel={t('Slot chuno')} style={[st.slotBtn, { backgroundColor: dark ? brand.gold : brand.violet }]}>
              <Text style={{ fontFamily: F.black, fontSize: 12, color: dark ? brand.ink : '#fff' }}>{t('Slot')} ▾</Text>
            </Pressy>
          </>
        ) : (
          <>
            {eta ? <Text style={{ fontFamily: F.black, fontSize: 15, color: c.fg }}>{short12(hm12(eta))}</Text> : null}
            <View style={[st.pill, { backgroundColor: c.tile2 }]}><Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 11, color: c.fg2 }}>{t(pill)}</Text></View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

/* ---------------- the timeline ---------------- */
export function RoundTimeline({ scroll, onBusy }: { scroll: ScrollCtl; onBusy: (b: boolean) => void }) {
  useStore();
  const { c } = useTheme();
  const rm = useReducedMotion();
  const locked = Route.isLocked();
  const regs = route().map(x => x.reg), slots = S.day?.slots || {};
  const [drag, setDrag] = useState<{ reg: string; zone: number; index: number } | null>(null);
  const model = useMemo(() => build(regs, slots, drag || undefined), [regs.join('|'), JSON.stringify(slots), drag?.reg, drag?.zone, drag?.index]);   // eslint-disable-line react-hooks/exhaustive-deps
  const box = useRef<any>(null);
  const modelRef = useRef(model); modelRef.current = model;
  const dragTop = useRef(new Animated.Value(0)).current;
  const g = useRef({ reg: null as string | null, pageY0: 0, top0: 0, scroll0: 0, vpTop: 0, vpBot: 0, pageY: 0, hover: null as null | { zone: number; index: number }, timer: null as any, ready: false });

  const ctl = useRef<Ctl>(null as any);
  const hit = (rel: number) => {
    const m = modelRef.current, reg = g.current.reg as string;
    let z = m.zones[m.zones.length - 1];
    for (const zz of m.zones) { if (rel <= zz.top + zz.height + ZGAP / 2) { z = zz; break } }
    const others = z.regs.filter(r => r !== reg);
    if (z.key < 0) return { zone: -1, index: others.length };   // the pool has no order: a car dropped there goes to its end
    let index = 0;
    others.forEach(r => { if (m.pos[r] + CARD_H / 2 < rel) index++ });
    return { zone: z.key, index };
  };
  const track = () => {
    const s = g.current; if (!s.reg || !s.ready) return;
    // follow the finger by deltas (no window measuring: pageY and measureInWindow disagree on some Android builds)
    const top = s.top0 + (s.pageY - s.pageY0) + (scroll.y.current - s.scroll0);
    dragTop.setValue(top); ctl.current.lastTop = top;
    const h = hit(top + CARD_H / 2);
    if (!s.hover || s.hover.zone !== h.zone || s.hover.index !== h.index) { s.hover = h; setDrag({ reg: s.reg, ...h }) }
  };
  const stop = () => { if (g.current.timer) { clearInterval(g.current.timer); g.current.timer = null } };
  ctl.current = ctl.current || ({
    active: null, lastTop: 0, dragTop,
    setBusy: (b: boolean) => onBusy(b),
    start(reg: string, pageY: number) {
      const s = g.current; if (s.reg) return;
      onBusy(true);   // freeze the ScrollView natively, synchronously
      const m = modelRef.current, vp = Dimensions.get('window');
      s.reg = reg; s.pageY = pageY; s.pageY0 = pageY; s.scroll0 = scroll.y.current; s.top0 = m.pos[reg] ?? 0; s.ready = true;
      s.vpTop = 0; s.vpBot = vp.height - 170;
      dragTop.setValue(s.top0); ctl.current.lastTop = s.top0; ctl.current.active = reg;
      s.hover = { zone: m.zoneOf[reg], index: m.zones.find(z => z.key === m.zoneOf[reg])!.regs.indexOf(reg) };
      setDrag({ reg, ...s.hover }); ui.haptic(8);
      try { (scroll.ref.current as any)?.measureInWindow((_x: number, wy: number, _w: number, h: number) => { if (h) { s.vpTop = wy; s.vpBot = Math.min(wy + h, vp.height) - 170 } }) } catch { /* fall back to the window */ }
      s.timer = setInterval(() => {
        let d = 0;
        if (s.pageY < s.vpTop + EDGE) d = -Math.ceil((s.vpTop + EDGE - s.pageY) / 10);
        else if (s.pageY > s.vpBot - EDGE + 40) d = Math.ceil((s.pageY - (s.vpBot - EDGE + 40)) / 10);
        if (d) { const ny = Math.max(0, scroll.y.current + Math.max(-14, Math.min(14, d))); if (ny !== scroll.y.current) { scroll.ref.current?.scrollTo({ y: ny, animated: false }); scroll.y.current = ny; track() } }
      }, 16);
    },
    move(pageY: number) { g.current.pageY = pageY; track() },
    end() {
      const s = g.current; if (!s.reg) return;
      stop();
      const reg = s.reg, h = s.hover; s.reg = null; s.ready = false; ctl.current.active = null;
      if (h && !(h.zone < 0 && Route.slotOf(reg) == null)) act.moveCar(reg, h.zone < 0 ? null : h.zone, h.index);
      setDrag(null); onBusy(false);
    },
  } as any);
  useEffect(() => stop, []);
  // a locked round or a dragged car that vanished ends the drag
  useEffect(() => { if (locked && g.current.reg) ctl.current.end() }, [locked]);

  const m = model, dz = drag ? drag.zone : null;
  const nTotal = regs.length;
  return (
    <View>
      {!locked && nTotal ? (
        <Text style={[st.help, { color: c.fg3 }]}>
          {t(web ? 'Gaadi ko pakad ke slot mein khischo, ya "Slot" dabao.' : 'Gaadi ko pakad ke (ya grip se) slot mein khischo, ya "Slot" dabao.')}
        </Text>
      ) : null}
      <View ref={box} collapsable={false} style={{ height: m.total, position: 'relative' }}>
        {m.zones.map(z => {
          const hot = dz === z.key, pool = z.key < 0;
          const n = z.regs.length;
          return (
            <View key={z.key} style={[st.zone, { top: z.top, height: z.height, backgroundColor: hot ? (rm ? c.tile2 : 'rgba(83,9,222,0.10)') : c.tile2, borderColor: hot ? brand.violet : c.line, borderStyle: pool ? 'dashed' : 'solid', borderWidth: hot ? 2 : 1 }]}>
              <View style={st.zhead}>
                {pool
                  ? <Text accessibilityRole="header" style={[st.ztitle, { color: c.fg }]}>{t('Slot mein daalo')}</Text>
                  : <View style={{ flex: 1, minWidth: 0 }}>
                    <Text accessibilityRole="header" numberOfLines={1} style={[st.ztitle, { color: c.fg }]}>{slotLabel(z.key)}</Text>
                  </View>}
                {pool ? <View style={{ flex: 1 }} /> : null}
                <View style={[st.badge, { backgroundColor: n ? (pool ? brand.orange : brand.violet) : c.line }]}>
                  <Text style={{ fontFamily: F.black, fontSize: 12, color: n ? '#fff' : c.fg3 }}>{n}</Text>
                </View>
              </View>
              {!n ? <Text style={[st.empty, { color: c.fg3 }]}>{pool ? t('Sab gaadi slot mein hain') : t('Yahan gaadi chhodo')}</Text> : null}
            </View>
          );
        })}
        {drag && m.pos[drag.reg] != null ? <View pointerEvents="none" style={[st.ph, { top: m.pos[drag.reg], borderColor: brand.violet }]} /> : null}
        {regs.map(r => {
          const z = m.zoneOf[r], zone = m.zones.find(q => q.key === z)!;
          return <CarCard key={r} reg={r} target={m.pos[r]} zone={z} idx={zone.regs.indexOf(r)} count={zone.regs.length} locked={locked} dragging={drag?.reg === r} ctl={ctl as any} />;
        })}
      </View>
    </View>
  );
}

/* ---------------- sticky lock bar ---------------- */
export function LockBar({ bottom }: { bottom: number }) {
  useStore();
  const { c } = useTheme();
  const rm = useReducedMotion();
  const regs = route(), locked = Route.isLocked();
  const open = regs.filter(x => Route.slotOf(x.reg) == null).length;
  const finished = regs.length > 0 && regs.every(x => { const w = W(x.reg); return w && ['done', 'skipped'].includes(w.status) });
  const can = regs.length > 0 && open === 0;
  const pulse = useRef(new Animated.Value(1)).current, prev = useRef(false);
  useEffect(() => {
    if (can && !prev.current && !locked && !rm) {
      Animated.sequence(Array.from({ length: 3 }, () => Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
        Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      ]))).start();
    }
    prev.current = can;
  }, [can, locked, rm, pulse]);
  if (!regs.length || finished) return null;
  return (
    <View pointerEvents="box-none" style={[st.barWrap, { bottom }]}>
      <View style={[st.bar, { backgroundColor: c.tile, borderColor: locked ? brand.mint : c.line }]}>
        {locked ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <Text accessibilityRole="alert" style={{ flex: 1, fontFamily: F.bold, fontSize: 14, color: c.fg }}>{t('Round locked · customers ko time dikh raha hai')}</Text>
            </View>
            <Button variant="ghost" label={t('Unlock karo')} onPress={() => act.unlockRound()} style={{ minHeight: 48, paddingVertical: 8 }} />
          </>
        ) : (
          <>
            {!can ? <Text style={{ fontFamily: F.bold, fontSize: 13, color: brand.orange, textAlign: 'center' }}>{t(`${open} gaadi slot mein nahi`)}</Text> : null}
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Button variant="violet" label={t('Round lock karo')} disabled={!can} onPress={() => act.lockRound()} style={{ minHeight: 52, paddingVertical: 10 }} />
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  help: { fontFamily: F.body, fontSize: 13, marginBottom: 10 },
  zone: { position: 'absolute', left: 0, right: 0, borderRadius: 20 },
  zhead: { height: ZHEAD, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  ztitle: { fontFamily: F.shout, fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.3 },
  badge: { minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: F.semi, fontSize: 13, textAlign: 'center', position: 'absolute', left: 0, right: 0, top: ZHEAD + 16 },
  card: { position: 'absolute', left: SIDE, right: SIDE, height: CARD_H, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingRight: 8, paddingLeft: 2, borderRadius: 16, borderWidth: 1.5 },
  grip: { width: 28, height: CARD_H - 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  plate: { alignSelf: 'flex-start', paddingVertical: 1, paddingHorizontal: 6, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2, borderColor: brand.ink, flexShrink: 1 },
  plateTxt: { fontFamily: F.black, fontSize: 12, letterSpacing: 0.8, color: brand.ink },
  late: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, backgroundColor: brand.red },
  lateTxt: { fontFamily: F.black, fontSize: 11, color: '#fff' },
  side: { width: 78, alignItems: 'flex-end', gap: 6 },
  ib: { width: 34, height: 30, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotBtn: { height: 28, minWidth: 72, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, maxWidth: 78 },
  ph: { position: 'absolute', left: SIDE, right: SIDE, height: CARD_H, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'rgba(83,9,222,0.08)' },
  srow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, minHeight: 60 },
  checked: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, borderWidth: 2 },
  barWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 12 },
  bar: { gap: 8, padding: 10, borderRadius: 22, borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
});

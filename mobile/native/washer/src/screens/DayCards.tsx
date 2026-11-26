// The Round home's "my day" pieces (v23): the attendance card (check-in / check-out, hours, cars, streak, month view), the bold
// start-the-day card with the slide-to-start (haptic ticks + sparkle burst), the live day-goal card once the round runs,
// the celebration after every finished car, and the end-of-day summary.
// Attendance data: attendance/{DATE}_{+91phone} is written by act.checkIn / act.checkOut (backend/attendance.ts); S.attend is its cache.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Button, Chip, F, Group, Icon, Pressy, Row, SparkleBurst, Spark, brand, sheet, ui, useCountUp, useReducedMotion, useTheme } from '../ui';
import { DAY, Money, Route, S, act, attendLog, carBy, me, route, useStore, W } from '../state/store';
import { monthAttendance } from '../lib/rewards';
import { monthDays } from '../lib/rewardsView';
import { hoursLabel, lastWeek, workStreak } from '../lib/dayplan';
import { hm12, rupee, short12, t12 } from '../lib/time';
import { t } from '../lib/i18n';
import { TNUM } from './DayParts';
import { SheetTitle } from './sheets';
import { openAttendance } from './AttendanceSheet';
import { openRewards } from './RewardsCards';

const SAFFRON = brand.gold, DEEP = brand.violetDeep;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ND = Platform.OS !== 'web';

/** Re-renders every `ms` so live hours keep moving. */
function useNow(ms = 30000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id) }, [ms]);
  return n;
}

function Flame({ size = 16, color = SAFFRON }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M12.5 2c.6 3.6 4.8 5.6 4.8 10.6A5.3 5.3 0 0 1 12 18a5.3 5.3 0 0 1-5.3-5.4c0-2 .9-3.3 2-4.3.1 1.6.8 2.7 2 3.2C10.3 8 10.9 5 12.5 2z" fill={color} />
      <Path d="M12 21.5c-2.6 0-4.4-1.6-4.4-3.7 0-1.3.8-2.3 1.8-3 .2 1 .8 1.7 1.7 2 .1-1.2.4-2.3 1.3-3.3 1.4 1.1 3.9 2.2 3.9 4.3 0 2-1.8 3.7-4.3 3.7z" fill={color} opacity={0.55} />
    </Svg>
  );
}

/* ---------- numbers every card shares ---------- */
function dayNumbers() {
  const cn = Route.counts();
  const expected = route().reduce((a, c) => a + Money.perDay(c), 0) + Money.todayExtra();
  const earned = Money.today();
  const left = cn.total - cn.done - cn.skipped;
  const streak = workStreak(attendLog(), DAY);
  return { cn, expected: Math.max(expected, earned), earned, left, streak };
}

/** The streak "tomorrow" line: how long the run is if he comes again. */
function streakHint(streak: number, checkedIn: boolean): string {
  const next = streak + 1;
  if (!streak && !checkedIn) return t('Aaj check-in karo, streak shuru karo');
  return checkedIn ? t(`Kal bhi aao: ${next} din ka streak`) : t(`Aaj aao: ${next} din ka streak`);
}

/* ================= attendance card ================= */
function Stat({ value, label, first }: { value: string; label: string; first?: boolean }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label} ${value}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderLeftWidth: first ? 0 : 1, borderLeftColor: c.line }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.fg }]}>{value}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey }}>{label}</Text>
    </View>
  );
}

function LiveDot({ color }: { color: string }) {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rm) return;
    const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: ND }));
    l.start();
    return () => l.stop();
  }, [rm, a]);
  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      {rm ? null : <Animated.View style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }] }} />}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Top of the Round home: where he stands today (not checked in / working since / checked out) and the one button for it. */
export function AttendanceCard() {
  useStore();
  const { c } = useTheme();
  const now = useNow();
  const inAt = S.day?.checkin_at, outAt = S.day?.checkout_at;
  const { cn, streak } = dayNumbers();
  const mode: 'none' | 'in' | 'out' = outAt ? 'out' : inAt ? 'in' : 'none';
  const hrs = inAt ? hoursLabel(inAt, outAt ? Date.parse(outAt) : now) : '–';
  const status = mode === 'none'
    ? { dot: <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', margin: 3 }} />, text: t('Check-in baaki hai'), color: '#B45309' }
    : mode === 'in'
      ? { dot: <LiveDot color={c.ok} />, text: t(`${short12(t12(inAt))} se kaam par`), color: c.ok }
      : { dot: <Icon name="check" size={14} color={c.grey} />, text: t(`Check-out ${short12(t12(outAt))}`), color: c.grey };
  return (
    <Group>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: c.fg }}>{t('Aaj ki hazri')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {status.dot}
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: status.color, ...TNUM }}>{status.text}</Text>
            </View>
          </View>
          <Pressy onPress={openAttendanceMonth} accessibilityLabel={t('Mahine ki attendance')} scaleTo={0.96} hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.canvas }}>
            <Icon name="calendar" size={16} color={c.primary} />
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg }}>{t('Mahina')}</Text>
          </Pressy>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 8 }}>
        <Stat first value={hrs} label={t('Ghante')} />
        <Stat value={`${cn.done}/${cn.total}`} label={t('Gaadi')} />
        <Stat value={`${streak} ${t('din')}`} label={t('Streak')} />
      </View>
      <View style={{ padding: 16, paddingTop: 8 }}>
        {mode === 'none' ? <Button variant="violet" icon="cam" label={t('Check-in karo')} onPress={openAttendance} /> : null}
        {mode === 'in' ? <Button variant="ghost" icon="flag" label={t('Check-out karo')} onPress={askCheckOut} /> : null}
        {mode === 'out' ? <Button variant="ghost" icon="gift" label={t('Din ka summary dekho')} onPress={openDaySummary} /> : null}
      </View>
    </Group>
  );
}

/* ================= check-out ================= */
/** "Aaj ka kaam khatam": asks first when cars are still open, then writes attendance and opens the day summary. */
export function askCheckOut() {
  const { left } = dayNumbers();
  const go = async () => { await act.checkOut(); setTimeout(openDaySummary, 300) };
  if (left <= 0) { void go(); return }
  sheet.open(close => (
    <View>
      <SheetTitle title={t('Kaam khatam karein?')} sub={t(`${left} gaadi abhi baaki hain. Check-out ke baad bhi unhe kar sakte ho.`)} />
      <View style={{ gap: 12 }}>
        <Button variant="violet" icon="flag" label={t('Haan, check-out karo')} onPress={() => { close(); void go() }} />
        <Button variant="ghost" label={t('Nahi, kaam jaari rakho')} onPress={close} />
      </View>
    </View>
  ));
}

/* ================= month attendance ================= */
function MonthBody({ close }: { close: () => void }) {
  useStore();
  const { c } = useTheme();
  const a = attendLog();
  const { lead, days } = monthDays(a, DAY);
  const m = monthAttendance(a, DAY), streak = workStreak(a, DAY);
  const missed = m.missed;
  const cells = [...Array(lead).fill(null), ...days];
  const head = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View>
      <SheetTitle title={`${t('Attendance')} · ${MONTHS[+DAY.slice(5, 7) - 1]} ${DAY.slice(0, 4)}`} sub={t(`${m.came} din aaye, ${m.total - m.came - m.left} din chhoot gaye`)} />
      <Group>
        <View style={{ flexDirection: 'row', marginHorizontal: 8 }}>
          <Stat first value={`${m.came}/${m.total}`} label={t('Din aaye')} />
          <Stat value={`${streak}`} label={t('Streak')} />
          <Stat value={`${missed}`} label={t('Chhoote')} />
        </View>
      </Group>
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        {head.map((h, i) => <Text key={i} style={{ width: '14.2857%', textAlign: 'center', fontFamily: F.medium, fontSize: 12, color: c.grey }}>{h}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <View key={'b' + i} style={{ width: '14.2857%', height: 46 }} />;
          const came = d.state === 'came', miss = d.state === 'missed';
          return (
            <View key={d.key} accessible accessibilityLabel={`${d.day} ${came ? t('aaye') : miss ? t('chhoot gaya') : d.isToday ? t('aaj') : ''}`}
              style={{ width: '14.2857%', height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                backgroundColor: came ? c.primary : miss ? 'rgba(220,38,38,0.1)' : 'transparent',
                borderWidth: d.isToday && !came ? 2 : 0, borderColor: c.primary,
              }}>
                <Text style={[TNUM, { fontFamily: came || d.isToday ? F.bold : F.medium, fontSize: 14, color: came ? '#fff' : miss ? '#dc2626' : d.state === 'upcoming' ? c.dash : c.fg }]}>{d.day}</Text>
              </View>
              {d.early && came ? <View style={{ position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3, backgroundColor: SAFFRON }} /> : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 16, justifyContent: 'center' }}>
        {[[c.primary, t('Aaye')], ['#dc2626', t('Chhoota')], [SAFFRON, t('Early (6 se pehle)')]].map(([col, l]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
            <Text style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{l}</Text>
          </View>
        ))}
      </View>
      <Group>
        <Row icon="gift" label={t('Bonus aur rewards')} sub={m.possible ? t(`${m.total - m.came} din aur aaoge to poore mahine ka bonus`) : t('Din chhoot gaya, is mahine ka bonus nahi')} onPress={() => { close(); openRewards() }} />
      </Group>
    </View>
  );
}
export function openAttendanceMonth() { sheet.open(close => <MonthBody close={close} />) }

/* ================= start-of-day card + slide ================= */
const KNOB = 52, PAD = 4;

/** A slide that fills with saffron as the knob moves, ticks a haptic on the way, and bursts into sparkles when it lands. */
function StartSlide({ label, doneLabel, onDone }: { label: string; doneLabel: string; onDone: () => boolean | void }) {
  const rm = useReducedMotion();
  const [w, setW] = useState(0);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const travel = Math.max(1, w - KNOB - PAD * 2);
  const tr = useRef(1); tr.current = travel;
  const fin = useRef(false), ticks = useRef(0);
  const cb = useRef(onDone); cb.current = onDone;

  useEffect(() => {
    if (rm) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(hint, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.timing(hint, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]));
    l.start();
    return () => l.stop();
  }, [rm, hint]);

  const back = useCallback(() => { ticks.current = 0; Animated.spring(x, { toValue: 0, useNativeDriver: ND, speed: 20, bounciness: 8 }).start() }, [x]);
  const complete = useCallback(() => {
    if (fin.current) return;
    fin.current = true; setDone(true); setBurst(b => b + 1);
    ui.haptic([20, 50, 20]);
    Animated.spring(x, { toValue: tr.current, useNativeDriver: ND, speed: 28, bounciness: 6 }).start();
    setTimeout(() => {
      if (cb.current() === false) { fin.current = false; setDone(false); back() }
    }, rm ? 0 : 700);
  }, [x, back, rm]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !fin.current,
    onMoveShouldSetPanResponder: () => !fin.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { ui.haptic(8) },
    onPanResponderMove: (_, g) => {
      const v = Math.min(Math.max(g.dx, 0), tr.current);
      x.setValue(v);
      const q = Math.floor((v / tr.current) * 3);   // a light tick at a third and at two thirds
      if (q > ticks.current && q < 3) ui.haptic(8);
      ticks.current = q;
    },
    onPanResponderRelease: (_, g) => { if (g.dx >= tr.current * 0.82) complete(); else back() },
    onPanResponderTerminate: back,
  })).current;

  return (
    <View testID="start-slide" accessible accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('Slide karo ya double tap karo')}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={complete} onAccessibilityTap={complete}
      onLayout={e => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
      style={{ height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', justifyContent: 'center' }}>
      {/* saffron fill behind the knob */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: w || 1, borderRadius: (KNOB + PAD * 2) / 2, backgroundColor: SAFFRON,
        opacity: x.interpolate({ inputRange: [0, 14], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateX: Animated.add(x, new Animated.Value(KNOB + PAD - w)) }],
      }} />
      {/* label + running chevrons */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: KNOB + PAD * 2 + 8, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: done ? 0 : x.interpolate({ inputRange: [0, Math.max(40, travel * 0.45)], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bold, fontSize: 16, letterSpacing: -0.2, color: '#fff' }}>{label}</Text>
        <View style={{ flexDirection: 'row' }}>
          {[0, 1, 2].map(i => (
            <Animated.View key={i} style={{ marginLeft: -6, opacity: hint.interpolate({ inputRange: [0, 1], outputRange: i === 0 ? [0.9, 0.3] : i === 1 ? [0.6, 0.6] : [0.3, 0.9] }) }}>
              <Icon name="chevron" size={18} color="#fff" />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      {done ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}><Text style={{ fontFamily: F.black, fontSize: 17, color: DEEP, paddingRight: KNOB }}>{doneLabel}</Text></View> : null}
      <Animated.View style={{ position: 'absolute', left: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: x }] }}>
        <Icon name={done ? 'check' : 'arrow'} size={24} color={DEEP} />
        <View style={{ position: 'absolute' }}><SparkleBurst play={burst} size={150} count={14} /></View>
      </Animated.View>
    </View>
  );
}

function Decor() {
  return (
    <>
      <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="xMaxYMin slice" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <Circle cx={330} cy={30} r={120} fill={brand.violet} opacity={0.45} />
        <Circle cx={330} cy={30} r={78} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} />
        <Circle cx={10} cy={290} r={70} fill={brand.violet2} opacity={0.5} />
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', right: 20, top: 56 }}><Spark size={20} opacity={0.9} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', right: 58, top: 20 }}><Spark size={11} color="#fff" opacity={0.7} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 100 }}><Spark size={9} color="#8A55F5" /></View>
    </>
  );
}

function WeekDots({ streak, today }: { streak: number; today: boolean }) {
  const wk = lastWeek(attendLog(), DAY);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={t(`${streak} din ka streak`)}>
      {wk.map(d => (
        <View key={d.key} style={{
          width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
          backgroundColor: d.state === 'came' ? SAFFRON : 'rgba(255,255,255,0.12)',
          borderWidth: d.state === 'today' ? 1.5 : 0, borderColor: SAFFRON, borderStyle: d.state === 'today' ? 'dashed' : 'solid',
        }}>
          {d.state === 'came' ? <Icon name="check" size={13} color={DEEP} /> : null}
        </View>
      ))}
    </View>
  );
}

function BigStat({ value, unit, tone }: { value: string; unit: string; tone: 'white' | 'gold' }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.black, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, color: tone === 'gold' ? SAFFRON : '#fff' }]}>{value}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.72)' }}>{unit}</Text>
    </View>
  );
}

/** The day's card: before the round it is the bold goal + streak + slide-to-start; once the round runs it is the live goal bar. */
export function DayCard() {
  useStore();
  const { cn, expected, earned, left, streak } = dayNumbers();
  const started = !!S.day?.started, inAt = S.day?.checkin_at, outAt = S.day?.checkout_at;
  const rets = route(), first = W(rets[0]?.reg)?.eta || Route.etaList()[0], last = W(rets[rets.length - 1]?.reg)?.eta || Route.etaList()[Math.max(0, rets.length - 1)];
  const m = monthAttendance(attendLog(), DAY);
  const pct = expected > 0 ? Math.min(1, earned / expected) : cn.total ? (cn.done + cn.skipped) / cn.total : 0;
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(bar, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() }, [pct, bar]);
  const shown = useCountUp(Math.round(earned), { duration: 800 });
  if (!cn.total) return null;
  const goalDone = started && left <= 0;
  const bonusLine = m.possible ? t(`Poora mahina: ${m.came}/${m.total} din · ${m.total - m.came} din aur, ₹1,000 bonus`) : t(`Is mahine ${m.came}/${m.total} din aaye`);

  return (
    <View style={{ borderRadius: 24, backgroundColor: DEEP, overflow: 'hidden', padding: 18 }}>
      <Decor />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: SAFFRON }}>{goalDone ? t('GOAL POORA') : t('AAJ KA GOAL')}</Text>
        <View accessible accessibilityLabel={t(`${streak} din ka streak`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Flame size={15} />
          <Text style={[TNUM, { fontFamily: F.bold, fontSize: 13, color: '#fff' }]}>{streak} {t('din')}</Text>
        </View>
      </View>

      {!started ? (
        <>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            <BigStat value={String(cn.total)} unit={t('gaadi chamkani hain')} tone="white" />
            <BigStat value={rupee(expected)} unit={t('kamai ho sakti hai')} tone="gold" />
          </View>
          <Text style={[TNUM, { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.6)', marginTop: 6 }]}>
            {first ? `${t('Pehli gaadi')} ${short12(hm12(first))}` : ''}{last ? ` · ${t('Aakhri')} ~${short12(hm12(last))}` : ''}
          </Text>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <WeekDots streak={streak} today={!!inAt} />
            <Text numberOfLines={2} style={{ flex: 1, textAlign: 'right', fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: '#fff' }}>{streakHint(streak, !!inAt)}</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            <StartSlide label={t('Round shuru karo')} doneLabel={t('Shuru ho gaya!')} onDone={() => act.startRound()} />
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 }}>
            {inAt ? bonusLine : t('Check-in abhi baaki hai. Shuru karte hi customers ko aapka naam dikh jayega.')}
          </Text>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { flexShrink: 1, fontFamily: F.black, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, color: SAFFRON }]}>{rupee(shown)}</Text>
            <Text numberOfLines={1} style={[TNUM, { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 18, color: 'rgba(255,255,255,0.72)', paddingBottom: 9 }]}>{t('kamai')} / {rupee(expected)}</Text>
          </View>
          <View accessible accessibilityRole="progressbar" accessibilityLabel={`${cn.done}/${cn.total}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
            style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 10 }}>
            <Animated.View style={{ height: 12, borderRadius: 6, backgroundColor: SAFFRON, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            <Text style={[TNUM, { fontFamily: F.bold, fontSize: 14, color: '#fff' }]}>{cn.done}/{cn.total} {t('gaadi')}</Text>
            <Text numberOfLines={2} style={{ flex: 1, textAlign: 'right', fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: '#fff' }}>
              {outAt ? t('Din poora, shabaash!') : goalDone ? t('Goal poora! Ab check-out karo') : t(`${left} gaadi aur, goal poora`)}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <WeekDots streak={streak} today />
            <Text numberOfLines={2} style={{ flex: 1, textAlign: 'right', fontFamily: F.body, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.72)' }}>{streakHint(streak, !!inAt)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

/* ================= a car is finished ================= */
function CarDoneBody({ reg, next, goPaisa, close }: { reg: string; next: { reg: string; model: string } | null; goPaisa: () => void; close: () => void }) {
  useStore();
  const { c } = useTheme();
  const car = carBy(reg), gain = car ? Money.perDay(car) : 0;
  const { cn, expected, earned, left, streak } = dayNumbers();
  const before = Math.max(0, earned - gain);
  const pop = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(expected ? before / expected : 0)).current;
  const [burst, setBurst] = useState(0);
  const amount = useCountUp(Math.round(gain), { duration: 1000, delay: 250 });
  const total = useCountUp(Math.round(earned), { from: Math.round(before), duration: 1000, delay: 250 });
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: ND, speed: 10, bounciness: 14 }).start(() => setBurst(1));
    Animated.timing(bar, { toValue: expected ? Math.min(1, earned / expected) : 0, duration: 1000, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goalDone = left <= 0;
  const m = monthAttendance(attendLog(), DAY);
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <SparkleBurst play={burst} size={190} />
        <Animated.View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
          <Icon name="check" size={34} color="#fff" />
        </Animated.View>
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: c.fg }}>{t('Chamak gayi!')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.grey, marginTop: 2, textAlign: 'center' }}>{t(`${car?.customer || 'Customer'} ke phone pe pahunch gaya`)}</Text>

      <View style={{ alignSelf: 'stretch', marginTop: 16, borderRadius: 20, backgroundColor: DEEP, padding: 16, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: brand.violet, opacity: 0.45 }} />
        <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, color: SAFFRON }}>{t('IS GAADI SE KAMAI')}</Text>
        <Text accessibilityLabel={`+${rupee(gain)}`} style={[TNUM, { fontFamily: F.black, fontSize: 48, lineHeight: 56, letterSpacing: -1.5, color: '#fff' }]}>+{rupee(amount)}</Text>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 8 }}>
          <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: SAFFRON, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
          <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: '#fff' }]}>{t('Aaj')} {rupee(total)} / {rupee(expected)}</Text>
          <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: 'rgba(255,255,255,0.8)' }]}>{cn.done}/{cn.total} {t('gaadi')}</Text>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Chip tone={goalDone ? 'green' : 'violet'} icon={goalDone ? 'check' : 'flag'}>{goalDone ? t('Aaj ka goal poora!') : t(`${left} gaadi aur, goal poora`)}</Chip>
        <Chip tone="amber" icon="star">{t(`${streak} din ka streak`)}</Chip>
        {m.possible ? <Chip tone="grey" icon="gift">{t(`Poora mahina ${m.came}/${m.total}`)}</Chip> : null}
      </View>

      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 18 }}>
        {next
          ? <Button variant="primary" iconRight="arrow" label={t(`Agli gaadi: ${next.model}`)} onPress={() => { act.setCurrent(next.reg); close() }} />
          : <Button variant="primary" label={t('Round poora · hisaab dekho')} onPress={() => { close(); goPaisa() }} />}
        <Button variant="ghost" label={t('Yahin raho')} onPress={close} />
      </View>
    </View>
  );
}
export function openCarDone(reg: string, next: { reg: string; model: string } | null, goPaisa: () => void) {
  sheet.open(close => <CarDoneBody reg={reg} next={next} goPaisa={goPaisa} close={close} />);
}

/* ================= end-of-day summary ================= */
function SummaryBody({ close }: { close: () => void }) {
  useStore();
  const { c } = useTheme();
  const { cn, earned, streak } = dayNumbers();
  const inAt = S.day?.checkin_at || S.day?.startedAt, outAt = S.day?.checkout_at;
  const ws = Object.values(S.day?.washes || {}).filter(Boolean).filter(w => w!.status === 'done');
  const mins = ws.map(w => w!.minutes || 0).filter(Boolean);
  const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0;
  const shown = useCountUp(Math.round(earned), { duration: 1100, delay: 200 });
  const m = monthAttendance(attendLog(), DAY);
  const once = useRef(false);
  useEffect(() => { if (!once.current && cn.done > 0) { once.current = true; ui.haptic([20, 40, 20]); ui.confetti(0.8) } }, [cn.done]);
  return (
    <View>
      <View style={{ borderRadius: 24, backgroundColor: DEEP, padding: 18, overflow: 'hidden', alignItems: 'center' }}>
        <Decor />
        <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.6, color: SAFFRON }}>{t('AAJ KA DIN POORA')}</Text>
        <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: '#fff', marginTop: 4 }}>{t(`Shabaash, ${me().name.split(' ')[0]}!`)}</Text>
        <Text accessibilityLabel={rupee(earned)} style={[TNUM, { fontFamily: F.black, fontSize: 56, lineHeight: 64, letterSpacing: -2, color: SAFFRON, marginTop: 6 }]}>{rupee(shown)}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{t(`${cn.done} gaadi chamkayi aaj`)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Flame size={15} /><Text style={[TNUM, { fontFamily: F.bold, fontSize: 13, color: '#fff' }]}>{t(`${streak} din ka streak`)}</Text>
        </View>
      </View>
      <Group style={{ marginTop: 14 }}>
        <Row icon="car" label={t('Gaadi poori')} value={`${cn.done}/${cn.total}`} sub={cn.skipped ? t(`${cn.skipped} skip`) : undefined} />
        <Row icon="clock" label={t('Kaam ke ghante')} value={inAt ? hoursLabel(inAt, outAt ? Date.parse(outAt) : Date.now()) : '–'} sub={inAt ? `${short12(t12(inAt))} – ${outAt ? short12(t12(outAt)) : t('abhi')}` : undefined} />
        {avg ? <Row icon="drop" label={t('Ek gaadi mein')} value={`${avg} min`} /> : null}
        <Row icon="calendar" label={t('Is mahine ki hazri')} value={`${m.came}/${m.total} ${t('din')}`} onPress={() => { close(); openAttendanceMonth() }} />
      </Group>
      <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: c.primary, textAlign: 'center', marginTop: 12 }}>{streakHint(streak, !!S.day?.checkin_at)}</Text>
      <View style={{ gap: 8, marginTop: 14 }}>
        <Button variant="primary" iconRight="arrow" label={t('Hisaab dekho')} onPress={() => { close(); router.push('/paisa' as any) }} />
        <Button variant="ghost" label={t('Band karo')} onPress={close} />
      </View>
    </View>
  );
}
export function openDaySummary() { sheet.open(close => <SummaryBody close={close} />) }

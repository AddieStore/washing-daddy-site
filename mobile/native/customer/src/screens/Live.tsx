// Washes tab (was Live): My Bookings with Upcoming/Previous, booking detail with live track, timeline, photos, tip, replay.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { C, SP } from '../theme';
import { Txt, Page, Topbar, Empty } from '../ui/kit';
import { Heart } from '../ui/icons';
import { IMG, src } from '../img';
import { TODAY, fmt, iso, ampm } from '../data/dates';
import { STAGE_LABEL } from '../data/model';
import { useApp, car, doc, act, maskPlate, liveHead, timeline, history7, syncLive } from '../state';
import { sheets } from '../sheets';
import { Pulse, useReduceMotion } from './Home';

// Pronto palette (local so this screen stands alone)
const TINT = '#EFE8FD', TINT2 = '#F6F1FF', GREY = '#6B6580', HAIR = 'rgba(26,10,51,.09)', OK = '#0E9F6E', CARD = '#FAF8FF';
const avatar = (d: ReturnType<typeof doc>) => (d.washer?.photo_url ? { uri: d.washer.photo_url } : IMG.washer);

function Tag({ label, tone = 'violet' }: { label: string; tone?: 'violet' | 'ok' | 'grey' | 'gold' }) {
  const m = { violet: [TINT, C.violet], ok: ['#E3F6EE', OK], grey: ['#F0EEF4', GREY], gold: ['#FFF3CC', '#8A5A00'] }[tone];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: m[0], borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}><Txt weight={600} size={11.5} color={m[1]}>{label}</Txt></View>;
}
function Panel({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const st = [{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: HAIR, padding: SP.l }, style];
  return onPress ? <Pressable onPress={onPress} style={st}>{children}</Pressable> : <View style={st}>{children}</View>;
}
function SegTabs({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#F1EEF6', borderRadius: 14, padding: 4 }}>
      {items.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="button" accessibilityState={{ selected: value === k }}
          style={{ flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: value === k ? C.white : 'transparent', borderWidth: value === k ? 1 : 0, borderColor: HAIR }}>
          <Txt weight={value === k ? 700 : 600} size={14} color={value === k ? C.violet : GREY}>{l}</Txt>
        </Pressable>
      ))}
    </View>
  );
}
function Sec({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: SP.m }}>
      <Txt weight={700} size={18} color={C.ink} style={{ flexShrink: 1 }}>{title}</Txt>{right}
    </View>
  );
}

function Track({ si, photo }: { si: number; photo: any }) {
  const rm = useReduceMotion(), [tw, setTw] = useState(0), p = useRef(new Animated.Value(Math.max(si, 0) / 4)).current;
  useEffect(() => { Animated.timing(p, { toValue: Math.max(si, 0) / 4, duration: rm ? 0 : 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() }, [si, rm]);
  const left = p.interpolate({ inputRange: [0, 1], outputRange: [0, tw] });
  return (
    <>
      <View onLayout={e => setTw(e.nativeEvent.layout.width)} style={{ marginTop: SP.xl, marginHorizontal: SP.s, height: 46 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 21, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.25)' }} />
        <Animated.View style={{ position: 'absolute', left: 0, top: 21, height: 4, borderRadius: 2, backgroundColor: C.gold, width: left }} />
        {STAGE_LABEL.map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: 15, left: (tw * i) / 4 - 8, width: 16, height: 16, borderRadius: 8, borderWidth: 3, backgroundColor: i <= si ? C.gold : C.violet2, borderColor: i <= si ? C.gold : 'rgba(255,255,255,.4)' }} />
        ))}
        <Animated.View style={{ position: 'absolute', top: 0, width: 46, height: 46, marginLeft: -23, left, borderRadius: 23, borderWidth: 3, borderColor: C.white, overflow: 'hidden', backgroundColor: C.violet, zIndex: 1 }}>
          <Image source={photo} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: SP.s, marginHorizontal: -6 }}>
        {STAGE_LABEL.map((l, i) => <Txt key={l} weight={600} size={10.5} color={i <= si ? C.white : 'rgba(255,255,255,.6)'} style={{ flex: 1, textAlign: 'center' }}>{l}</Txt>)}
      </View>
    </>
  );
}

function Timeline() {
  const rows = timeline();
  return (
    <Panel style={{ paddingVertical: SP.s }}>
      <View style={{ position: 'absolute', left: 32, top: 30, bottom: 30, width: 2, backgroundColor: HAIR }} />
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m, paddingVertical: SP.s }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: r.st === 'done' ? OK : r.st === 'now' ? C.violet : C.white, borderWidth: r.st === 'todo' ? 2 : 0, borderColor: HAIR }}>
            <Txt weight={800} size={12} color={r.st === 'todo' ? GREY : C.white}>{r.st === 'done' ? (r.icon || '✓') : r.st === 'now' ? '•' : ''}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0, opacity: r.st === 'todo' ? 0.55 : 1 }}>
            <Txt weight={600} size={14} color={C.ink}>{r.title}</Txt>
            {r.sub ? <Txt size={12} color={GREY}>{r.sub}</Txt> : null}
          </View>
          <Txt weight={600} size={12} color={GREY}>{r.at ? ampm(r.at) : ''}</Txt>
        </View>
      ))}
    </Panel>
  );
}

function Photos() {
  const d = doc(), ph = d.photos || [], before = ph.find(p => p.kind === 'before'), after = ph.find(p => p.kind === 'after');
  const tile = (p: (typeof ph)[number] | undefined, label: string, wait: string) => (
    <View style={{ flex: 1 }}>
      {p ? (
        <View style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1, borderColor: HAIR, overflow: 'hidden', backgroundColor: TINT2 }}>
          <Image source={typeof p.src === 'string' ? src(p.src)! : p.src} resizeMode={p.cut ? 'contain' : 'cover'} accessibilityLabel={`${label} photo`} style={[StyleSheet.absoluteFill, p.cut && { margin: 14 }]} />
          {p.local === 'before' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(80,50,10,.3)' }]} /> : null}
          <View style={{ position: 'absolute', left: 8, bottom: 8 }}><View style={{ backgroundColor: 'rgba(26,10,51,.7)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}><Txt weight={700} size={11} color={C.white}>{label}</Txt></View></View>
        </View>
      ) : (
        <View style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(84,9,218,.3)', backgroundColor: TINT2, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <Txt size={12} color={GREY} style={{ textAlign: 'center' }}>{wait}</Txt>
        </View>
      )}
    </View>
  );
  // one photo is the norm: the before tile only shows when there is one
  return (
    <View style={{ flexDirection: 'row', gap: SP.m }}>
      {before ? tile(before, 'Before', '') : null}
      {tile(after, before ? 'After' : 'Your car', 'Photo comes the moment the wash is done')}
      {!before ? <View style={{ flex: 1 }} /> : null}
    </View>
  );
}

const statusTone = (s: string): 'violet' | 'ok' | 'grey' => (s === 'done' ? 'ok' : s === 'skipped' ? 'grey' : 'violet');
const statusLabel = (s: string, notStarted?: boolean) => (notStarted ? 'Scheduled' : ({ scheduled: 'Scheduled', on_the_way: 'On the way', arrived: 'Arrived', washing: 'In progress', done: 'Completed', skipped: 'Skipped' } as Record<string, string>)[s] || 'Scheduled');

/* ---- booking detail: dark violet header (service in progress / completed) + white rounded sheet ---- */
function Detail({ onBack }: { onBack: () => void }) {
  const ui = useApp(), c = car(), h = liveHead(c), d = h.doc, showNote = !!d.washer_note && d.status === 'done';
  const live = d.status === 'on_the_way' || d.status === 'arrived' || d.status === 'washing', done = d.status === 'done';
  const hist = history7(c);
  return (
    <>
      <View style={{ backgroundColor: C.violet2, marginHorizontal: -SP.page, marginTop: -SP.l, paddingHorizontal: SP.page, paddingTop: SP.l, paddingBottom: 56 }}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to bookings" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Txt weight={700} size={22} color={C.white}>←</Txt>
        </Pressable>
        <View style={{ alignItems: 'center', marginTop: SP.s }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: done ? OK : 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }}>
            {live ? <Pulse color={C.gold} size={14} /> : <Txt weight={800} size={26} color={C.white}>{done ? '✓' : '•'}</Txt>}
          </View>
          <Txt weight={700} size={13} color="rgba(255,255,255,.75)" style={{ marginTop: SP.m }}>{`${c.make ? c.make + ' ' : ''}${c.name} · ${maskPlate(c.plate)}`}</Txt>
          <Txt weight={700} size={24} color={C.white} style={{ marginTop: 4, textAlign: 'center' }}>{h.big}</Txt>
          <Txt size={13.5} color="rgba(255,255,255,.8)" style={{ marginTop: SP.s, textAlign: 'center' }}>{h.sub}</Txt>
        </View>
        {h.stage >= 0 ? <Track si={h.stage} photo={avatar(d)} /> : null}
      </View>
      <View style={{ backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginHorizontal: -SP.page, marginTop: -28, paddingHorizontal: SP.page, paddingTop: SP.xl }}>
        <Panel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m }}>
            <Image source={avatar(d)} resizeMode="cover" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: TINT }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={15} color={C.ink}>{h.washer}</Txt>
              <Txt size={12} color={GREY}>{`★ 4.9 · your washer${c.status !== 'new' ? ` · ${c.washes} washes on this car` : ''}`}</Txt>
            </View>
            <Pressable onPress={() => sheets.tip()} accessibilityRole="button" accessibilityLabel="Tip your washer"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: TINT }}>
              <Heart size={14} strokeWidth={2.4} color={C.violet} /><Txt weight={700} size={13} color={C.violet}>Tip</Txt>
            </Pressable>
          </View>
        </Panel>
        {showNote ? (
          <Panel style={{ marginTop: SP.m, backgroundColor: TINT2 }}>
            <Txt weight={700} size={13.5} color={C.ink}>{`From ${d.washer?.name || c.washer}`}</Txt>
            <Txt size={13.5} color={GREY} style={{ marginTop: 2 }}>{d.washer_note}</Txt>
          </Panel>
        ) : null}
        <View style={{ marginTop: SP.section }}>
          <Sec title="This morning" right={<Txt size={13} color={GREY}>{fmt(d.date || iso(TODAY), { weekday: 'long', day: 'numeric', month: 'short' })}</Txt>} />
          <Timeline />
        </View>
        <View style={{ marginTop: SP.section }}>
          <Sec title="Photos" right={<Pressable onPress={() => sheets.proof()} hitSlop={8}><Txt weight={700} size={13} color={C.violet}>Compare</Txt></Pressable>} />
          <Photos />
        </View>
        <View style={{ marginTop: SP.section }}>
          <Pressable disabled={!!ui.sim} onPress={() => act.replay()} style={{ minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.violet, alignItems: 'center', justifyContent: 'center', opacity: ui.sim ? 0.6 : 1 }}>
            <Txt weight={700} size={15} color={C.violet}>{ui.sim ? 'Playing back…' : 'Replay this morning, live'}</Txt>
          </Pressable>
          <Txt size={12} color={GREY} style={{ textAlign: 'center', marginTop: SP.m }}>Plays the morning back step by step, the way it arrives from the washer app.</Txt>
        </View>
        {hist.length ? <Txt size={12} color={GREY} style={{ textAlign: 'center', marginTop: SP.l }}>Earlier mornings are under Previous.</Txt> : null}
      </View>
    </>
  );
}

function BookingCard({ title, sub, when, status, tone, photo, onPress }: { title: string; sub?: string; when: string; status: string; tone: 'violet' | 'ok' | 'grey'; photo?: any; onPress: () => void }) {
  return (
    <Panel onPress={onPress} style={{ marginBottom: SP.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Tag label={status} tone={tone} />
        <Txt weight={600} size={12.5} color={GREY}>{when}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m, marginTop: SP.m }}>
        <Image source={photo || IMG.washer} resizeMode="cover" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TINT }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={700} size={15} color={C.ink}>{title}</Txt>
          {sub ? <Txt size={12.5} color={GREY} style={{ marginTop: 1 }} numberOfLines={2}>{sub}</Txt> : null}
        </View>
        <Txt weight={600} size={18} color={GREY}>›</Txt>
      </View>
    </Panel>
  );
}

export default function Live() {
  const ui = useApp(), c = car(), d = doc(c), ref = useRef<any>(null), live = syncLive();
  const [tab, setTab] = useState<'up' | 'prev'>('up'), [view, setView] = useState<'list' | 'detail'>('list');
  useEffect(() => { if (ui.tabNonce) { setView('list'); ref.current?.scrollTo({ y: 0, animated: true }) } }, [ui.tabNonce]);
  const h = liveHead(c), hist = history7(c), over = d.status === 'done' || d.status === 'skipped';
  const chip = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: TINT }}>
      <Pulse color={live ? OK : C.gold} size={7} still={!live} />
      <Txt weight={600} size={11.5} color={C.violet}>{live ? 'Live' : 'Test data'}</Txt>
    </View>
  );
  const today = (
    <BookingCard key="today" title={h.big} sub={`${c.make ? c.make + ' ' : ''}${c.name} · ${maskPlate(c.plate)} · ${h.washer}`} when={`Today${d.eta ? ', ' + ampm(d.eta) : ''}`}
      status={statusLabel(d.status, d.notStarted)} tone={statusTone(d.status)} photo={avatar(d)} onPress={() => setView('detail')} />
  );
  return (
    <Page {...({ ref } as any)} bottom={120}
      header={<Topbar left={view === 'list' ? <Txt weight={700} size={22} color={C.ink}>My Bookings</Txt> : <Txt weight={700} size={18} color={C.ink}>Booking details</Txt>}
        right={view === 'list' ? <Pressable onPress={() => sheets.help()} accessibilityRole="button" style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={13} color={C.violet}>Help</Txt></Pressable> : chip} />}>
      {view === 'detail' ? <Detail onBack={() => setView('list')} /> : (
        <>
          <View style={{ marginTop: SP.s }}><SegTabs items={[['up', 'Upcoming'], ['prev', 'Previous']]} value={tab} onChange={v => setTab(v as 'up' | 'prev')} /></View>
          <View style={{ marginTop: SP.l }}>
            {tab === 'up' ? (over ? <Empty title="No upcoming washes" sub="Your next morning wash shows up here as soon as it is scheduled." /> : today) : (
              <>
                {over ? today : null}
                {hist.map(([dt, title, sub]) => (
                  <Panel key={iso(dt)} onPress={() => sheets.day(iso(dt))} style={{ marginBottom: SP.m }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Tag label={/skipped|paused/i.test(title) ? 'Not washed' : 'Completed'} tone={/skipped|paused/i.test(title) ? 'grey' : 'ok'} />
                      <Txt weight={600} size={12.5} color={GREY}>{fmt(dt, { weekday: 'short', day: 'numeric', month: 'short' })}</Txt>
                    </View>
                    <Txt weight={700} size={14.5} color={C.ink} style={{ marginTop: SP.m }}>{title}</Txt>
                    <Txt size={12.5} color={GREY} style={{ marginTop: 2 }}>{sub || 'Pressure wash, hand dry'}</Txt>
                  </Panel>
                ))}
                {!over && !hist.length ? <Empty title="Nothing yet" sub="Your mornings show up here after the first wash." /> : null}
              </>
            )}
          </View>
        </>
      )}
    </Page>
  );
}

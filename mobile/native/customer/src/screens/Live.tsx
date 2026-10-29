// Live tab: today's wash as it happens (status, 5-node track, washer, note, timeline, photos, replay, last 7 mornings).
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, InkContext, useTheme } from '../theme';
import { Txt, Card, Hard, Btn, Pill, Page, Topbar, Eyebrow, Rows, Row, BigTitle, Empty } from '../ui/kit';
import { Heart } from '../ui/icons';
import { IMG, src } from '../img';
import { TODAY, fmt, iso, ampm } from '../data/dates';
import { STAGE_LABEL } from '../data/model';
import { useApp, car, doc, act, maskPlate, liveHead, timeline, history7, syncLive } from '../state';
import { sheets } from '../sheets';
import { Head, LinkTxt, Pulse, useReduceMotion, edgeOf } from './Home';

const avatar = (d: ReturnType<typeof doc>) => (d.washer?.photo_url ? { uri: d.washer.photo_url } : IMG.washer);

function Track({ si, photo }: { si: number; photo: any }) {
  const T = useTheme(), ink = T.block, rm = useReduceMotion(), [tw, setTw] = useState(0), p = useRef(new Animated.Value(Math.max(si, 0) / 4)).current;
  useEffect(() => { Animated.timing(p, { toValue: Math.max(si, 0) / 4, duration: rm ? 0 : 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start() }, [si, rm]);
  const left = p.interpolate({ inputRange: [0, 1], outputRange: [0, tw] });
  return (
    <>
      <View onLayout={e => setTw(e.nativeEvent.layout.width)} style={{ marginTop: 24, marginHorizontal: 8, height: 46 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 21, height: 4, borderRadius: 2, backgroundColor: ink.line }} />
        <Animated.View style={{ position: 'absolute', left: 0, top: 21, height: 4, borderRadius: 2, backgroundColor: C.gold, width: left }} />
        {STAGE_LABEL.map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: 15, left: (tw * i) / 4 - 8, width: 16, height: 16, borderRadius: 8, borderWidth: 3, backgroundColor: i <= si ? C.gold : C.violet2, borderColor: i <= si ? C.gold : 'rgba(255,246,233,.35)' }} />
        ))}
        <Animated.View style={{ position: 'absolute', top: 0, width: 46, height: 46, marginLeft: -23, left, borderRadius: 23, borderWidth: 3, borderColor: C.gold, overflow: 'hidden', backgroundColor: C.violet, zIndex: 1 }}>
          <Image source={photo} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6, marginHorizontal: -6 }}>
        {STAGE_LABEL.map((l, i) => <Txt key={l} weight={600} size={10.5} color={i <= si ? ink.fg : ink.fg3} style={{ flex: 1, textAlign: 'center' }}>{l}</Txt>)}
      </View>
    </>
  );
}

function LiveHero() {
  const T = useTheme(), ink = T.block, c = car(), h = liveHead(c), d = h.doc;
  return (
    <Hard dx={8} dy={8} radius={28} color={T.shadow} style={{ marginTop: 18 }}>
      <View style={{ borderRadius: T.day ? 28 : 24, borderWidth: T.day ? 12 : 1, borderColor: T.day ? C.gold : T.blockBorder, overflow: 'hidden', padding: 20, backgroundColor: C.violet }}>
        <LinearGradient colors={[C.violet, C.violet2]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
        <InkContext.Provider value={ink}>
          <Eyebrow>{`${c.make ? c.make + ' ' : ''}${c.name} · ${maskPlate(c.plate)}`}</Eyebrow>
          <Txt font="shout" size={40} upper style={{ marginTop: 10, lineHeight: 38 }}>{h.big}</Txt>
          <Txt size={13.5} color={ink.fg2} style={{ marginTop: 6 }}>{h.sub}</Txt>
          {h.stage >= 0 ? <Track si={h.stage} photo={avatar(d)} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: ink.line }}>
            <Image source={avatar(d)} resizeMode="cover" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.violet2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={14}>{h.washer}</Txt>
              <Txt size={12} color={ink.fg3}>{`★ 4.9 · your washer${c.status !== 'new' ? ` · ${c.washes} washes on this car` : ''}`}</Txt>
            </View>
            <Pill gold label="Tip" icon={<Heart size={14} strokeWidth={2.4} />} onPress={() => sheets.tip()} style={{ marginRight: 3, marginBottom: 3 }} />
          </View>
        </InkContext.Provider>
      </View>
    </Hard>
  );
}

function Timeline() {
  const T = useTheme(), ink = T.card, rows = timeline();
  return (
    <Card pad={0} style={{ marginTop: 0 }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={{ position: 'absolute', left: 31, top: 28, bottom: 28, width: 2, backgroundColor: ink.line }} />
        {rows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: r.st === 'done' ? '#2EE6A6' : r.st === 'now' ? C.gold : T.cardBg, borderColor: r.st === 'done' ? '#2EE6A6' : r.st === 'now' ? C.gold : ink.line }}>
              <Txt weight={800} size={13} color={r.st === 'todo' ? ink.fg : C.ink}>{r.st === 'done' ? r.icon || '✓' : r.st === 'now' ? '•' : ''}</Txt>
            </View>
            <View style={{ flex: 1, minWidth: 0, opacity: r.st === 'todo' ? 0.5 : 1 }}>
              <Txt weight={600} size={14}>{r.title}</Txt>
              {r.sub ? <Txt size={12} color={ink.fg3}>{r.sub}</Txt> : null}
            </View>
            <Txt weight={700} size={12} color={ink.fg2}>{r.at ? ampm(r.at) : ''}</Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Photos() {
  const T = useTheme(), ink = T.card, d = doc(), ph = d.photos || [], before = ph.find(p => p.kind === 'before'), after = ph.find(p => p.kind === 'after');
  const tile = (p: (typeof ph)[number] | undefined, label: string, wait: string) => (
    <View style={{ flex: 1 }}>
      {p ? (
        <Hard dx={5} dy={5} radius={20} color={T.day ? C.violetInk : null} reserve={false}>
          <View style={{ aspectRatio: 1, borderRadius: 20, borderWidth: T.day ? 6 : 0, borderColor: C.gold, overflow: 'hidden', backgroundColor: ink.tile2 }}>
            {p.cut ? <LinearGradient colors={[C.violet, C.violetNight]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
            <Image source={typeof p.src === 'string' ? src(p.src)! : p.src} resizeMode={p.cut ? 'contain' : 'cover'} accessibilityLabel={`${label} photo`} style={[StyleSheet.absoluteFill, p.cut && { margin: 14 }]} />
            {p.local === 'before' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(80,50,10,.3)' }]} /> : null}
            <View style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: T.day ? C.gold : 'rgba(0,0,0,.6)', borderWidth: T.day ? 2 : 0, borderColor: C.ink, borderRadius: 7, paddingVertical: 3, paddingHorizontal: 7 }}>
              <Txt weight={800} size={10.5} upper color={T.day ? C.ink : C.white} style={{ letterSpacing: 0.8 }}>{label}</Txt>
            </View>
          </View>
        </Hard>
      ) : (
        <View style={{ aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.page.dash, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <Txt size={12} color={T.page.fg3} style={{ textAlign: 'center' }}>{wait}</Txt>
        </View>
      )}
    </View>
  );
  // one photo is the norm: the before tile only shows when there is one
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {before ? tile(before, 'Before', '') : null}
      {tile(after, before ? 'After' : 'Your car', 'Photo comes the moment the wash is done')}
      {!before ? <View style={{ flex: 1 }} /> : null}
    </View>
  );
}

export default function Live() {
  const ui = useApp(), T = useTheme(), c = car(), d = doc(c), ref = useRef<any>(null), [stuck, setStuck] = useState(false), live = syncLive();
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  const hist = history7(c), showNote = !!d.washer_note && d.status === 'done';
  const chip = (
    <Hard dx={3} dy={3} radius={999} color={T.day ? C.ink : null} reserve={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, backgroundColor: T.day ? C.cream : 'rgba(255,255,255,.1)', borderWidth: T.day ? 3 : 1, borderColor: edgeOf(T) }}>
        <Pulse color={live ? '#2EE6A6' : C.gold} size={7} still={!live} />
        <Txt weight={600} size={11.5} color={T.day ? C.ink : C.cream}>{live ? 'Live' : 'Test data'}</Txt>
      </View>
    </Hard>
  );
  return (
    <Page {...({ ref } as any)} bottom={120} scrollEventThrottle={32} onScroll={(e: any) => { const s = e.nativeEvent.contentOffset.y > 40; if (s !== stuck) setStuck(s) }}
      header={<Topbar left={<Eyebrow>Live from your washer</Eyebrow>} title={stuck ? 'Live' : undefined} right={<View style={{ marginRight: 3 }}>{chip}</View>} />}>
      <BigTitle em="as it happens.">Your wash,</BigTitle>
      <LiveHero />
      {showNote ? (
        <Card pad={14} style={{ marginTop: 28 }} inner={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Image source={IMG.washer} resizeMode="cover" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.violet }} />
            <View style={{ flex: 1 }}>
              <Txt weight={700} size={13.5}>{`From ${d.washer?.name || c.washer}`}</Txt>
              <Txt size={13.5} color={T.card.fg2} style={{ marginTop: 2 }}>{d.washer_note}</Txt>
            </View>
          </View>
        </Card>
      ) : null}
      <View style={{ marginTop: 28 }}>
        <Head title="This morning" right={<Txt size={13} color={T.page.fg3}>{fmt(d.date || iso(TODAY), { weekday: 'long', day: 'numeric', month: 'short' })}</Txt>} />
        <Timeline />
      </View>
      <View style={{ marginTop: 28 }}>
        <Head title="Photos" right={<LinkTxt label="Compare" onPress={() => sheets.proof()} />} />
        <Photos />
      </View>
      <View style={{ marginTop: 28 }}>
        <Btn variant="ghost" label="Replay this morning, live" busy={ui.sim ? 'Playing back…' : false} onPress={() => act.replay()} />
        <Txt size={11} color={T.page.fg3} style={{ textAlign: 'center', marginTop: 10 }}>Plays the morning back step by step, the way it arrives from the washer app.</Txt>
      </View>
      <View style={{ marginTop: 28 }}>
        <Head title="Last 7 mornings" />
        <Rows>
          {hist.length ? hist.map(([dt, title, sub]) => (
            <Row key={iso(dt)} onPress={() => sheets.day(iso(dt))} chev title={title} sub={sub || 'Pressure wash, hand dry'}
              icon={<Txt weight={600} size={12} style={{ textAlign: 'center', lineHeight: 13 }}>{`${fmt(dt, { weekday: 'short' })}\n${dt.getDate()}`}</Txt>} />
          )) : <Row title="Nothing yet" sub="Your mornings show up here after the first wash." />}
        </Rows>
      </View>
    </Page>
  );
}

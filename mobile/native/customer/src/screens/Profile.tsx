// Profile tab: avatar and stats, garage, look, refer, wash details, notifications, help. Ported from renderProfile.
import React, { useEffect, useRef } from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, InkContext, creamInk, SP, R as RAD, HIT } from '../theme';
import { Page, Topbar, IconBtn, Txt, Card, Rows, Row, Pill, Toggle, Hard, CountUp, PAD, useTheme, useInk } from '../ui/kit';
import { Pen, Pin, Clock, Key, WhatsApp, Warn, Drop, Logout, GhostCar } from '../ui/icons';
import { inGroup } from '../data/dates';
import { src } from '../img';
import { A, car, carImg, planOf, maskPlate, totals, refCode, fmtPhone, act, S, REAL, useApp } from '../state';
import { sheets } from '../sheets';

function Head({ title, right }: { title: string; right?: string }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: SP.l }}>
      <Txt font="shout" size={30} upper style={[{ flexShrink: 1 }, T.day && { textShadowColor: C.violetInk, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }]}>{title}</Txt>
      {right ? <Txt size={13} color={ink.fg3}>{right}</Txt> : null}
    </View>
  );
}
const Sec = ({ children }: { children: React.ReactNode }) => <View style={{ marginTop: SP.section }}>{children}</View>;
const rail = { marginHorizontal: -PAD } as const;
const tint = (bg: string, icon: React.ReactNode) => ({ tile: bg, icon });

function Garage() {
  const T = useTheme(), a = A();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rail} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: SP.s, paddingTop: SP.hair }}>
      {a.cars.map((g, i) => {
        const on = i === S.carIdx, im = carImg(g), ink = on ? T.block : T.card;
        const body = (
          <>
            <View style={{ height: 84, alignItems: 'center', justifyContent: 'center' }}>
              {im ? <Image source={src(im)!} resizeMode="contain" style={{ width: '100%', height: 84 }} /> : <GhostCar width={160} color={ink.fg3} />}
            </View>
            <Txt weight={700} style={{ marginTop: SP.s }}>{(g.make ? g.make + ' ' : '') + g.name}</Txt>
            <Txt size={12} color={ink.fg3}>{maskPlate(g.plate)} · {planOf(g).name}{g.status === 'new' ? ' · starts tomorrow' : ''}</Txt>
          </>
        );
        return on ? (
          <Hard key={g.id} dx={6} dy={6} radius={RAD.card} style={{ width: 226, marginRight: SP.l }}>
            <InkContext.Provider value={ink}>
              <Pressable onPress={() => act.pickCar(i)} style={{ backgroundColor: T.day ? C.violetDeep : C.violet2, borderWidth: 3, borderColor: T.day ? C.gold : C.gold, borderRadius: RAD.card, padding: SP.l }}>{body}</Pressable>
            </InkContext.Provider>
          </Hard>
        ) : <Card key={g.id} pad={SP.l} style={{ width: 226, marginRight: SP.l }} onPress={() => act.pickCar(i)}>{body}</Card>;
      })}
      <Pressable onPress={() => sheets.addCar()} style={{ width: 220, minHeight: 150, marginRight: SP.l, marginBottom: 6, borderRadius: RAD.card, borderWidth: 3, borderStyle: 'dashed', borderColor: T.page.dash, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={30} color={T.page.fg2} style={{ lineHeight: 32 }}>＋</Txt>
        <Txt weight={600} color={T.page.fg2} style={{ marginTop: SP.s }}>Add a car</Txt>
        <Txt size={12} color={T.page.fg3}>Add a second car</Txt>
      </Pressable>
    </ScrollView>
  );
}

function Look() {
  const T = useTheme(), cur = S.theme;
  const items: [typeof cur, string, React.ReactNode][] = [
    ['light', 'Day', <View style={{ flex: 1, backgroundColor: '#5409DA' }} />],
    ['dark', 'Night', <View style={{ flex: 1, backgroundColor: '#1A0A33' }} />],
    ['system', 'Auto', <View style={{ flex: 1, flexDirection: 'row' }}><View style={{ flex: 1, backgroundColor: '#5409DA' }} /><View style={{ flex: 1, backgroundColor: '#1A0A33' }} /></View>],
  ];
  return (
    <View style={{ flexDirection: 'row', gap: SP.m }}>
      {items.map(([k, label, sw]) => {
        const on = cur === k;
        return (
          <View key={k} style={{ flex: 1 }}>
            <Hard dx={4} dy={4} radius={RAD.card} color={on && T.day ? C.ink : null} reserve={false}>
              <Pressable onPress={() => act.setTheme(k)} style={{ padding: SP.m, borderRadius: RAD.card, borderWidth: 2.5, borderColor: on && !T.day ? C.gold : T.day ? C.ink : T.card.line, backgroundColor: T.day ? C.cream : T.card.tile, ...(on && T.day ? { outlineWidth: 3, outlineColor: C.gold } as object : null) }}>
                <View style={{ height: 52, borderRadius: RAD.inner, overflow: 'hidden', marginBottom: SP.s }}>
                  {sw}
                  <View style={{ position: 'absolute', left: 10, right: 10, bottom: 8, height: 16, borderRadius: 6, backgroundColor: C.violet }} />
                </View>
                <Txt weight={700} size={12.5} style={{ textAlign: 'center' }} color={T.day ? C.ink : C.cream}>{label}</Txt>
              </Pressable>
            </Hard>
          </View>
        );
      })}
    </View>
  );
}

export default function Profile() {
  const { tabNonce } = useApp(), T = useTheme(), ink = T.page;
  const sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const a = A(), c = car(), tt = totals(), open = a.requests.filter(r => r.open).length;
  const initials = a.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const stat = (n: number, l: string) => (
    <Card key={l} pad={SP.m} style={{ flex: 1 }} inner={{ paddingVertical: SP.l }}>
      <CountUp to={n} font="shout" size={28} format={v => inGroup(Math.round(v))} />
      <Txt weight={600} size={11} color={T.card.fg3}>{l}</Txt>
    </Card>
  );
  const det = [
    ['parking', 'Where the car is parked', c.parking, 'rgba(46,139,255,.16)', <Pin size={18} color={C.sky} />],
    ['window', 'Wash window', c.window, 'rgba(255,186,8,.2)', <Clock size={18} color="#C98A00" />],
    ['keys', 'Interior cleaning access', c.keys, 'rgba(255,106,26,.16)', <Key size={18} color={C.orange} />],
  ] as const;
  const prefs = [['photo', 'Photo when my car is done', 'On WhatsApp, every morning'], ['pay', 'Payment reminder', '3 days before my plan runs out'], ['drops', 'New store drops', 'Twice a month at most']] as const;
  return (
    <Page {...({ ref: sc } as any)} header={<Topbar right={<IconBtn label="Edit profile" onPress={() => sheets.editName()}><Pen size={22} /></IconBtn>} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.l, marginTop: SP.s }}>
        <Hard dx={4} dy={4} radius={38} color={T.day ? C.ink : null} reserve={false}>
          <LinearGradient colors={[C.gold, C.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 76, height: 76, borderRadius: 38, borderWidth: T.day ? 3 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Txt font="hero" size={30} color={C.ink}>{initials}</Txt>
          </LinearGradient>
        </Hard>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={700} size={22} style={{ letterSpacing: -0.4 }}>{a.name}</Txt>
          <Txt size={13} color={ink.fg2}>{`+91 ${a.phone.slice(0, 2)}•••• •${a.phone.slice(-4)} · Member since ${a.since}`}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SP.l, marginTop: SP.xl }}>
        {stat(tt.washes, 'Washes')}{stat(tt.litres, 'Litres saved*')}{stat(tt.streak, 'Day streak')}
      </View>
      <Txt size={13} color={ink.fg3} style={{ marginTop: SP.s }}>*Against a bucket wash. A pressure wash uses about 7 litres a car.</Txt>

      <Sec><Head title="My garage" right="Tap to switch" /><Garage /></Sec>

      {a.requests.length ? (
        <Sec><Head title="Activity" />
          <Rows><Row icon={<Txt weight={800} color={C.red}>↺</Txt>} tile="rgba(232,56,79,.14)" title="Re-wash requests" sub={`${open} open`} chev onPress={() => sheets.requests()} /></Rows>
        </Sec>
      ) : null}

      <Sec><Head title="Look" /><Look /></Sec>

      <Sec>
        <Hard dx={8} dy={8} radius={RAD.card + 4} style={{ transform: [{ rotate: '-1deg' }] }}>
          <InkContext.Provider value={creamInk}>
            <View style={{ backgroundColor: C.gold, borderRadius: RAD.card + 4, borderWidth: T.day ? 3 : 0, borderColor: C.ink, padding: SP.card, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] }}>
                <Txt font="shout" size={30} color={C.cream} style={{ marginLeft: -14, marginTop: 14 }}>₹200</Txt>
              </View>
              <Txt font="shout" size={34} upper style={{ paddingRight: 84, marginBottom: SP.s }}>Get a neighbour off pocha</Txt>
              <Txt size={13} style={{ marginBottom: SP.l }}>They get ₹200 off their first month. You get ₹200 off your next.</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: SP.s, paddingLeft: SP.l, paddingRight: SP.s, borderRadius: RAD.ctl, backgroundColor: C.ink }}>
                <Txt font="shout" size={22} color={C.cream} style={{ letterSpacing: 2.6 }}>{refCode()}</Txt>
                <Pill gold label="Copy invite" onPress={() => act.copyRef()} />
              </View>
            </View>
          </InkContext.Provider>
        </Hard>
      </Sec>

      <Sec><Head title="Wash details" right={`For your ${c.name}`} />
        <Rows>{det.map(r => <Row key={r[0]} tile={r[3]} icon={r[4]} title={r[1]} sub={r[2]} chev onPress={() => sheets.editDetail(r[0])} />)}</Rows>
      </Sec>

      <Sec><Head title="Notifications" />
        <Rows>{prefs.map(n => <Row key={n[0]} title={n[1]} sub={n[2]} right={<Toggle on={!!a.prefs[n[0]]} onChange={() => act.togglePref(n[0])} />} />)}</Rows>
      </Sec>

      <Sec><Head title="Help" />
        <Rows>
          <Row {...tint('rgba(20,192,138,.15)', <WhatsApp size={18} color={C.mint} />)} title="WhatsApp Washing Daddy" sub="77018 08924 · 7 AM to 9 PM" chev onPress={() => sheets.help()} />
          <Row {...tint('rgba(232,56,79,.14)', <Warn size={18} color={C.red} />)} title="Report a missed spot" sub="We re-wash it the same day" chev onPress={() => sheets.issue()} />
          <Row {...tint('rgba(84,9,218,.14)', <Drop size={18} color={C.violet} />)} title="Washer app" sub={REAL ? 'For Washing Daddy staff' : 'For Washing Daddy staff · OTP 1234'} chev onPress={() => act.openUrl('https://washingdaddy.com/get/')} />
          <Row {...tint('rgba(232,56,79,.14)', <Txt weight={800} color={C.red}>✕</Txt>)} title="Delete my account" sub="We remove your number and car details" chev onPress={() => sheets.deleteAccount()} />
          <Row icon={<Logout size={18} />} title="Log out" sub={'Signed in as +91 ' + fmtPhone(a.phone)} onPress={() => sheets.logout()} />
        </Rows>
      </Sec>

      <View style={{ alignItems: 'center', marginTop: SP.section }}>
        <Txt font="hero" size={26} color={T.day ? C.gold : ink.fg3} style={{ marginBottom: SP.s, opacity: T.day ? 1 : 0.6 }}>Washing Daddy!</Txt>
        <Txt size={12} color={T.day ? ink.fg2 : ink.fg3} style={{ textAlign: 'center' }}>{'Washing Daddy Private Limited · New Delhi' + (REAL ? '' : '\nPrototype. Sign-in, payments and orders use test data.')}</Txt>
      </View>
    </Page>
  );
}

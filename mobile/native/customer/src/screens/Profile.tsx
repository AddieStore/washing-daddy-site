// Profile (Pronto look): name and phone, refer banner, quick tiles, garage, wash details, notifications, help, account rows.
import React, { useEffect, useRef } from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SP } from '../theme';
import { Page, Txt, Toggle, CountUp, PAD } from '../ui/kit';
import { Pin, Clock, Key, WhatsApp, Warn, Drop, Logout, GhostCar, Chev, Cart, Book, Help, Pen, Sun, Moon, Auto } from '../ui/icons';
import { P, Light, PCard, PRows, PRow, PHead, PTop, PIconBtn, PChip } from '../ui/pr';
import { inGroup } from '../data/dates';
import { src } from '../img';
import { A, car, carImg, planOf, maskPlate, totals, fmtPhone, act, go, S, REAL, useApp } from '../state';
import { sheets } from '../sheets';

const Sec = ({ children }: { children: React.ReactNode }) => <View style={{ marginTop: SP.section }}>{children}</View>;
const rail = { marginHorizontal: -PAD } as const;

function Garage() {
  const a = A();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rail} contentContainerStyle={{ paddingHorizontal: PAD, gap: SP.m }}>
      {a.cars.map((g, i) => {
        const on = i === S.carIdx, im = carImg(g);
        return (
          <Pressable key={g.id} onPress={() => act.pickCar(i)} style={{ width: 220, borderRadius: 18, padding: SP.l, backgroundColor: on ? P.tint2 : P.card, borderWidth: on ? 1.5 : 1, borderColor: on ? C.violet : P.line }}>
            <View style={{ height: 84, alignItems: 'center', justifyContent: 'center' }}>
              {im ? <Image source={src(im)!} resizeMode="contain" style={{ width: '100%', height: 84 }} /> : <GhostCar width={160} color={P.grey} />}
            </View>
            <Txt weight={700} color={P.ink} style={{ marginTop: SP.s }}>{(g.make ? g.make + ' ' : '') + g.name}</Txt>
            <Txt size={12} color={P.grey}>{maskPlate(g.plate)} · {planOf(g).name}{g.status === 'new' ? ' · starts tomorrow' : ''}</Txt>
            {on ? <View style={{ alignSelf: 'flex-start', marginTop: SP.s, backgroundColor: C.violet, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Txt weight={700} size={10.5} color="#FFFFFF">SELECTED</Txt></View> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={() => sheets.addCar()} style={{ width: 180, minHeight: 150, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CDBDF2', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: P.tint, alignItems: 'center', justifyContent: 'center' }}><Txt size={24} color={C.violet} style={{ lineHeight: 28 }}>+</Txt></View>
        <Txt weight={600} color={P.ink} style={{ marginTop: SP.s }}>Add a car</Txt>
        <Txt size={12} color={P.grey}>Add a second car</Txt>
      </Pressable>
    </ScrollView>
  );
}

function Look() {
  const cur = S.theme;
  const items: [typeof cur, string, React.ReactNode][] = [['light', 'Day', <Sun size={16} color={cur === 'light' ? C.violet : P.grey} />], ['dark', 'Night', <Moon size={16} color={cur === 'dark' ? C.violet : P.grey} />], ['system', 'Auto', <Auto size={16} color={cur === 'system' ? C.violet : P.grey} />]];
  return (
    <View style={{ flexDirection: 'row', gap: SP.s }}>
      {items.map(([k, label, ic]) => {
        const on = cur === k;
        return (
          <Pressable key={k} onPress={() => act.setTheme(k)} style={{ flex: 1, minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: on ? C.violet : P.line, backgroundColor: on ? P.tint : '#FFFFFF' }}>
            {ic}<Txt weight={on ? 700 : 600} size={13.5} color={on ? C.violet : P.ink}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Profile() {
  const { tabNonce } = useApp();
  const sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const a = A(), c = car(), tt = totals(), open = a.requests.filter(r => r.open).length;
  const initials = a.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const stat = (n: number, l: string) => (
    <PCard key={l} pad={SP.m} style={{ flex: 1 }}>
      <CountUp to={n} weight={700} size={24} color={P.ink} format={v => inGroup(Math.round(v))} />
      <Txt weight={600} size={11} color={P.grey}>{l}</Txt>
    </PCard>
  );
  const tile = (label: string, ic: React.ReactNode, f: () => void) => (
    <Pressable key={label} onPress={f} style={{ flex: 1, alignItems: 'center', gap: SP.s, paddingVertical: SP.l, borderRadius: 18, backgroundColor: P.card, borderWidth: 1, borderColor: P.line }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: P.tint, alignItems: 'center', justifyContent: 'center' }}>{ic}</View>
      <Txt weight={600} size={12.5} color={P.ink} style={{ textAlign: 'center' }}>{label}</Txt>
    </Pressable>
  );
  const det = [
    ['parking', 'Where the car is parked', c.parking, <Pin size={18} color={C.violet} />],
    ['window', 'Wash window', c.window, <Clock size={18} color={C.violet} />],
    ['keys', 'Interior cleaning access', c.keys, <Key size={18} color={C.violet} />],
  ] as const;
  const prefs = [['photo', 'Photo when my car is done', 'On WhatsApp, every morning'], ['pay', 'Payment reminder', '3 days before my plan runs out'], ['drops', 'New store drops', 'Twice a month at most']] as const;
  return (
    <Light>
      <Page {...({ ref: sc } as any)} style={{ backgroundColor: '#FFFFFF' }}
        header={<PTop left={<PIconBtn label="Back" onPress={() => go('home')}><View style={{ transform: [{ rotate: '180deg' }] }}><Chev size={20} color={P.ink} /></View></PIconBtn>} title="Profile" />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.l }}>
          <LinearGradient colors={[C.violet, '#8B5CF0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={700} size={26} color="#FFFFFF">{initials}</Txt>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt weight={700} size={22} color={P.ink} style={{ letterSpacing: -0.4 }}>{a.name}</Txt>
            <Txt size={13} color={P.grey}>{`+91 ${a.phone.slice(0, 2)}•••• •${a.phone.slice(-4)}`}</Txt>
            <Txt size={12} color={P.grey}>{`Member since ${a.since}`}</Txt>
          </View>
          <Pressable onPress={() => sheets.editName()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.tint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Pen size={14} color={C.violet} /><Txt weight={700} size={12.5} color={C.violet}>Edit</Txt>
          </Pressable>
        </View>

        <Pressable onPress={() => sheets.refer()} style={{ marginTop: SP.xl }}>
          <LinearGradient colors={[C.violet, '#7B3FF0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: SP.l, flexDirection: 'row', alignItems: 'center', gap: SP.m, overflow: 'hidden' }}>
            <View style={{ flex: 1 }}>
              <Txt weight={700} size={17} color="#FFFFFF">Refer a friend, you both get ₹200 off</Txt>
              <Txt size={12.5} color="rgba(255,255,255,.85)" style={{ marginTop: 2 }}>{a.credit && a.credit > 0 ? `Invite credit: ₹${a.credit} off your next payment` : 'Share your link and save on your plan'}</Txt>
            </View>
            <View style={{ backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}><Txt weight={700} size={13} color={C.ink}>Invite</Txt></View>
          </LinearGradient>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: SP.m, marginTop: SP.l }}>
          {tile('Washes', <Drop size={20} color={C.violet} />, () => go('live'))}
          {tile('Orders', <Cart size={20} color={C.violet} />, () => sheets.orders())}
          {tile('Help & Support', <Help size={20} color={C.violet} />, () => sheets.help())}
        </View>

        <View style={{ flexDirection: 'row', gap: SP.m, marginTop: SP.l }}>
          {stat(tt.washes, 'Washes')}{stat(tt.litres, 'Litres saved*')}{stat(tt.streak, 'Day streak')}
        </View>
        <Txt size={12} color={P.grey} style={{ marginTop: SP.s }}>*Against a bucket wash. A pressure wash uses about 7 litres a car.</Txt>

        <Sec><PHead title="My garage" right="Tap to switch" /><Garage /></Sec>

        <Sec><PHead title="Wash details" right={`For your ${c.name}`} />
          <PRows>{det.map(r => <PRow key={r[0]} icon={r[3]} title={r[1]} sub={r[2]} chev onPress={() => sheets.editDetail(r[0])} />)}</PRows>
        </Sec>

        {a.requests.length ? (
          <Sec><PHead title="Activity" />
            <PRows><PRow icon={<Txt weight={800} color={P.red}>↺</Txt>} tile="#FDE8EB" title="Re-wash requests" sub={`${open} open`} chev onPress={() => sheets.requests()} /></PRows>
          </Sec>
        ) : null}

        <Sec><PHead title="Look" /><Look /></Sec>

        <Sec><PHead title="Notifications" />
          <PRows>{prefs.map(n => <PRow key={n[0]} title={n[1]} sub={n[2]} right={<Toggle on={!!a.prefs[n[0]]} onChange={() => act.togglePref(n[0])} />} />)}</PRows>
        </Sec>

        <Sec><PHead title="Help & more" />
          <PRows>
            <PRow icon={<WhatsApp size={18} color={P.ok} />} tile="#DDF5EA" title="WhatsApp Washing Daddy" sub="77018 08924 · 7 AM to 9 PM" chev onPress={() => sheets.help()} />
            <PRow icon={<Warn size={18} color={P.red} />} tile="#FDE8EB" title="Report a missed spot" sub="We re-wash it the same day" chev onPress={() => sheets.issue()} />
            <PRow icon={<Drop size={18} color={C.violet} />} title="Washer app" sub={REAL ? 'For Washing Daddy staff' : 'For Washing Daddy staff · OTP 1234'} chev onPress={() => act.openUrl('https://washingdaddy.com/get/')} />
            <PRow icon={<Book size={18} color={C.violet} />} title="One-time washes" sub="Your booked extra washes" chev onPress={() => sheets.bookings()} />
            <PRow icon="i" title="About us" chev onPress={() => act.openUrl('https://washingdaddy.com/')} />
            <PRow icon="◆" title="Privacy policy" chev onPress={() => act.openUrl('https://washingdaddy.com/privacy.html')} />
          </PRows>
        </Sec>

        <Sec>
          <PRows>
            <PRow icon={<Txt weight={800} color={P.red}>✕</Txt>} tile="#FDE8EB" title="Delete my account" sub="We remove your number and car details" chev onPress={() => sheets.deleteAccount()} />
            <PRow icon={<Logout size={18} color={P.ink} />} title="Log out" sub={'Signed in as +91 ' + fmtPhone(a.phone)} onPress={() => sheets.logout()} />
          </PRows>
        </Sec>

        <View style={{ alignItems: 'center', marginTop: SP.section }}>
          <Txt weight={700} size={18} color={C.violet} style={{ marginBottom: 4 }}>Washing Daddy</Txt>
          <Txt size={12} color={P.grey} style={{ textAlign: 'center' }}>{'Washing Daddy Private Limited · New Delhi' + (REAL ? '' : '\nPrototype. Sign-in, payments and orders use test data.')}</Txt>
        </View>
      </Page>
    </Light>
  );
}

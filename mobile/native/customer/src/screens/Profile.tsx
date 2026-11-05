// Profile page (pushed): white header with avatar, plan row, 3 tiles, refer row, grouped list rows.
import React from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { C } from '../theme';
import { Txt, Toggle, useInsets } from '../ui/kit';
import { Bell, Pin, Clock, Key, WhatsApp, Warn, Drop, Logout, GhostCar, Chev, Cart, Help, Pen, Sun, Moon, Auto, Back, Info, Shield, Trash, Plan, Gift, Book, Plus } from '../ui/icons';
import { planOf, A, car, carImg, maskPlate, planStatus, fmtPhone, act, go, closePage, openPage, S, REAL } from '../state';
import { src } from '../img';
import { sheets } from '../sheets';
import { Plate } from '../ui/Plate';

const INK = '#171717', GREY = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5', RED = '#dc2626';
const card = { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: LINE } as const;
const NUM = { fontVariant: ['tabular-nums'] } as const;
const nav = (t: Parameters<typeof go>[0]) => () => { closePage(); go(t) };

function Row({ icon, title, sub, right, onPress, last, danger }: { icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean; danger?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, gap: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: LINE }}>
      <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}>
        <Txt weight={400} size={15} color={danger ? RED : INK}>{title}</Txt>
        {sub ? <Txt size={13} color={MUTED} numberOfLines={1} style={{ marginTop: 2 }}>{sub}</Txt> : null}
      </View>
      {right}
      {onPress && !right ? <Chev size={18} color={MUTED} strokeWidth={1.5} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? RAISED : '#fff' })}>{body}</Pressable> : body;
}
const Group = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <View style={{ marginTop: 32 }}>
    {title ? <Txt weight={500} size={13} color={MUTED} style={{ marginBottom: 8 }}>{title}</Txt> : null}
    <View style={[card, { overflow: 'hidden' }]}>{children}</View>
  </View>
);

const Clip = ({ c = MUTED }: { c?: string }) => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="4" width="14" height="17" rx="3" /><Path d="M9 3h6v3H9zM9 12h6M9 16h4" /></Svg>;

export default function Profile() {
  const ins = useInsets(), a = A(), c = car();
  const days = planStatus(c);
  const ic = (X: any, p: any = {}) => <X size={18} color={MUTED} strokeWidth={1.5} {...p} />;
  const tile = (label: string, icon: React.ReactNode, f: () => void) => (
    <Pressable key={label} onPress={f} style={({ pressed }) => [card, { flex: 1, height: 88, padding: 12, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {icon}
      <Txt weight={500} size={14} color={INK} style={{ lineHeight: 20 }}>{label}</Txt>
    </Pressable>
  );
  const theme = S.theme;
  const open = a.requests.filter(r => r.open).length;
  const looks: [typeof theme, string, any][] = [['light', 'Day', Sun], ['dark', 'Night', Moon], ['system', 'Auto', Auto]];
  const prefs = [['photo', 'Photo when my car is done', 'On WhatsApp, every morning'], ['pay', 'Payment reminder', '3 days before my plan runs out'], ['drops', 'New store drops', 'Twice a month at most']] as const;
  const det = [['parking', 'Saved parking', c.parking, Pin], ['window', 'Wash window', c.window, Clock], ['keys', 'Interior cleaning access', c.keys, Key]] as const;
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 48 }}>
            <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12} style={{ width: 32, height: 48, justifyContent: 'center' }}><Back size={24} color={INK} strokeWidth={1.5} /></Pressable>
            <Txt weight={500} size={18} color={INK}>Profile</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: RAISED, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Svg width={64} height={64} viewBox="0 0 70 70"><Circle cx="35" cy="28" r="12" fill="#D4D4D8" /><Path d="M10 70c0-17 11-25 25-25s25 8 25 25z" fill="#D4D4D8" /></Svg>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={22} color={INK} numberOfLines={1}>{a.name}</Txt>
              <Txt size={14} color={GREY} style={NUM}>+91 {fmtPhone(a.phone)}</Txt>
              <Pressable onPress={() => sheets.editName()} hitSlop={8} style={{ marginTop: 4 }}>
                <Txt weight={500} size={14} color={C.violet}>Edit profile</Txt>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Pressable onPress={nav('plan')} style={[card, { minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13} color={MUTED}>Monthly plan</Txt>
              <Txt weight={500} size={15} color={INK} numberOfLines={1} style={{ marginTop: 2 }}>{planOf(c).name}: {days[0]}</Txt>
            </View>
            <Chev size={18} color={MUTED} strokeWidth={1.5} />
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {tile('My washes', <Drop size={18} color={MUTED} />, nav('live'))}
            {tile('Monthly plan', <Plan size={18} color={MUTED} />, nav('plan'))}
            {tile('Help and support', <Help size={18} color={MUTED} />, () => sheets.help())}
          </View>

          <Group>
            <Row icon={ic(Gift)} title="Refer and earn" right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Txt size={14} color={MUTED} style={NUM}>₹200</Txt><Chev size={18} color={MUTED} strokeWidth={1.5} /></View>} onPress={() => openPage({ k: 'refer' })} last />
          </Group>

          <Group title="My cars">
            {a.cars.map((g, i) => {
              const on = i === S.carIdx, im = carImg(g);
              return (
                <Pressable key={g.id} onPress={() => act.pickCar(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: LINE }}>
                  <View style={{ width: 64, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: RAISED, borderRadius: 8, overflow: 'hidden' }}>{im ? <Image source={src(im)!} resizeMode="contain" style={{ width: 64, height: 44 }} /> : <GhostCar width={52} color={MUTED} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight={500} size={15} color={INK} numberOfLines={1}>{(g.make ? g.make + ' ' : '') + g.name}</Txt>
                    <Plate reg={maskPlate(g.plate)} width={88} style={{ marginTop: 4 }} />
                    <Txt size={13} color={MUTED} numberOfLines={1} style={{ marginTop: 4 }}>{planOf(g).name}{g.status === 'new' ? ' · starts tomorrow' : ''}</Txt>
                  </View>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: on ? C.violet : '#D4D4D8', alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /> : null}</View>
                </Pressable>
              );
            })}
            <Row icon={ic(Plus)} title="Add a car" sub="Add a second car" onPress={() => sheets.addCar()} last />
          </Group>

          <Group title={`Wash details · ${c.name}`}>
            {det.map((r, i) => <Row key={r[0]} icon={ic(r[3])} title={r[1]} sub={r[2]} onPress={() => sheets.editDetail(r[0])} last={i === det.length - 1} />)}
          </Group>

          <Group title="Look">
            <View style={{ flexDirection: 'row', padding: 4, gap: 4, backgroundColor: RAISED, borderRadius: 14 }}>
              {looks.map(([k, label, I]) => { const on = theme === k; return (
                <Pressable key={k} onPress={() => act.setTheme(k)} style={{ flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: on ? '#fff' : 'transparent', borderWidth: on ? 1 : 0, borderColor: LINE }}>
                  <I size={18} color={on ? C.violet : MUTED} strokeWidth={1.5} /><Txt weight={on ? 600 : 400} size={14} color={on ? C.violet : GREY}>{label}</Txt>
                </Pressable>); })}
            </View>
          </Group>

          <Group title="Notifications">
            {prefs.map((n, i) => <Row key={n[0]} icon={ic(Bell)} title={n[1]} sub={n[2]} last={i === prefs.length - 1} right={<Toggle on={!!a.prefs[n[0]]} onChange={() => act.togglePref(n[0])} />} />)}
          </Group>

          <Group>
            {a.requests.length ? <Row icon={ic(Warn)} title="Re-wash requests" sub={`${open} open`} onPress={() => sheets.requests()} /> : null}
            <Row icon={ic(Book)} title="One-time washes" onPress={() => sheets.bookings()} />
            <Row icon={ic(Cart)} title="Orders" onPress={() => sheets.orders()} />
            <Row icon={ic(WhatsApp)} title="WhatsApp Washing Daddy" sub="77018 08924 · 7 AM to 9 PM" onPress={() => sheets.help()} />
            <Row icon={ic(Warn)} title="Report a missed spot" onPress={() => sheets.issue()} />
            <Row icon={ic(Drop)} title="Washer app" sub={REAL ? 'For Washing Daddy staff' : 'For staff · OTP 1234'} onPress={() => act.openUrl('https://washingdaddy.com/get/')} />
            <Row icon={ic(Info)} title="About us" onPress={() => act.openUrl('https://washingdaddy.com/')} />
            <Row icon={<Clip />} title="Terms of service" onPress={() => act.openUrl('https://washingdaddy.com/terms.html')} />
            <Row icon={ic(Shield)} title="Privacy policy" onPress={() => act.openUrl('https://washingdaddy.com/privacy.html')} />
            <Row icon={<Clip c={RED} />} title="Request account deletion" onPress={() => sheets.deleteAccount()} danger />
            <Row icon={ic(Logout)} title="Log out" onPress={() => sheets.logout()} last />
          </Group>

          <Txt size={12} color={MUTED} style={{ textAlign: 'center', marginTop: 32 }}>App version 1.0.0 (wd{REAL ? '' : ' proto'})</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

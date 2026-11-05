// Profile page (pushed, Pronto look): dark header with avatar, pass banner, 3 tiles, refer row, grouped list rows.
import React from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';
import { Txt, Toggle, useInsets } from '../ui/kit';
import { Bell, Pin, Clock, Key, WhatsApp, Warn, Drop, Logout, GhostCar, Chev, Cart, Help, Pen, Sun, Moon, Auto, Back, Info, Shield, Trash, Plan, Gift, Book } from '../ui/icons';
import { planOf, A, car, carImg, maskPlate, planStatus, fmtPhone, act, go, closePage, openPage, S, REAL } from '../state';
import { src } from '../img';
import { sheets } from '../sheets';

const INK = '#1A0A33', GREY = '#6B6580', LINE = '#ECEAF2', BG = '#F6F5FA';
const card = { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: LINE, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 } as const;
const nav = (t: Parameters<typeof go>[0]) => () => { closePage(); go(t) };

function Row({ icon, title, sub, right, onPress, last, danger }: { icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean; danger?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, gap: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: LINE }}>
      <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}>
        <Txt weight={500} size={14} color={danger ? '#E8384F' : INK}>{title}</Txt>
        {sub ? <Txt size={11.5} color={GREY} numberOfLines={1} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {right}
      {onPress && !right ? <Chev size={16} color={INK} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? '#F6F3FD' : '#fff' })}>{body}</Pressable> : body;
}
const Group = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <View style={{ marginTop: 12 }}>
    {title ? <Txt weight={600} size={12} color={GREY} style={{ marginBottom: 6, marginLeft: 4, letterSpacing: 0.6 }}>{title.toUpperCase()}</Txt> : null}
    <View style={[card, { overflow: 'hidden' }]}>{children}</View>
  </View>
);

const Clip = ({ c = INK }: { c?: string }) => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="4" width="14" height="17" rx="3" /><Path d="M9 3h6v3H9zM9 12h6M9 16h4" /></Svg>;

export default function Profile() {
  const ins = useInsets(), a = A(), c = car();
  const days = planStatus(c);
  const ic = (X: any, p: any = {}) => <X size={21} color={INK} strokeWidth={1.6} {...p} />;
  const open = a.requests.filter(r => r.open).length;
  const tile = (label: string, icon: React.ReactNode, f: () => void, pill?: string) => (
    <Pressable key={label} onPress={f} style={({ pressed }) => [card, { flex: 1, height: 90, padding: 12, justifyContent: 'space-between', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>{icon}{pill ? <View style={{ backgroundColor: '#FFF3CC', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Txt weight={600} size={10.5} color="#8A6100" numberOfLines={1}>{pill}</Txt></View> : null}</View>
      <Txt weight={500} size={13.5} color={INK} style={{ lineHeight: 18 }}>{label}</Txt>
    </Pressable>
  );
  const theme = S.theme;
  const looks: [typeof theme, string, any][] = [['light', 'Day', Sun], ['dark', 'Night', Moon], ['system', 'Auto', Auto]];
  const prefs = [['photo', 'Photo when my car is done', 'On WhatsApp, every morning'], ['pay', 'Payment reminder', '3 days before my plan runs out'], ['drops', 'New store drops', 'Twice a month at most']] as const;
  const det = [['parking', 'Saved parking', c.parking, Pin], ['window', 'Wash window', c.window, Clock], ['keys', 'Interior cleaning access', c.keys, Key]] as const;
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ backgroundColor: C.violetNight, paddingTop: ins.top + 32, paddingBottom: 44, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 44 }}>
            <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12} style={{ width: 32, height: 44, justifyContent: 'center' }}><Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 12H4M10 6l-6 6 6 6" /></Svg></Pressable>
            <Txt weight={500} size={18} color="#fff">Profile</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22 }}>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#E4DAFA', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Svg width={70} height={70} viewBox="0 0 70 70"><Circle cx="35" cy="28" r="12" fill="#8E7BC0" /><Path d="M10 70c0-17 11-25 25-25s25 8 25 25z" fill="#A99AD2" /></Svg>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={22} color="#fff" numberOfLines={1}>{a.name}</Txt>
              <Txt size={13} color="rgba(255,255,255,.65)">+91 {fmtPhone(a.phone)}</Txt>
              <Pressable onPress={() => sheets.editName()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Txt weight={500} size={13} color={C.gold}>Edit profile</Txt><Svg width={8} height={10} viewBox="0 0 8 10"><Path d="M1 1l5 4-5 4z" fill={C.gold} /></Svg>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable onPress={nav('plan')}>
            <LinearGradient colors={['#24065F', '#5409DA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, height: 62, paddingHorizontal: 14, justifyContent: 'center', overflow: 'hidden' }}>
              <Txt weight={600} size={10} color={C.gold} style={{ letterSpacing: 1.5 }}>WD PASS</Txt>
              <Txt weight={600} size={16} color="#fff" numberOfLines={1} style={{ marginTop: 2, maxWidth: '72%' }}>{planOf(c).name}: {days[0]}</Txt>
              <View style={{ position: 'absolute', right: 14, top: 8, width: 62, height: 46, borderRadius: 8, backgroundColor: 'rgba(255,186,8,.92)', transform: [{ rotate: '-8deg' }], alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={15} color="#3A06A0">PASS</Txt></View>
            </LinearGradient>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {tile('My\nWashes', <Drop size={22} color="#5409DA" strokeWidth={1.8} />, nav('live'))}
            {tile('Monthly\nPlan', <Plan size={22} color="#5409DA" strokeWidth={1.8} />, nav('plan'), planOf(c).name)}
            {tile('Help &\nSupport', <Help size={22} color="#5409DA" strokeWidth={1.8} />, () => sheets.help())}
          </View>

          <Group>
            <Pressable onPress={() => openPage({ k: 'refer' })} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, gap: 14 }}>
              <Gift size={22} color={INK} strokeWidth={1.6} />
              <Txt weight={500} size={14} color={INK}>Refer & earn</Txt>
              <View style={{ backgroundColor: '#FFF3CC', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}><Txt weight={600} size={11} color="#8A6100">₹200</Txt></View>
              <View style={{ flex: 1 }} /><Chev size={16} color={INK} />
            </Pressable>
          </Group>

          <Group title="My cars">
            {a.cars.map((g, i) => {
              const on = i === S.carIdx, im = carImg(g);
              return (
                <Pressable key={g.id} onPress={() => act.pickCar(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: on ? '#F8F4FF' : '#fff' }}>
                  <View style={{ width: 72, height: 46, alignItems: 'center', justifyContent: 'center' }}>{im ? <Image source={src(im)!} resizeMode="contain" style={{ width: 72, height: 46 }} /> : <GhostCar width={64} color={GREY} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight={500} size={14} color={INK} numberOfLines={1}>{(g.make ? g.make + ' ' : '') + g.name}</Txt>
                    <Txt size={11.5} color={GREY} numberOfLines={1}>{maskPlate(g.plate)} · {planOf(g).name}{g.status === 'new' ? ' · starts tomorrow' : ''}</Txt>
                  </View>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.violet : '#CFCADB', alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /> : null}</View>
                </Pressable>
              );
            })}
            <Row icon={<Txt weight={600} size={22} color={C.violet} style={{ lineHeight: 24 }}>+</Txt>} title="Add a car" sub="Add a second car" onPress={() => sheets.addCar()} last />
          </Group>

          <Group title={`Wash details · ${c.name}`}>
            {det.map((r, i) => <Row key={r[0]} icon={ic(r[3])} title={r[1]} sub={r[2]} onPress={() => sheets.editDetail(r[0])} last={i === det.length - 1} />)}
          </Group>

          <Group title="Look">
            <View style={{ flexDirection: 'row', padding: 6, gap: 6 }}>
              {looks.map(([k, label, I]) => { const on = theme === k; return (
                <Pressable key={k} onPress={() => act.setTheme(k)} style={{ flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? C.violet : '#F6F5FA' }}>
                  <I size={16} color={on ? '#fff' : GREY} /><Txt weight={on ? 600 : 500} size={13} color={on ? '#fff' : INK}>{label}</Txt>
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
            <Row icon={<WhatsApp size={21} color="#0E9F6E" strokeWidth={1.6} />} title="WhatsApp Washing Daddy" sub="77018 08924 · 7 AM to 9 PM" onPress={() => sheets.help()} />
            <Row icon={ic(Warn)} title="Report a missed spot" onPress={() => sheets.issue()} />
            <Row icon={ic(Drop)} title="Washer app" sub={REAL ? 'For Washing Daddy staff' : 'For staff · OTP 1234'} onPress={() => act.openUrl('https://washingdaddy.com/get/')} />
            <Row icon={ic(Info)} title="About us" onPress={() => act.openUrl('https://washingdaddy.com/')} />
            <Row icon={<Clip />} title="Terms of services" onPress={() => act.openUrl('https://washingdaddy.com/terms.html')} />
            <Row icon={ic(Shield)} title="Privacy policy" onPress={() => act.openUrl('https://washingdaddy.com/privacy.html')} />
            <Row icon={<Clip />} title="Request account deletion" onPress={() => sheets.deleteAccount()} danger />
            <Row icon={ic(Logout)} title="Log out" onPress={() => sheets.logout()} last />
          </Group>

          <Txt size={11.5} color={GREY} style={{ textAlign: 'center', marginTop: 24, letterSpacing: 0.4 }}>APP VERSION: 1.0.0 (wd{REAL ? '' : ' proto'})</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

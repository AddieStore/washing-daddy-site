// Profile (Pronto layout): header, Pass banner, tiles (My Bookings / Money / Help), rows Refer, Addresses, About us, Legal & Privacy, Log out, version. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Chev, Plan, Wallet, Help, Gift, Pin, Info, Shield, Logout, Car, Cart } from '../ui/icons';
import { useApp, profile, fmtPhone, openPage, closePage, go, wallet, passView } from '../state';
import { REFERRAL } from '../data/reference';
import { sheets } from '../sheets';
import { G, card, Tap, inr, TNUM } from '../pages/parts';
import { ListRow } from '../pages/Help';

export default function Profile() {
  const ui = useApp(), ins = useInsets(), p = profile(), pushed = ui.pages.length > 0, pv = passView(), plan = pv.plans[0], bal = wallet().balance;
  const ic = (X: any) => <X size={18} color={G.mute} strokeWidth={1.5} />;
  const name = (p.first + ' ' + p.last).trim() || 'Your profile';
  const tile = (label: string, icon: React.ReactNode, f: () => void, badge?: string) => (
    <Tap key={label} label={label} onPress={f} style={card({ flex: 1, height: 92, padding: 12, justifyContent: 'space-between' })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {icon}
        {badge ? <View style={{ backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Txt weight={500} size={11} color={G.pos} style={TNUM}>{badge}</Txt></View> : null}
      </View>
      <Txt weight={500} size={14} style={{ lineHeight: 20 }}>{label}</Txt>
    </Tap>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pushed ? 40 : 110 }}>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 48 }}>
            {pushed ? <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12} style={{ width: 32, height: 48, justifyContent: 'center' }}><Back size={24} color={G.ink} strokeWidth={1.5} /></Pressable> : null}
            <Txt weight={500} size={18}>Profile</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: G.raised, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Svg width={72} height={72} viewBox="0 0 70 70"><Circle cx="35" cy="28" r="12" fill="#D4D4D8" /><Path d="M10 70c0-17 11-25 25-25s25 8 25 25z" fill="#D4D4D8" /></Svg>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={22} numberOfLines={1}>{name}</Txt>
              <Txt size={14} color={G.sub} style={TNUM}>+91 {fmtPhone(p.phone)}</Txt>
              <Pressable onPress={() => openPage({ k: 'profileEdit' })} hitSlop={8} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Txt weight={500} size={14} color={C.violet}>Edit profile</Txt><Chev size={14} color={C.violet} strokeWidth={1.5} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Tap label="WD Pass" onPress={() => openPage({ k: 'pass' })} style={{ backgroundColor: C.violet, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            <View style={{ flex: 1 }}>
              <Txt weight={500} size={11} color="rgba(255,255,255,0.75)" style={{ letterSpacing: 1 }}>WD PASS</Txt>
              <Txt weight={500} size={17} color="#fff" style={{ marginTop: 4, lineHeight: 24 }}>{pv.active ? `${pv.active.visitsLeft} ${pv.active.visitsLeft === 1 ? 'visit' : 'visits'} left` : `Get ${plan.visits} visits for ${inr(plan.price)} only`}</Txt>
              <Txt size={12} color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>{pv.active ? 'Tap to see your pass' : `Valid ${plan.days} days · save on every wash`}</Txt>
            </View>
            <View style={{ width: 76, height: 56, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
              <Txt weight={500} size={13} color="#fff">WD PASS</Txt>
            </View>
          </Tap>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {tile('My Bookings', ic(Plan), () => openPage({ k: 'bookings' }))}
            {tile('Money', ic(Wallet), () => openPage({ k: 'money' }), inr(bal))}
            {tile('Help & Support', ic(Help), () => openPage({ k: 'help' }))}
          </View>

          <View style={[card({ marginTop: 12, overflow: 'hidden' })]}>
            <ListRow icon={ic(Gift)} title="Refer & earn" onPress={() => openPage({ k: 'refer' })} last right={<View style={{ backgroundColor: 'rgba(84,9,218,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Txt weight={500} size={12} color={C.violet} style={TNUM}>{inr(REFERRAL.bannerAmt)}</Txt></View>} />
          </View>

          <View style={[card({ marginTop: 12, overflow: 'hidden' })]}>
            <ListRow icon={ic(Pin)} title="Saved addresses" onPress={() => openPage({ k: 'addresses' })} />
            <ListRow icon={ic(Car)} title="Monthly plan" onPress={() => { closePage(); go('plan') }} />
            <ListRow icon={ic(Cart)} title="Store" onPress={() => { closePage(); go('store') }} />
            <ListRow icon={ic(Info)} title="About us" onPress={() => openPage({ k: 'about' })} />
            <ListRow icon={ic(Shield)} title="Legal & Privacy" onPress={() => openPage({ k: 'legal' })} />
            <ListRow icon={ic(Logout)} title="Log out" onPress={() => sheets.logout()} last />
          </View>

          <Txt size={12} color={G.mute} style={{ textAlign: 'center', marginTop: 32, letterSpacing: 0.6 }}>APP VERSION: 2.0.0</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

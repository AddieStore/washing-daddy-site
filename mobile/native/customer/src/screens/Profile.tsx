// Profile (Pronto layout): header, Pass banner, tiles (My Bookings / Money / Help), rows Refer, Addresses, About us, Legal & Privacy, Log out, version. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Footer } from '../ui/Footer';
import { Back, Chev, Plan, Wallet, Help, Gift, Pin, Info, Shield, Logout, Car, Cart } from '../ui/icons';
import { useApp, profile, fmtPhone, openPage, closePage, go, wallet, passView, feature } from '../state';
import { Buttons } from './Home';
import { REFERRAL } from '../data/reference';
import { sheets } from '../sheets';
import { G, card, Tap, inr, TNUM, PAGE_BG } from '../pages/parts';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeUp } from '../ui/motion';
import { artFor, ArtBoundary } from '../art';
const PassArt = artFor('pass');
import { ListRow } from '../pages/Help';

export default function Profile() {
  const ui = useApp(), ins = useInsets(), p = profile(), pushed = ui.pages.length > 0, pv = passView(), plan = pv.plans[0], bal = wallet().balance, showPass = feature('pass') && (!!pv.active || !!plan);
  const ic = (X: any) => <X size={18} color={G.mute} strokeWidth={1.5} />;
  const tic = (X: any) => <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}><X size={19} color={C.violet} strokeWidth={1.7} /></View>;
  const name = (p.first + ' ' + p.last).trim() || 'Your profile';
  const tile = (label: string, icon: React.ReactNode, f: () => void, badge?: string) => (
    <Tap key={label} label={label} onPress={f} style={card({ flex: 1, height: 96, padding: 12, justifyContent: 'space-between' })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {icon}
        {badge ? <View style={{ backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Txt weight={500} size={11} color={G.pos} style={TNUM}>{badge}</Txt></View> : null}
      </View>
      <Txt weight={600} size={13} style={{ lineHeight: 18 }}>{label}</Txt>
    </Tap>
  );
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pushed ? 40 : 0 }}>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 56, overflow: 'hidden' }}>
          <LinearGradient colors={['#6A1BF2', '#5409DA', '#36058F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', right: -50, top: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, height: 48 }}>
            {pushed ? <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12} style={{ width: 32, height: 48, justifyContent: 'center' }}><Back size={24} color="#fff" strokeWidth={1.8} /></Pressable> : null}
            <Txt weight={600} size={18} color="#fff">Profile</Txt>
          </View>
          <FadeUp index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#EDE6FF', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }}>
              <Svg width={72} height={72} viewBox="0 0 70 70"><Circle cx="35" cy="28" r="12" fill="#B9A6EA" /><Path d="M10 70c0-17 11-25 25-25s25 8 25 25z" fill="#B9A6EA" /></Svg>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={24} color="#fff" numberOfLines={1}>{name}</Txt>
              <Txt size={14} color="rgba(255,255,255,0.82)" style={TNUM}>+91 {fmtPhone(p.phone)}</Txt>
              <Pressable onPress={() => openPage({ k: 'profileEdit' })} hitSlop={8} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Txt weight={600} size={14} color="#FFD166">Edit profile</Txt><Chev size={14} color="#FFD166" strokeWidth={1.8} />
              </Pressable>
            </View>
          </FadeUp>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          {showPass ? <FadeUp index={1}><Tap label="WD Pass" onPress={() => openPage({ k: 'pass' })} style={{ backgroundColor: '#1C0A47', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#1A1033', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <View style={{ flex: 1 }}>
              <Txt weight={600} size={11} color="#FFD166" style={{ letterSpacing: 1.2 }}>WD PASS</Txt>
              <Txt weight={700} size={17} color="#fff" style={{ marginTop: 4, lineHeight: 24 }}>{pv.active ? `${pv.active.visitsLeft} ${pv.active.visitsLeft === 1 ? 'visit' : 'visits'} left` : `Get ${plan!.visits} visits for ${inr(plan!.price)} only`}</Txt>
              <Txt size={12} color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>{pv.active ? 'Tap to see your pass' : `Valid ${plan!.days} days · save on every wash`}</Txt>
            </View>
            {PassArt ? <View style={{ width: 84, height: 64, alignItems: 'center', justifyContent: 'center' }}><ArtBoundary fallback={null}><PassArt size={84} /></ArtBoundary></View> : <View style={{ width: 76, height: 56, borderRadius: 10, backgroundColor: '#FFD166', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
              <Txt weight={800} size={13} color="#1C0A47">WD PASS</Txt>
            </View>}
          </Tap></FadeUp> : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {tile('My Bookings', tic(Plan), () => openPage({ k: 'bookings' }))}
            {feature('wallet') ? tile('Money', tic(Wallet), () => openPage({ k: 'money' }), inr(Math.floor(bal))) : null}
            {tile('Help & Support', tic(Help), () => openPage({ k: 'help' }))}
          </View>

          <Buttons placement="profile" side={0} top={12} />

          {feature('refer') ? <View style={[card({ marginTop: 12, overflow: 'hidden' })]}>
            <ListRow icon={ic(Gift)} title="Refer & earn" onPress={() => openPage({ k: 'refer' })} last right={<View style={{ backgroundColor: 'rgba(84,9,218,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Txt weight={500} size={12} color={C.violet} style={TNUM}>{inr(REFERRAL.bannerAmt)}</Txt></View>} />
          </View> : null}

          <View style={[card({ marginTop: 12, overflow: 'hidden' })]}>
            <ListRow icon={ic(Pin)} title="Saved addresses" onPress={() => openPage({ k: 'addresses' })} />
            {feature('plans') ? <ListRow icon={ic(Car)} title="Monthly plan" onPress={() => { closePage(); go('plan') }} /> : null}
            {feature('store') ? <ListRow icon={ic(Cart)} title="Store" onPress={() => { closePage(); go('store') }} /> : null}
            <ListRow icon={ic(Info)} title="About us" onPress={() => openPage({ k: 'about' })} />
            <ListRow icon={ic(Shield)} title="Legal & Privacy" onPress={() => openPage({ k: 'legal' })} />
            <ListRow icon={ic(Logout)} title="Log out" onPress={() => sheets.logout()} last />
          </View>

          <Txt size={12} color={G.mute} style={{ textAlign: 'center', marginTop: 32, letterSpacing: 0.6 }}>APP VERSION: 2.0.0</Txt>
        </View>
        {pushed ? null : <Footer bg={PAGE_BG} />}
      </ScrollView>
    </View>
  );
}

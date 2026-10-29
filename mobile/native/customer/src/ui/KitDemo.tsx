// Every kit component on one scrollable screen, for checking only. Mounts its own hosts.
import React, { useState } from 'react';
import { View } from 'react-native';
import { C, DAY, NIGHT, ThemeContext } from '../theme';
import {
  Txt, Card, Block, Rows, Row, Btn, Pill, IconBtn, Eyebrow, SecHead, BigTitle, Chips, Seg, Opt, Toggle, Field, Ring, CountUp, Empty,
  StatusPill, Confirm, Ticker, Page, Topbar, Gap, Hard,
} from './kit';
import { ToastHost, SheetHost, ConfettiHost, toast, openSheet, SheetTitle, SheetSub, Success, confetti, haptic } from './hosts';
import * as I from './icons';
import { Art, ArtKind } from './art';

const ARTS: ArtKind[] = ['perfume', 'cloth', 'bottle', 'spray', 'mount', 'inflator', 'cover', 'mats', 'cam', 'sparkle'];

export default function KitDemo() {
  const [night, setNight] = useState(false), [chip, setChip] = useState('b'), [multi, setMulti] = useState<string[]>(['x']), [seg, setSeg] = useState('1');
  const [opt, setOpt] = useState(0), [tg, setTg] = useState(true), [busy, setBusy] = useState(false), [frac, setFrac] = useState(0.75);
  return (
    <ThemeContext.Provider value={night ? NIGHT : DAY}>
      <View style={{ flex: 1 }}>
        <Page header={<><Ticker items={['Pressure wash', 'Monthly from ₹999', 'Car wash in 10 min']} /><Topbar left={<Txt font="shout" size={22}>Kit</Txt>} title="Demo" right={<IconBtn dot onPress={() => toast('Updates')}><I.Bell size={20} /></IconBtn>} /></>}>
          <BigTitle em="Pocha?">No more</BigTitle>
          <Gap />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Pill label="Tip" gold icon={<I.Heart size={14} color={C.ink} />} />
            <Pill label="Leave a note" icon={<I.Note size={14} />} />
            <IconBtn badge={3}><I.Cart size={20} /></IconBtn>
            <IconBtn onPress={() => setNight(n => !n)}>{night ? <I.Sun size={20} /> : <I.Moon size={20} />}</IconBtn>
          </View>
          <Gap />
          <SecHead title="Used" gold="this month" link="1-29 Oct" />
          <Card>
            <Eyebrow>Your plan</Eyebrow>
            <Txt font="shout" size={30} upper>WD Pro</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 12 }}>
              <Ring frac={frac} size={90} color={C.violet}><CountUp to={15} weight={800} size={22} /></Ring>
              <View style={{ gap: 6 }}><StatusPill label="Active" /><StatusPill label="Due" tone="warn" /><StatusPill label="Missed" tone="bad" /><StatusPill label="Paused" tone="mute" /></View>
            </View>
            <Btn label="Pay next month" variant="violet" icon={<I.Card size={18} />} onPress={() => setFrac(f => (f > 0.5 ? 0.25 : 0.9))} />
            <Gap h={14} />
            <Btn label="Gold" onPress={() => { haptic(); toast('Gold pressed'); }} />
            <Gap h={14} />
            <Btn label="Ghost" variant="ghost" />
            <Gap h={14} />
            <Btn label="Pay" busy={busy ? 'Paying...' : false} onPress={() => { setBusy(true); setTimeout(() => setBusy(false), 1500); }} />
            <Gap h={14} />
            <Btn label="Disabled" disabled />
          </Card>
          <Gap />
          <Block><Eyebrow>Today</Eyebrow><Txt weight={700} size={20}>Done before your chai.</Txt><Txt size={13} color="rgba(255,246,233,.85)">Chotte finished at 6:42 AM.</Txt></Block>
          <Gap />
          <Rows>
            <Row icon={<I.WhatsApp size={18} color={C.mint} />} tile="rgba(20,192,138,.15)" title="WhatsApp Washing Daddy" sub="77018 08924 · 7 AM to 9 PM" chev onPress={() => toast('Row')} />
            <Row icon={<I.Warn size={18} color={C.red} />} tile="rgba(232,56,79,.14)" title="Report a missed spot" sub="We re-wash it the same day" chev onPress={() => {}} />
            <Row icon={<I.Logout size={18} />} title="Log out" right="v1.0" />
          </Rows>
          <Gap />
          <Card>
            <Eyebrow>Chips</Eyebrow>
            <Chips items={['a', { key: 'b', label: 'Bee' }, 'c']} value={chip} onChange={setChip} />
            <Chips multi items={['x', 'y', 'z']} value={multi} onChange={setMulti} />
            <Seg items={[{ key: '1', label: 'Daily' }, { key: '2', label: 'Alt days' }]} value={seg} onChange={setSeg} />
            <Opt on={opt === 0} onPress={() => setOpt(0)} title="Pay by UPI" text="Instant" price="₹1,800" />
            <Opt on={opt === 1} onPress={() => setOpt(1)} title="Cash to washer" text="Pay on the day" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><Txt weight={600}>Photo each wash</Txt><Toggle on={tg} onChange={setTg} /></View>
            <Field label="Name" placeholder="Your name" />
            <Confirm from="Standard" to="Pro" />
          </Card>
          <Gap />
          <Empty title="Nothing yet" sub="Your mornings show up here after the first wash." />
          <Gap />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{ARTS.map(k => <Art key={k} kind={k} c={[C.violet, C.sky]} size={90} />)}</View>
          <Gap />
          <Card style={{ alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {Object.entries(I).filter(([k]) => k !== 'GhostCar' && k !== 'useUid').map(([k, Ic]) => { const C2 = Ic as React.ComponentType<I.IconProps>; return <C2 key={k} size={26} />; })}
            </View>
            <Gap h={10} /><I.GhostCar width={220} />
          </Card>
          <Gap />
          <Hard color={C.gold} dx={5} dy={5} radius={10}><View style={{ height: 40, backgroundColor: C.ink, borderRadius: 10 }} /></Hard>
          <Gap />
          <Btn label="Open sheet" onPress={() => openSheet(<><SheetTitle>Pay sheet</SheetTitle><SheetSub>Pick how you pay.</SheetSub><Field placeholder="Type here" /><Confirm from="₹0" to="₹999" /><Success title="Booked!" sub="Request sent." /></>)} />
          <Gap h={14} /><Btn label="Confetti" variant="violet" onPress={confetti} />
        </Page>
        <SheetHost /><ToastHost /><ConfettiHost />
      </View>
    </ThemeContext.Provider>
  );
}

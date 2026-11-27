// Parking alerts page (Profile > Parking alerts): switch, per-car Bluetooth and usual spot, permission checklist, battery tips.
// Logic lives in src/park; this file is only the screens.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SP } from '../theme';
import { Txt as KTxt, TxtProps, Toggle } from '../ui/kit';
import { P, PCard, PBtn, POutline, PRows, PRow, Tap } from '../ui/pr';
import { Check, Pin, ChevronDown, Car as CarIc } from '../ui/icons';
import { SpotMap } from '../ui/SpotMap';
import { PageBar } from './Stub';
import { useApp, A, toast, openSheet, closeSheet } from '../state';
import {
  useParkView, enable, grant, devices, link, homeChoices, useHereAsHome, setHome, carSetting, ready, simulate, isDemo, openAppSettings,
  type ParkDevice, type ParkCar, type Home, type Perm,
} from '../park';

const Txt = (p: TxtProps) => <KTxt {...p} color={p.color ?? P.ink} />;
const Hint = ({ children, style }: { children: React.ReactNode; style?: any }) => <Txt size={13} color={P.muted} style={[{ lineHeight: 18 }, style]}>{children}</Txt>;
const Label = ({ children }: { children: string }) => <Txt weight={500} size={13} color={P.muted} style={{ marginTop: SP.xl, marginBottom: SP.s }}>{children}</Txt>;

/* ---------- small sheets (white, radio lists) ---------- */
function Radio({ on, title, sub, onPress }: { on: boolean; title: string; sub?: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: SP.l, marginBottom: SP.m, borderRadius: 14, borderWidth: 1, borderColor: on ? P.violet : P.line, backgroundColor: '#FFFFFF' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: on ? P.violet : '#D4D4D8', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P.violet }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={500} size={15}>{title}</Txt>
        {sub ? <Txt size={13} color={P.muted} style={{ marginTop: 2 }}>{sub}</Txt> : null}
      </View>
    </Tap>
  );
}
const Title = ({ children }: { children: React.ReactNode }) => <Txt weight={500} size={22} style={{ marginBottom: 4, lineHeight: 28 }}>{children}</Txt>;
const Sub = ({ children }: { children: React.ReactNode }) => <Txt size={14} color={P.grey} style={{ marginBottom: 16, lineHeight: 20 }}>{children}</Txt>;

function DeviceSheet({ carId }: { carId: string }) {
  const [list, setList] = useState<ParkDevice[] | null>(null), cur = carSetting(carId)?.device?.address || null;
  useEffect(() => { let on = true; devices().then(d => { if (on) setList(d) }, () => { if (on) setList([]) }); return () => { on = false } }, []);
  const pick = (d: ParkDevice | null) => { link(carId, d); closeSheet() };
  return (
    <View>
      <Title>Car Bluetooth</Title>
      <Sub>Pick the name your car shows when your phone connects (car stereo or Android Auto).</Sub>
      {list == null ? <Txt size={14} color={P.muted} style={{ paddingVertical: 12 }}>Looking for paired devices…</Txt> : (
        <>
          {list.map(d => <Radio key={d.address} on={cur === d.address} title={d.name} onPress={() => pick(d)} />)}
          {!list.length ? <Txt size={14} color={P.grey} style={{ marginBottom: SP.m, lineHeight: 20 }}>No paired devices found. Pair your phone with your car first, then come back here.</Txt> : null}
          <Radio on={!cur} title="None" sub="Don't watch this car" onPress={() => pick(null)} />
        </>
      )}
    </View>
  );
}

function HomeSheet({ carId }: { carId: string }) {
  const choices = homeChoices(), cur = carSetting(carId)?.home || null, [busy, setBusy] = useState(false);
  const same = (h: Home) => !!cur && cur.lat === h.lat && cur.lng === h.lng;
  const here = async () => {
    setBusy(true);
    try { await useHereAsHome(carId); closeSheet(); toast('Saved as the usual spot.') } catch (e: any) { setBusy(false); toast(e?.message || 'Could not get your location.') }
  };
  return (
    <View>
      <Title>Usual parking spot</Title>
      <Sub>Where your car is parked most nights. We only ask when it is parked somewhere else.</Sub>
      {choices.map((h, i) => <Radio key={i} on={same(h)} title={h.label} onPress={() => { setHome(carId, h); closeSheet() }} />)}
      <Radio on={false} title={busy ? 'Getting your location…' : 'My car is parked there now'} sub="Uses where you are right now" onPress={busy ? () => {} : here} />
    </View>
  );
}

function Disclosure() {
  return (
    <View>
      <Title>{'Allow location "all the time" for Parking alerts'}</Title>
      <Txt size={14} color={P.grey} style={{ marginTop: SP.s, lineHeight: 21 }}>Washing Daddy collects your phone's location, even when the app is closed or not in use, to power Parking alerts. When your phone disconnects from the Bluetooth of the car you chose, we take one location reading to check whether you parked somewhere new, and then ask if you want to save that spot for your washer.</Txt>
      <Txt size={14} color={P.grey} style={{ marginTop: SP.m, lineHeight: 21 }}>{'We take one reading each time you disconnect from that car. We do not track your location continuously or while you drive. Your location is only saved to your account if you tap "Add this spot", and it is only shared with your washer. We do not use it for ads.'}</Txt>
      <Txt size={14} color={P.grey} style={{ marginTop: SP.m, marginBottom: SP.xl, lineHeight: 21 }}>You can turn Parking alerts off any time here, or change location permission in your phone settings.</Txt>
      <View style={{ flexDirection: 'row', gap: SP.m }}>
        <POutline label="Not now" onPress={closeSheet} style={{ flex: 1 }} />
        <PBtn label="Continue" onPress={() => { closeSheet(); grant('background') }} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

/* ---------- page ---------- */
const PERMS: { kind: 'bt' | 'location' | 'background' | 'notifications'; title: string; sub: string }[] = [
  { kind: 'bt', title: 'Nearby devices', sub: 'To see when your phone leaves your car' },
  { kind: 'location', title: 'Location', sub: 'To check where you parked' },
  { kind: 'background', title: 'Location all the time', sub: 'So it works when the app is closed' },
  { kind: 'notifications', title: 'Notifications', sub: 'To ask you when you park somewhere new' },
];
const stateTxt = (v: Perm) => (v === 'granted' ? 'On' : v === 'denied' ? 'Open settings' : 'Allow');

function PermRow({ title, sub, state, onPress }: { title: string; sub: string; state: Perm; onPress: () => void }) {
  const ok = state === 'granted';
  return (
    <PRow title={title} sub={sub} onPress={ok ? undefined : onPress}
      right={ok ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={16} color={P.ok} strokeWidth={2} /><Txt weight={500} size={14} color={P.ok}>On</Txt></View> : <Txt weight={500} size={14} color={P.violet}>{stateTxt(state)}</Txt>} />
  );
}

function CarCard({ c }: { c: ParkCar }) {
  const v = useParkView(), plate = (A().cars.find(x => x.id === c.carId)?.plate) || c.reg;
  const pickDevice = async () => {
    if (v.health.bt !== 'granted') { const r = await grant('bt'); if (r !== 'granted') { toast('Allow Nearby devices to see your paired Bluetooth.'); return } }
    openSheet(<DeviceSheet carId={c.carId} />);
  };
  return (
    <PCard pad={0} style={{ marginTop: SP.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.l }}>
        <CarIc size={22} color={P.muted} strokeWidth={1.5} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={500} size={16} numberOfLines={1}>{c.name}</Txt>
          <Txt size={13} color={P.muted} style={{ marginTop: 2 }}>{plate}</Txt>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: P.line }} />
      <PRow title="Car Bluetooth" right={<Txt weight={500} size={14} color={c.device ? P.ink : P.violet} numberOfLines={1} style={{ maxWidth: 170 }}>{c.device?.name || 'Choose'}</Txt>} chev onPress={pickDevice} />
      <Hint style={{ paddingHorizontal: SP.l, paddingBottom: SP.l }}>Pick the name your car shows when your phone connects (car stereo or Android Auto).</Hint>
      <View style={{ height: 1, backgroundColor: P.line }} />
      <PRow title="Usual parking spot" sub={c.home ? c.home.label : 'Not set'} chev onPress={() => openSheet(<HomeSheet carId={c.carId} />)} />
      {c.home ? <View style={{ paddingHorizontal: SP.l, paddingBottom: SP.l }}><SpotMap lat={c.home.lat} lng={c.home.lng} h={96} /></View> : null}
    </PCard>
  );
}

const TIPS: [string, string][] = [
  ['Xiaomi, Redmi, Poco', 'Turn on Autostart for Washing Daddy. Set Battery saver to No restrictions.'],
  ['Oppo, Realme, OnePlus', 'Allow Auto launch for Washing Daddy.'],
  ['Vivo', 'Allow Autostart and background activity.'],
  ['Samsung', 'Remove Washing Daddy from Sleeping apps. Set battery to Unrestricted.'],
];
function SleepHelp() {
  const [open, setOpen] = useState(false);
  return (
    <PCard pad={0} style={{ marginTop: SP.xl }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: SP.l, minHeight: 56 }}>
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={15}>Phone keeps the app asleep?</Txt>
          <Hint style={{ marginTop: 2 }}>Some phones stop apps in the background.</Hint>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><ChevronDown size={18} color={P.muted} strokeWidth={1.5} /></View>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: SP.l, paddingBottom: SP.l }}>
          {TIPS.map(([k, t]) => <View key={k} style={{ marginBottom: SP.m }}><Txt weight={500} size={14}>{k}</Txt><Txt size={13} color={P.grey} style={{ marginTop: 2, lineHeight: 19 }}>{t}</Txt></View>)}
          <POutline label="Open app settings" onPress={openAppSettings} style={{ marginTop: SP.s }} />
        </View>
      ) : null}
    </PCard>
  );
}

export default function ParkAlerts() {
  useApp();
  const v = useParkView(), h = v.health, on = v.settings.enabled;
  let cars: ParkCar[] = []; try { A(); cars = v.settings.cars.map(c => carSetting(c.carId) || c) } catch {}
  if (h.platform === 'ios') {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <PageBar title="Parking alerts" />
        <ScrollView contentContainerStyle={{ padding: SP.page }}>
          <PCard tint><Txt size={15} style={{ lineHeight: 22 }}>Parking alerts work on Android phones for now. On iPhone, you can still tell your washer where the car is from the home screen.</Txt></PCard>
        </ScrollView>
      </View>
    );
  }
  const missing: string[] = [];
  if (!cars.some(c => c.device)) missing.push('your car Bluetooth');
  if (!cars.some(c => c.home)) missing.push('a usual parking spot');
  if (h.bt !== 'granted') missing.push('Nearby devices');
  if (h.location !== 'granted') missing.push('Location');
  if (h.background !== 'granted') missing.push('Location all the time');
  if (h.notifications === 'denied') missing.push('Notifications');
  const status = !on ? 'Off. Turn it on to get started.' : ready() ? "On. We'll ask when your car is parked somewhere new." : `Almost there. Still needed: ${missing.join(', ')}.`;
  const perm = (k: typeof PERMS[number]['kind']) => () => (k === 'background' && h.background !== 'granted' && h.background !== 'denied' ? openSheet(<Disclosure />) : void grant(k));
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Parking alerts" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SP.page, paddingBottom: 48 }}>
        <Txt size={15} color={P.grey} style={{ lineHeight: 22 }}>Your phone notices when it leaves your car's Bluetooth. If the car is parked somewhere new, we ask if you want your washer to look there.</Txt>
        <PCard style={{ marginTop: SP.l }} pad={SP.l}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt weight={500} size={16} style={{ flex: 1 }}>Parking alerts</Txt>
            <Toggle on={on} onChange={enable} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: SP.m }}>
            <View style={{ marginTop: 2 }}><Pin size={16} color={on && ready() ? P.ok : P.muted} strokeWidth={1.5} /></View>
            <Txt size={14} color={on && ready() ? P.ok : P.grey} style={{ flex: 1, lineHeight: 20 }}>{status}</Txt>
          </View>
        </PCard>

        {(
          <>
            <Label>Your cars</Label>
            {cars.map(c => <CarCard key={c.carId} c={c} />)}
            {!cars.length ? <Hint>Add a car to your account first.</Hint> : null}

            <Label>Permissions</Label>
            <PRows>{PERMS.map(p => <PermRow key={p.kind} title={p.title} sub={p.sub} state={h[p.kind]} onPress={perm(p.kind)} />)}</PRows>

            <SleepHelp />
            {isDemo() && cars[0] ? <PBtn label="Try it: pretend I parked somewhere new" onPress={() => simulate(cars[0].carId, true)} style={{ marginTop: SP.xl }} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// "Naya customer jodo": the washer signs a new customer up in front of them, step by step. The car(s) land on his round
// today; The manager approves. One newcars doc per car (the store takes one car per call); the first car carries the extras' numbers.
import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BigNumber, Button, ChipPicker, DashCard, Eyebrow, Field, F, Icon, LinkButton, Pressy, brand, sheet, ui, useTheme } from '../ui';
import { act, DAY, route } from '../state/store';
import { PLAN, PLAN_PRICE, normReg, type PlanId } from '../lib/schedule';
import { SHARE } from '../lib/data';
import { daysInMonth, rupee } from '../lib/time';
import { t } from '../lib/i18n';

export function openAddCar() {
  sheet.open((close) => <AddCarForm close={close} />);
}

// Legacy is closed to new cars; old Legacy cars keep it
const PLANS = (Object.keys(PLAN) as PlanId[]).filter((k) => k !== 'legacy');
const STEPS = ['Gaadi', 'Customer', 'Pata', 'Plan', 'Aur gaadi', 'Paisa'] as const;
type Geo = { lat: number; lng: number };
type Pay = 'cash' | 'upi' | 'later';
const mapUrl = (g: Geo) => `https://maps.google.com/?q=${g.lat.toFixed(5)},${g.lng.toFixed(5)}`;

function AddCarForm({ close }: { close: () => void }) {
  const { c } = useTheme();
  const [step, setStep] = useState(0);
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [geo, setGeo] = useState<Geo | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState('');
  const [plan, setPlan] = useState<PlanId>('std');
    const [extras, setExtras] = useState<string[]>([]);
  const [pay, setPay] = useState<Pay>('later');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const bad = (m: string) => { setErr(m); ui.haptic(14); return false; };
  const ph = phone.replace(/\D/g, '');
  const ex = extras.filter((x) => x.trim());   // an empty extra box is just ignored
  const regs = [normReg(plate), ...ex.map((x) => normReg(x))];
  const fee = PLAN_PRICE[plan];   // list price; never shown to the washer
  const total = fee * regs.length;   // recorded with the payment, never shown

  const useLocation = async () => {
    if (locBusy) return;
    setLocBusy(true); setLocMsg('');
    try {
      const Location = await import('expo-location');
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') { setLocMsg(t('Location ki ijaazat nahi mili. Neeche pata likh do.')); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGeo(g); ui.haptic(8);
      try {
        const r = (await Location.reverseGeocodeAsync({ latitude: g.lat, longitude: g.lng }))[0];
        if (r && !address.trim()) {
          const bits = [r.name, r.street, r.district || r.subregion, r.city, r.postalCode].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
          if (bits.length) setAddress(bits.join(', ').slice(0, 200));
        }
      } catch (e) { console.warn('reverse geocode', e); }
    } catch (e) {
      console.warn('location', e);
      setLocMsg(t('Location nahi mili. Neeche pata likh do.'));
    } finally { setLocBusy(false); }
  };

  const check = (s: number): boolean => {
    if (s === 0) {
      const reg = normReg(plate);
      if (reg.length < 4) return bad(t('Poora number daalo'));
      if (route().some((x) => x.reg === reg)) return bad(t('Yeh gaadi pehle se round pe hai'));
    }
    if (s === 1) {
      if (ph.length !== 10) return bad(t(ph ? 'Phone 10 number ka hota hai' : 'Phone number daalo'));
    }
    if (s === 2) {
      if (address.trim().length < 5) return bad(t('Poora pata likho'));
    }
    if (s === 4) {
      for (let i = 0; i < ex.length; i++) {
        const r = regs[i + 1];
        if (r.length < 4) return bad(t('Poora number daalo'));
        if (regs.indexOf(r) !== i + 1) return bad(t('Yeh number dobara likha hai'));
        if (route().some((x) => x.reg === r)) return bad(t('Yeh gaadi pehle se round pe hai'));
      }
    }
    setErr('');
    return true;
  };
  const next = () => { if (check(step)) { setStep(step + 1); ui.haptic(4); } };
  const back = () => { setErr(''); setStep(Math.max(0, step - 1)); };

  const submit = async () => {
    for (let s = 0; s <= 4; s++) if (!check(s)) { setStep(s); return; }
    setBusy(true); setErr('');
    const m = model.trim() || 'Gaadi', addr = address.trim(), cn = name.trim(), cp = '+91' + ph;
    const area = addr.slice(0, 80);
    const paid = pay === 'later' ? null : { method: pay, amount: total };
    try {
      await act.addCar({
        reg: regs[0], plate: plate.trim().toUpperCase(), model: m, area, plan, fee, customer_name: cn, customer_phone: cp,
        address: addr, geo, paid, others: regs.slice(1),
      });
      for (let i = 1; i < regs.length; i++) {
        await act.addCar({
          reg: regs[i], plate: ex[i - 1].trim().toUpperCase(), model: 'Gaadi', area, plan, fee, customer_name: cn, customer_phone: cp,
          address: addr, geo, paid: null, others: [regs[0]],
        });
      }
      close();
      router.navigate('/');
    } catch (e) {
      console.warn(e);
      setBusy(false);
      bad(t('Nahi gayi. Internet dekh ke dobara try karo.'));
    }
  };

  const share = fee * regs.length * SHARE;
  const last = step === STEPS.length - 1;
  return (
    <View style={{ paddingBottom: 8 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{t('Naya customer jodo')}</Text>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 12 }} accessibilityLabel={`${t('Step')} ${step + 1}/${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? c.primary : c.soft }} />
        ))}
      </View>
      <Text style={{ fontFamily: F.bold, fontSize: 14, color: c.fg2, marginTop: 8, marginBottom: 12 }}>
        {`${t('Step')} ${step + 1}/${STEPS.length} · ${t(STEPS[step])}`}
      </Text>

      {step === 0 ? (
        <DashCard style={{ padding: 16 }}>
          <Eyebrow style={lbl(0)}>{t('Gaadi ka number')}</Eyebrow>
          <Field value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} maxLength={20} autoCapitalize="characters" autoCorrect={false} placeholder="DL 8C AB 1234" />
          <Eyebrow style={lbl()}>{t('Gaadi ka naam / model (optional)')}</Eyebrow>
          <Field value={model} onChangeText={setModel} maxLength={60} placeholder={t('Jaise: Swift')} />
        </DashCard>
      ) : null}

      {step === 1 ? (
        <DashCard style={{ padding: 16 }}>
          <Eyebrow style={lbl(0)}>{t('Customer ka naam')}</Eyebrow>
          <Field value={name} onChangeText={setName} maxLength={80} placeholder={t('Naam')} />
          <Eyebrow style={lbl()}>{t('Phone (10 number)')}</Eyebrow>
          <Field value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, ''))} maxLength={10} keyboardType="number-pad" inputMode="numeric" placeholder="98XXXXXXXX" />
        </DashCard>
      ) : null}

      {step === 2 ? (
        <DashCard style={{ padding: 16 }}>
          <Button variant={geo ? 'ghost' : 'violet'} icon="pin" label={locBusy ? t('Location dhoondh raha hoon…') : geo ? t('Location dobara lo') : t('Meri location lo')} disabled={locBusy} onPress={useLocation} />
          {locMsg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.semi, fontSize: 13.5, color: c.fg2, marginTop: 10 }}>{locMsg}</Text> : null}
          {geo ? (
            <View style={{ marginTop: 12 }}>
              <PinMap />
              <Pressy
                onPress={() => { void Linking.openURL(mapUrl(geo)).catch(() => {}); }}
                accessibilityLabel={t('Map pe dekho')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, marginTop: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.soft }}
              >
                <Icon name="pin" size={22} color={c.softInk} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: c.softInk }}>{t('Location mil gayi')} · {t('Map pe dekho')}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg2 }}>{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</Text>
                </View>
                <Icon name="arrow" size={20} color={c.softInk} />
              </Pressy>
            </View>
          ) : null}
          <Eyebrow style={lbl()}>{t('Poora pata (flat / tower / society)')}</Eyebrow>
          <Field value={address} onChangeText={setAddress} maxLength={200} multiline placeholder={t('Flat 402, Tower B, Society ka naam')} />
        </DashCard>
      ) : null}

      {step === 3 ? (
        <>
          <DashCard style={{ padding: 16 }}>
            <Eyebrow style={lbl(0)}>{t('Plan')}</Eyebrow>
            <ChipPicker
              options={PLANS.map((k) => ({ value: k, label: PLAN[k].name }))}
              value={plan}
              onChange={(k) => { setPlan(k); ui.haptic(4); }}
            />
          </DashCard>
          <DashCard style={{ padding: 16, marginTop: 12 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>
              {t(`Aapko milega: ${rupee(share)} / mahina (${rupee(share / daysInMonth(DAY))} roz)`)}
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 6 }}>{t('Manager ki manzoori ke baad ginna shuru hoga.')}</Text>
          </DashCard>
        </>
      ) : null}

      {step === 4 ? (
        <DashCard style={{ padding: 16 }}>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: c.fg2 }}>{t('Same customer, same plan. Bas gaadi ka number chahiye.')}</Text>
          {extras.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Field value={x} onChangeText={(v) => setExtras(extras.map((y, j) => (j === i ? v.toUpperCase() : y)))} maxLength={20} autoCapitalize="characters" autoCorrect={false} placeholder="DL 8C AB 1234" accessibilityLabel={t('Aur gaadi')} />
              </View>
              <Pressy onPress={() => { setExtras(extras.filter((_, j) => j !== i)); ui.haptic(4); }} accessibilityLabel={t('Hata do')} scaleTo={0.9} style={{ minHeight: 56, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: brand.red }}>{t('Hata do')}</Text>
              </Pressy>
            </View>
          ))}
          <Button variant="ghost" icon="plus" label={`${t('+ Ek aur gaadi jodo')}${extras.length ? ` (${extras.length})` : ''}`} onPress={() => { setExtras([...extras, '']); ui.haptic(6); }} style={{ marginTop: 14 }} />
        </DashCard>
      ) : null}

      {step === 5 ? (
        <>
          <DashCard style={{ padding: 16 }}>
            <Row k={t('Customer')} v={`${name.trim() ? name.trim() + ' · ' : ''}+91 ${ph}`} />
            <Row k={t('Pata')} v={address.trim()} />
            <Row k={t('gaadi')} v={regs.map((r, i) => (i === 0 ? plate.trim().toUpperCase() || r : ex[i - 1].trim().toUpperCase())).join(', ')} />
            <Row k={t('Plan')} v={PLAN[plan].name} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg2 }}>{t('Aapko milega')}</Text>
              <BigNumber value={rupee(share)} unit={t('mahina')} size={26} />
            </View>
          </DashCard>
          <Eyebrow style={lbl(14)}>{t('Customer se paisa liya?')}</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['cash', 'upi', 'later'] as Pay[]).map((k) => {
              const on = pay === k;
              const label = k === 'cash' ? t('Cash mila') : k === 'upi' ? t('UPI mila') : t('Baad mein');
              return (
                <Pressy key={k} onPress={() => { setPay(k); ui.haptic(4); }} accessibilityLabel={label} accessibilityState={{ selected: on }}
                  style={{ minHeight: 52, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: on ? brand.violet : c.line, backgroundColor: on ? brand.violet : c.tile }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: on ? '#fff' : c.fg }}>{label}</Text>
                </Pressy>
              );
            })}
          </View>
          {pay === 'later' ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3, marginTop: 8 }}>{t('Abhi paisa nahi liya. Baad mein le lena.')}</Text> : null}
        </>
      ) : null}

      {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 14, color: brand.red, marginTop: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {step > 0 ? <Button variant="ghost" label={t('Peeche')} full={false} onPress={back} style={{ minWidth: 110 }} /> : null}
        <View style={{ flex: 1 }}>
          {last
            ? <Button variant="violet" label={busy ? t('Daal raha hoon…') : t('Round pe daalo')} disabled={busy} onPress={submit} />
            : <Button variant="violet" iconRight="arrow" label={t('Aage badho')} onPress={next} />}
        </View>
      </View>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <LinkButton label={t('Rehne do')} onPress={close} />
      </View>
    </View>
  );
}

const lbl = (mt = 12) => ({ marginTop: mt, marginBottom: 6 });

function Row({ k, v }: { k: string; v: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 5 }}>
      <Text style={{ width: 76, fontFamily: F.bold, fontSize: 13, color: c.fg3 }}>{k}</Text>
      <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 14.5, color: c.fg }}>{v}</Text>
    </View>
  );
}

// A small drawn "map": soft blocks, two roads and a pin. No map SDK.
function PinMap() {
  const { c } = useTheme();
  return (
    <View accessible={false} style={{ height: 84, borderRadius: 16, overflow: 'hidden', backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 10, backgroundColor: c.card, opacity: 0.8 }} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: '62%', width: 10, backgroundColor: c.card, opacity: 0.8 }} />
      <View style={{ position: 'absolute', left: 14, top: 10, width: 54, height: 14, borderRadius: 4, backgroundColor: c.line, opacity: 0.6 }} />
      <View style={{ position: 'absolute', left: 20, bottom: 10, width: 70, height: 26, borderRadius: 4, backgroundColor: c.line, opacity: 0.6 }} />
      <View style={{ position: 'absolute', right: 16, bottom: 12, width: 40, height: 22, borderRadius: 4, backgroundColor: c.line, opacity: 0.6 }} />
      <View style={{ position: 'absolute', left: '62%', top: 35, width: 10, height: 10, marginLeft: 0, marginTop: 0, borderRadius: 5, backgroundColor: 'rgba(232,56,79,0.25)', transform: [{ scale: 3 }] }} />
      <View style={{ position: 'absolute', left: '62%', top: 8, marginLeft: -7 }}>
        <Icon name="pin" size={32} color={brand.red} />
      </View>
    </View>
  );
}

// "Nayi gaadi add karo": a car the washer sold himself. It lands on his round today; Ravi approves it.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, ChipPicker, Eyebrow, Field, F, LinkButton, Pressy, brand, sheet, ui, useTheme } from '../ui';
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

function AddCarForm({ close }: { close: () => void }) {
  const { c } = useTheme();
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [area, setArea] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<PlanId>('std');
  const [fee, setFee] = useState(PLAN_PRICE.std);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const bad = (m: string) => { setErr(m); ui.haptic(14); };
  const setF = (v: number) => setFee(Math.max(0, Math.min(20000, v)));
  const step = (d: number) => { setF(fee + d); ui.haptic(4); };

  const submit = async () => {
    const m = model.trim(), p = plate.trim().toUpperCase(), reg = normReg(p), ph = phone.replace(/\D/g, '');
    if (!m) return bad(t('Gaadi ka naam likho'));
    if (reg.length < 4) return bad(t('Poora number daalo'));
    if (route().some((x) => x.reg === reg)) return bad(t('Yeh gaadi pehle se round pe hai'));
    if (ph && ph.length !== 10) return bad(t('Phone 10 number ka hota hai'));
    setErr(''); setBusy(true);
    try {
      await act.addCar({ reg, plate: p, model: m, area: area.trim(), plan, fee, customer_name: name.trim(), customer_phone: ph ? '+91' + ph : '' });
      close();
      router.navigate('/');
    } catch (e) {
      console.warn(e);
      setBusy(false);
      bad(t('Nahi gayi. Internet dekh ke dobara try karo.'));
    }
  };

  const share = fee * SHARE;
  return (
    <View style={{ paddingBottom: 8 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{t('Nayi gaadi add karo')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 14.5, color: c.fg2, marginTop: 4, marginBottom: 10 }}>
        {t('Aaj se aapke round pe aa jayegi. Ravi manzoori denge aur book mein daalenge.')}
      </Text>
      <Eyebrow style={lbl(0)}>{t('Gaadi')}</Eyebrow>
      <Field value={model} onChangeText={setModel} maxLength={60} placeholder={t('Jaise: Swift')} />
      <Eyebrow style={lbl()}>{t('Gaadi ka number')}</Eyebrow>
      <Field value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} maxLength={20} autoCapitalize="characters" autoCorrect={false} placeholder="DL 8C AB 1234" />
      <Eyebrow style={lbl()}>{t('Ghar / area')}</Eyebrow>
      <Field value={area} onChangeText={setArea} maxLength={80} placeholder="GH-9, 212" />
      <Eyebrow style={lbl()}>{t('Customer')}</Eyebrow>
      <Field value={name} onChangeText={setName} maxLength={80} placeholder={t('Naam')} />
      <Field value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, ''))} maxLength={10} keyboardType="number-pad" inputMode="numeric" placeholder={t('Phone (10 number)')} style={{ marginTop: 8 }} />
      <Eyebrow style={lbl()}>{t('Plan')}</Eyebrow>
      <ChipPicker
        options={PLANS.map((k) => ({ value: k, label: PLAN[k].name }))}
        value={plan}
        onChange={(k) => { setPlan(k); setF(PLAN_PRICE[k]); ui.haptic(4); }}
      />
      <Eyebrow style={lbl()}>{t('Mahine ka kitna tay hua?')}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StepBtn label="−" a11y={t('Kam')} onPress={() => step(-100)} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 16, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, flexDirection: 'row', gap: 6 }}>
          <Text style={{ fontFamily: F.shout, fontSize: 34, color: c.fg }}>₹{fee}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.fg3 }}>{t('mahina')}</Text>
        </View>
        <StepBtn label="+" a11y={t('Zyada')} onPress={() => step(100)} />
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 12 }}>
        {t(`Aapka aadha: ${rupee(share)} mahina, ${rupee(share / daysInMonth(DAY))} roz. Ravi ki manzoori ke baad ginna shuru hoga.`)}
      </Text>
      {err ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 14, color: brand.red, marginTop: 10 }}>{err}</Text> : null}
      <Button variant="violet" label={busy ? t('Daal raha hoon…') : t('Round pe daalo')} disabled={busy} onPress={submit} style={{ marginTop: 14 }} />
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <LinkButton label={t('Rehne do')} onPress={close} />
      </View>
    </View>
  );
}

const lbl = (mt = 12) => ({ marginTop: mt, marginBottom: 6 });

function StepBtn({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={a11y} scaleTo={0.9} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tile2, borderWidth: 1, borderColor: c.line }}>
      <Text style={{ fontFamily: F.black, fontSize: 26, color: c.fg, marginTop: -2 }}>{label}</Text>
    </Pressy>
  );
}

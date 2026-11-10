// Profile tab sections: assigned clothes, my kit (add-only), my documents (read-only, set by Daddy).
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { BigNumber, Button, ChipPicker, DashCard, F, Field, Icon, LinkButton, ListCard, Pressy, SectionTitle, StatusPill, brand, sheet, ui, useTheme } from '../ui';
import { Kit, addKitItem, clothesHave, useStore } from '../state/store';
import { KIT_KINDS, type KitKind } from '../lib/data';
import { t } from '../lib/i18n';
import { takePhoto } from '../lib/photo';
import { SheetTitle } from './sheets';
import { DocsPanel } from './DocsUpload';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MON[Number(m[2]) - 1]} ${m[1]}` : '';
};
const kindLabel = (k: KitKind) => t(KIT_KINDS.find(x => x.kind === k)?.label ?? 'Aur saaman');

function useBox() {
  const { c } = useTheme();
  return { c, box: { padding: 0, overflow: 'hidden' } as const };
}

/** Titled block on the page background (title 17px semibold, optional grey meta on the right). */
function Section({ title, meta, children }: { title: string; meta?: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <SectionTitle title={title} />
      {meta ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: -6, marginBottom: 10 }}>{meta}</Text> : null}
      {children}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 10 }}>{children}</Text>;
}

/* ---------- 1. Mere kapde ---------- */
export function ClothesCard() {
  useStore();
  const { c, box } = useBox();
  const given = Kit.profile?.assigned_clothes;
  const own = clothesHave();
  const cell = (n: string | number, label: string) => (
    <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2 }} numberOfLines={2}>{label}</Text>
      <BigNumber value={n} size={32} style={{ marginTop: 6 }} />
    </View>
  );
  return (
    <Section title={t('Mere kapde')}>
      <DashCard style={[box, { flexDirection: 'row' }]}>
        {cell(given == null ? '—' : given, t('Daddy ne diye'))}
        <View style={{ width: 1, backgroundColor: c.line, marginVertical: 14 }} />
        {cell(own, t('Maine khud add kiye'))}
      </DashCard>
      {given == null ? <Note>{t('Daddy abhi kapde assign kar rahe hain')}</Note> : null}
    </Section>
  );
}

/* ---------- 2. Mera saaman ---------- */
export function KitCard() {
  useStore();
  const { c } = useBox();
  const items = Kit.items;
  return (
    <Section title={t('Mera saaman')} meta={Kit.loaded ? undefined : t('Aa raha hai…')}>
      {items.length === 0 ? (
        <DashCard style={{ padding: 16 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg2 }}>{t('Abhi koi saaman add nahi kiya')}</Text>
        </DashCard>
      ) : (
        <View style={{ gap: 12 }}>
          {KIT_KINDS.filter(k => items.some(i => i.kind === k.kind)).map(k => (
            <View key={k.kind} style={{ gap: 10 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: c.fg3, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>{kindLabel(k.kind)}</Text>
              {items.filter(i => i.kind === k.kind).map(i => (
                <ListCard key={i.id} leading={<Thumb uri={Kit.photos?.[i.id]} />} title={i.name} detail={`${t('Add kiya')} ${fmtDate(i.at)}`}
                  right={<Text style={{ fontFamily: F.black, fontSize: 18, color: c.fg }}>× {i.qty}</Text>} />
              ))}
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 14 }}>
        <Button label={t('Saaman add karo')} variant="violet" icon="plus" onPress={openAddKit} />
      </View>
      <Note>{t('Ek baar add kiya to hata nahi sakte')}</Note>
    </Section>
  );
}

function Thumb({ uri }: { uri?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: 48, height: 48 }} resizeMode="cover" /> : <Icon name="cam" size={20} color={c.fg3} />}
    </View>
  );
}

function openAddKit() { sheet.open(close => <AddKitBody close={close} />) }

function AddKitBody({ close }: { close: () => void }) {
  const { c } = useTheme();
  const [kind, setKind] = useState<KitKind>('clothes');
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<{ preview: string; url: string } | null>(null);
  const snap = async () => {
    try {
      const r = await takePhoto();
      if (r) setShot(r);
    } catch (e: any) { ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo')) }
  };
  const nm = name.trim();
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addKitItem(kind, nm, qty, shot?.url ?? null);
      ui.toast(t('Saaman add ho gaya'));
      close();
    } catch (e: any) {
      ui.toast(e?.hi ? t(e.hi) : t('Add nahi hua. Dobara try karo'));
      setStep('form');
    } finally { setBusy(false) }
  };
  const stepBtn = (label: string, d: number, off: boolean) => (
    <Pressy onPress={() => setQty(q => Math.min(999, Math.max(1, q + d)))} disabled={off} accessibilityLabel={label}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.4 : 1 }}>
      <Text style={{ fontFamily: F.black, fontSize: 24, color: c.softInk }}>{d > 0 ? '+' : '−'}</Text>
    </Pressy>
  );
  if (step === 'confirm') {
    return (
      <View>
        <SheetTitle title={t('Pakka add karein?')} sub={t('Ek baar add kiya to hata nahi sakte. Naam aur ginti dobara check kar lo.')} />
        <View style={{ padding: 14, borderRadius: 20, backgroundColor: c.soft, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.black, fontSize: 18, color: c.fg }}>{nm} × {qty}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: c.fg2, marginTop: 2 }}>{kindLabel(kind)}</Text>
          {shot ? <Image source={{ uri: shot.preview }} style={{ width: 72, height: 72, borderRadius: 18, marginTop: 10 }} resizeMode="cover" /> : null}
        </View>
        <Button label={busy ? t('Add ho raha hai…') : t('Haan, pakka add karo')} variant="ink" disabled={busy} onPress={save} />
        <View style={{ alignItems: 'center' }}><LinkButton label={t('Wapas badlo')} onPress={() => setStep('form')} /></View>
      </View>
    );
  }
  const lab = { fontFamily: F.bold, fontSize: 13, color: c.fg2, marginTop: 14, marginBottom: 8 } as const;
  return (
    <View>
      <SheetTitle title={t('Saaman add karo')} sub={t('Jo saaman aapke paas hai wo likho.')} />
      <Text style={lab}>{t('Kya hai?')}</Text>
      <ChipPicker options={KIT_KINDS.map(k => ({ value: k.kind, label: t(k.label) }))} value={kind} onChange={setKind} />
      <Text style={lab}>{t('Naam')}</Text>
      <Field value={name} onChangeText={setName} maxLength={60} placeholder={t('Jaise: Car shampoo 1L')} accessibilityLabel={t('Naam')} />
      <Text style={lab}>{t('Kitne?')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        {stepBtn(t('Kam'), -1, qty <= 1)}
        <Text accessibilityLabel={t('Ginti') + ' ' + qty} style={{ fontFamily: F.black, fontSize: 36, color: c.fg, minWidth: 64, textAlign: 'center' }}>{qty}</Text>
        {stepBtn(t('Zyada'), 1, qty >= 999)}
      </View>
      <Text style={lab}>{t('Saaman ki photo (optional)')}</Text>
      {shot ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Image source={{ uri: shot.preview }} style={{ width: 96, height: 96, borderRadius: 24 }} resizeMode="cover" />
          <LinkButton label={t('Dobara lo')} onPress={snap} />
        </View>
      ) : (
        <Pressy onPress={snap} accessibilityLabel={t('Photo lo')} scaleTo={0.96}
          style={{ height: 96, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: c.dash, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon name="cam" size={28} color={c.fg2} />
          <Text style={{ fontFamily: F.black, fontSize: 13, color: c.fg2 }}>{t('Photo lo')}</Text>
        </Pressy>
      )}
      <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: brand.red, marginTop: 14 }}>{t('Ek baar add kiya to hata nahi sakte')}</Text>
      <View style={{ marginTop: 12 }}>
        <Button label={t('Aage badho')} variant="gold" disabled={!nm} onPress={() => setStep('confirm')} />
      </View>
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} onPress={close} /></View>
    </View>
  );
}

/* ---------- 3. Mere documents ---------- */
export function DocsCard() {
  useStore();
  const { c, box } = useBox();
  const p = Kit.profile;
  const last4 = /^\d{4}$/.test(p?.aadhaar_last4 ?? '') ? p!.aadhaar_last4! : '';
  const pcc = p?.pcc;
  const pill = pcc?.status === 'clear' ? <StatusPill status="done" label={t('Verified')} />
    : pcc?.status === 'rejected' ? <StatusPill status="skipped" label={t('Reject hua')} />
    : pcc ? <StatusPill status="arrived" label={t('Pending')} /> : null;
  const head = (label: string, right?: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: c.fg3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</Text>
      {right}
    </View>
  );
  const wait = <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg2, marginTop: 6 }}>{t('Daddy abhi verify kar rahe hain')}</Text>;
  const sub = { fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 4 } as const;
  return (
    <Section title={t('Mere documents')}>
      <DashCard style={box}>
        <View style={{ padding: 16 }}>
          {head(t('Aadhaar'), last4 && p?.aadhaar_verified_at ? <StatusPill status="done" label={t('Verified')} /> : null)}
          {last4 ? (
            <>
              <Text accessibilityLabel={t('Aadhaar') + ' ' + last4} style={{ fontFamily: F.black, fontSize: 22, letterSpacing: 1.2, color: c.fg, marginTop: 6 }}>XXXX XXXX {last4}</Text>
              {p?.aadhaar_verified_at ? <Text style={sub}>{t('Verified')} {fmtDate(p.aadhaar_verified_at)}</Text> : <Text style={sub}>{t('Daddy abhi verify kar rahe hain')}</Text>}
            </>
          ) : wait}
        </View>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: c.line }}>
          {head(t('Police clearance (PCC)'), pill)}
          {pcc ? (
            <>
              {pcc.status === 'clear' || pcc.verified_at ? <Text style={[sub, { marginTop: 6 }]}>{pcc.status === 'clear' ? t('Verified') : t('Check hua')} {fmtDate(pcc.verified_at)}</Text> : null}
              {pcc.ref ? <Text style={sub}>{t('Ref')}: {pcc.ref}</Text> : null}
              {pcc.status === 'pending' ? wait : null}
              {pcc.status === 'rejected' ? <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: brand.red, marginTop: 6 }}>{t('Daddy se baat karo')}</Text> : null}
            </>
          ) : wait}
        </View>
      </DashCard>
      <View style={{ height: 14 }} />
      <DocsPanel />
    </Section>
  );
}

export function KitSections() {
  return <><ClothesCard /><KitCard /><DocsCard /></>;
}

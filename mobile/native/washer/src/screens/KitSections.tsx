// Profile tab sections: assigned clothes, my kit (add-only), my documents (read-only, set by Daddy).
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, ChipPicker, F, Field, Group, Icon, LinkButton, Pressy, Row, SectionLabel, brand, sheet, ui, useTheme } from '../ui';
import { TNUM } from './ProntoBits';
import { DOC_KINDS, Docs, Kit, addKitItem, clothesHave, useStore } from '../state/store';
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

function Note({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, marginTop: 8, marginLeft: 4 }}>{children}</Text>;
}

/* ---------- 1. Mere kapde ---------- */
export function ClothesCard() {
  useStore();
  const { c } = useTheme();
  const given = Kit.profile?.assigned_clothes;
  const own = clothesHave();
  const cell = (n: string | number, label: string) => (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.grey }} numberOfLines={2}>{label}</Text>
      <Text style={[TNUM, { fontFamily: F.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: c.fg, marginTop: 2 }]}>{n}</Text>
    </View>
  );
  return (
    <View>
      <SectionLabel style={{ marginTop: 8 }}>{t('Mere kapde')}</SectionLabel>
      <Group>
        <View style={{ flexDirection: 'row' }}>
          {cell(given == null ? '—' : given, t('Daddy ne diye'))}
          <View style={{ width: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} />
          {cell(own, t('Maine khud add kiye'))}
        </View>
      </Group>
      {given == null ? <Note>{t('Daddy abhi kapde assign kar rahe hain')}</Note> : null}
    </View>
  );
}

/* ---------- 2. Mera saaman ---------- */
export function KitCard({ onAdd }: { onAdd?: () => void }) {
  useStore();
  const { c } = useTheme();
  const items = Kit.items;
  return (
    <View>
      <SectionLabel>{Kit.loaded ? t('Mera saaman') : `${t('Mera saaman')} · ${t('Aa raha hai…')}`}</SectionLabel>
      {items.length === 0 ? (
        <Group>
          <Row icon="kit" label={t('Abhi koi saaman add nahi kiya')} />
        </Group>
      ) : (
        <View style={{ gap: 4 }}>
          {KIT_KINDS.filter(k => items.some(i => i.kind === k.kind)).map(k => (
            <View key={k.kind}>
              <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey, marginLeft: 4, marginTop: 8, marginBottom: 6 }}>{kindLabel(k.kind)}</Text>
              <Group>
                {items.filter(i => i.kind === k.kind).map(i => (
                  <Row key={i.id} icon={<Thumb uri={Kit.photos?.[i.id]} />} label={i.name} sub={`${t('Add kiya')} ${fmtDate(i.at)}`}
                    right={<Text style={[TNUM, { fontFamily: F.bold, fontSize: 16, color: c.fg }]}>× {i.qty}</Text>} />
                ))}
              </Group>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <Button label={t('Saaman add karo')} variant="violet" icon="plus" onPress={onAdd ?? openAddKit} />
      </View>
      <Note>{t('Ek baar add kiya to hata nahi sakte')}</Note>
    </View>
  );
}

function Thumb({ uri }: { uri?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width: 40, height: 40 }} resizeMode="cover" /> : <Icon name="cam" size={18} color={c.grey} />}
    </View>
  );
}

function openAddKit() { sheet.open(close => <AddKitBody close={close} />) }

/** Kit sheet from Profile > Mera saaman: clothes, items by kind, add button. */
export function openKitSheet() {
  sheet.open(close => (
    <View>
      <SheetTitle title={t('Mera saaman')} action={t('Add')} actionIcon="plus" onAction={() => sheet.open(cl => <AddKitBody close={() => { cl(); openKitSheet() }} />)} />
      <ClothesCard />
      <KitCard onAdd={() => sheet.open(cl => <AddKitBody close={() => { cl(); openKitSheet() }} />)} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Band karo')} onPress={close} /></View>
    </View>
  ));
}

/** Documents sheet from Profile > Mere documents. */
export function openDocsSheet() {
  sheet.open(close => (
    <View>
      <SheetTitle title={t('Mere documents')} sub={t('Daddy ki taraf se verify hote hain')} />
      <DocsCard />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Band karo')} onPress={close} /></View>
    </View>
  ));
}

export const kitCount = () => Kit.items.reduce((n, i) => n + (i.qty || 0), 0);
export const docsApproved = () => DOC_KINDS.filter(k => Docs.items[k.kind]?.status === 'verified').length;

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
      style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.4 : 1 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 24, color: c.fg }}>{d > 0 ? '+' : '−'}</Text>
    </Pressy>
  );
  if (step === 'confirm') {
    return (
      <View>
        <SheetTitle title={t('Pakka add karein?')} sub={t('Ek baar add kiya to hata nahi sakte. Naam aur ginti dobara check kar lo.')} />
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.canvas, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: c.fg }}>{nm} × {qty}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13.5, color: c.fg2, marginTop: 2 }}>{kindLabel(kind)}</Text>
          {shot ? <Image source={{ uri: shot.preview }} style={{ width: 72, height: 72, borderRadius: 18, marginTop: 10 }} resizeMode="cover" /> : null}
        </View>
        <Button label={busy ? t('Add ho raha hai…') : t('Haan, pakka add karo')} variant="ink" disabled={busy} onPress={save} />
        <View style={{ alignItems: 'center' }}><LinkButton label={t('Wapas badlo')} onPress={() => setStep('form')} /></View>
      </View>
    );
  }
  const lab = { fontFamily: F.semi, fontSize: 13, color: c.grey, marginTop: 16, marginBottom: 8 } as const;
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
        <Text accessibilityLabel={t('Ginti') + ' ' + qty} style={{ fontFamily: F.black, fontSize: 32, lineHeight: 40, color: c.fg, minWidth: 64, textAlign: 'center' }}>{qty}</Text>
        {stepBtn(t('Zyada'), 1, qty >= 999)}
      </View>
      <Text style={lab}>{t('Saaman ki photo (optional)')}</Text>
      {shot ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Image source={{ uri: shot.preview }} style={{ width: 96, height: 96, borderRadius: 16 }} resizeMode="cover" />
          <LinkButton label={t('Dobara lo')} onPress={snap} />
        </View>
      ) : (
        <Pressy onPress={snap} accessibilityLabel={t('Photo lo')} scaleTo={0.96}
          style={{ height: 96, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.dash, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon name="cam" size={28} color={c.fg2} />
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2 }}>{t('Photo lo')}</Text>
        </Pressy>
      )}
      <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: brand.red, marginTop: 14 }}>{t('Ek baar add kiya to hata nahi sakte')}</Text>
      <View style={{ marginTop: 12 }}>
        <Button label={t('Aage badho')} variant="violet" disabled={!nm} onPress={() => setStep('confirm')} />
      </View>
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} onPress={close} /></View>
    </View>
  );
}

/* ---------- 3. Mere documents ---------- */
export function DocsCard() {
  useStore();
  const { c } = useTheme();
  const p = Kit.profile;
  const last4 = /^\d{4}$/.test(p?.aadhaar_last4 ?? '') ? p!.aadhaar_last4! : '';
  const pcc = p?.pcc;
  const pcChip = pcc?.status === 'clear' ? <Chip tone="green">{t('Verified')}</Chip>
    : pcc?.status === 'rejected' ? <Chip tone="red">{t('Reject hua')}</Chip>
    : pcc ? <Chip tone="amber">{t('Pending')}</Chip> : <Chip tone="grey">{t('Baaki')}</Chip>;
  const aaChip = last4 && p?.aadhaar_verified_at ? <Chip tone="green">{t('Verified')}</Chip> : <Chip tone="grey">{last4 ? t('Pending') : t('Baaki')}</Chip>;
  const wait = t('Daddy abhi verify kar rahe hain');
  const pccSub = !pcc ? wait
    : pcc.status === 'rejected' ? t('Daddy se baat karo')
    : pcc.status === 'pending' ? wait
    : [`${pcc.status === 'clear' ? t('Verified') : t('Check hua')} ${fmtDate(pcc.verified_at)}`.trim(), pcc.ref ? `${t('Ref')}: ${pcc.ref}` : ''].filter(Boolean).join(' · ');
  return (
    <View>
      <SectionLabel style={{ marginTop: 8 }}>{t('Daddy ne verify kiye')}</SectionLabel>
      <Group>
        <Row icon="id" label={last4 ? `${t('Aadhaar')}  XXXX ${last4}` : t('Aadhaar')} sub={last4 ? (p?.aadhaar_verified_at ? `${t('Verified')} ${fmtDate(p.aadhaar_verified_at)}` : wait) : wait} right={aaChip} />
        <Row icon="shield" label={t('Police clearance (PCC)')} sub={pccSub} right={pcChip} />
      </Group>
      <SectionLabel>{t('Mere documents')}</SectionLabel>
      <DocsPanel reopen={openDocsSheet} />
    </View>
  );
}

/** Compat: the Profile tab now links to the two sheets; this renders those two entry rows as one Group. */
export function KitSections() {
  useStore();
  return (
    <Group>
      <Row icon="kit" label={t('Mera saaman')} value={String(kitCount())} onPress={openKitSheet} />
      <Row icon="doc" label={t('Mere documents')} value={`${docsApproved()}/${DOC_KINDS.length}`} onPress={openDocsSheet} />
    </Group>
  );
}

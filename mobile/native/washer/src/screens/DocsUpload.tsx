// Identity documents (Aadhaar front/back, PAN): list with status, and a bottom sheet to add or replace each one.
// Shared by the onboarding "Profile" step and the Profile tab ("Mere documents"). Data layer: state/store.ts (Docs, uploadDoc).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { Chip, F, Group, Icon, LinkButton, Pressy, Row, brand, sheet, ui, useTheme, type IconName } from '../ui';
import { DOC_KINDS, Docs, uploadDoc, useStore, watchDocs, type DocItem, type DocKind } from '../state/store';
import { pickDocument } from '../lib/docs';
import { t } from '../lib/i18n';
import { SheetTitle } from './sheets';

type Tone = 'ok' | 'wait' | 'todo' | 'bad';
const CHIP: Record<Tone, 'green' | 'violet' | 'grey' | 'red'> = { ok: 'green', wait: 'violet', todo: 'grey', bad: 'red' };
function statusOf(d?: DocItem): { label: string; tone: Tone } {
  if (!d) return { label: t('Baaki'), tone: 'todo' };
  if (d.status === 'verified') return { label: t('Verified'), tone: 'ok' };
  if (d.status === 'rejected') return { label: t('Rejected'), tone: 'bad' };
  return { label: t('Bheja gaya'), tone: 'wait' };
}

/** Overall state of the three documents, for the onboarding step card. */
export function docsSummary(items: Partial<Record<DocKind, DocItem>> = Docs.items): { label: string; tone: 'ok' | 'wait' | 'todo' } {
  const sent = DOC_KINDS.filter(k => items[k.kind] && items[k.kind]!.status !== 'rejected');
  if (sent.length === DOC_KINDS.length) {
    return DOC_KINDS.every(k => items[k.kind]!.status === 'verified') ? { label: t('Verified'), tone: 'ok' } : { label: t('Bheje gaye'), tone: 'wait' };
  }
  return Object.keys(items).length ? { label: t('Adhoora'), tone: 'wait' } : { label: t('Baaki'), tone: 'todo' };
}

/** Primary button, reference look: 52 high, radius 14, flat brand violet; `ghost` is the white outlined secondary. */
export function Cta({ label, onPress, busy, ready = true, icon, arrow, ghost, style }: {
  label: string; onPress: () => void; busy?: boolean; ready?: boolean; icon?: IconName; arrow?: boolean; ghost?: boolean; style?: object;
}) {
  const { c, dark } = useTheme();
  const off = !!busy || !ready;
  const fg = ghost ? c.fg : off ? (dark ? c.fg3 : '#6B6483') : '#fff';
  return (
    <Pressy onPress={onPress} disabled={busy} accessibilityLabel={label} scaleTo={0.97}
      style={[{ minHeight: 52, borderRadius: 14, backgroundColor: ghost ? c.card : off ? (dark ? c.tile2 : '#E6E0F5') : c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
        ghost ? { borderWidth: 1, borderColor: c.line } : null, style]}>
      {icon && !busy ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 16, color: fg, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
      {arrow && !busy ? <Icon name="arrow" size={18} color={fg} /> : null}
    </Pressy>
  );
}

function Thumb({ d }: { d?: DocItem }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }}>
      {!d ? <Icon name={'cam' as IconName} size={20} color={c.grey} />
        : d.mime === 'application/pdf' ? <Icon name="doc" size={22} color={c.grey} />
        : <Image source={{ uri: d.data }} style={{ width: 44, height: 44 }} resizeMode="cover" accessibilityIgnoresInvertColors />}
    </View>
  );
}

const OPTIONS: { source: 'camera' | 'gallery' | 'pdf'; label: string; icon: IconName }[] = [
  { source: 'camera', label: 'Camera se photo', icon: 'cam' },
  { source: 'gallery', label: 'Gallery se photo', icon: 'note' },
  { source: 'pdf', label: 'PDF chuno', icon: 'doc' },
];

function ChooseSheet({ kind, label, close, onDone }: { kind: DocKind; label: string; close: () => void; onDone?: () => void }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (source: 'camera' | 'gallery' | 'pdf') => {
    if (busy) return;
    setBusy(source);
    try {
      const r = await pickDocument(source);
      if (!r) { setBusy(null); return }
      await uploadDoc(kind, r.mime, r.name, r.data);
      ui.haptic([10, 30, 10]); ui.toast(t('Document bhej diya'));
      close(); onDone?.();
    } catch (e: any) {
      ui.haptic(14); ui.toast(e?.hi ? t(e.hi) : t('Nahi gaya. Internet dekh ke dobara try karo.'));
      setBusy(null);
    }
  };
  return (
    <View>
      <SheetTitle title={label} sub={t('Saaf photo ya PDF chuno. Poora document dikhna chahiye.')} />
      <Group>
        {OPTIONS.map(o => (
          <Row key={o.source} icon={o.icon} label={t(o.label)} onPress={() => { if (!busy) void go(o.source) }}
            right={busy === o.source ? <ActivityIndicator color={c.primary} /> : undefined} style={{ opacity: busy && busy !== o.source ? 0.5 : 1 }} />
        ))}
      </Group>
      {busy ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.medium, fontSize: 13, color: c.grey, textAlign: 'center', marginTop: 12 }}>{t('Bhej rahe hain…')}</Text> : null}
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} onPress={() => { if (!busy) { close(); onDone?.() } }} /></View>
    </View>
  );
}

/**
 * The three documents with status and an upload / replace button.
 * `reopen` is for a panel that itself lives in a sheet: only one sheet shows at a time, so it is called to bring that sheet back after the picker sheet closes.
 */
export function DocsPanel({ reopen }: { reopen?: () => void }) {
  useStore();
  const { c } = useTheme();
  useEffect(() => { watchDocs() }, []);
  return (
    <View>
      <Group>
        {DOC_KINDS.map(k => {
          const d = Docs.items[k.kind];
          const s = statusOf(d);
          const locked = d?.status === 'verified';
          const label = t(k.label);
          const sub = d?.status === 'rejected' && d.note ? d.note : d?.mime === 'application/pdf' ? d.name : undefined;
          return (
            <Row key={k.kind} icon={<Thumb d={d} />} label={label} sub={sub}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {d ? <Chip tone={CHIP[s.tone]}>{s.label}</Chip> : null}
                  {locked ? <Icon name="shield" size={16} color={c.grey} /> : (
                    <Pressy scaleTo={0.95} accessibilityRole="button" accessibilityLabel={(d ? t('Badlo') : t('Upload karo')) + ' ' + label}
                      onPress={() => sheet.open(close => <ChooseSheet kind={k.kind} label={label} close={close} onDone={reopen} />)}
                      style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: d ? c.card : c.primary, borderWidth: d ? 1 : 0, borderColor: c.line }}>
                      <Text style={{ fontFamily: F.medium, fontSize: 13, color: d ? c.fg : '#fff' }}>{d ? t('Badlo') : t('Upload')}</Text>
                    </Pressy>
                  )}
                </View>
              } />
          );
        })}
      </Group>
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, marginTop: 8, marginLeft: 4 }}>{t('Aapke documents sirf Washing Daddy team verify karne ke liye dekhegi.')}</Text>
    </View>
  );
}

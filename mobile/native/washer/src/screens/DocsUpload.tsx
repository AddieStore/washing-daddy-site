// Identity documents (Aadhaar front/back, PAN): list with status, and a bottom sheet to add or replace each one.
// Shared by the onboarding "Profile" step and the Profile tab ("Mere documents"). Data layer: state/store.ts (Docs, uploadDoc).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { DashCard, F, Icon, LinkButton, Pressy, brand, sheet, ui, useTheme, type IconName } from '../ui';
import { DOC_KINDS, Docs, uploadDoc, useStore, watchDocs, type DocItem, type DocKind } from '../state/store';
import { pickDocument } from '../lib/docs';
import { t } from '../lib/i18n';
import { SheetTitle } from './sheets';

type Tone = 'ok' | 'wait' | 'todo' | 'bad';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(20,192,138,0.18)', fg: '#0b8a62' },
  wait: { bg: 'rgba(17,17,20,0.07)', fg: '#52525B' },
  todo: { bg: 'rgba(17,17,20,0.07)', fg: '#52525B' },
  bad: { bg: 'rgba(232,56,79,0.14)', fg: '#c0182f' },
};
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

function Thumb({ d }: { d?: DocItem }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
      {!d ? <Icon name={'cam' as IconName} size={22} color={c.fg3} />
        : d.mime === 'application/pdf' ? <Text style={{ fontSize: 26 }}>📄</Text>
        : <Image source={{ uri: d.data }} style={{ width: 56, height: 56 }} resizeMode="cover" accessibilityIgnoresInvertColors />}
    </View>
  );
}

const OPTIONS: { source: 'camera' | 'gallery' | 'pdf'; label: string; emoji: string }[] = [
  { source: 'camera', label: 'Camera se photo', emoji: '📷' },
  { source: 'gallery', label: 'Gallery se photo', emoji: '🖼️' },
  { source: 'pdf', label: 'PDF chuno', emoji: '📄' },
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
      <View style={{ gap: 10 }}>
        {OPTIONS.map(o => (
          <Pressy key={o.source} scaleTo={0.97} disabled={!!busy} accessibilityLabel={t(o.label)} onPress={() => go(o.source)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.card, shadowColor: '#000', shadowOpacity: c.shadow ? 0.07 : 0, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: c.shadow ? 1 : 0, borderWidth: 1, borderColor: c.line, opacity: busy && busy !== o.source ? 0.5 : 1 }}>
            <Text style={{ fontSize: 26 }}>{o.emoji}</Text>
            <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 16, color: c.fg }}>{t(o.label)}</Text>
            {busy === o.source ? <ActivityIndicator color={brand.violet} /> : null}
          </Pressy>
        ))}
      </View>
      {busy ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2, textAlign: 'center', marginTop: 12 }}>{t('Bhej rahe hain…')}</Text> : null}
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} color={c.fg2} onPress={() => { if (!busy) { close(); onDone?.() } }} /></View>
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
      <DashCard style={{ overflow: 'hidden' }}>
        {DOC_KINDS.map((k, i) => {
          const d = Docs.items[k.kind];
          const s = statusOf(d);
          const locked = d?.status === 'verified';
          const label = t(k.label);
          return (
            <View key={k.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Thumb d={d} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: c.fg }}>{label}</Text>
                {d?.mime === 'application/pdf' ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 1 }}>{d.name}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <View style={{ paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, backgroundColor: TONES[s.tone].bg }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 17, color: TONES[s.tone].fg }}>{s.label}</Text>
                  </View>
                  {locked ? <Text accessibilityLabel={t('Verify ho chuka, badal nahi sakte')} style={{ fontSize: 14 }}>🔒</Text> : null}
                </View>
                {d?.status === 'rejected' && d.note ? <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: brand.red, marginTop: 4 }}>{d.note}</Text> : null}
              </View>
              {locked ? null : (
                <Pressy scaleTo={0.95} accessibilityRole="button" accessibilityLabel={(d ? t('Badlo') : t('Upload karo')) + ' ' + label}
                  onPress={() => sheet.open(close => <ChooseSheet kind={k.kind} label={label} close={close} onDone={reopen} />)}
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: d ? c.soft : c.primary }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 14, color: d ? c.softInk : '#fff' }}>{d ? t('Badlo') : t('Upload karo')}</Text>
                </Pressy>
              )}
            </View>
          );
        })}
      </DashCard>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 10 }}>{t('Aapke documents sirf Washing Daddy team verify karne ke liye dekhegi.')}</Text>
    </View>
  );
}

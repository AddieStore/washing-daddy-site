// Identity documents (Aadhaar front/back, PAN): list with status, and a bottom sheet to add or replace each one.
// Shared by the onboarding "Profile" step and the Profile tab ("Mere documents"). Data layer: state/store.ts (Docs, uploadDoc).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { F, Icon, LinkButton, Pressy, brand, sheet, ui, useTheme, type IconName } from '../ui';
import { DOC_KINDS, Docs, uploadDoc, useStore, watchDocs, type DocItem, type DocKind } from '../state/store';
import { pickDocument } from '../lib/docs';
import { t } from '../lib/i18n';
import { SheetTitle } from './sheets';
import { WCard } from './ProntoBits';

type Tone = 'ok' | 'wait' | 'todo' | 'bad';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(22,163,74,0.12)', fg: '#15803d' },
  wait: { bg: 'rgba(84,9,218,0.08)', fg: '#5409DA' },
  todo: { bg: 'rgba(84,9,218,0.08)', fg: '#5409DA' },
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

/** Primary button, customer look: 56 high, radius 16, violet with a violet glow; lilac while busy / not ready. `ghost` is the white-card secondary with violet text. */
export function Cta({ label, onPress, busy, ready = true, icon, arrow, ghost, style }: {
  label: string; onPress: () => void; busy?: boolean; ready?: boolean; icon?: IconName; arrow?: boolean; ghost?: boolean; style?: object;
}) {
  const { c, dark } = useTheme();
  const off = !!busy || !ready;
  const fg = ghost ? c.primary : off ? (dark ? c.fg3 : '#6B6483') : '#fff';
  return (
    <Pressy onPress={onPress} disabled={busy} accessibilityLabel={label} scaleTo={0.97}
      style={[{ minHeight: 56, borderRadius: 16, backgroundColor: ghost ? c.card : off ? (dark ? c.tile2 : '#E6E0F5') : c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
        ghost ? { borderWidth: 1.5, borderColor: 'rgba(84,9,218,0.18)' } : null,
        !off && !ghost && { shadowColor: '#5409DA', shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, style]}>
      {icon && !busy ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 16, color: fg, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
      {arrow && !busy ? <Icon name="arrow" size={18} color={fg} /> : null}
    </Pressy>
  );
}

function Thumb({ d }: { d?: DocItem }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
      {!d ? <Icon name={'cam' as IconName} size={22} color={c.primary} />
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
      <View style={{ gap: 12 }}>
        {OPTIONS.map(o => (
          <Pressy key={o.source} scaleTo={0.97} disabled={!!busy} accessibilityLabel={t(o.label)} onPress={() => go(o.source)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.inputBg, opacity: busy && busy !== o.source ? 0.5 : 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>{o.emoji}</Text></View>
            <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 16, color: c.fg }}>{t(o.label)}</Text>
            {busy === o.source ? <ActivityIndicator color={brand.violet} /> : <Icon name="chevron" size={18} color={c.fg3} />}
          </Pressy>
        ))}
      </View>
      {busy ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2, textAlign: 'center', marginTop: 12 }}>{t('Bhej rahe hain…')}</Text> : null}
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} color={c.primary} onPress={() => { if (!busy) { close(); onDone?.() } }} /></View>
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
      <WCard>
        {DOC_KINDS.map((k, i) => {
          const d = Docs.items[k.kind];
          const s = statusOf(d);
          const locked = d?.status === 'verified';
          const label = t(k.label);
          return (
            <View key={k.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(84,9,218,0.10)' }}>
              <Thumb d={d} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: c.fg }}>{label}</Text>
                {d?.mime === 'application/pdf' ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 1 }}>{d.name}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: TONES[s.tone].bg }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: TONES[s.tone].fg }}>{s.label}</Text>
                  </View>
                  {locked ? <Text accessibilityLabel={t('Verify ho chuka, badal nahi sakte')} style={{ fontSize: 14 }}>🔒</Text> : null}
                </View>
                {d?.status === 'rejected' && d.note ? <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: '#dc2626', marginTop: 4 }}>{d.note}</Text> : null}
              </View>
              {locked ? null : (
                <Pressy scaleTo={0.95} accessibilityRole="button" accessibilityLabel={(d ? t('Badlo') : t('Upload karo')) + ' ' + label}
                  onPress={() => sheet.open(close => <ChooseSheet kind={k.kind} label={label} close={close} onDone={reopen} />)}
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: d ? 'rgba(84,9,218,0.08)' : c.primary }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 14, color: d ? c.primary : '#fff' }}>{d ? t('Badlo') : t('Upload karo')}</Text>
                </Pressy>
              )}
            </View>
          );
        })}
      </WCard>
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3, marginTop: 8 }}>{t('Aapke documents sirf Washing Daddy team verify karne ke liye dekhegi.')}</Text>
    </View>
  );
}

// Car-screen extras: the leave-a-started-wash sheet, the condition picker shown at start, and the report chips / summary.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { F, sheet, useTheme } from '../ui';
import { Button, ChipPicker, Field, Pressy } from '../ui';
import { act } from '../state/store';
import { t } from '../lib/i18n';
import { ABANDON_REASONS, CONDITIONS, DELAYS, ISSUES, type Wash } from '../lib/data';

type Cond = 'light' | 'normal' | 'heavy';

function Label({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: c.fg3, marginBottom: 6 }}>{children}</Text>;
}

/** A chip that toggles on/off (multi-select). */
function Toggle({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const { c, dark } = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: on ? c.primary : 'transparent',
        backgroundColor: on ? (dark ? 'rgba(139,92,246,0.22)' : 'rgba(84,9,218,0.08)') : c.tile2 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? c.primary : c.fg }}>{label}</Text>
    </Pressy>
  );
}

/* ---------- leaving a started wash ---------- */
function LeaveSheet({ reg, close, onLeft }: { reg: string; close: () => void; onLeft: () => void }) {
  const { c } = useTheme();
  const [step, setStep] = useState<'ask' | 'why'>('ask');
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (step === 'ask') {
    return (
      <View>
        <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 24, color: c.fg }}>{t('Wash abhi chal raha hai')}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 20, color: c.fg3, marginTop: 4, marginBottom: 16 }}>{t('Gaadi chhodne se pehle batao kya hua.')}</Text>
        <Button variant="gold" icon="check" label={t('Wash poora karo')} onPress={close} />
        <View style={{ height: 10 }} />
        <Button variant="ghost" label={t('Wash nahi kiya / chhod diya')} onPress={() => setStep('why')} />
      </View>
    );
  }
  return (
    <View>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 24, color: c.fg }}>{t('Kyun chhoda?')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 20, color: c.fg3, marginTop: 4, marginBottom: 14 }}>{t('Manager aur customer ko yahi wajah dikhegi.')}</Text>
      <ChipPicker options={ABANDON_REASONS.map(r => ({ value: r, label: t(r) }))} value={pick} onChange={setPick} />
      <Field multiline maxLength={300} value={note} onChangeText={setNote} placeholder={t('Kuch aur batana hai? (optional)')} style={{ minHeight: 70 }} />
      <View style={{ height: 12 }} />
      <Button variant="ink" label={t('Wash band karo')} disabled={!pick}
        onPress={() => { if (pick && act.abandon(reg, pick, note.trim() || undefined)) { close(); onLeft() } }} />
      <View style={{ height: 8 }} />
      <Button variant="ghost" label={t('Wash poora karo')} onPress={close} />
    </View>
  );
}
export function openLeaveSheet(reg: string, onLeft: () => void) {
  sheet.open(close => <LeaveSheet reg={reg} close={close} onLeft={onLeft} />);
}

/* ---------- at start: condition + damage, default normal so a plain slide still works ---------- */
export type StartInfo = { condition: Cond; damage: boolean; note: string };
export function StartCapture({ info }: { info: React.MutableRefObject<StartInfo> }) {
  const { c } = useTheme();
  const [cond, setCond] = useState<Cond>(info.current.condition);
  const [dmg, setDmg] = useState(info.current.damage);
  const [note, setNote] = useState(info.current.note);
  const set = (p: Partial<StartInfo>) => { info.current = { ...info.current, ...p } };
  return (
    <View style={{ marginBottom: 12 }}>
      <Label>{t('Gaadi kaisi hai?')}</Label>
      <ChipPicker options={CONDITIONS.map(o => ({ value: o.key, label: t(o.label) }))} value={cond} onChange={v => { setCond(v); set({ condition: v }) }} style={{ marginBottom: 2 }} />
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <Toggle on={dmg} label={t('Gaadi par pehle se nishaan hai')} onPress={() => { setDmg(!dmg); set({ damage: !dmg }) }} />
      </View>
      {dmg ? (
        <View style={{ marginTop: 8 }}>
          <Field multiline maxLength={300} value={note} onChangeText={v => { setNote(v); set({ note: v }) }} placeholder={t('Kahan aur kaisa nishaan? (scratch, dent)')} style={{ minHeight: 60 }} />
          <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{t('Neeche "Problem ki photo" bhi le lo.')}</Text>
        </View>
      ) : null}
    </View>
  );
}
export function newStartInfo(): StartInfo { return { condition: 'normal', damage: false, note: '' } }
/** Call right after act.startWash. */
export function saveStartInfo(reg: string, i: StartInfo, issues: string[] = []) {
  const list = i.damage ? Array.from(new Set([...issues, 'car_damage'])) : issues;
  act.setReport(reg, { condition: i.condition, damage_note: i.damage ? (i.note.trim() || null) : null, ...(list.length ? { issues: list } : null) });
}

/* ---------- while washing: compact report ---------- */
export function ReportSection({ reg, wd }: { reg: string; wd: Wash }) {
  const { c } = useTheme();
  const issues = wd.issues || [];
  const flip = (k: string) => act.setReport(reg, { issues: issues.includes(k) ? issues.filter(x => x !== k) : [...issues, k] });
  const yn = (v: boolean) => act.setReport(reg, { customer_present: wd.customer_present === v ? null : v });
  return (
    <View style={{ gap: 14 }}>
      {wd.overdue_at ? (
        <View>
          <Label>{t('Der kyun hui?')}</Label>
          <ChipPicker options={DELAYS.map(d => ({ value: d, label: t(d) }))} value={wd.delay_reason || null} onChange={v => act.setReport(reg, { delay_reason: v })} style={{ marginBottom: 0 }} />
        </View>
      ) : null}
      <View>
        <Label>{t('Koi dikkat aayi?')}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ISSUES.map(i => <Toggle key={i.key} on={issues.includes(i.key)} label={t(i.label)} onPress={() => flip(i.key)} />)}
        </View>
      </View>
      <View>
        <Label>{t('Customer mile?')}</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Toggle on={wd.customer_present === true} label={t('Haan')} onPress={() => yn(true)} />
          <Toggle on={wd.customer_present === false} label={t('Nahi')} onPress={() => yn(false)} />
        </View>
      </View>
    </View>
  );
}

/* ---------- done: read-only summary ---------- */
export function ReportSummary({ wd }: { wd: Wash }) {
  const { c } = useTheme();
  const rows: [string, string][] = [];
  const cond = CONDITIONS.find(o => o.key === wd.condition);
  if (cond) rows.push([t('Gaadi'), t(cond.label)]);
  if (wd.issues && wd.issues.length) rows.push([t('Dikkat'), wd.issues.map(k => t(ISSUES.find(i => i.key === k)?.label || k)).join(', ')]);
  if (wd.damage_note) rows.push([t('Nishaan'), wd.damage_note]);
  if (wd.customer_present != null) rows.push([t('Customer'), t(wd.customer_present ? 'Mile' : 'Nahi mile')]);
  if (wd.delay_reason) rows.push([t('Der ki wajah'), t(wd.delay_reason)]);
  if (!rows.length) return null;
  return (
    <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{t('Aapne bataya')}</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
          <Text style={{ width: 96, fontFamily: F.medium, fontSize: 13, color: c.fg3 }}>{k}</Text>
          <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: c.fg }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

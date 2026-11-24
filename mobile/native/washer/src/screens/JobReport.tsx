// Car-screen extras: the leave-a-started-wash sheet, the condition picker shown at start, and the report chips / summary.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { F, Icon, Group, SheetHeader, SectionLabel, sheet, useTheme } from '../ui';
import { Button, Field, Pressy } from '../ui';
import { act } from '../state/store';
import { t } from '../lib/i18n';
import { ABANDON_REASONS, CONDITIONS, DELAYS, ISSUES, type Wash } from '../lib/data';

type Cond = 'light' | 'normal' | 'heavy';

/** Small grey caption above a chip block inside a Group. */
function Label({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: c.grey, marginBottom: 10 }}>{children}</Text>;
}

/** One tappable chip: flat grey, violet tint when on. `kind` radio = single select, switch = multi. */
export function PickChip({ on, label, onPress, role = 'switch', tone }: { on: boolean; label: string; onPress: () => void; role?: 'switch' | 'radio'; tone?: 'red' }) {
  const { c, dark } = useTheme();
  const red = tone === 'red';
  const onBg = red ? (dark ? 'rgba(248,113,113,0.16)' : '#FEF2F2') : dark ? 'rgba(139,92,246,0.22)' : 'rgba(84,9,218,0.08)';
  const onFg = red ? (dark ? '#FCA5A5' : '#dc2626') : c.primary;
  return (
    <Pressy onPress={onPress} accessibilityRole={role} accessibilityState={role === 'radio' ? { selected: on } : { checked: on }} accessibilityLabel={label} scaleTo={0.96}
      style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? onBg : (dark ? c.tile2 : '#F1F1F4') }}>
      {on ? <Icon name="check" size={14} color={onFg} /> : null}
      <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? onFg : c.fg }}>{label}</Text>
    </Pressy>
  );
}

/** Single-select wrap of PickChips. */
export function ChipPick<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null | undefined; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => <PickChip key={o.value} role="radio" on={o.value === value} label={o.label} onPress={() => onChange(o.value)} />)}
    </View>
  );
}

function SheetSub({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, marginTop: -6, marginBottom: 16 }}>{children}</Text>;
}

/* ---------- leaving a started wash ---------- */
function LeaveSheet({ reg, close, onLeft }: { reg: string; close: () => void; onLeft: () => void }) {
  const [step, setStep] = useState<'ask' | 'why'>('ask');
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (step === 'ask') {
    return (
      <View>
        <SheetHeader title={t('Wash abhi chal raha hai')} />
        <SheetSub>{t('Gaadi chhodne se pehle batao kya hua.')}</SheetSub>
        <Button variant="primary" icon="check" label={t('Wash poora karo')} onPress={close} />
        <View style={{ height: 10 }} />
        <Button variant="secondary" label={t('Wash nahi kiya / chhod diya')} onPress={() => setStep('why')} />
      </View>
    );
  }
  return (
    <View>
      <SheetHeader title={t('Kyun chhoda?')} />
      <SheetSub>{t('Manager aur customer ko yahi wajah dikhegi.')}</SheetSub>
      <ChipPick options={ABANDON_REASONS.map(r => ({ value: r, label: t(r) }))} value={pick} onChange={setPick} />
      <View style={{ height: 12 }} />
      <Field multiline maxLength={300} value={note} onChangeText={setNote} placeholder={t('Kuch aur batana hai? (optional)')} style={{ minHeight: 70 }} />
      <View style={{ height: 12 }} />
      <Button variant="ink" label={t('Wash band karo')} disabled={!pick}
        onPress={() => { if (pick && act.abandon(reg, pick, note.trim() || undefined)) { close(); onLeft() } }} />
      <View style={{ height: 8 }} />
      <Button variant="secondary" label={t('Wash poora karo')} onPress={close} />
    </View>
  );
}
export function openLeaveSheet(reg: string, onLeft: () => void) {
  sheet.open(close => <LeaveSheet reg={reg} close={close} onLeft={onLeft} />);
}

/* ---------- at start: condition + damage, default normal so a plain start still works ---------- */
export type StartInfo = { condition: Cond; damage: boolean; note: string };
export function StartCapture({ info }: { info: React.MutableRefObject<StartInfo> }) {
  const { c } = useTheme();
  const [cond, setCond] = useState<Cond>(info.current.condition);
  const [dmg, setDmg] = useState(info.current.damage);
  const [note, setNote] = useState(info.current.note);
  const set = (p: Partial<StartInfo>) => { info.current = { ...info.current, ...p } };
  return (
    <View>
      <SectionLabel>{t('Gaadi kaisi hai?')}</SectionLabel>
      <Group>
        <View style={{ padding: 14, gap: 12 }}>
          <ChipPick options={CONDITIONS.map(o => ({ value: o.key as Cond, label: t(o.label) }))} value={cond} onChange={v => { setCond(v); set({ condition: v }) }} />
          <View style={{ flexDirection: 'row' }}>
            <PickChip on={dmg} tone="red" label={t('Gaadi par pehle se nishaan hai')} onPress={() => { setDmg(!dmg); set({ damage: !dmg }) }} />
          </View>
          {dmg ? (
            <View>
              <Field multiline maxLength={300} value={note} onChangeText={v => { setNote(v); set({ note: v }) }} placeholder={t('Kahan aur kaisa nishaan? (scratch, dent)')} style={{ minHeight: 60 }} />
              <Text style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{t('Neeche "Problem ki photo" bhi le lo.')}</Text>
            </View>
          ) : null}
        </View>
      </Group>
    </View>
  );
}
export function newStartInfo(): StartInfo { return { condition: 'normal', damage: false, note: '' } }
/** Call right after act.startWash. */
export function saveStartInfo(reg: string, i: StartInfo, issues: string[] = []) {
  const list = i.damage ? Array.from(new Set([...issues, 'car_damage'])) : issues;
  act.setReport(reg, { condition: i.condition, damage_note: i.damage ? (i.note.trim() || null) : null, ...(list.length ? { issues: list } : null) });
}

/* ---------- while washing: report as one Group of chip blocks ---------- */
export function ReportSection({ reg, wd }: { reg: string; wd: Wash }) {
  const issues = wd.issues || [];
  const flip = (k: string) => act.setReport(reg, { issues: issues.includes(k) ? issues.filter(x => x !== k) : [...issues, k] });
  const yn = (v: boolean) => act.setReport(reg, { customer_present: wd.customer_present === v ? null : v });
  return (
    <Group>
      {wd.overdue_at ? (
        <View style={{ padding: 14 }}>
          <Label>{t('Der kyun hui?')}</Label>
          <ChipPick options={DELAYS.map(d => ({ value: d, label: t(d) }))} value={wd.delay_reason || null} onChange={v => act.setReport(reg, { delay_reason: v })} />
        </View>
      ) : null}
      <View style={{ padding: 14 }}>
        <Label>{t('Koi dikkat aayi?')}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ISSUES.map(i => <PickChip key={i.key} tone="red" on={issues.includes(i.key)} label={t(i.label)} onPress={() => flip(i.key)} />)}
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <Label>{t('Customer mile?')}</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PickChip on={wd.customer_present === true} label={t('Haan')} onPress={() => yn(true)} />
          <PickChip on={wd.customer_present === false} label={t('Nahi')} onPress={() => yn(false)} />
        </View>
      </View>
    </Group>
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
    <View>
      <SectionLabel>{t('Aapne bataya')}</SectionLabel>
      <Group>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ width: 92, fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: c.grey }}>{k}</Text>
            <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: c.fg }}>{v}</Text>
          </View>
        ))}
      </Group>
    </View>
  );
}

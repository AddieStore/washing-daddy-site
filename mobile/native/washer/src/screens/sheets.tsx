// Sheets shared by more than one tab: sync info, help/SOS, refer a friend, and the two confirm sheets.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { Button, F, Group, Icon, LinkButton, Row, SheetHeader, sheet, ui, useTheme, type IconName } from '../ui';
import { MODE, S, act, me, outboxSize, syncState } from '../state/store';
import { t } from '../lib/i18n';
import { OWNER_PHONE, waTo } from '../lib/data';
import { LANGS } from '../lib/langs';

const open = (url: string) => { void Linking.openURL(url).catch(() => {}) };

/** Sheet heading: big left title + optional small outlined action on the right (SheetHeader), grey sub line under it. */
export function SheetTitle({ title, sub, action, onAction, actionIcon }: { title: string; sub?: string; action?: string; onAction?: () => void; actionIcon?: IconName }) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <SheetHeader title={title} action={action} onAction={onAction} actionIcon={actionIcon} style={{ paddingBottom: sub ? 4 : 0 }} />
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.grey }}>{sub}</Text> : null}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, textAlign: 'center', marginTop: 12 }}>{children}</Text>;
}

/** Radio dot used by the Language and Theme sheets. */
function Dot({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: c.line, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <Icon name="check" size={13} color="#fff" /> : null}
    </View>
  );
}

/** Transparent "Band karo" text button at the foot of a sheet. */
function CloseLink({ close, label = 'Band karo' }: { close: () => void; label?: string }) {
  return <View style={{ alignItems: 'center' }}><LinkButton label={t(label)} onPress={close} /></View>;
}

/** The little sponge ..... car strip. */
function BeamSync({ right }: { right: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
      <Text style={{ fontSize: 26 }}>🧽</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2, 3].map(i => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg, opacity: 0.2 + i * 0.25 }} />)}
      </View>
      <Text style={{ fontSize: 26 }}>{right}</Text>
    </View>
  );
}

export function openSyncSheet() {
  sheet.open(close => {
    const [, , label] = syncState();
    const n = outboxSize();
    return <SyncBody label={label} n={n} close={close} />;
  });
}

function SyncBody({ label, n, close }: { label: string; n: number; close: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <SheetTitle title={t('Customer app se sync')} sub={t(label)} />
      <BeamSync right="🚗" />
      <Group>
        <Row label={t('Ruke hue update')} sub={t('Net nahi ho to phone pe safe rehte hain')} right={<Text style={{ fontFamily: F.bold, fontSize: 22, color: c.fg, fontVariant: ['tabular-nums'] }}>{n}</Text>} />
        <Row label={t('Photo')} sub={t('Chhoti photo jaati hai (is version mein)')} />
      </Group>
      <View style={{ marginTop: 16 }}>
        {n > 0 && MODE === 'live'
          ? <Button label={t('Abhi bhejo')} variant="violet" onPress={() => { act.flushNow(); close() }} />
          : <Button label={t('Theek hai')} variant="ghost" onPress={close} />}
      </View>
    </View>
  );
}

export function openHelpSheet() {
  sheet.open(close => <HelpBody close={close} />);
}

function HelpBody({ close }: { close: () => void }) {
  const w = me();
  const who = `${w.name} (+91 ${w.phone})`;
  const items: [string, string, IconName][] = [
    ['Paisa nahi mila / hisaab galat', 'Payment ya hisaab ki problem', 'tabPaisa'],
    ['Customer se problem', 'Customer ne kuch kaha ya mana kiya', 'user'],
    ['App ya photo ki dikkat', 'App chal nahi raha', 'cam'],
    ['Gaadi ko nuksaan hua', 'Scratch ya toot-phoot', 'car'],
  ];
  return (
    <View>
      <SheetTitle title={t('Madad chahiye?')} sub={t('Kya hua? Manager ko WhatsApp pe seedha message jayega.')} />
      <Group>
        {items.map(([ti, d, ic]) => (
          <Row key={ti} icon={ic} label={t(ti)} sub={t(d)} onPress={() => open(waTo(`Namaste Manager, ${who}. ${ti}.`))} />
        ))}
      </Group>
      <View style={{ marginTop: 16 }}>
        <Button label={t('SOS · Manager ko abhi call karo')} variant="sos" onPress={() => open('tel:' + OWNER_PHONE)} />
      </View>
      <Note>{t('Accident ya khatre mein pehle 112 pe call karo.')}</Note>
      <CloseLink close={close} />
    </View>
  );
}

export function openReferSheet() {
  sheet.open(close => <ReferBody close={close} />);
}

function ReferBody({ close }: { close: () => void }) {
  const { c } = useTheme();
  const w = me();
  const code = 'WD' + String(w.phone || '').replace(/\D/g, '').slice(-5);
  const msg = `Washing Daddy mein washer bano! Roz kaam, pressure wash, seedhi kamai. Yahan se jao: https://washingdaddy.com/washer/ Mera code: ${code}`;
  const copy = async () => {
    try { await setStringAsync(msg); ui.toast(t('Copy ho gaya')) } catch { ui.toast(t('Code upar likha hai')) }
  };
  return (
    <View>
      <SheetTitle title={t('Dost ko laao')} sub={t('Dost sign-up pe aapka code bataye aur kaam shuru kare, toh aapko bonus milega.')} />
      <Group>
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey, marginBottom: 4 }}>{t('Aapka code')}</Text>
          <Text accessibilityLabel={code} style={{ fontFamily: F.bold, fontSize: 30, lineHeight: 38, letterSpacing: 2.4, color: c.primary }}>{code}</Text>
        </View>
      </Group>
      <View style={{ marginTop: 16, gap: 12 }}>
        <Button label={t('WhatsApp pe bhejo')} variant="violet" onPress={() => open('https://wa.me/?text=' + encodeURIComponent(msg))} />
        <Button label={t('Code copy karo')} variant="ghost" onPress={copy} />
      </View>
      <CloseLink close={close} />
    </View>
  );
}

function ConfirmBody({ title, sub, go, goLabel, close }: { title: string; sub: string; go: () => void; goLabel: string; close: () => void }) {
  return (
    <View>
      <SheetTitle title={title} sub={sub} />
      <Button label={goLabel} variant="violet" onPress={() => { close(); go() }} />
      <CloseLink close={close} label="Rehne do" />
    </View>
  );
}

export function openResetSheet(after?: () => void) {
  sheet.open(close => (
    <ConfirmBody
      title={t('Aaj ka round reset?')}
      sub={t('Is phone se aaj ka sab hat jayega. Jo customer tak jaa chuka hai, woh unke app mein rahega.')}
      goLabel={t('Haan, reset karo')}
      go={() => { act.resetDay(); after?.() }}
      close={close}
    />
  ));
}

export function openLogoutSheet() {
  sheet.open(close => (
    <ConfirmBody
      title={t('Log out?')}
      sub={t(outboxSize() ? 'Kuch update abhi bheje nahi gaye. Log out karoge to yeh hat jayenge. Pehle net pe bhej do.' : 'Round, customer ke naam aur photos is phone se hat jayenge. Dobara login pe wapas aa jayenge.')}
      goLabel={t(outboxSize() ? 'Phir bhi log out' : 'Log out')}
      go={() => { void act.logout(true) }}
      close={close}
    />
  ));
}

/** Language picker: all app languages as radio rows, the current one ticked. */
export function openLangSheet() {
  sheet.open(close => <LangBody close={close} />);
}

function LangBody({ close }: { close: () => void }) {
  const cur = S.lang || 'hinglish';
  return (
    <View>
      <SheetTitle title={t('Bhasha')} sub={t('App ki bhasha chuno')} />
      <Group>
        {LANGS.map(l => (
          <Row key={l.code} label={l.label} sub={t(l.sub)} right={<Dot on={l.code === cur} />}
            onPress={() => { ui.haptic(6); act.setLang(l.code); close() }} />
        ))}
      </Group>
      <CloseLink close={close} />
    </View>
  );
}

/** Theme picker: Din / Raat / Auto as radio rows. */
export function openThemeSheet() {
  sheet.open(close => <ThemeBody close={close} />);
}

function ThemeBody({ close }: { close: () => void }) {
  const opts: { value: 'light' | 'dark' | 'auto'; label: string; sub: string; icon: IconName }[] = [
    { value: 'light', label: 'Din', sub: 'Dhoop mein "Din" saaf dikhta hai', icon: 'sun' },
    { value: 'dark', label: 'Raat', sub: 'Andhere mein aankhon ko aaram', icon: 'bell' },
    { value: 'auto', label: 'Auto', sub: 'Phone ki setting ke hisaab se', icon: 'reset' },
  ];
  return (
    <View>
      <SheetTitle title={t('Screen')} sub={t('App ka rang chuno')} />
      <Group>
        {opts.map(o => (
          <Row key={o.value} icon={o.icon} label={t(o.label)} sub={t(o.sub)} right={<Dot on={S.theme === o.value} />}
            onPress={() => { ui.haptic(6); act.setTheme(o.value); close() }} />
        ))}
      </Group>
      <CloseLink close={close} />
    </View>
  );
}

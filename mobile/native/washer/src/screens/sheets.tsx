// Sheets shared by more than one tab: sync info, help/SOS, refer a friend, and the two confirm sheets.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { Button, F, LinkButton, Pressy, cardShadow, sheet, ui, useTheme } from '../ui';
import { MODE, act, me, outboxSize, syncState } from '../state/store';
import { t } from '../lib/i18n';
import { OWNER_PHONE, waTo } from '../lib/data';

const open = (url: string) => { void Linking.openURL(url).catch(() => {}) };

export function SheetTitle({ title, sub }: { title: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 24, color: c.fg, letterSpacing: -0.3 }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 14.5, color: c.fg2, marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 12 }}>{children}</Text>;
}

function LinkRow({ title, sub, onPress, first }: { title: string; sub?: string; onPress: () => void; first?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={title}
      style={[{ paddingVertical: 14, paddingHorizontal: 16, minHeight: 66, justifyContent: 'center' }, !first && { borderTopWidth: 1, borderTopColor: c.line }]}
    >
      <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{sub}</Text> : null}
    </Pressy>
  );
}

function RowsBox({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={[{ borderRadius: 22, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }, cardShadow(c)]}>{children}</View>;
}

/** The little 🧽 ····· 🚗 strip. */
function BeamSync({ right }: { right: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginVertical: 14 }}>
      <Text style={{ fontSize: 26 }}>🧽</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2, 3].map(i => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fg, opacity: 0.25 + i * 0.25 }} />)}
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
      <RowsBox>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 66 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{t('Ruke hue update')}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{t('Net nahi ho to phone pe safe rehte hain')}</Text>
          </View>
          <Text style={{ fontFamily: F.shout, fontSize: 24, color: c.fg }}>{n}</Text>
        </View>
        <View style={{ paddingVertical: 14, paddingHorizontal: 16, minHeight: 66, justifyContent: 'center', borderTopWidth: 1, borderTopColor: c.line }}>
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{t('Photo')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{t('Chhoti photo jaati hai (is version mein)')}</Text>
        </View>
      </RowsBox>
      <View style={{ marginTop: 14 }}>
        {n > 0 && MODE === 'live'
          ? <Button label={t('Abhi bhejo')} variant="gold" onPress={() => { act.flushNow(); close() }} />
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
  const items: [string, string][] = [
    ['Paisa nahi mila / hisaab galat', 'Payment ya hisaab ki problem'],
    ['Customer se problem', 'Customer ne kuch kaha ya mana kiya'],
    ['App ya photo ki dikkat', 'App chal nahi raha'],
    ['Gaadi ko nuksaan hua', 'Scratch ya toot-phoot'],
  ];
  return (
    <View>
      <SheetTitle title={t('Madad chahiye?')} sub={t('Kya hua? Support ko WhatsApp pe seedha message jayega.')} />
      <RowsBox>
        {items.map(([ti, d], i) => (
          <LinkRow key={ti} first={i === 0} title={t(ti)} sub={t(d)} onPress={() => open(waTo(`Namaste Support, ${who}. ${ti}.`))} />
        ))}
      </RowsBox>
      <View style={{ marginTop: 14 }}>
        <Button label={t('SOS · Support ko abhi call karo')} variant="sos" onPress={() => open('tel:' + OWNER_PHONE)} />
      </View>
      <Note>{t('Accident ya khatre mein pehle 112 pe call karo.')}</Note>
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Band karo')} onPress={close} /></View>
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
      <View style={{ marginTop: 8, padding: 14, borderRadius: 16, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center' }}>
        <Text accessibilityLabel={code} style={{ fontFamily: F.black, fontSize: 34, letterSpacing: 2.7, color: c.fg }}>{code}</Text>
      </View>
      <View style={{ marginTop: 12, gap: 10 }}>
        <Button label={t('WhatsApp pe bhejo')} variant="mint" onPress={() => open('https://wa.me/?text=' + encodeURIComponent(msg))} />
        <Button label={t('Code copy karo')} variant="ghost" onPress={copy} />
      </View>
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Band karo')} onPress={close} /></View>
    </View>
  );
}

function ConfirmBody({ title, sub, go, goLabel, close }: { title: string; sub: string; go: () => void; goLabel: string; close: () => void }) {
  return (
    <View>
      <SheetTitle title={title} sub={sub} />
      <Button label={goLabel} variant="ink" onPress={() => { close(); go() }} />
      <View style={{ alignItems: 'center' }}><LinkButton label={t('Rehne do')} onPress={close} /></View>
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

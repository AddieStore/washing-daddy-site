// Spoken stage alerts that still reach the washer when the app is in the background, swiped away or the screen is off.
// The OS delivers local notifications by itself, so each stage (3, 6, 9 and 10 min after the timer starts) is scheduled
// as a notification whose sound is that stage's Hindi voice clip. The 0-minute line is played in the app when the timer starts.
// Android keeps a notification's sound on its channel, so there is one channel per stage (versioned ids: a changed clip = a new id).
// Web / Expo Go / a build without the sound files just does nothing here and the in-app voice is used instead.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDE, GUIDE_SUNDAY, planFor } from './washGuide';
import { t } from './i18n';

const NATIVE = Platform.OS === 'android' || Platform.OS === 'ios';
// One Android channel and one sound file per spoken clip (wd_c_<clip>.wav, made by tools/prep-notif-sounds.sh), so any
// plan (Mon-Sat, Sunday, with the interior add-on) can be scheduled. Versioned ids: a changed clip = a new channel id.
const STAGE_CLIPS = Array.from(new Set([...GUIDE, ...GUIDE_SUNDAY].map(g => g.clip))).filter(c => c !== 'ph_wash');
const channelOf = (clip: string) => `wd_clip_${clip}_v1`;
const soundOf = (clip: string) => `wd_c_${clip}.wav`;
export const EXTRA_CHANNEL = 'wd_extra_v1';
const LATE_CLIP = 'ph_late', MORNING_CLIP = 'ph_morning';
const idsKey = (wash: string) => 'wd-alerts:' + wash;
let N: typeof import('expo-notifications') | null = null;
let ready = false;

async function lib() {
  if (!NATIVE) return null;
  if (!N) { try { N = await import('expo-notifications') } catch { N = null } }
  return N;
}

/** Ask once, up front: notifications (Android 13+/iOS) and exact alarms (Android 12+), so the stages fire on time. */
export async function setupWashAlerts(): Promise<boolean> {
  const n = await lib(); if (!n) return false;
  try {
    // foreground: let the channel's voice play too, so there is one code path
    n.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
    if (Platform.OS === 'android') {
      for (const clip of [...STAGE_CLIPS, LATE_CLIP, MORNING_CLIP]) {
        await n.setNotificationChannelAsync(channelOf(clip), {
          name: clip === LATE_CLIP ? 'Car not done yet' : clip === MORNING_CLIP ? 'Morning 5:00 alarm' : 'Wash stage voice', importance: n.AndroidImportance.HIGH, sound: soundOf(clip), enableVibrate: true,
          audioAttributes: { usage: n.AndroidAudioUsage.ALARM, contentType: n.AndroidAudioContentType.SONIFICATION },
        });
      }
      // server push for an 'extra kaam' assigned to this washer (FCM sets android.notification.channel_id = this id)
      await n.setNotificationChannelAsync(EXTRA_CHANNEL, {
        name: 'Extra kaam', importance: n.AndroidImportance.HIGH, sound: 'wd_extra.wav', enableVibrate: true,
        audioAttributes: { usage: n.AndroidAudioUsage.ALARM, contentType: n.AndroidAudioContentType.SONIFICATION },
      });
    }
    let p = await n.getPermissionsAsync();
    if (!p.granted && p.canAskAgain) p = await n.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      try { const e = await n.getExactAlarmPermissionsAsync(); if (!e.granted) await n.requestExactAlarmPermissionsAsync() } catch { /* older Android: not needed */ }
    }
    ready = !!p.granted;
    return ready;
  } catch (e) { console.warn('wash alerts setup', e); return false }
}

/** True when the OS will speak the later stages by itself (so the app should not speak them too). */
export const alertsReady = () => ready;

export async function scheduleWashAlerts(wash: string, startedAtIso: string, washerName?: string, interiorFrom?: number | null): Promise<void> {
  const n = await lib(); if (!n || !ready) return;
  try {
    await cancelWashAlerts(wash);
    const t0 = Date.parse(startedAtIso); if (!isFinite(t0)) return;
    const ids: string[] = [];
    for (const st of planFor(startedAtIso, interiorFrom)) {
      if (st.from <= 0) continue;
      const date = new Date(t0 + st.from * 1000);
      if (date.getTime() <= Date.now() + 1500) continue;
      ids.push(await n.scheduleNotificationAsync({
        content: { title: 'Washing Daddy', body: (washerName ? washerName + ' ji, ' : '') + st.hi, sound: soundOf(st.clip), data: { wash, clip: st.clip } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date, channelId: channelOf(st.clip) },
      }));
    }
    await AsyncStorage.setItem(idsKey(wash), JSON.stringify(ids));
  } catch (e) { console.warn('schedule wash alerts', e) }
}

/** The car was not done by the end of its slot: a spoken reminder with the car number in the text (the number itself is read aloud only inside the app). */
export async function scheduleLateAlert(reg: string, plate: string, at: Date): Promise<void> {
  const n = await lib(); if (!n || !ready || at.getTime() <= Date.now() + 1500) return;
  try {
    await cancelLateAlert(reg);
    const id = await n.scheduleNotificationAsync({
      content: { title: plate, body: t('Is gaadi par kaam nahi hua. Kripya is gaadi par pahunchein aur kaam shuru karein.'), sound: soundOf(LATE_CLIP), data: { late: reg } },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at, channelId: channelOf(LATE_CLIP) },
    });
    await AsyncStorage.setItem('wd-late:' + reg, id);
  } catch (e) { console.warn('schedule late alert', e) }
}
export async function cancelLateAlert(reg: string): Promise<void> {
  const n = await lib(); if (!n) return;
  try { const id = await AsyncStorage.getItem('wd-late:' + reg); if (id) { await n.cancelScheduledNotificationAsync(id); await AsyncStorage.removeItem('wd-late:' + reg) } } catch { /* ignore */ }
}

/** Every morning at 5:00: "kaam ka samay ho gaya hai, kripya taiyaar ho jaayen aur hub pahunchen". Repeats daily until logout. */
export async function scheduleMorningAlarm(): Promise<void> {
  const n = await lib(); if (!n || !ready) return;
  try {
    const old = await AsyncStorage.getItem('wd-morning'); if (old) await n.cancelScheduledNotificationAsync(old);
    const id = await n.scheduleNotificationAsync({
      content: { title: 'Washing Daddy', body: t('Kaam ka samay ho gaya hai. Taiyaar ho jaayen aur hub pahunchen.'), sound: soundOf(MORNING_CLIP), data: { morning: true } },
      trigger: { type: n.SchedulableTriggerInputTypes.DAILY, hour: 5, minute: 0, channelId: channelOf(MORNING_CLIP) },
    });
    await AsyncStorage.setItem('wd-morning', id);
  } catch (e) { console.warn('morning alarm', e) }
}

export async function cancelWashAlerts(wash: string): Promise<void> {
  const n = await lib(); if (!n) return;
  try {
    const ids: string[] = JSON.parse((await AsyncStorage.getItem(idsKey(wash))) || '[]');
    await Promise.all(ids.map(i => n.cancelScheduledNotificationAsync(i)));
    await AsyncStorage.removeItem(idsKey(wash));
  } catch (e) { console.warn('cancel wash alerts', e) }
}

/** Everything off: logout / day reset. */
export async function cancelAllWashAlerts(): Promise<void> {
  const n = await lib(); if (!n) return;
  try { await n.cancelAllScheduledNotificationsAsync(); await n.dismissAllNotificationsAsync() } catch { /* ignore */ }
}

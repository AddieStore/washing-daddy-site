// Spoken stage alerts that still reach the washer when the app is in the background, swiped away or the screen is off.
// The OS delivers local notifications by itself, so each stage (3, 6, 9 and 10 min after the timer starts) is scheduled
// as a notification whose sound is that stage's Hindi voice clip. The 0-minute line is played in the app when the timer starts.
// Android keeps a notification's sound on its channel, so there is one channel per stage (versioned ids: a changed clip = a new id).
// Web / Expo Go / a build without the sound files just does nothing here and the in-app voice is used instead.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDE, GUIDE_SUNDAY, isSundayIST } from './washGuide';

const NATIVE = Platform.OS === 'android' || Platform.OS === 'ios';
// Mon-Sat and Sunday have different plans, so each has its own channels and sound files:
// assets/notif/wd_s<minute>.wav (Mon-Sat) and wd_u<minute>.wav (Sunday), made by tools/prep-notif-sounds.sh
type Stage = { min: number; hi: string; sunday: boolean };
const mk = (plan: typeof GUIDE, sunday: boolean): Stage[] => plan.map(g => ({ min: g.from / 60, hi: g.hi, sunday })).filter(s => s.min > 0);
const ALL_STAGES = [...mk(GUIDE, false), ...mk(GUIDE_SUNDAY, true)];
const channelId = (s: Stage) => `${s.sunday ? 'wd_sun' : 'wd_stage'}${s.min}_v2`;
const soundOf = (s: Stage) => `${s.sunday ? 'wd_u' : 'wd_s'}${s.min}.wav`;
export const EXTRA_CHANNEL = 'wd_extra_v1';
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
      for (const s of ALL_STAGES) {
        await n.setNotificationChannelAsync(channelId(s), {
          name: `${s.sunday ? 'Sunday wash' : 'Wash'} stage ${s.min} min`, importance: n.AndroidImportance.HIGH, sound: soundOf(s), enableVibrate: true,
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

export async function scheduleWashAlerts(wash: string, startedAtIso: string, washerName?: string): Promise<void> {
  const n = await lib(); if (!n || !ready) return;
  try {
    await cancelWashAlerts(wash);
    const t0 = Date.parse(startedAtIso); if (!isFinite(t0)) return;
    const ids: string[] = [];
    const sunday = isSundayIST(startedAtIso);
    for (const s of ALL_STAGES.filter(x => x.sunday === sunday)) {
      const date = new Date(t0 + s.min * 60000);
      if (date.getTime() <= Date.now() + 1500) continue;
      ids.push(await n.scheduleNotificationAsync({
        content: { title: 'Washing Daddy', body: (washerName ? washerName + ' ji, ' : '') + s.hi, sound: soundOf(s), data: { wash, min: s.min } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date, channelId: channelId(s) },
      }));
    }
    await AsyncStorage.setItem(idsKey(wash), JSON.stringify(ids));
  } catch (e) { console.warn('schedule wash alerts', e) }
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

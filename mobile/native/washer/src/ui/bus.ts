import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { announceClips } from '../lib/hindiNumber';
import { VOICE_CLIPS } from '../lib/voiceClips';

type Listener<T> = (v: T) => void;

function channel<T>() {
  const ls = new Set<Listener<T>>();
  return {
    emit: (v: T) => ls.forEach((l) => l(v)),
    sub: (l: Listener<T>) => {
      ls.add(l);
      return () => {
        ls.delete(l);
      };
    },
  };
}

const toastCh = channel<string>();
const confettiCh = channel<number>();
const flashCh = channel<void>();

export const ui = {
  toast(msg: string) {
    toastCh.emit(msg);
  },
  haptic(pattern: number | number[] = 10) {
    if (Platform.OS === 'web') return;
    try {
      if (Array.isArray(pattern)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (pattern > 30) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* ignore */
    }
  },
  confetti(strength = 1) {
    confettiCh.emit(strength);
  },
  // The extra-work alert: Hindi voice "Extra kaam aaya hai, <amount> rupaye" built from clips (tools/make-voice.mjs).
  // Falls back to the old beep until the clips exist, or if any clip is missing.
  alertSound(amount?: number | null) {
    const clips = announceClips(amount).map(k => VOICE_CLIPS[k]);
    if (clips.length && clips.every(Boolean)) { void playQueue(clips); return; }
    try {
      const player = createAudioPlayer(require('../../assets/sound/job-alert.wav'));
      player.play();
      setTimeout(() => { try { player.remove() } catch { /* ignore */ } }, 1500);
    } catch {
      /* no-op on failure */
    }
  },
  // one spoken Hindi line by clip key (the wash guide); the old beep stands in until that clip exists
  speak(clip: string) {
    const src = VOICE_CLIPS[clip];
    if (src) { void playQueue([src]); return; }
    try {
      const player = createAudioPlayer(require('../../assets/sound/job-alert.wav'));
      player.play();
      setTimeout(() => { try { player.remove() } catch { /* ignore */ } }, 1500);
    } catch { /* no-op */ }
  },
  flash() {
    flashCh.emit();
  },
};

export const onToast = toastCh.sub;
export const onConfetti = confettiCh.sub;
export const onFlash = (l: () => void) => flashCh.sub(l);

// plays clips one after another (each waits for the last to finish, with a 2.5 s safety so a stuck clip can't hang the queue)
let queueToken = 0;
async function playQueue(clips: number[]) {
  const mine = ++queueToken;   // a newer alert cuts the older one off
  for (const src of clips) {
    if (mine !== queueToken) return;
    await new Promise<void>(done => {
      let finished = false, player: ReturnType<typeof createAudioPlayer> | null = null;
      const end = () => { if (finished) return; finished = true; try { player?.remove() } catch { /* ignore */ } done() };
      try {
        player = createAudioPlayer(src);
        player.addListener('playbackStatusUpdate', (st: { didJustFinish?: boolean }) => { if (st.didJustFinish) end() });
        player.play();
      } catch { end(); return }
      setTimeout(end, 2500);
    });
  }
}

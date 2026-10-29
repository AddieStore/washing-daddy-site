import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';

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
  alertSound() {
    try {
      const player = createAudioPlayer(require('../../assets/sound/job-alert.wav'));
      player.play();
      setTimeout(() => {
        try {
          player.remove();
        } catch {
          /* ignore */
        }
      }, 1500);
    } catch {
      /* no-op on failure */
    }
  },
  flash() {
    flashCh.emit();
  },
};

export const onToast = toastCh.sub;
export const onConfetti = confettiCh.sub;
export const onFlash = (l: () => void) => flashCh.sub(l);

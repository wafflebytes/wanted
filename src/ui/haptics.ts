/** Haptics on every state change (PRD 8.3b). The web gets a short vibration where supported. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export const haptic = {
  tick() {
    if (Platform.OS === 'web') return vibrate(6);
    Haptics.selectionAsync().catch(() => {});
  },
  tap() {
    if (Platform.OS === 'web') return vibrate(10);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  thump() {
    if (Platform.OS === 'web') return vibrate([18, 30, 12]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success() {
    if (Platform.OS === 'web') return vibrate([10, 40, 10, 40, 24]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warn() {
    if (Platform.OS === 'web') return vibrate([30, 50, 30]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  /**
   * A long, quiet purr while Gus works: a swell of soft taps (soft, light, medium, light, soft),
   * a breath of rest, and again, until `stop` is called. It reads as "thinking", not "alert".
   */
  think: {
    start() {
      if (running) return;
      running = true;
      if (Platform.OS === 'web') {
        const swell = [8, 40, 10, 40, 14, 40, 18, 40, 14, 40, 10, 40, 8, 520];
        const loop = () => {
          if (!running) return;
          vibrate(swell);
          timer = setTimeout(loop, swell.reduce((a, b) => a + b, 0));
        };
        return loop();
      }
      const S = Haptics.ImpactFeedbackStyle;
      const swell = [S.Soft, S.Soft, S.Light, S.Light, S.Medium, S.Medium, S.Light, S.Light, S.Soft, S.Soft];
      let i = 0;
      const step = () => {
        if (!running) return;
        Haptics.impactAsync(swell[i]).catch(() => {});
        i = (i + 1) % swell.length;
        timer = setTimeout(step, i === 0 ? 700 : 58);
      };
      step();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      if (Platform.OS === 'web') vibrate(0);
    },
  },
};

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

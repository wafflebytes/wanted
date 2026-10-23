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
};

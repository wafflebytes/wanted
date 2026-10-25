/**
 * Motion tokens. Apple-quiet: short, ease-out, no bounce. Springs only where a finger lets
 * go of something (and then critically damped, so they settle without overshoot).
 */
import { Platform } from 'react-native';
import { Easing, Keyframe, withSpring, withTiming } from 'react-native-reanimated';

/** Reanimated's web keyframes leave views mid-transform (stacked, overlapping), so web skips them. */
const native = <K>(k: () => K): K | undefined => (Platform.OS === 'web' ? undefined : k());

/** iOS's default curve family: fast out, long gentle settle. */
export const EASE = Easing.bezier(0.2, 0, 0, 1);
export const EASE_IN = Easing.bezier(0.4, 0, 1, 1);

export const DUR = { fast: 160, base: 240, slow: 340 } as const;

export const timing = (to: number, ms: number = DUR.base) => {
  'worklet';
  return withTiming(to, { duration: ms, easing: EASE });
};

/** Follow-through after a gesture: no overshoot. */
export const settle = (to: number, ms = 320) => {
  'worklet';
  return withSpring(to, { duration: ms, dampingRatio: 1 });
};

/** Fade up a few points. The default way anything appears. */
export const enterUp = (delay = 0, dy = 8, ms: number = DUR.base) =>
  native(() =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateY: dy }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
    })
      .duration(ms)
      .delay(delay),
  );

export const exitUp = (dy = 6, ms: number = DUR.fast) =>
  native(() =>
    new Keyframe({
      0: { opacity: 1, transform: [{ translateY: 0 }] },
      100: { opacity: 0, transform: [{ translateY: -dy }], easing: EASE_IN },
    }).duration(ms),
  );

/** Step changes in a flow: a short sideways drift, like a navigation push but quieter. */
export const enterSide = (dx = 14, ms: number = DUR.base) =>
  native(() =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateX: dx }] },
      100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE },
    }).duration(ms),
  );

export const exitSide = (dx = 10, ms: number = DUR.fast) =>
  native(() =>
    new Keyframe({
      0: { opacity: 1, transform: [{ translateX: 0 }] },
      100: { opacity: 0, transform: [{ translateX: -dx }], easing: EASE_IN },
    }).duration(ms),
  );

/** Sheets and cards rising from the bottom edge. */
export const enterSheet = (dy = 60, ms: number = DUR.slow) =>
  native(() =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateY: dy }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
    }).duration(ms),
  );

export const exitSheet = (dy = 40, ms = 220) =>
  native(() =>
    new Keyframe({
      0: { opacity: 1, transform: [{ translateY: 0 }] },
      100: { opacity: 0, transform: [{ translateY: dy }], easing: EASE_IN },
    }).duration(ms),
  );

export const fadeIn = (ms: number = DUR.base, delay = 0) => native(() => new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1, easing: EASE } }).duration(ms).delay(delay));
export const fadeOut = (ms: number = DUR.fast) =>
  native(() =>
    new Keyframe({
      0: { opacity: 1 },
      100: { opacity: 0, easing: EASE_IN },
    }).duration(ms),
  );

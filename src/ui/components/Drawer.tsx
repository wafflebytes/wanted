/**
 * A resizable bottom drawer for the map, built like a system sheet (HIG sheets: detents, a
 * grabber people can drag or tap to cycle, content stays scrollable). It's nonmodal: the map
 * above stays live.
 *
 * Everything runs on the UI thread. A finger drags the sheet from anywhere: on the grabber and
 * header, or on the content when the list is at its top. Dragging up past the top detent hands
 * off to the list, and dragging down from a list at its top hands back to the sheet. Past either
 * end it rubber-bands, a flick projects to the detent it would reach, and the touch lights the
 * grabber the way a system sheet does. Reduce Motion swaps the spring for a short timing.
 */
import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, S } from '../theme';

const AnimatedScroll = Animated.createAnimatedComponent(GHScrollView);

/** iOS-style resistance: the further past the limit, the less the sheet follows the finger. */
function rubber(over: number, dim: number) {
  'worklet';
  return (1 - 1 / ((over * 0.55) / dim + 1)) * dim;
}

export function Drawer({
  detents,
  index,
  onIndexChange,
  header,
  children,
  bottomInset = 0,
  style,
  label = 'Panel',
  perch,
  tuck = 14,
  hero,
  heroLift = 70,
  heroHeight = 0,
}: {
  detents: number[];
  index: number;
  onIndexChange: (i: number) => void;
  header?: ReactNode;
  children: ReactNode;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
  /** Something standing behind the sheet's top edge (Gus). Rides the sheet, hides when it's fully up. */
  perch?: ReactNode;
  tuck?: number;
  /** Something in front of the sheet's top edge, half out of it (the city's poster). `heroLift` is how far it rises above the edge. */
  hero?: ReactNode;
  heroLift?: number;
  heroHeight?: number;
}) {
  const reduced = useReducedMotion();
  const max = detents[detents.length - 1];
  const min = detents[0];
  // The sheet's visible height. The container is always `max` tall and slides up from below.
  const h = useSharedValue(detents[index]);
  const start = useSharedValue(0);
  const anchor = useSharedValue(0);
  const engaged = useSharedValue(false);
  const scrollY = useSharedValue(0);
  const touch = useSharedValue(0);
  const scroll = useAnimatedRef<any>();

  const move = (to: number, velocity = 0) => {
    'worklet';
    h.value = reduced ? withTiming(to, { duration: 160 }) : withSpring(to, { velocity: -velocity, damping: 38, stiffness: 380, mass: 1, overshootClamping: false });
  };

  useEffect(() => {
    if (!engaged.value) h.value = reduced ? withTiming(detents[index], { duration: 160 }) : withSpring(detents[index], { damping: 38, stiffness: 380, mass: 1 });
    if (index === 0) scroll.current?.scrollTo?.({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, detents.join(), reduced]);

  const commit = (i: number, changed: boolean) => {
    if (changed) haptic.tick();
    onIndexChange(i);
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .simultaneousWithExternalGesture(scroll)
    .onBegin(() => {
      start.value = h.value;
      engaged.value = false;
      touch.value = withTiming(1, { duration: 90 });
    })
    .onUpdate((e) => {
      if (!engaged.value) {
        const atTop = scrollY.value <= 0;
        // The list keeps the gesture while the sheet is full up and the list has somewhere to go.
        if (!(h.value < max - 0.5 || (atTop && e.translationY > 0))) return;
        engaged.value = true;
        anchor.value = e.translationY;
        start.value = h.value;
      }
      const raw = start.value - (e.translationY - anchor.value);
      if (raw >= max && e.translationY - anchor.value < 0) {
        // Reached the top: let the list take over from here.
        h.value = max;
        engaged.value = false;
        return;
      }
      h.value = raw > max ? max + rubber(raw - max, 120) : raw < min ? min - rubber(min - raw, 120) : raw;
    })
    .onEnd((e) => {
      if (!engaged.value) return;
      const projected = h.value - e.velocityY * 0.18;
      let best = 0;
      for (let i = 1; i < detents.length; i++) if (Math.abs(detents[i] - projected) < Math.abs(detents[best] - projected)) best = i;
      move(detents[best], e.velocityY / 1000);
      scheduleOnRN(commit, best, best !== index);
    })
    .onFinalize(() => {
      touch.value = withTiming(0, { duration: 260 });
    });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    // While the sheet is below the top detent the list stays put; the sheet takes the drag.
    if (h.value < max - 1 && e.contentOffset.y > 0) scrollTo(scroll, 0, 0, false);
  });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: max - h.value }] }));
  const perchStyle = useAnimatedStyle(() => ({ bottom: h.value + bottomInset - tuck, opacity: interpolate(h.value, [max - 80, max - 20], [1, 0], Extrapolation.CLAMP) }));
  const heroStyle = useAnimatedStyle(() => ({ bottom: h.value + bottomInset + heroLift - heroHeight, opacity: interpolate(h.value, [max - 80, max - 20], [1, 0], Extrapolation.CLAMP) }));
  const grabber = useAnimatedStyle(() => ({ width: 36 + touch.value * 10, backgroundColor: `rgba(235,235,245,${0.3 + touch.value * 0.35})` }));
  const edge = useAnimatedStyle(() => ({ borderTopColor: `rgba(255,255,255,${0.08 + touch.value * 0.2})` }));

  const cycle = () => {
    haptic.tick();
    onIndexChange((index + 1) % detents.length);
  };

  return (
    <>
      {perch ? (
        <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', right: S.gutter + 4 }, perchStyle]}>
          {perch}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: max + bottomInset,
              backgroundColor: 'rgba(18,18,20,0.97)',
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderCurve: 'continuous',
              borderTopWidth: 1,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -4 },
            },
            edge,
            sheet,
            style,
          ]}
        >
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{ text: index === 0 ? 'collapsed' : index === detents.length - 1 ? 'expanded' : 'half height' }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'increment') onIndexChange(Math.min(detents.length - 1, index + 1));
              else onIndexChange(Math.max(0, index - 1));
            }}
            onPress={cycle}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{ alignItems: 'center', paddingTop: S.sm, paddingBottom: S.xs, minHeight: 22 }}
          >
            <Animated.View style={[{ height: 5, borderRadius: 3 }, grabber]} />
          </Pressable>
          {header ? <View style={{ paddingHorizontal: S.gutter, paddingBottom: S.lg }}>{header}</View> : null}
          {/* Content fades out under the header instead of being cut off. */}
          {header ? (
            <View pointerEvents="none" style={{ height: 18, marginBottom: -18, zIndex: 1 }}>
              {Array.from({ length: 9 }, (_, i) => (
                <View key={i} style={{ height: 2, backgroundColor: `rgba(18,18,20,${(0.97 * (1 - i / 9)).toFixed(3)})` }} />
              ))}
            </View>
          ) : null}
          <AnimatedScroll
            ref={scroll}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottomInset + S.xxl, gap: S.xl }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </AnimatedScroll>
        </Animated.View>
      </GestureDetector>
      {hero ? (
        <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: S.gutter + 6 }, heroStyle]}>
          {hero}
        </Animated.View>
      ) : null}
    </>
  );
}

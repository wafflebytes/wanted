/**
 * A resizable bottom drawer for the map (HIG sheets: detents, a grabber people can drag or
 * tap to cycle, content stays scrollable). It's nonmodal: the map above stays live.
 *
 * Detents are heights in points, smallest first. Drag starts on the grabber and header
 * region; the list scrolls on its own. Reduce Motion swaps the spring for a short timing.
 */
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, S } from '../theme';

export function Drawer({
  detents,
  index,
  onIndexChange,
  header,
  children,
  bottomInset = 0,
  style,
  label = 'Panel',
}: {
  detents: number[];
  index: number;
  onIndexChange: (i: number) => void;
  header?: ReactNode;
  children: ReactNode;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const max = detents[detents.length - 1];
  const h = useRef(new Animated.Value(detents[index])).current;
  const current = useRef(detents[index]);
  const start = useRef(0);
  const scroll = useRef<ScrollView>(null);

  const snap = (i: number, velocity = 0) => {
    const to = detents[i];
    current.current = to;
    if (reduced) Animated.timing(h, { toValue: to, duration: 160, useNativeDriver: false }).start();
    else Animated.spring(h, { toValue: to, velocity: -velocity, useNativeDriver: false, damping: 26, stiffness: 260, mass: 0.9 }).start();
  };

  useEffect(() => {
    snap(index);
    if (index === 0) scroll.current?.scrollTo({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, detents.join()]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          h.stopAnimation((v) => (start.current = v));
        },
        onPanResponderMove: (_, g) => {
          const next = start.current - g.dy;
          // Rubber-band past the ends.
          const lo = detents[0];
          const clamped = next < lo ? lo - (lo - next) * 0.25 : next > max ? max + (next - max) * 0.25 : next;
          h.setValue(clamped);
        },
        onPanResponderRelease: (_, g) => {
          const at = start.current - g.dy;
          // Project the throw a little so a flick moves one detent.
          const projected = at - g.vy * 180;
          let best = 0;
          detents.forEach((d, i) => {
            if (Math.abs(d - projected) < Math.abs(detents[best] - projected)) best = i;
          });
          if (best !== index) haptic.tick();
          snap(best, g.vy);
          onIndexChange(best);
        },
        onPanResponderTerminate: () => snap(index),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detents.join(), index, max],
  );

  const cycle = () => {
    haptic.tick();
    onIndexChange((index + 1) % detents.length);
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Animated.add(h, bottomInset),
          backgroundColor: 'rgba(18,18,20,0.97)',
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          borderCurve: 'continuous',
          borderTopWidth: 1,
          borderColor: C.line,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
        },
        style,
      ]}
    >
      <View {...pan.panHandlers}>
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
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(235,235,245,0.3)' }} />
        </Pressable>
        {header ? <View style={{ paddingHorizontal: S.gutter, paddingBottom: S.sm }}>{header}</View> : null}
      </View>
      <ScrollView ref={scroll} scrollEnabled={index > 0} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottomInset + S.xxl, gap: S.xl }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

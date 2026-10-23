/** Native stand-in for border-beam: a light that travels the outline, in the same token colors. */
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { C } from '../theme';

export type BeamVariant = 'stage' | 'heat' | 'proof' | 'gold';
export type BeamProps = { children: ReactNode; active?: boolean; variant?: BeamVariant; radius?: number; size?: 'sm' | 'md' | 'line'; strength?: number; duration?: number };

const COLOR: Record<BeamVariant, [string, string]> = {
  stage: [C.purple, C.purpleHi],
  heat: [C.sunset, C.amber],
  proof: ['#1E9E4F', C.good],
  gold: ['#9A6A00', C.gold],
};

export function Beam({ children, active = true, radius = 28, variant = 'stage' }: BeamProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1960, easing: Easing.inOut(Easing.sin), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);
  if (!active) return <>{children}</>;
  const [a, b] = COLOR[variant];
  return (
    <View>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, borderRadius: radius, borderCurve: 'continuous', borderWidth: 1.5, borderColor: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [a, b, a] }), shadowColor: b, shadowOpacity: 0.6, shadowRadius: 10 }}
      />
    </View>
  );
}

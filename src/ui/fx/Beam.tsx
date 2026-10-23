/** Native stand-in for border-beam: a pulsing warm outline. */
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { C } from '../theme';

export type BeamProps = { children: ReactNode; active?: boolean; variant?: 'sunset' | 'gold' | 'ocean' | 'colorful'; radius?: number };

export function Beam({ children, active = true, radius = 28 }: BeamProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);
  if (!active) return <>{children}</>;
  return (
    <View>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, borderRadius: radius, borderWidth: 1.5, borderColor: pulse.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,106,26,0.35)', C.amber] }) }}
      />
    </View>
  );
}

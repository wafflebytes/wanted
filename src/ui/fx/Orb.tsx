/** Native stand-in for thinking-orbs (a canvas library): a breathing dot ring. */
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { C } from '../theme';

export type OrbProps = { state?: 'working' | 'searching' | 'solving' | 'composing' | 'listening' | 'connecting'; size?: 64 | 32 | 20; color?: string };

export function Orb({ size = 32, color = C.text }: OrbProps) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const dots = 8;
  return (
    <Animated.View
      accessibilityLabel="Gus is thinking"
      style={{ width: size, height: size, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
    >
      {Array.from({ length: dots }, (_, i) => {
        const a = (i / dots) * Math.PI * 2;
        const r = size / 2 - 3;
        return (
          <View
            key={i}
            style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: color, opacity: 0.25 + (i / dots) * 0.75, left: size / 2 - 2 + Math.cos(a) * r, top: size / 2 - 2 + Math.sin(a) * r }}
          />
        );
      })}
    </Animated.View>
  );
}

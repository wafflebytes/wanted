/**
 * The launch, continued. The native launch screen shows Gus, the wordmark and the country as
 * faint dots; this takes over pixel for pixel and lights the map up: the busiest cities' dots
 * grow first and the heat spreads outward band by band, the way the crowd map reads. Then it
 * fades into the app. About two seconds, once per cold launch.
 *
 * Each heat band is one path of zero-length round-capped strokes (scripts/build-splash.py), so
 * growing a band is animating a single stroke width on the UI thread.
 */
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '../hooks';
import DOTS from './dots.json';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** The native launch image is this many points wide (app.json imageWidth), centered on screen. */
const BOX = 360;
const GROW_MS = 1500;
const START_MS = 300;

type Band = { t: number; r: number; color: string; d: string };

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  const fade = useSharedValue(1);

  useEffect(() => {
    // A beat after mount, so the first frames of a cold start don't eat the growth.
    if (!reduced) p.value = withDelay(START_MS, withTiming(1, { duration: GROW_MS, easing: Easing.linear }));
    fade.value = withDelay(reduced ? 300 : START_MS + GROW_MS + 350, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }, (ok) => ok && runOnJS(onDone)()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const veil = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }, veil]}>
      <View style={{ width: BOX, height: BOX }}>
        <Image source={require('../../../assets/images/splash.png')} style={StyleSheet.absoluteFill} contentFit="contain" />
        <Svg viewBox={`0 0 ${DOTS.size} ${DOTS.size}`} style={StyleSheet.absoluteFill}>
          {(DOTS.bands as Band[]).map((b) => (
            <HeatBand key={b.t} band={b} p={p} />
          ))}
        </Svg>
      </View>
    </Animated.View>
  );
}

/** Hottest bands start first; each grows over half the run with an ease-out, no overshoot. */
function HeatBand({ band, p }: { band: Band; p: SharedValue<number> }) {
  const start = (1 - band.t) * 0.5;
  const props = useAnimatedProps(() => {
    const k = interpolate(p.value, [start, start + 0.5], [0, 1], 'clamp');
    const eased = 1 - Math.pow(1 - k, 3);
    return { strokeWidth: band.r * 2 * eased, strokeOpacity: Math.min(1, k * 2.5) };
  });
  return <AnimatedPath d={band.d} stroke={band.color} strokeLinecap="round" fill="none" animatedProps={props} />;
}

/**
 * The Tour Score dial (PRD 8.3): a chunky sticker-style gauge whose needle springs to the score.
 * The van drives along the route whenever the plan is rebuilt.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, F, IMAGES } from '../theme';
import { T } from './T';

const AnimatedView = Animated.View;

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

export function ScoreDial({ score, size = 168 }: { score: number | null; size?: number }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(score ?? 0)).current;
  const [shown, setShown] = useState(score ?? 0);
  useEffect(() => {
    if (score === null) return;
    const id = v.addListener(({ value }) => setShown(value));
    if (reduced) v.setValue(score);
    else Animated.spring(v, { toValue: score, useNativeDriver: false, speed: 6, bounciness: 14 }).start(() => haptic.tick());
    return () => v.removeListener(id);
  }, [score, reduced, v]);
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h * 0.92;
  const r = w * 0.4;
  const a0 = Math.PI;
  const a1 = 2 * Math.PI;
  const t = Math.max(0, Math.min(100, shown)) / 100;
  const ang = a0 + (a1 - a0) * t;
  const nx = cx + r * 0.86 * Math.cos(ang);
  const ny = cy + r * 0.86 * Math.sin(ang);
  return (
    <View accessibilityRole="image" accessibilityLabel={`Tour Score ${score === null ? 'not set' : score.toFixed(0)} out of 100`} style={{ width: w, alignItems: 'center' }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="dial" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.heatLo} />
            <Stop offset="0.5" stopColor={C.heatMid} />
            <Stop offset="1" stopColor={C.heatHi} />
          </LinearGradient>
        </Defs>
        <Path d={arc(cx, cy, r, a0, a1)} stroke="#000" strokeWidth={w * 0.15} strokeLinecap="round" fill="none" />
        <Path d={arc(cx, cy, r, a0, a1)} stroke="url(#dial)" strokeWidth={w * 0.11} strokeLinecap="round" fill="none" />
        {[0, 25, 50, 75, 100].map((k) => {
          const a = a0 + (a1 - a0) * (k / 100);
          return <Path key={k} d={`M ${cx + (r - w * 0.09) * Math.cos(a)} ${cy + (r - w * 0.09) * Math.sin(a)} L ${cx + (r - w * 0.13) * Math.cos(a)} ${cy + (r - w * 0.13) * Math.sin(a)}`} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />;
        })}
        <Path d={`M ${cx} ${cy} L ${nx} ${ny}`} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
        <Path d={`M ${cx} ${cy} L ${nx} ${ny}`} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={w * 0.055} fill="#fff" stroke={C.ink} strokeWidth={3} />
      </Svg>
      <T style={{ fontFamily: F.monoBold, fontSize: size * 0.2, lineHeight: size * 0.22, marginTop: 2 }}>{score === null ? '—' : shown.toFixed(0)}</T>
      <T v="label">Tour Score</T>
    </View>
  );
}

/** The sticker van drives across the route strip whenever `runKey` changes. */
export function VanRun({ runKey, width }: { runKey: number; width: number }) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      x.setValue(1);
      return;
    }
    x.setValue(0);
    Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [runKey, reduced, x]);
  const vanW = 84;
  return (
    <View style={{ height: 52, justifyContent: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8, height: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }} />
      <AnimatedView style={{ width: vanW, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-vanW, Math.max(0, width - vanW)] }) }, { translateY: x.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -2, 0, -2, 0] }) }] }}>
        <Image source={IMAGES.van} style={{ width: vanW, height: 46 }} contentFit="contain" />
      </AnimatedView>
    </View>
  );
}

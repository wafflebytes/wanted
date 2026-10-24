/**
 * The landing hero: Maya's real Qloo heat as a halftone map of the US. Dots ignite in a
 * west-to-east sweep, the camera flies to her tour, the route draws itself with a van riding
 * it, and the cities fans signed pulse. Reduce Motion lands on the final frame.
 *
 * Plain SVG over native views (no WebView), so it's on screen with the first frame.
 */
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { T } from '../components/T';
import { LANDING } from '../landing.generated';
import { C, F, heatColor } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { cols, rows, dots, route, wanted } = LANDING;
const ease = Easing.bezier(0.32, 0.72, 0, 1);

/** The tour's bounding box in grid units, padded, which the camera flies to. */
const FOCUS = (() => {
  const xs = [...route.stops.map((s) => s.xy[0]), ...wanted.map((w) => w.xy[0])];
  const ys = [...route.stops.map((s) => s.xy[1]), ...wanted.map((w) => w.xy[1])];
  const pad = 3;
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
})();

const ROUTE_D = route.stops.map((s, i) => `${i ? 'L' : 'M'}${s.xy[0]} ${s.xy[1]}`).join(' ');

/** Static dot layers, memoized: they never redraw while the camera moves. */
const BaseDots = memo(function BaseDots({ w, h }: { w: number; h: number }) {
  const out = [];
  for (let i = 0; i < dots.length; i += 3) out.push(<Circle key={i} cx={dots[i] + 0.5} cy={dots[i + 1] + 0.5} r={0.17} fill="rgba(235,235,245,0.18)" />);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${cols} ${rows}`}>
      {out}
    </Svg>
  );
});

const HeatDots = memo(function HeatDots({ w, h }: { w: number; h: number }) {
  const out = [];
  for (let i = 0; i < dots.length; i += 3) {
    const p = dots[i + 2];
    if (p < 0.12) continue;
    out.push(<Circle key={i} cx={dots[i] + 0.5} cy={dots[i + 1] + 0.5} r={0.14 + p * 0.3} fill={heatColor(0.15 + p * 0.85)} opacity={0.3 + p * 0.7} />);
  }
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${cols} ${rows}`}>
      {out}
    </Svg>
  );
});

function Pulse({ x, y, delay, on, reduced }: { x: number; y: number; delay: number; on: SharedValue<number>; reduced: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, reduced, t]);
  const ring = useAnimatedProps(() => ({ r: 0.4 + t.value * 1.6, opacity: on.value * (1 - t.value) * 0.9 }));
  const core = useAnimatedProps(() => ({ opacity: on.value }));
  return (
    <>
      <AnimatedCircle cx={x} cy={y} fill="none" stroke={C.purpleHi} strokeWidth={0.12} animatedProps={ring} />
      <AnimatedCircle cx={x} cy={y} r={0.42} fill="#fff" stroke={C.purpleHi} strokeWidth={0.18} animatedProps={core} />
    </>
  );
}

/** A label pinned to a map point that stays the same size while the map scales under it. */
function Pin({ x, y, u, zoom, show, children }: { x: number; y: number; u: number; zoom: SharedValue<number>; show: SharedValue<number>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [{ translateY: (1 - show.value) * 6 }, { scale: 1 / zoom.value }],
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x * u, top: y * u, width: 0, height: 0, alignItems: 'center' }}>
      <Animated.View style={[{ position: 'absolute', bottom: 8, transformOrigin: 'bottom' }, style]}>
        <View style={styles.pin}>{children}</View>
      </Animated.View>
    </View>
  );
}

export function HeatField({ width, height, reduced }: { width: number; height: number; reduced: boolean }) {
  // Fit the whole country, then work out the camera move onto the tour.
  const u = Math.min(width / cols, height / rows);
  const W = cols * u;
  const H = rows * u;
  const cam = useMemo(() => {
    const fw = (FOCUS.x1 - FOCUS.x0) * u;
    const fh = (FOCUS.y1 - FOCUS.y0) * u;
    // Phones fly in close; big screens keep more of the country in view.
    const z = Math.max(1, Math.min(width / fw, height / fh, width > 700 ? 1.6 : 2.6));
    const fx = ((FOCUS.x0 + FOCUS.x1) / 2) * u;
    const fy = ((FOCUS.y0 + FOCUS.y1) / 2) * u;
    // RN scales around the view's center: move the focus point to the frame's center.
    return { z, tx: (W / 2 - fx) * z, ty: (H / 2 - fy) * z };
  }, [u, width, height, W, H]);

  const fade = useSharedValue(reduced ? 1 : 0);
  const sweep = useSharedValue(reduced ? 1 : 0);
  const fly = useSharedValue(reduced ? 1 : 0);
  const draw = useSharedValue(reduced ? 1 : 0);
  const pins = useSharedValue(reduced ? 1 : 0);
  const ride = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    fade.value = withTiming(1, { duration: 400 });
    sweep.value = withDelay(150, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }));
    fly.value = withDelay(1400, withTiming(1, { duration: 1300, easing: ease }));
    draw.value = withDelay(2400, withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }));
    pins.value = withDelay(2300, withTiming(1, { duration: 500 }));
    // The van rides the route as it draws, then keeps touring.
    ride.value = withDelay(
      2400,
      withSequence(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }), withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 9000, easing: Easing.linear })), -1, false)),
    );
  }, [reduced, fade, sweep, fly, draw, pins, ride]);

  const zoom = useDerivedValue(() => 1 + (cam.z - 1) * fly.value);
  const camera = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: cam.tx * fly.value }, { translateY: cam.ty * fly.value }, { scale: zoom.value }],
  }));
  const reveal = useAnimatedStyle(() => ({ width: W * sweep.value }));
  const scanline = useAnimatedStyle(() => ({ left: W * sweep.value - 1, opacity: sweep.value > 0 && sweep.value < 1 ? 1 : 0 }));

  const len = route.length;
  const line = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));
  const van = useAnimatedProps(() => {
    const n = route.samples.length / 2 - 1;
    const f = Math.min(n, Math.max(0, ride.value * n));
    const i = Math.floor(f);
    const k = f - i;
    const j = Math.min(n, i + 1);
    return {
      cx: route.samples[i * 2] + (route.samples[j * 2] - route.samples[i * 2]) * k,
      cy: route.samples[i * 2 + 1] + (route.samples[j * 2 + 1] - route.samples[i * 2 + 1]) * k,
      opacity: draw.value > 0 ? 1 : 0,
    };
  });

  const top = wanted.reduce((a, b) => ((b.rank ?? 999) < (a.rank ?? 999) ? b : a));
  const most = wanted[0];

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} pointerEvents="none">
      <Animated.View style={[{ width: W, height: H }, camera]}>
        <BaseDots w={W} h={H} />
        <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, reveal]}>
          <HeatDots w={W} h={H} />
        </Animated.View>
        <Animated.View style={[styles.scan, { height: H }, scanline]} />
        <Svg style={StyleSheet.absoluteFill} width={W} height={H} viewBox={`0 0 ${cols} ${rows}`}>
          <AnimatedPath d={ROUTE_D} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={0.16} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[len, len]} animatedProps={line} />
          {route.stops.map((s) => (
            <Circle key={s.city} cx={s.xy[0]} cy={s.xy[1]} r={0.2} fill="#fff" opacity={0.85} />
          ))}
          {wanted.map((w, i) => (
            <Pulse key={w.id} x={w.xy[0]} y={w.xy[1]} delay={2400 + i * 380} on={pins} reduced={reduced} />
          ))}
          <AnimatedCircle r={0.5} fill={C.amber} stroke="#000" strokeWidth={0.14} animatedProps={van} />
        </Svg>
        <Pin x={top.xy[0]} y={top.xy[1]} u={u} zoom={zoom} show={pins}>
          <T style={styles.pinRank}>#{top.rank}</T>
          <T style={styles.pinText}>{top.city}</T>
        </Pin>
        {most.id !== top.id ? (
          <Pin x={most.xy[0]} y={most.xy[1]} u={u} zoom={zoom} show={pins}>
            <T style={[styles.pinRank, { color: C.purpleHi }]}>{most.signatures}</T>
            <T style={styles.pinText}>signed in {most.city}</T>
          </Pin>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scan: { position: 'absolute', top: 0, width: 2, backgroundColor: C.amber, shadowColor: C.amber, shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(22,22,24,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.lineHi,
  },
  pinRank: { fontFamily: F.monoBold, fontSize: 12, lineHeight: 15, color: C.amber },
  pinText: { fontFamily: F.head, fontSize: 13, lineHeight: 16, color: C.text },
});

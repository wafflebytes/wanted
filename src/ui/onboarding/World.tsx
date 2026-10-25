/**
 * The onboarding world: the lower 48 at night as a halftone of taste heat, drifting a little
 * like water. Two layers: cold dots (always there) and a hot layer that ignites as Gus reads
 * the taste graph. Once a scout lands, the hot layer redraws from the act's own heat and the
 * picked cities light up. Static SVG; only views move, so nothing re-commits the drawing.
 */
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { T } from '../components/T';
import { LANDING } from '../landing.generated';
import { cellToLatLng } from '../map/h3';
import { C, F, heatColor } from '../theme';

const K = Math.cos((38 * Math.PI) / 180);
const COLS = LANDING.cols;
const ROWS = LANDING.rows;
const X0 = -125 * K;
const Y0 = -49.5;
const CELL = (-66.5 * K - X0) / COLS;

/** Lat/lon to grid units (same projection the landing data was built with). */
export const project = (lat: number, lon: number): [number, number] => [(lon * K - X0) / CELL, (-lat - Y0) / CELL];

type Dot = { x: number; y: number; h: number };

const BASE: Dot[] = (() => {
  const out: Dot[] = [];
  const d = LANDING.dots as readonly number[];
  for (let i = 0; i < d.length; i += 3) out.push({ x: d[i], y: d[i + 1], h: d[i + 2] });
  return out;
})();

/** Rebuild grid heat from a scout's hexes: the hottest hex in each cell wins. */
export function heatFromHexes(hexes: { h3: string; heat: number }[]): Dot[] {
  const grid = new Map<string, number>();
  for (const hx of hexes) {
    let ll: [number, number];
    try {
      ll = cellToLatLng(hx.h3) as [number, number];
    } catch {
      continue;
    }
    const [x, y] = project(ll[0], ll[1]);
    const key = `${Math.round(x)},${Math.round(y)}`;
    grid.set(key, Math.max(grid.get(key) ?? 0, hx.heat));
  }
  return BASE.map((d) => ({ ...d, h: grid.get(`${d.x},${d.y}`) ?? d.h * 0.25 }));
}

const Layer = memo(function Layer({ dots, w, cell, hot }: { dots: Dot[]; w: number; cell: number; hot: boolean }) {
  return (
    <Svg width={w} height={ROWS * cell} style={StyleSheet.absoluteFill}>
      {dots.map((d, i) =>
        hot ? (
          d.h > 0.06 ? <Circle key={i} cx={(d.x + 0.5) * cell} cy={(d.y + 0.5) * cell} r={cell * (0.18 + d.h * 0.3)} fill={heatColor(Math.min(1, 0.25 + d.h))} opacity={0.35 + d.h * 0.65} /> : null
        ) : (
          <Circle key={i} cx={(d.x + 0.5) * cell} cy={(d.y + 0.5) * cell} r={cell * 0.2} fill="#4A5170" opacity={0.7} />
        ),
      )}
    </Svg>
  );
});

export type Pin = { id: string; name: string; lat: number; lon: number; sleeper?: boolean };

/**
 * `ignite` 0..1 drives the hot layer. `pins` pop in one by one. `focus` (grid units) pans the
 * world so a point sits where the van will meet it.
 */
export function World({ width, height, ignite, rise, heat, pins, reduced }: { width: number; height: number; ignite: SharedValue<number>; rise?: SharedValue<number>; heat: Dot[] | null; pins: Pin[]; reduced: boolean }) {
  // A little wider than the screen on a phone, so the coasts drift in and out; capped on big screens.
  const cell = Math.min(width * 1.3, 1100) / COLS;
  const w = COLS * cell;
  const h = ROWS * cell;
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    drift.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, drift]);
  const left = (width - w) / 2;
  const top = height * 0.43 - h / 2;
  const pan = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.value - 0.5) * Math.min(80, (w - width) * 0.4) }, { translateY: (drift.value - 0.5) * 10 + (rise?.value ?? 0) }, { scale: 1 + ignite.value * 0.06 }] }));
  const hotSt = useAnimatedStyle(() => ({ opacity: ignite.value }));
  const hot = useMemo(() => heat ?? BASE, [heat]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#05060B' }]}>
      <Animated.View style={[{ position: 'absolute', left, top, width: w, height: h }, pan]}>
        <Layer dots={BASE} w={w} cell={cell} hot={false} />
        <Animated.View style={[StyleSheet.absoluteFill, hotSt]}>
          <Layer dots={hot} w={w} cell={cell} hot />
        </Animated.View>
        {pins.map((p, i) => {
          const [x, y] = project(p.lat, p.lon);
          return <PinView key={p.id} x={(x + 0.5) * cell} y={(y + 0.5) * cell} name={p.name} sleeper={!!p.sleeper} delay={i * 260} />;
        })}
      </Animated.View>
      {/* Night falloff so text on top stays readable. */}
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: 'radial-gradient(ellipse at 50% 38%, rgba(5,6,11,0) 0%, rgba(5,6,11,0.25) 60%, rgba(5,6,11,0.85) 100%)' } as object]} />
    </View>
  );
}

function PinView({ x, y, name, sleeper, delay }: { x: number; y: number; name: string; sleeper: boolean; delay: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withTiming(1, { duration: 260, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [delay, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: Math.min(1, s.value * 1.5) }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 7, top: y - 7, flexDirection: 'row', alignItems: 'center', gap: 6 }, st]}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: sleeper ? C.gold : '#fff', borderWidth: 3, borderColor: sleeper ? '#7a5a00' : C.flame }} />
      <Animated.View entering={FadeIn.delay(delay + 200)}>
        <T style={{ fontFamily: F.displayBold, fontSize: 12, color: '#fff', textShadowColor: '#000', textShadowRadius: 6 }}>{name}</T>
      </Animated.View>
    </Animated.View>
  );
}

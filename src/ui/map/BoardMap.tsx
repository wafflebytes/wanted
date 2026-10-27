/**
 * The Posters board: the artist's heat as halftone, a chalk trail through every city with a
 * poster up (in the order they went up), and one pin that rides the trail as you swipe between
 * posters. `at` is the pager's position as a float, so the pin glides between cities with the
 * finger instead of jumping. Static SVG underneath; only the pin and its label move.
 */
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { T } from '../components/T';
import { C, emberColor, F } from '../theme';
import { cellToBoundary } from './h3';

const K = Math.cos((38 * Math.PI) / 180);

export type BoardPin = { lat: number; lon: number; name: string; played: boolean; proven: boolean };

export const BoardMap = memo(function BoardMap({ hexes, pins, width, height, at, names }: { hexes: { h3: string; heat: number; score: number | null }[]; pins: BoardPin[]; width: number; height: number; at: SharedValue<number>; names: string[] }) {
  const view = useMemo(() => {
    const xs = pins.map((s) => s.lon * K);
    const ys = pins.map((s) => -s.lat);
    let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const minW = 10;
    const minH = 6;
    if (x1 - x0 < minW) [x0, x1] = [(x0 + x1) / 2 - minW / 2, (x0 + x1) / 2 + minW / 2];
    if (y1 - y0 < minH) [y0, y1] = [(y0 + y1) / 2 - minH / 2, (y0 + y1) / 2 + minH / 2];
    const padX = 40;
    const padY = 44;
    const z = Math.min((width - padX * 2) / (x1 - x0), (height - padY * 2) / (y1 - y0));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return (lat: number, lon: number): [number, number] => [width / 2 + (lon * K - cx) * z, height / 2 + 6 + (-lat - cy) * z];
  }, [pins, width, height]);

  const base = useMemo(() => {
    const buckets = new Map<number, string[]>();
    for (const h of hexes) {
      let b: [number, number][];
      try {
        b = cellToBoundary(h.h3) as [number, number][];
      } catch {
        continue;
      }
      const pts = b.map(([lat, lon]) => view(lat, lon));
      const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (mx < -20 || my < -20 || mx > width + 20 || my > height + 20) continue;
      const v = Math.round((h.score !== null ? h.score / 100 : h.heat * 0.5) * 8);
      const inner = (pts.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / pts.length) * 0.866;
      const r = inner * (0.16 + 0.56 * Math.sqrt(v / 8));
      if (r < 0.35) continue;
      const d = `M${(mx - r).toFixed(1)} ${my.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;
      const list = buckets.get(v);
      if (list) list.push(d);
      else buckets.set(v, [d]);
    }
    return [...buckets.entries()].map(([v, ds]) => ({ v: v / 8, d: ds.join('') }));
  }, [hexes, view, width, height]);

  const pts = useMemo(() => pins.map((p) => view(p.lat, p.lon)), [pins, view]);
  // A soft curve through the cities, like a route drawn by hand rather than a ruler.
  const trail = useMemo(() => {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const bend = (i % 2 ? 1 : -1) * 0.22;
      const mx = (ax + bx) / 2 - (by - ay) * bend;
      const my = (ay + by) / 2 + (bx - ax) * bend;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
    }
    return d;
  }, [pts]);

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const idx = pts.map((_, i) => i);
  const pin = useAnimatedStyle(() => {
    if (xs.length < 2) return { transform: [{ translateX: (xs[0] ?? 0) - 11 }, { translateY: (ys[0] ?? 0) - 11 }] };
    const x = interpolate(at.value, idx, xs, 'clamp');
    const y = interpolate(at.value, idx, ys, 'clamp');
    return { transform: [{ translateX: x - 11 }, { translateY: y - 11 }] };
  });
  const label = useAnimatedStyle(() => {
    const x = xs.length < 2 ? (xs[0] ?? 0) : interpolate(at.value, idx, xs, 'clamp');
    const y = ys.length < 2 ? (ys[0] ?? 0) : interpolate(at.value, idx, ys, 'clamp');
    // The label flips below the pin near the top edge, and hugs the sides near the edges.
    const below = y < 46;
    const left = Math.max(8, Math.min(width - 140, x - 70));
    return { transform: [{ translateX: left }, { translateY: below ? y + 16 : y - 44 }] };
  });
  return (
    <View style={{ width, height }} accessible accessibilityRole="image" accessibilityLabel={`Your posters: ${pins.map((p) => p.name).join(', ')}.`}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {base.map((b) => (
          <Path key={b.v} d={b.d} fill={emberColor(b.v)} opacity={0.28 + b.v * 0.5} />
        ))}
        {trail ? <Path d={trail} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="1 6" strokeLinecap="round" /> : null}
        {pts.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill={pins[i].played ? C.bad : pins[i].proven ? C.good : '#fff'} stroke="rgba(0,0,0,0.55)" strokeWidth={1.5} />
        ))}
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 140, height: 26 }, label]}>
        {names.map((n, i) => (
          <PinName key={`${n}-${i}`} name={n} i={i} at={at} />
        ))}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff', backgroundColor: 'rgba(155,48,224,0.9)', shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }, pin]} />
    </View>
  );
});

/** One city's label pill, centred over the pin, fully shown only while the pin sits on it. */
function PinName({ name, i, at }: { name: string; i: number; at: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(at.value - i), [0, 0.45], [1, 0], 'clamp') }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center' }, style]}>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingHorizontal: 10, height: 26, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
        <T numberOfLines={1} style={{ fontFamily: F.rounded ?? F.head, fontWeight: '700', fontSize: 13, color: '#111' }}>
          {name}
        </T>
      </View>
    </Animated.View>
  );
}

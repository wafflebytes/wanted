/**
 * The tour's route on the artist's own heat: a still map (no gestures) framed on the stops,
 * the road drawn white, numbered stops, and the van riding the route on a loop. Static SVG
 * underneath; only the van moves, as a view transform, so nothing re-commits the SVG.
 */
import { Image } from 'expo-image';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { C, emberColor, F, IMAGES } from '../theme';
import { cellToBoundary } from './h3';

const K = Math.cos((38 * Math.PI) / 180);

type Stop = { lat: number; lon: number; city: string };

export const RouteMap = memo(function RouteMap({ hexes, stops, width, height, reduced }: { hexes: { h3: string; heat: number; score: number | null }[]; stops: Stop[]; width: number; height: number; reduced: boolean }) {
  const view = useMemo(() => {
    const xs = stops.map((s) => s.lon * K);
    const ys = stops.map((s) => -s.lat);
    // Frame the stops with room around them; never tighter than a region.
    let x0 = Math.min(...xs);
    let x1 = Math.max(...xs);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    const minW = 9;
    const minH = 5.5;
    if (x1 - x0 < minW) [x0, x1] = [(x0 + x1) / 2 - minW / 2, (x0 + x1) / 2 + minW / 2];
    if (y1 - y0 < minH) [y0, y1] = [(y0 + y1) / 2 - minH / 2, (y0 + y1) / 2 + minH / 2];
    const pad = 28;
    const z = Math.min((width - pad * 2) / (x1 - x0), (height - pad * 2) / (y1 - y0));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return (lat: number, lon: number): [number, number] => [width / 2 + (lon * K - cx) * z, height / 2 + (-lat - cy) * z];
  }, [stops, width, height]);

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
      if (mx < -30 || my < -30 || mx > width + 30 || my > height + 30) continue;
      const v = Math.round((h.score !== null ? h.score / 100 : h.heat * 0.5) * 8);
      // Halftone, like the Crowd Map: a dot per hex, sized by its value.
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

  const pts = useMemo(() => stops.map((s) => view(s.lat, s.lon)), [stops, view]);
  const road = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

  // The van rides evenly along the road: cumulative lengths, sampled for the worklet.
  const { sx, sy } = useMemo(() => {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = segs.reduce((a, b) => a + b, 0) || 1;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let n = 0; n <= 80; n++) {
      let d = (n / 80) * total;
      let i = 0;
      while (i < segs.length - 1 && d > segs[i]) d -= segs[i++];
      const t = segs[i] ? d / segs[i] : 0;
      const a = pts[i] ?? [0, 0];
      const b = pts[i + 1] ?? a;
      xs.push(a[0] + (b[0] - a[0]) * t);
      ys.push(a[1] + (b[1] - a[1]) * t);
    }
    return { sx: xs, sy: ys };
  }, [pts]);
  const ride = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    ride.value = 0;
    ride.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1, false);
  }, [reduced, sx]);
  const van = useAnimatedStyle(() => {
    const f = ride.value * (sx.length - 1);
    const i = Math.min(sx.length - 2, Math.floor(f));
    const k = f - i;
    const x = sx[i] + (sx[i + 1] - sx[i]) * k;
    const y = sy[i] + (sy[i + 1] - sy[i]) * k;
    const flip = sx[i + 1] < sx[i] ? -1 : 1;
    return { transform: [{ translateX: x - 22 }, { translateY: y - 26 }, { scaleX: flip }] };
  });

  return (
    <View style={{ width, height }} accessible accessibilityRole="image" accessibilityLabel={`Route map: ${stops.map((s) => s.city).join(', ')}.`}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {base.map((b) => (
          <Path key={b.v} d={b.d} fill={emberColor(b.v)} opacity={0.35 + b.v * 0.5} />
        ))}
        <Path d={road} fill="none" stroke={C.purpleHi} strokeOpacity={0.35} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
        <Path d={road} fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={9} fill={i === 0 ? C.purple : '#141416'} stroke="#fff" strokeWidth={1.5} />
        ))}
        {pts.map((p, i) => (
          <SvgText key={`t${i}`} x={p[0]} y={p[1] + 3.5} fill="#fff" fontSize={10} fontWeight="700" textAnchor="middle" fontFamily={F.monoBold}>
            {String(i + 1)}
          </SvgText>
        ))}
      </Svg>
      {stops.length > 1 && !reduced ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, van]}>
          <Image source={IMAGES.van} style={{ width: 44, height: 28 }} contentFit="contain" />
        </Animated.View>
      ) : null}
    </View>
  );
});

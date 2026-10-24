/**
 * A city as a small WANTED handbill: cream paper, the city's name in poster type, its crowd as
 * halftone dots (the same dots as the map, in poster ink), and how many people signed.
 * Used in the map's "The five" row and floating over the top of a city's sheet.
 */
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { cityEdition } from '@/lib/poster';
import { T } from '../components/T';
import { haptic } from '../haptics';
import { C, F } from '../theme';
import { cellToLatLng } from './h3';

export type TileHex = { h3: string; heat: number };

/** Hexes to dots fitted in a w×h box: bigger where the heat is. */
function dotsFor(hexes: TileHex[], w: number, h: number) {
  if (!hexes.length) return [];
  const pts = hexes.map((x) => {
    const [lat, lon] = cellToLatLng(x.h3);
    return { lat, lon, heat: x.heat };
  });
  const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = pts.map((p) => p.lon * k);
  const ys = pts.map((p) => -p.lat);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0) || 1;
  const scale = (Math.min(w, h) * 0.86) / span;
  const step = Math.min(12, Math.max(3, Math.sqrt((w * h * 0.42) / pts.length)));
  const max = Math.max(...pts.map((p) => p.heat), 0.001);
  return pts.map((p, i) => ({ x: w / 2 + (xs[i] - (x0 + x1) / 2) * scale, y: h / 2 + (ys[i] - (y0 + y1) / 2) * scale, r: (step / 2) * (0.22 + 0.78 * Math.sqrt(p.heat / max)) }));
}

export function PosterTile({
  cityId,
  name,
  state,
  hexes,
  signed,
  proven,
  width = 132,
  tilt = 0,
  onPress,
  label,
}: {
  cityId: string;
  name: string;
  state: string;
  hexes: TileHex[];
  signed: number | null;
  proven?: boolean;
  width?: number;
  tilt?: number;
  onPress?: () => void;
  label?: string;
}) {
  const ed = cityEdition(cityId);
  const h = Math.round(width * 1.32);
  const art = Math.round(width * 0.74);
  const dots = useMemo(() => dotsFor(hexes, art, art * 0.82), [hexes, art]);
  const big = name.length > 10 ? width * 0.13 : width * 0.16;
  const face = (
    <View
      style={{
        width,
        height: h,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: '#F1E6CF',
        padding: width * 0.08,
        alignItems: 'center',
        transform: [{ rotate: `${tilt}deg` }],
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <T numberOfLines={1} style={{ fontFamily: F.displayBlack, fontSize: width * 0.082, letterSpacing: width * 0.01, color: C.posterInk, lineHeight: width * 0.11 }}>WANTED IN</T>
      <View style={{ height: 1.5, alignSelf: 'stretch', backgroundColor: 'rgba(58,34,19,0.35)', marginVertical: width * 0.03 }} />
      <Svg width={art} height={art * 0.82}>
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={ed.ink} />
        ))}
      </Svg>
      <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.displayBlack, fontSize: big, lineHeight: big * 1.15, color: ed.ink, marginTop: width * 0.03, textAlign: 'center' }}>
        {name.toUpperCase()}
      </T>
      <T style={{ fontFamily: F.display, fontSize: width * 0.075, letterSpacing: width * 0.01, color: 'rgba(58,34,19,0.7)' }}>{state}</T>
      {signed !== null ? (
        <View
          style={{
            position: 'absolute',
            right: -width * 0.06,
            top: width * 0.3,
            minWidth: width * 0.3,
            height: width * 0.3,
            paddingHorizontal: 6,
            borderRadius: width * 0.15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: proven ? C.good : C.purple,
            transform: [{ rotate: '8deg' }],
            borderWidth: 2,
            borderColor: '#F1E6CF',
          }}
        >
          <T style={{ fontFamily: F.displayBold, fontSize: width * 0.1, color: '#fff', fontVariant: ['tabular-nums'] }}>{signed}</T>
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return face;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? `${name}, ${state}${signed !== null ? `, ${signed} signed` : ''}`}
      onPress={() => (haptic.tap(), onPress())}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      {face}
    </Pressable>
  );
}

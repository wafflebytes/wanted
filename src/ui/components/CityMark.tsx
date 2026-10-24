/**
 * What makes each city's poster its own: an ink picked for the city (the city line, the stamp,
 * a faint tone in the paper) and a rubber stamp in the corner with the city's heat honeycomb
 * inside: the same areas as the map, as halftone dots, bigger where more of your people are.
 * The stamp sits bottom-left so it balances the gold SIGNED seal bottom-right.
 */
import { useMemo } from 'react';
import Svg, { Circle, Defs, G, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { F } from '../theme';

export { cityEdition } from '@/lib/poster';

export type Hex = { h3: string; heat: number; lat: number; lon: number };

/** The stamp, `size` across in poster units. */
export function CityMark({ cityId, cityName, state, hexes, size, ink, tilt }: { cityId: string; cityName: string; state: string; hexes: Hex[]; size: number; ink: string; tilt: number }) {
  const R = 100; // drawn in a 200×200 box, scaled to size
  // Halftone: one ink dot per hex, its size the heat. The same look as the map.
  const dots = useMemo(() => {
    if (!hexes.length) return [];
    // Flat local projection: degrees of longitude shrink with latitude.
    const lat0 = hexes.reduce((a, h) => a + h.lat, 0) / hexes.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const pts = hexes.map((h) => ({ heat: h.heat, x: h.lon * k, y: -h.lat }));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Fit the cloud inside the inner ring (a square inscribed in it), centred.
    const inner = 58;
    const span = Math.max(x1 - x0, y1 - y0) || 1;
    const scale = (inner * Math.SQRT2) / span;
    // Each dot gets its share of the circle, so a sparse city and a dense one both read as a picture.
    const step = Math.min(15, Math.max(4, Math.sqrt((inner * Math.SQRT2) ** 2 / pts.length) * 1.1));
    return pts.map((p) => ({ x: R + (p.x - (x0 + x1) / 2) * scale, y: R + (p.y - (y0 + y1) / 2) * scale, r: (step / 2) * (0.22 + 0.78 * Math.sqrt(p.heat)) }));
  }, [hexes]);
  const id = `ring-${cityId}`;
  const top = cityName.toUpperCase();
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={{ transform: [{ rotate: `${tilt}deg` }] }} opacity={0.88}>
      <Defs>
        {/* Top arc reads left to right over the top; the bottom arc runs the other way so its words aren't upside down. */}
        <Path id={`${id}-t`} d={`M 22 100 A 78 78 0 0 1 178 100`} fill="none" />
        <Path id={`${id}-b`} d={`M 30 100 A 70 70 0 0 0 170 100`} fill="none" />
      </Defs>
      <Circle cx={R} cy={R} r={96} fill="none" stroke={ink} strokeWidth={6} />
      <Circle cx={R} cy={R} r={64} fill="none" stroke={ink} strokeWidth={1.6} />
      <SvgText fill={ink} fontFamily={F.display} fontSize={top.length > 12 ? 15 : 19} letterSpacing={2} textAnchor="middle">
        <TextPath href={`#${id}-t`} startOffset="50%">
          {top}
        </TextPath>
      </SvgText>
      <SvgText fill={ink} fontFamily={F.display} fontSize={13} letterSpacing={2.5} textAnchor="middle">
        <TextPath href={`#${id}-b`} startOffset="50%">
          {`${state} ★ WHERE THEY HIDE`}
        </TextPath>
      </SvgText>
      <G>
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={ink} />
        ))}
      </G>
    </Svg>
  );
}

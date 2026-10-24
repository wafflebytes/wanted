/**
 * The Crowd Map on iOS and Android, drawn natively with SVG instead of a WebGL WebView
 * (PRD 8.3). Country level: every Qloo H3 hex as a real hexagon, colored by Wanted Score;
 * sleepers get a gold ring, opened cities a purple one, fan signatures white dots. Tap a city
 * and the camera zooms into it: street-level hexes, ranked neighborhoods, room pins.
 *
 * Hexes are batched into one path per color bucket, so thousands of cells draw as a dozen
 * shapes. Pinch and pan move a transform on the UI thread; when the gesture ends the camera
 * is committed and everything is re-projected crisply.
 */
import { cellToBoundary } from './h3';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Circle, Path } from 'react-native-svg';
import { T } from '../components/T';
import { haptic } from '../haptics';
import { C, emberColor, F } from '../theme';
import { BASEMAPS, basemapTile, type Basemap, type CrowdMapProps, type MapCity } from './types';

export type { CrowdMapProps } from './types';

/** Web Mercator in tile-pixel units at zoom 0 (the world is 256 across), so the base map's tiles line up. */
const world = (lat: number, lon: number): [number, number] => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return [((lon + 180) / 360) * 256, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256];
};
/** Contiguous US in world units: west, north, east, south. */
const [usW, usN] = world(49.4, -124.6);
const [usE, usS] = world(24.6, -66.9);
const US = { x0: usW, y0: usN, x1: usE, y1: usS };

type Cam = { x: number; y: number; z: number };
type Size = { w: number; h: number };
type Pad = CrowdMapProps['padding'];

function fit(b: { x0: number; y0: number; x1: number; y1: number }, size: Size, pad: Pad, maxZ = Infinity): Cam {
  const vw = Math.max(40, size.w - pad.left - pad.right);
  const vh = Math.max(40, size.h - pad.top - pad.bottom);
  const z = Math.min(vw / (b.x1 - b.x0), vh / (b.y1 - b.y0), maxZ);
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z };
}

/** Screen position of a world point: the camera center sits in the middle of the visible area. */
function projector(cam: Cam, size: Size, pad: Pad) {
  const cx = pad.left + (size.w - pad.left - pad.right) / 2;
  const cy = pad.top + (size.h - pad.top - pad.bottom) / 2;
  return (lat: number, lon: number): [number, number] => {
    const [x, y] = world(lat, lon);
    return [cx + (x - cam.x) * cam.z, cy + (y - cam.y) * cam.z];
  };
}

const boundaries = new Map<string, [number, number][]>();
function boundary(h3: string) {
  let b = boundaries.get(h3);
  if (!b) {
    try {
      b = cellToBoundary(h3) as [number, number][];
    } catch {
      b = [];
    }
    boundaries.set(h3, b);
  }
  return b;
}

/**
 * Halftone: each hex is drawn as one round dot at its centre, sized by its value, so cool areas
 * thin out to specks and hot ones nearly touch. One SVG path per value bucket.
 */
function hexPaths(hexes: { h3: string; v: number; strong: boolean }[], project: (lat: number, lon: number) => [number, number], shrink: number, size: Size, maxR = Infinity) {
  const buckets = new Map<string, string[]>();
  for (const h of hexes) {
    const b = boundary(h.h3);
    if (b.length < 3) continue;
    const pts = b.map(([lat, lon]) => project(lat, lon));
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (cx < -60 || cy < -60 || cx > size.w + 60 || cy > size.h + 60) continue;
    const bucket = Math.round(h.v * 12);
    const key = `${bucket}|${h.strong ? 1 : 0}`;
    // The cell's inner radius (centre to edge), then the dot's share of it.
    const inner = (pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / pts.length) * 0.866;
    // Zoomed into a city the cells are huge; cap the dot so it stays a dot, not a blob.
    const r = Math.min(maxR, inner * shrink) * (0.26 + 0.74 * Math.sqrt(bucket / 12));
    if (r < 0.35) continue;
    const d = `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;
    const list = buckets.get(key);
    if (list) list.push(d);
    else buckets.set(key, [d]);
  }
  return [...buckets.entries()].map(([key, ds]) => {
    const [v, strong] = key.split('|').map(Number);
    return { key, d: ds.join(''), v: v / 12, strong: !!strong };
  });
}

const HexLayer = memo(function HexLayer({ paths, size, dark }: { paths: ReturnType<typeof hexPaths>; size: Size; dark: boolean }) {
  return (
    <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {paths.map((p) => (
        <Path key={p.key} d={p.d} fill={dark ? '#2C2C2E' : emberColor(p.v)} opacity={dark ? 0.7 : p.strong ? 0.82 : 0.4} />
      ))}
    </Svg>
  );
});

/**
 * The base map: dark raster tiles with no labels (the map writes its own), fetched for the
 * committed camera. While a pinch or a flight is in progress they scale with the layer, then
 * snap crisp when the camera commits.
 */
// Esri tiles: no key. They're 256px, so pick one zoom finer than the camera to stay sharp on Retina.
const TileLayer = memo(function TileLayer({ cam, size, pad, dim, basemap }: { cam: Cam; size: Size; pad: Pad; dim: boolean; basemap: Basemap }) {
  const tiles = useMemo(() => {
    const b = BASEMAPS.find((x) => x.key === basemap) ?? BASEMAPS[0];
    const url = basemapTile(b.layer);
    const TILE = (z: number, x: number, y: number) => url.replace('{z}', `${z}`).replace('{x}', `${x}`).replace('{y}', `${y}`);
    const n = Math.max(2, Math.min(b.maxZoom, Math.round(Math.log2(cam.z) + 1)));
    const span = 256 / 2 ** n;
    const cx = pad.left + (size.w - pad.left - pad.right) / 2;
    const cy = pad.top + (size.h - pad.top - pad.bottom) / 2;
    // A tile of margin all round, so a short pan doesn't open a gap before the camera commits.
    const wx0 = cam.x - cx / cam.z - span;
    const wy0 = cam.y - cy / cam.z - span;
    const wx1 = cam.x + (size.w - cx) / cam.z + span;
    const wy1 = cam.y + (size.h - cy) / cam.z + span;
    const max = 2 ** n - 1;
    const out: { key: string; uri: string; left: number; top: number; s: number }[] = [];
    for (let ty = Math.max(0, Math.floor(wy0 / span)); ty <= Math.min(max, Math.floor(wy1 / span)); ty++) {
      for (let tx = Math.max(0, Math.floor(wx0 / span)); tx <= Math.min(max, Math.floor(wx1 / span)); tx++) {
        out.push({ key: `${n}/${tx}/${ty}`, uri: TILE(n, tx, ty), left: cx + (tx * span - cam.x) * cam.z, top: cy + (ty * span - cam.y) * cam.z, s: span * cam.z });
      }
    }
    return out;
  }, [cam, size, pad.top, pad.left, pad.bottom, pad.right, basemap]);
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: dim ? 0.35 : 1 }]} pointerEvents="none">
      {tiles.map((t) => (
        // Half a pixel of overlap hides the hairline seams between tiles.
        <Image key={t.key} source={{ uri: t.uri }} cachePolicy="memory-disk" transition={0} style={{ position: 'absolute', left: t.left - 0.25, top: t.top - 0.25, width: t.s + 0.5, height: t.s + 0.5 }} />
      ))}
    </View>
  );
});

export function CrowdMapView(props: CrowdMapProps) {
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 1 || Math.abs(size.h - height) > 1) setSize({ w: width, h: height });
  };
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: C.canvas }} onLayout={onLayout}>
      {size ? <MapBody {...props} size={size} /> : null}
    </View>
  );
}

function cityBounds(city: MapCity) {
  const pts: [number, number][] = [];
  // Fit the heat, not the city limits: the hottest cells should fill the view.
  const hot = [...city.hexes].sort((a, b) => b.heat - a.heat).slice(0, Math.max(10, Math.ceil(city.hexes.length * 0.35)));
  for (const h of hot) for (const [lat, lon] of boundary(h.h3)) pts.push(world(lat, lon));
  for (const r of city.rooms) if (r.lat !== null && r.lon !== null) pts.push(world(r.lat, r.lon));
  if (!pts.length) pts.push(world(city.lat - 0.15, city.lon - 0.2), world(city.lat + 0.15, city.lon + 0.2));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function MapBody(props: CrowdMapProps & { size: Size }) {
  const { size, padding: pad, city, dark, reduceMotion } = props;

  const target = useMemo<Cam>(() => (city ? fit(cityBounds(city), size, pad) : fit(US, size, pad)), [city, size, pad.top, pad.left, pad.bottom, pad.right]);
  const [cam, setCam] = useState<Cam>(target);
  const camRef = useRef(cam);
  camRef.current = cam;

  // Live transform (gestures and camera flights), applied about the visible center.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);
  const vcx = pad.left + (size.w - pad.left - pad.right) / 2;
  const vcy = pad.top + (size.h - pad.top - pad.bottom) / 2;

  const commit = (next: Cam) => {
    setCam(next);
    tx.value = 0;
    ty.value = 0;
    sc.value = 1;
  };

  // Fly to a new target: zoom about the point that stays put, then commit and re-project.
  const flying = useRef(false);
  useEffect(() => {
    const from = camRef.current;
    const k = target.z / from.z;
    const Tx = (from.x - target.x) * target.z;
    const Ty = (from.y - target.y) * target.z;
    if (Math.abs(k - 1) < 0.01 && Math.abs(Tx) < 1 && Math.abs(Ty) < 1) return;
    if (reduceMotion) {
      commit(target);
      return;
    }
    flying.current = true;
    const dur = Math.min(1400, 700 + Math.abs(Math.log(k)) * 260);
    const ease = Easing.bezier(0.32, 0.72, 0, 1);
    sc.value = withTiming(k, { duration: dur, easing: ease });
    tx.value = withTiming(Tx, { duration: dur, easing: ease });
    ty.value = withTiming(Ty, { duration: dur, easing: ease }, (done) => {
      if (done) runOnJS(finishFly)(target);
    });
  }, [target]);
  function finishFly(t: Cam) {
    flying.current = false;
    commit(t);
  }

  // Pinch and pan.
  const start = useSharedValue({ tx: 0, ty: 0, sc: 1 });
  const commitGesture = (gx: number, gy: number, gs: number) => {
    const c = camRef.current;
    const z = Math.max(fit(US, size, pad).z * 0.7, Math.min(c.z * gs, 2 ** 17));
    const real = z / c.z;
    commit({ x: c.x - gx / (real * c.z), y: c.y - gy / (real * c.z), z });
  };
  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      start.value = { tx: tx.value, ty: ty.value, sc: sc.value };
    })
    .onUpdate((e) => {
      tx.value = start.value.tx + e.translationX;
      ty.value = start.value.ty + e.translationY;
    })
    .onEnd(() => {
      runOnJS(commitGesture)(tx.value, ty.value, sc.value);
    });
  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.value = { tx: tx.value, ty: ty.value, sc: sc.value };
    })
    .onUpdate((e) => {
      sc.value = Math.max(0.5, Math.min(8, start.value.sc * e.scale));
    })
    .onEnd(() => {
      runOnJS(commitGesture)(tx.value, ty.value, sc.value);
    });

  const project = useMemo(() => projector(cam, size, pad), [cam, size, pad.top, pad.left, pad.bottom, pad.right]);

  // Taps pick the nearest city, room or neighborhood within reach of a fingertip.
  const pickables = useMemo(() => {
    const out: { kind: 'metro' | 'room' | 'neighborhood'; id: string; x: number; y: number; w: number }[] = [];
    if (city) {
      for (const r of city.rooms) if (r.lat !== null && r.lon !== null) out.push({ kind: 'room', id: r.id, ...xy(project(r.lat, r.lon)), w: 2 });
      for (const n of city.neighborhoods) if (n.lat !== null && n.lon !== null) out.push({ kind: 'neighborhood', id: n.name, ...xy(project(n.lat, n.lon)), w: 1 });
    } else if (!dark) {
      const opened = new Set(props.opened);
      for (const m of props.metros) {
        if (!lower48(m.lat, m.lon) || !(opened.has(m.id) || m.sleeper || (m.rank ?? 999) <= 40)) continue;
        out.push({ kind: 'metro', id: m.id, ...xy(project(m.lat, m.lon)), w: opened.has(m.id) ? 3 : m.sleeper ? 2 : 1 });
      }
    }
    return out;
  }, [city, project, props.metros, props.opened, dark]);
  const onTap = (x: number, y: number) => {
    let best: (typeof pickables)[number] | null = null;
    let bestD = Infinity;
    for (const p of pickables) {
      const d = Math.hypot(p.x - x, p.y - y) - p.w * 4;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best && bestD < 30) {
      haptic.tap();
      props.onPick({ kind: best.kind, id: best.id });
    }
  };
  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((e, ok) => {
      if (ok) runOnJS(onTap)(e.x, e.y);
    });
  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));

  const layer = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
  }));
  const counter = useAnimatedStyle(() => ({ transform: [{ scale: 1 / sc.value }] }));

  // First light: the heat sweeps in west to east, like the landing.
  const sweep = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) sweep.value = withDelay(100, withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }));
  }, []);
  const reveal = useAnimatedStyle(() => ({ width: size.w * sweep.value }));

  // Country hexes, projected for the committed camera.
  const showCountry = !city;
  const countryPaths = useMemo(() => {
    // The lower 48 only: Alaska, Hawaii and Puerto Rico would sit far off the frame.
    const hexes = props.hexes.filter((h) => inLower48(h.h3)).map((h) => ({ h3: h.h3, v: h.score !== null ? h.score / 100 : h.heat * 0.55, strong: h.score !== null }));
    const shrink = cam.z > 60 ? 1 : 0.96;
    return hexPaths(hexes, project, shrink, size);
  }, [props.hexes, project, size, cam.z]);
  const cityPaths = useMemo(() => (city ? hexPaths(city.hexes.map((h) => ({ h3: h.h3, v: 0.15 + h.heat * 0.85, strong: h.heat > 0.15 })), project, 0.8, size, 9) : []), [city, project, size]);

  const routeD = useMemo(() => {
    if (!props.route?.length || city || dark) return null;
    return props.route.map((s, i) => {
      const [x, y] = project(s.lat, s.lon);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join('');
  }, [props.route, project, city, dark]);
  const outlineD = useMemo(() => {
    if (!city?.outline?.length) return null;
    return city.outline.map(([lon, lat], i) => {
      const [x, y] = project(lat, lon);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join('') + 'Z';
  }, [city, project]);

  const opened = useMemo(() => new Set(props.opened), [props.opened]);
  const dots = dark ? [] : props.dots.filter((d) => (city ? d.city === city.id : true));
  const metros = dark || city ? [] : props.metros.filter((m) => lower48(m.lat, m.lon) && (opened.has(m.id) || m.sleeper || (m.rank ?? 999) <= 8));

  // Labels: opened cities first, then sleepers, then the top ranks; skip any that would collide.
  const labels = useMemo(() => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const out: { key: string; x: number; y: number; text: string; badge?: string; tone: 'fans' | 'gold' | 'plain' | 'amber' | 'room' }[] = [];
    const tryPlace = (key: string, x: number, y: number, text: string, tone: (typeof out)[number]['tone'], badge?: string) => {
      const w = text.length * 7.4 + 8;
      const r = { x: x - w / 2, y: y - 30, w, h: 20 };
      if (r.x < 4 || r.x + r.w > size.w - 4 || r.y < pad.top - 10 || r.y > size.h - pad.bottom) return;
      if (placed.some((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y)) return;
      placed.push(r);
      out.push({ key, x, y, text, tone, badge });
    };
    if (city) {
      const hoods = [...city.neighborhoods].filter((n) => n.lat !== null && n.lon !== null).sort((a, b) => a.rank - b.rank);
      for (const n of hoods.slice(0, 8)) {
        const [x, y] = project(n.lat!, n.lon!);
        tryPlace(`n-${n.name}`, x, y, n.name, n.rank <= 3 ? 'amber' : 'plain', n.rank <= 3 ? `#${n.rank}` : undefined);
      }
      for (const r of [...city.rooms].sort((a, b) => a.rank - b.rank).slice(0, 6)) {
        if (r.lat === null || r.lon === null) continue;
        const [x, y] = project(r.lat, r.lon);
        tryPlace(`r-${r.id}`, x, y, r.name, 'room');
      }
    } else if (!dark) {
      const order = [...metros].sort((a, b) => Number(opened.has(b.id)) - Number(opened.has(a.id)) || Number(b.sleeper) - Number(a.sleeper) || (a.rank ?? 999) - (b.rank ?? 999));
      for (const m of order) {
        const [x, y] = project(m.lat, m.lon);
        tryPlace(`m-${m.id}`, x, y, m.name, opened.has(m.id) ? 'fans' : m.sleeper ? 'gold' : 'plain', m.rank && !m.sleeper && !opened.has(m.id) ? `#${m.rank}` : undefined);
      }
    }
    return out;
  }, [city, metros, project, opened, size, pad.top, pad.bottom, dark]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [vcx, vcy, 0] } as object, layer]}>
          <TileLayer cam={cam} size={size} pad={pad} dim={dark} basemap={props.basemap ?? 'dark'} />
          {showCountry ? (
            <>
              {/* Grey base under the heat, so the country reads before the sweep reaches it. */}
              <HexLayer paths={countryPaths} size={size} dark />
              {!dark ? (
                <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, reveal]}>
                  <HexLayer paths={countryPaths} size={size} dark={false} />
                </Animated.View>
              ) : null}
            </>
          ) : (
            <>
              <HexLayer paths={cityPaths} size={size} dark={false} />
            </>
          )}
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {outlineD ? <Path d={outlineD} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1} /> : null}
            {routeD ? <Path d={routeD} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
            {props.route && !city && !dark
              ? props.route.map((s, i) => {
                  const [x, y] = project(s.lat, s.lon);
                  return <Circle key={`s${i}`} cx={x} cy={y} r={3} fill="#fff" />;
                })
              : null}
            {metros.map((m) => {
              const [x, y] = project(m.lat, m.lon);
              const isOpen = opened.has(m.id);
              return (
                <Circle
                  key={m.id}
                  cx={x}
                  cy={y}
                  // Two kinds only: purple where you've put a poster up, white for everywhere else worth a look.
                  r={isOpen ? 6 : 3.5}
                  fill={isOpen ? C.purple : '#fff'}
                  stroke={isOpen ? '#fff' : 'rgba(0,0,0,0.6)'}
                  strokeWidth={isOpen ? 2 : 1}
                />
              );
            })}
            {city
              ? city.rooms.map((r) => {
                  if (r.lat === null || r.lon === null) return null;
                  const [x, y] = project(r.lat, r.lon);
                  return <Circle key={r.id} cx={x} cy={y} r={4.5} fill="#fff" stroke="#000" strokeWidth={2} />;
                })
              : null}
          </Svg>
          {dots.map((d, i) => {
            const [x, y] = project(d.lat, d.lon);
            return <FanDot key={`${d.city}-${d.neighborhood}-${i}`} x={x} y={y} r={city ? Math.min(7, 3 + Math.sqrt(d.count)) : 2.5 + Math.min(3, Math.sqrt(d.count))} confirmed={d.confirmed} pulse={props.pulse} reduced={reduceMotion} />;
          })}
          {labels.map((l) => (
            <View key={l.key} pointerEvents="none" style={{ position: 'absolute', left: l.x, top: l.y, width: 0, height: 0, alignItems: 'center' }}>
              <Animated.View style={[{ position: 'absolute', bottom: 9, transformOrigin: 'bottom' } as object, counter]}>
                <View style={styles.label}>
                  <T style={[styles.labelText, { color: l.tone === 'gold' ? C.gold : l.tone === 'fans' ? '#D9B3FF' : l.tone === 'room' ? C.text2 : C.text }, l.tone === 'amber' && { fontWeight: '700' }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    {l.text}
                  </T>
                </View>
              </Animated.View>
            </View>
          ))}
        </Animated.View>
        <T pointerEvents="none" style={[styles.credit, { top: pad.top - 18 }]}>© Esri © OpenStreetMap</T>
      </View>
    </GestureDetector>
  );
}

const xy = ([x, y]: [number, number]) => ({ x, y });
const lower48 = (lat: number, lon: number) => lat > 24 && lat < 50 && lon > -125.5 && lon < -66;
const inLower48 = (h3: string) => {
  const b = boundary(h3);
  return b.length > 0 && lower48(b[0][0], b[0][1]);
};

function FanDot({ x, y, r, confirmed, pulse, reduced }: { x: number; y: number; r: number; confirmed: boolean; pulse: number; reduced: boolean }) {
  const ring = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    ring.value = 0;
    ring.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) });
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 3 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 2, borderColor: C.purpleHi }, style]} />
      <View pointerEvents="none" style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: confirmed ? C.purple : C.purpleHi, borderWidth: 1.5, borderColor: '#fff' }} />
    </>
  );
}

const styles = StyleSheet.create({
  // Apple Maps style: text on the map with a soft halo, no plate behind it.
  label: { flexDirection: 'row', alignItems: 'center', height: 20 },
  labelText: { fontFamily: F.head, fontWeight: '600', fontSize: 13, lineHeight: 16, color: C.text, letterSpacing: -0.1, textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 0 } },
  credit: { position: 'absolute', right: 12, fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  badge: { fontFamily: F.monoBold, fontSize: 11, lineHeight: 14 },
});

'use dom';

/**
 * The Crowd Map (FR-4, FR-5, FR-21; PRD 8.3): OpenFreeMap tiles under deck.gl H3 hexes.
 * Country level: halftone dots, one per hex, sized and coloured by Wanted Score; sleeper cities get a
 * gold ring and a tin star. City level: flat street-level hexes, Qloo's ranked
 * neighborhoods (ranks, not percentages) with a pulsing ring on #1, and room pins.
 * Fan signatures sit on top as white dots with a purple ring.
 *
 * Runs as an Expo DOM component, so the same code renders on the web and inside a WebView
 * on iOS and Android.
 */
import { MapboxOverlay } from '@deck.gl/mapbox';
import { cellToLatLng, getHexagonEdgeLengthAvg, getResolution, UNITS } from 'h3-js';
import { IconLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { MX_SVG } from '../icons/mx.native.generated';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';

export type { CrowdMapProps, MapCity, MapDot, MapMetro, MapRoute } from './types';
import { BASEMAPS, basemapTile, type CrowdMapProps, type MapCity, type MapDot, type MapMetro } from './types';

/** MX Icons star (bold), tinted gold, as the sleeper marker. */
const STAR_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MX_SVG.star.bold.replace(/currentColor/g, '#F5C542').replace('<svg ', '<svg width="64" height="64" ').replace(/width="24" height="24" /, ''))}`;

const US = { center: [-96.5, 38.3] as [number, number], zoom: 3.25, pitch: 42, bearing: -8 };
/** Contiguous US, west/south/east/north. */
const US_BOUNDS: [number, number, number, number] = [-124.6, 25.0, -67.0, 49.2];
/** On phones, trim the empty ocean margins so the country is as large as it can be. */
const US_BOUNDS_TIGHT: [number, number, number, number] = [-123.2, 26.0, -68.2, 48.6];

/** The halftone ember scale (see emberRgb in theme.ts), repeated here because this file runs in the DOM bundle. */
const EMBER: [number, [number, number, number]][] = [
  [0, [0x3b, 0x24, 0x2c]],
  [0.35, [0xb4, 0x4a, 0x2a]],
  [0.65, [0xff, 0x9f, 0x1c]],
  [0.88, [0xff, 0xd2, 0x6a]],
  [1, [0xff, 0xf1, 0xd0]],
];
function ramp(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const i = Math.max(0, EMBER.findIndex(([at]) => at >= x) - 1);
  const [a, p] = EMBER[i];
  const [b, q] = EMBER[Math.min(EMBER.length - 1, i + 1)];
  const k = b === a ? 0 : (x - a) / (b - a);
  return [0, 1, 2].map((j) => Math.round(p[j] + (q[j] - p[j]) * k)) as [number, number, number];
}

type Dot = { pos: [number, number]; v: number; r: number; strong: boolean };
/** Halftone: one dot per hex at its centre, its radius (metres) the value's share of the cell. */
function halftone<T extends { h3: string }>(hexes: T[], value: (h: T) => number, strong: (h: T) => boolean, fill = 1): Dot[] {
  if (!hexes.length) return [];
  const inner = getHexagonEdgeLengthAvg(getResolution(hexes[0].h3), UNITS.m) * 0.866;
  return hexes.map((h) => {
    const [lat, lon] = cellToLatLng(h.h3);
    const v = value(h);
    return { pos: [lon, lat], v, r: inner * fill * (0.26 + 0.74 * Math.sqrt(Math.max(0, v))), strong: strong(h) };
  });
}

export default function CrowdMap(props: CrowdMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [t, setT] = useState(0);
  const pulseAt = useRef(0);
  const moving = useRef(false);
  const [zoom, setZoom] = useState(US.zoom);
  // City layers wait for the camera to be most of the way in, then grow in, so nothing pops.
  const [cityLive, setCityLive] = useState(false);
  const [box, setBox] = useState('');

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: US.center,
      zoom: US.zoom,
      pitch: US.pitch,
      bearing: US.bearing,
      maxPitch: 70,
      // Phones render at 3x; 2x looks the same on a dark map and costs less than half the pixels.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      canvasContextAttributes: { antialias: false },
      attributionControl: { compact: true },
      dragRotate: true,
    });
    map.current = m;
    const o = new MapboxOverlay({ interleaved: false, layers: [], useDevicePixels: Math.min(window.devicePixelRatio || 1, 2) });
    m.addControl(o as unknown as maplibregl.IControl);
    overlay.current = o;
    m.on('load', () => {
      // Quieter base map: dim labels so the heat carries the story.
      for (const layer of m.getStyle().layers ?? []) {
        if (layer.type === 'symbol') {
          try {
            m.setPaintProperty(layer.id, 'text-opacity', 0.55);
          } catch {}
        }
      }
      setReady(true);
    });
    // Labels only care about quarter-zoom steps, so don't re-render on every frame of a zoom.
    m.on('zoom', () => setZoom((prev) => (Math.round(prev * 4) === Math.round(m.getZoom() * 4) ? prev : m.getZoom())));
    // Hold the pulse clock while the camera moves so the frame budget goes to the map itself.
    m.on('movestart', () => (moving.current = true));
    m.on('moveend', () => (moving.current = false));
    // Re-frame once the window settles at a new size, so the country never ends up off to one side.
    let settle: ReturnType<typeof setTimeout>;
    m.on('resize', () => {
      clearTimeout(settle);
      settle = setTimeout(() => setBox(`${m.getContainer().clientWidth}x${m.getContainer().clientHeight}`), 250);
    });
    return () => {
      o.finalize();
      m.remove();
    };
  }, []);

  // Base map: OpenFreeMap's dark vectors, or an Esri raster for satellite, terrain and streets.
  const basemap = props.basemap ?? 'dark';
  const firstStyle = useRef(true);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (firstStyle.current) {
      firstStyle.current = false;
      if (basemap === 'dark') return;
    }
    const b = BASEMAPS.find((x) => x.key === basemap) ?? BASEMAPS[0];
    m.setStyle(
      basemap === 'dark'
        ? 'https://tiles.openfreemap.org/styles/dark'
        : { version: 8, sources: { base: { type: 'raster', tiles: [basemapTile(b.layer)], tileSize: 256, maxzoom: b.maxZoom, attribution: '© Esri' } }, layers: [{ id: 'base', type: 'raster', source: 'base' }] },
    );
  }, [basemap]);

  // Camera: dive into the city, or back out to the country, centered in the visible area.
  const pad = props.padding;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const dur = props.reduceMotion ? 0 : props.city ? 1700 : 1400;
    // Ease in and out like a system map, and fly nearly straight (curve ~1) instead of pulling way out first.
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const padding = pad;
    const narrow = m.getContainer().clientWidth < 600;
    if (props.city) {
      m.flyTo({ center: [props.city.lon, props.city.lat], zoom: narrow ? 10.2 : 10.6, pitch: narrow ? 40 : 50, bearing: -12, duration: dur, essential: true, padding, curve: 1.05, easing: ease });
      return;
    }
    // Fit the lower 48 into whatever the panels leave visible, then tilt a little for depth.
    const cam = m.cameraForBounds(narrow ? US_BOUNDS_TIGHT : US_BOUNDS, { padding: narrow ? { ...padding, left: 4, right: 4 } : padding, bearing: 0, pitch: 0 });
    const zoom = cam?.zoom ?? US.zoom;
    m.flyTo({ center: cam?.center ?? US.center, zoom: zoom + (narrow ? 0.15 : 0), pitch: narrow ? 28 : US.pitch, bearing: narrow ? -4 : US.bearing, duration: dur, essential: true, padding: { top: 0, left: 0, right: 0, bottom: 0 }, curve: 1.05, easing: ease });
  }, [props.city?.id, props.reduceMotion, pad.left, pad.bottom, pad.top, pad.right, box]);

  useEffect(() => {
    if (!props.city) return setCityLive(false);
    setCityLive(false);
    const id = setTimeout(() => setCityLive(true), props.reduceMotion ? 0 : 750);
    return () => clearTimeout(id);
  }, [props.city?.id, props.reduceMotion]);

  // A slow clock for the pulsing ring and dot ripples.
  useEffect(() => {
    if (props.reduceMotion) return;
    let raf = 0;
    let last = 0;
    // ~15 fps is plenty for a ring pulse, and it stands still while the camera is moving.
    const tick = (now: number) => {
      if (now - last > 66 && !moving.current) {
        last = now;
        setT(now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [props.reduceMotion]);

  useEffect(() => {
    pulseAt.current = performance.now();
  }, [props.pulse]);

  const opened = useMemo(() => new Set(props.opened), [props.opened]);
  const scored = useMemo(() => props.metros.filter((m) => m.score !== null), [props.metros]);
  // Dot positions are worked out once per data change, not on every animation frame.
  const countryDots = useMemo(() => halftone(props.hexes, (d) => (d.score !== null ? d.score / 100 : d.heat * 0.55), (d) => d.score !== null, 0.96), [props.hexes]);
  const cityDots = useMemo(() => (props.city ? halftone(props.city.hexes, (d) => 0.15 + d.heat * 0.85, (d) => d.heat > 0.15) : []), [props.city]);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 600);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const labelled = useMemo(() => {
    // Phones get the top few and any city with a poster up; sleepers keep their stars.
    const top = [...scored].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, narrow ? (zoom > 5 ? 14 : 8) : 12);
    const extra = props.metros.filter((m) => (narrow ? opened.has(m.id) : m.sleeper || opened.has(m.id)));
    const seen = new Set<string>();
    const all = [...extra, ...top].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    // Greedy declutter in screen space: keep a label only if it doesn't collide with one already kept.
    const m = map.current;
    if (!m) return all.map((d) => ({ ...d, anchor: 'middle' as const }));
    const kept: { x: number; y: number; w: number }[] = [];
    const W = m.getContainer().clientWidth;
    const out: (MapMetro & { anchor: 'start' | 'middle' | 'end' })[] = [];
    for (const d of all) {
      const p = m.project([d.lon, d.lat]);
      const w = (d.name.length + 3) * 7;
      // Labels near the screen edge grow inward instead of running off it.
      const anchor = p.x < w / 2 + 8 ? 'start' : p.x > W - w / 2 - 8 ? 'end' : 'middle';
      const cx = anchor === 'start' ? p.x + w / 2 : anchor === 'end' ? p.x - w / 2 : p.x;
      if (kept.some((k) => Math.abs(k.x - cx) < (k.w + w) / 2 + 4 && Math.abs(k.y - p.y) < 18)) continue;
      kept.push({ x: cx, y: p.y, w });
      out.push({ ...d, anchor });
    }
    return out;
  }, [scored, props.metros, opened, narrow, Math.round(zoom * 4), ready]);

  useEffect(() => {
    if (!ready || !overlay.current) return;
    const phase = (t % 1800) / 1800;
    const ripple = Math.max(0, 1 - (t - pulseAt.current) / 1600);
    const layers: unknown[] = [];
    const city = props.city;

    if (!props.dark && !city) {
      layers.push(
        new ScatterplotLayer({
          id: 'country-hex',
          data: countryDots,
          getPosition: (d: Dot) => d.pos,
          getRadius: (d: Dot) => d.r,
          radiusUnits: 'meters',
          getFillColor: (d: Dot) => [...ramp(d.v), d.strong ? 255 : 128] as [number, number, number, number],
          pickable: false,
          transitions: props.reduceMotion ? undefined : { getRadius: { duration: 1100, enter: () => [0] } },
        }),
      );
      // Sleeper cities: gold ring plus a tin star.
      const sleepers = props.metros.filter((m) => m.sleeper);
      layers.push(
        new ScatterplotLayer({
          id: 'sleeper-ring',
          data: sleepers,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getRadius: 26000 + phase * 9000,
          radiusUnits: 'meters',
          stroked: true,
          filled: false,
          getLineColor: [245, 197, 66, Math.round(255 * (1 - phase * 0.6))],
          lineWidthMinPixels: 2.5,
          updateTriggers: { getRadius: phase, getLineColor: phase },
        }),
        new IconLayer({
          id: 'sleeper-star',
          data: sleepers,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getIcon: () => ({ url: STAR_URL, id: 'star', width: 64, height: 64, mask: false }),
          getSize: narrow ? 18 : 22,
          sizeUnits: 'pixels',
          getPixelOffset: [0, narrow ? -16 : -22],
        }),
      );
      // Pickable metro markers (invisible hit area plus a small dot for opened cities).
      layers.push(
        new ScatterplotLayer({
          id: 'metros',
          data: scored,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getRadius: (d: MapMetro) => (opened.has(d.id) ? 7 : 5),
          radiusUnits: 'pixels',
          getFillColor: (d: MapMetro) => (opened.has(d.id) ? [155, 48, 224, 255] : [255, 255, 255, zoom > 4.2 ? 120 : 0]),
          stroked: true,
          getLineColor: (d: MapMetro) => (opened.has(d.id) ? [255, 255, 255, 255] : [0, 0, 0, 0]),
          lineWidthMinPixels: 1.5,
          pickable: true,
          updateTriggers: { getFillColor: [zoom, props.opened.join()], getRadius: props.opened.join() },
        }),
        new TextLayer({
          id: 'metro-labels',
          data: labelled,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getText: (d: MapMetro) => (d.rank && d.rank <= 20 ? `${d.rank} ${d.name}` : d.name),
          getSize: narrow ? 12 : 12.5,
          getColor: (d: MapMetro) => (d.sleeper ? [245, 197, 66, 255] : opened.has(d.id) ? [212, 160, 255, 255] : [255, 255, 255, 220]),
          getPixelOffset: [0, 16],
          getTextAnchor: (d: { anchor: 'start' | 'middle' | 'end' }) => d.anchor,
          fontFamily: '"Archivo-SemiBold", system-ui, sans-serif',
          fontWeight: 600,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 230],
          fontSettings: { sdf: true },
          pickable: true,
        }),
      );
      if (props.route?.length) {
        layers.push(
          new PathLayer({
            id: 'route',
            data: [{ path: props.route.map((s) => [s.lon, s.lat]) }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: [180, 92, 240, 220],
            getWidth: 3,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
          }),
        );
      }
    }

    if (!props.dark && city && cityLive) {
      const grow = props.reduceMotion ? undefined : { getRadius: { duration: 650, enter: () => [0] } };
      layers.push(
        new ScatterplotLayer({
          id: 'city-hex',
          transitions: grow,
          data: cityDots,
          getPosition: (d: Dot) => d.pos,
          getRadius: (d: Dot) => d.r,
          radiusUnits: 'meters',
          getFillColor: (d: Dot) => [...ramp(d.v), d.strong ? 150 : 70] as [number, number, number, number],
        }),
      );
      if (city.outline?.length) {
        layers.push(
          new PathLayer({
            id: 'city-outline',
            data: [{ path: city.outline }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: [255, 255, 255, 70],
            getWidth: 1.5,
            widthUnits: 'pixels',
          }),
        );
      }
      const hoods = city.neighborhoods.filter((n) => n.lat !== null && n.lon !== null);
      const top = hoods.filter((n) => n.rank <= 3);
      const best = hoods.find((n) => n.rank === 1);
      if (best) {
        layers.push(
          new ScatterplotLayer({
            id: 'hood-pulse',
            data: [best],
            getPosition: (d: MapCity['neighborhoods'][number]) => [d.lon!, d.lat!],
            getRadius: 500 + phase * 900,
            radiusUnits: 'meters',
            filled: false,
            stroked: true,
            getLineColor: [255, 77, 46, Math.round(255 * (1 - phase))],
            lineWidthMinPixels: 3,
            updateTriggers: { getRadius: phase, getLineColor: phase },
          }),
        );
      }
      layers.push(
        new ScatterplotLayer({
          id: 'hoods',
          transitions: grow,
          data: hoods,
          getPosition: (d: MapCity['neighborhoods'][number]) => [d.lon!, d.lat!],
          getRadius: (d: MapCity['neighborhoods'][number]) => (d.rank <= 3 ? 8 : 3.5),
          radiusUnits: 'pixels',
          getFillColor: (d: MapCity['neighborhoods'][number]) => (d.rank <= 3 ? [255, 176, 0, 255] : [255, 255, 255, 120]),
          stroked: true,
          getLineColor: (d: MapCity['neighborhoods'][number]) => (d.rank <= 3 ? [26, 18, 11, 255] : [0, 0, 0, 0]),
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new TextLayer({
          id: 'hood-labels',
          data: zoom > 11.6 ? hoods.slice(0, 8) : top,
          getPosition: (d: MapCity['neighborhoods'][number]) => [d.lon!, d.lat!],
          getText: (d: MapCity['neighborhoods'][number]) => `${d.rank}  ${d.name}`,
          getSize: (d: MapCity['neighborhoods'][number]) => (d.rank <= 3 ? 14 : 11),
          getColor: (d: MapCity['neighborhoods'][number]) => (d.rank <= 3 ? [255, 214, 140, 255] : [255, 255, 255, 190]),
          getPixelOffset: [0, -16],
          fontFamily: '"Archivo-SemiBold", system-ui, sans-serif',
          fontWeight: 600,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 235],
          fontSettings: { sdf: true },
          updateTriggers: { getText: zoom > 11.6 },
        }),
      );
      const rooms = city.rooms.filter((r) => r.lat !== null && r.lon !== null);
      layers.push(
        new ScatterplotLayer({
          id: 'rooms',
          transitions: grow,
          data: rooms,
          getPosition: (d: MapCity['rooms'][number]) => [d.lon!, d.lat!],
          getRadius: 9,
          radiusUnits: 'pixels',
          getFillColor: [31, 138, 255, 255],
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new TextLayer({
          id: 'room-labels',
          data: zoom > 11.4 ? rooms : [],
          getPosition: (d: MapCity['rooms'][number]) => [d.lon!, d.lat!],
          getText: (d: MapCity['rooms'][number]) => d.name,
          getSize: 11.5,
          getColor: [190, 222, 255, 255],
          getPixelOffset: [0, 18],
          fontFamily: '"Archivo-Medium", system-ui, sans-serif',
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 235],
          fontSettings: { sdf: true },
          pickable: true,
        }),
      );
    }

    // Fan signatures: aggregate dots per neighborhood, white with a purple ring (never individual fans).
    const dots = city ? props.dots.filter((d) => d.city === city.id) : props.dots;
    if (dots.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'claim-ripple',
          data: ripple > 0 ? dots : [],
          getPosition: (d: MapDot) => [d.lon, d.lat],
          getRadius: (d: MapDot) => (city ? 6 + Math.sqrt(d.count) * 3 : 5) + (1 - ripple) * 26,
          radiusUnits: 'pixels',
          filled: false,
          stroked: true,
          getLineColor: [180, 92, 240, Math.round(255 * ripple)],
          lineWidthMinPixels: 2,
          updateTriggers: { getRadius: ripple, getLineColor: ripple },
        }),
        new ScatterplotLayer({
          id: 'claims',
          data: dots,
          getPosition: (d: MapDot) => [d.lon, d.lat],
          getRadius: (d: MapDot) => (city ? 4 + Math.sqrt(d.count) * 2.4 : 3 + Math.min(4, Math.sqrt(d.count))),
          radiusUnits: 'pixels',
          getFillColor: [255, 255, 255, 255],
          stroked: true,
          getLineColor: (d: MapDot) => (d.confirmed ? [155, 48, 224, 255] : [155, 48, 224, 170]),
          getLineWidth: (d: MapDot) => (d.confirmed ? 3 : 1.5),
          lineWidthUnits: 'pixels',
        }),
      );
    }

    overlay.current.setProps({
      layers: layers as never,
      onClick: (info: { layer?: { id: string } | null; object?: unknown }) => {
        if (!info.object || !info.layer) return;
        const id = info.layer.id;
        const o = info.object as Record<string, unknown>;
        if (id === 'metros' || id === 'metro-labels') props.onPick({ kind: 'metro', id: String(o.id) });
        else if (id === 'rooms' || id === 'room-labels') props.onPick({ kind: 'room', id: String(o.id) });
        else if (id === 'hoods') props.onPick({ kind: 'neighborhood', id: String(o.name) });
      },
      getCursor: ({ isHovering }: { isHovering: boolean }) => (isHovering ? 'pointer' : 'grab'),
    } as never);
  }, [ready, countryDots, cityDots, props.hexes, props.metros, props.dots, props.city, props.route, props.dark, t, zoom, labelled, scored, opened, narrow, cityLive]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <div ref={el} style={{ position: 'absolute', inset: 0, opacity: props.dark ? 0.35 : 1, transition: 'opacity 900ms ease', filter: props.dark ? 'grayscale(1) brightness(0.55)' : 'none' }} />
      <style>{`.maplibregl-ctrl-attrib{background:rgba(0,0,0,.55)!important;color:rgba(255,255,255,.55)!important;font:11px system-ui}.maplibregl-ctrl-attrib a{color:rgba(255,255,255,.7)!important}.maplibregl-ctrl-attrib-button{filter:invert(1)}`}</style>
    </div>
  );
}

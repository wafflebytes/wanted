'use client';
/**
 * The Crowd Map on paper. OpenFreeMap's positron vectors, repainted to Wanted's cream paper
 * (or a warm night), under deck.gl: a halftone of where your crowd lives, sized and coloured by
 * Wanted Score; sleeper cities get a gold ring and star; fan signatures sit on top as white
 * dots with an orange ring. In a city: street-level heat, ranked neighbourhoods, room pins.
 * Ported from src/ui/map/CrowdMap.dom.tsx (the Expo app keeps that one).
 */
import { MapboxOverlay } from '@deck.gl/mapbox';
import { IconLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';

/**
 * Labels are real DOM pinned to the map (maplibre markers), not deck text: the browser draws them
 * in the display face, crisp at any zoom, and they're tappable. Diffed by key every frame.
 */
type Pick = { kind: 'metro' | 'room' | 'neighborhood'; id: string };
type Label = { key: string; lon: number; lat: number; text: string; cls: string; num?: number; pick?: Pick };
type Mark = { m: maplibregl.Marker; el: HTMLElement; sig: string };

/** Drop labels that would sit on top of one already placed (list order is priority). Metros are pre-placed. */
function declutter(map: maplibregl.Map | null, list: Label[]) {
  if (!map) return list;
  const kept: { x: number; y: number; w: number }[] = [];
  // Named route ends place first so numbered stops yield to them.
  const order = [...list].sort((a, b) => Number(b.cls.includes('named')) - Number(a.cls.includes('named')));
  const ok = new Set(order.filter((l) => {
    if (l.key.startsWith('m')) return true;
    const p = map.project([l.lon, l.lat]);
    const w = l.text.length * 7.6 + (l.num !== undefined ? 24 : 0) + 8;
    if (kept.some((k) => Math.abs(k.x - p.x) < (k.w + w) / 2 + 4 && Math.abs(k.y - p.y) < 26)) return false;
    kept.push({ x: p.x, y: p.y, w });
    return true;
  }));
  return list.filter((l) => ok.has(l));
}

function syncLabels(map: maplibregl.Map | null, marks: Map<string, Mark>, list: Label[], onPick: (p: Pick) => void) {
  if (!map) return;
  const keep = new Set<string>();
  for (const l of list) {
    keep.add(l.key);
    const sig = `${l.text}|${l.cls}|${l.num ?? ''}`;
    let mk = marks.get(l.key);
    if (!mk) {
      const el = document.createElement(l.pick ? 'button' : 'span');
      const m = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' }).setLngLat([l.lon, l.lat]).addTo(map);
      mk = { m, el, sig: '' };
      marks.set(l.key, mk);
    }
    if (mk.sig !== sig) {
      mk.el.className = `ml ${l.cls}`;
      mk.el.innerHTML = '';
      if (l.num !== undefined) {
        const n = document.createElement('i');
        n.textContent = String(l.num);
        mk.el.appendChild(n);
      }
      mk.el.appendChild(document.createTextNode(l.text));
      mk.el.onclick = l.pick ? (e) => (e.stopPropagation(), onPick(l.pick!)) : null;
      mk.sig = sig;
    }
    mk.m.setLngLat([l.lon, l.lat]);
  }
  for (const [k, mk] of marks) if (!keep.has(k)) (mk.m.remove(), marks.delete(k));
}
import { cellToLatLng, getHexagonEdgeLengthAvg, getResolution, UNITS } from 'h3-js';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapCity, MapDot, MapMetro, MapRoute } from '@/ui/map/types';

export type { MapCity, MapDot, MapMetro, MapRoute };

export type CrowdMapProps = {
  hexes: { h3: string; heat: number; score: number | null }[];
  metros: MapMetro[];
  opened: string[];
  /** Cities with a date held: their pin turns into the green check. */
  held?: string[];
  dots: MapDot[];
  city: MapCity | null;
  route: MapRoute | null;
  dark: boolean;
  /** Hidden behind another tab: stop the clock, keep the map. */
  active: boolean;
  reduceMotion: boolean;
  pulse: number;
  padding: { top: number; left: number; bottom: number; right: number };
  onPick: (pick: { kind: 'metro' | 'room' | 'neighborhood'; id: string }) => void;
  /** Called once the map has painted its first frame. */
  onReady?: () => void;
};

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const US = { center: [-96.5, 38.3] as [number, number], zoom: 3.25, pitch: 42, bearing: -8 };
const US_BOUNDS: [number, number, number, number] = [-124.6, 25.0, -67.0, 49.2];
const US_BOUNDS_TIGHT: [number, number, number, number] = [-123.2, 26.0, -68.2, 48.6];

type RGB = [number, number, number];
/** Light: warm paper to a hot orange-red. Dark: the original ember. */
const RAMP_LIGHT: [number, RGB][] = [
  [0, [0xe9, 0xd6, 0xc0]],
  [0.35, [0xf5, 0xa8, 0x72]],
  [0.65, [0xff, 0x6e, 0x2c]],
  [0.88, [0xe4, 0x42, 0x0e]],
  [1, [0xa8, 0x24, 0x04]],
];
const RAMP_DARK: [number, RGB][] = [
  [0, [0x33, 0x25, 0x1f]],
  [0.35, [0x8f, 0x3c, 0x22]],
  [0.65, [0xe8, 0x66, 0x2a]],
  [0.88, [0xff, 0x9a, 0x45]],
  [1, [0xff, 0xbf, 0x73]],
];
function ramp(stops: [number, RGB][], t: number): RGB {
  const x = Math.max(0, Math.min(1, t));
  const i = Math.max(0, stops.findIndex(([at]) => at >= x) - 1);
  const [a, p] = stops[i];
  const [b, q] = stops[Math.min(stops.length - 1, i + 1)];
  const k = b === a ? 0 : (x - a) / (b - a);
  return [0, 1, 2].map((j) => Math.round(p[j] + (q[j] - p[j]) * k)) as RGB;
}

/** Positron, repainted. Matched on layer ids so a style update can't break the look. */
const PAPER = {
  light: { bg: '#EEE9DE', park: '#E3E6D3', water: '#CFDCE0', waterway: '#BFD0D6', resi: '#EAE4D8', wood: '#E0E2D0', bldg: '#E4DDCF', road: '#FBF8F2', casing: '#E0D8C8', boundary: '#BDB4A3', text: '#8A8478', halo: '#F6F4EF', city: '#5E5950' },
  dark: { bg: '#191814', park: '#1D211A', water: '#10171B', waterway: '#142027', resi: '#1C1B17', wood: '#1C1F18', bldg: '#23211C', road: '#2A2823', casing: '#211F1A', boundary: '#3E3A31', text: '#6E6A61', halo: '#12110E', city: '#9C968A' },
};
function paint(m: maplibregl.Map, dark: boolean) {
  const p = dark ? PAPER.dark : PAPER.light;
  const set = (id: string, prop: string, v: unknown) => {
    try {
      m.setPaintProperty(id, prop, v);
    } catch {}
  };
  // A map that was just removed (or not loaded yet) has no style: nothing to paint.
  let layers: maplibregl.LayerSpecification[] = [];
  try {
    layers = m.getStyle()?.layers ?? [];
  } catch {}
  for (const l of layers) {
    const id = l.id;
    if (l.type === 'background') set(id, 'background-color', p.bg);
    else if (id === 'water') set(id, 'fill-color', p.water);
    else if (id === 'park') set(id, 'fill-color', p.park);
    else if (id.startsWith('landuse')) set(id, 'fill-color', p.resi);
    else if (id.startsWith('landcover')) set(id, 'fill-color', p.wood);
    else if (id === 'building') (set(id, 'fill-color', p.bldg), set(id, 'fill-outline-color', p.casing));
    else if (id === 'waterway') set(id, 'line-color', p.waterway);
    else if (id.startsWith('boundary')) set(id, 'line-color', p.boundary);
    else if (l.type === 'line' && /casing/.test(id)) set(id, 'line-color', p.casing);
    else if (l.type === 'line' && /(highway|road|railway|aeroway|tunnel)/.test(id)) set(id, 'line-color', p.road);
    else if (l.type === 'fill' && /(road|aeroway)/.test(id)) set(id, 'fill-color', p.road);
    else if (l.type === 'symbol') {
      set(id, 'text-color', /label_(city|town|state|country)/.test(id) ? p.city : p.text);
      set(id, 'text-halo-color', p.halo);
      set(id, 'text-opacity', /label_(village|other)|highway-name/.test(id) ? 0.6 : 0.75);
    }
  }
}

type Dot = { pos: [number, number]; v: number; r: number; strong: boolean };
function halftone<T extends { h3: string }>(hexes: T[], value: (h: T) => number, strong: (h: T) => boolean, fill = 1): Dot[] {
  if (!hexes.length) return [];
  const inner = getHexagonEdgeLengthAvg(getResolution(hexes[0].h3), UNITS.m) * 0.866;
  return hexes.map((h) => {
    const [lat, lon] = cellToLatLng(h.h3);
    const v = value(h);
    return { pos: [lon, lat], v, r: inner * fill * (0.26 + 0.74 * Math.sqrt(Math.max(0, v))), strong: strong(h) };
  });
}

/** The rendered pushpins (web/public/art, 256 px, point at the bottom centre). */
const PIN = (name: 'pin-city' | 'pin-sleeper' | 'pin-booked') => ({ url: `/art/${name}.webp`, id: name, width: 256, height: 256, anchorY: 250, mask: false });

const ORANGE: RGB = [255, 90, 31];

/** A soft disc in the map's own ground colour, laid under each pin so it lifts off the heat. */
const halo = (dark: boolean) => {
  const c = dark ? '18,17,14' : '246,244,239';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><defs><radialGradient id='g'><stop offset='0' stop-color='rgb(${c})' stop-opacity='${dark ? 0.9 : 0.85}'/><stop offset='0.55' stop-color='rgb(${c})' stop-opacity='${dark ? 0.6 : 0.5}'/><stop offset='1' stop-color='rgb(${c})' stop-opacity='0'/></radialGradient></defs><circle cx='48' cy='48' r='48' fill='url(#g)'/></svg>`;
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, id: dark ? 'halo-dark' : 'halo-light', width: 96, height: 96, anchorY: 48, mask: false };
};

export default function CrowdMap(props: CrowdMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const marks = useRef(new Map<string, Mark>());
  const pickRef = useRef(props.onPick);
  pickRef.current = props.onPick;
  const [t, setT] = useState(0);
  const pulseAt = useRef(0);
  const moving = useRef(false);
  const [zoom, setZoom] = useState(US.zoom);
  const [cityLive, setCityLive] = useState(false);
  const [box, setBox] = useState('');
  const dark = props.dark;

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE,
      center: US.center,
      zoom: US.zoom,
      pitch: US.pitch,
      bearing: US.bearing,
      maxPitch: 70,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      attributionControl: { compact: true },
    });
    map.current = m;
    const o = new MapboxOverlay({ interleaved: false, layers: [], useDevicePixels: Math.min(window.devicePixelRatio || 1, 2) });
    m.addControl(o as unknown as maplibregl.IControl);
    overlay.current = o;
    m.on('styledata', () => paint(m, darkRef.current));
    m.on('load', () => {
      paint(m, darkRef.current);
      // Start the attribution folded; it opens on tap.
      m.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      setReady(true);
      // Show the map as soon as the base has drawn once; waiting for 'idle' meant every tile,
      // which on a cold load took ~10 s. Whichever comes first wins.
      let shown = false;
      const show = () => !shown && ((shown = true), props.onReady?.());
      m.once('idle', show);
      setTimeout(show, 600);
    });
    m.on('zoom', () => setZoom((prev) => (Math.round(prev * 4) === Math.round(m.getZoom() * 4) ? prev : m.getZoom())));
    m.on('movestart', () => (moving.current = true));
    m.on('moveend', () => (moving.current = false));
    let settle: ReturnType<typeof setTimeout>;
    m.on('resize', () => {
      clearTimeout(settle);
      settle = setTimeout(() => setBox(`${m.getContainer().clientWidth}x${m.getContainer().clientHeight}`), 250);
    });
    return () => {
      setReady(false);
      o.finalize();
      m.remove();
    };
  }, []);

  const darkRef = useRef(dark);
  useEffect(() => {
    darkRef.current = dark;
    if (map.current && ready) paint(map.current, dark);
  }, [dark, ready]);

  // Camera: dive into the city, fit a route, or back out to the country, centred in what's visible.
  const pad = props.padding;
  const routeKey = props.route?.map((s) => s.city).join('|') ?? '';
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const dur = props.reduceMotion ? 0 : props.city ? 1700 : 1300;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const narrow = m.getContainer().clientWidth < 600;
    if (props.city) {
      m.flyTo({ center: [props.city.lon, props.city.lat], zoom: narrow ? 10.4 : 10.8, pitch: narrow ? 42 : 50, bearing: -12, duration: dur, essential: true, padding: pad, curve: 1.05, easing: ease });
      return;
    }
    if (props.route?.length) {
      const lons = props.route.map((s) => s.lon);
      const lats = props.route.map((s) => s.lat);
      const cam = m.cameraForBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], { padding: { top: pad.top + 40, bottom: pad.bottom + 30, left: 40, right: 40 }, bearing: 0, pitch: 0 });
      m.flyTo({ center: cam?.center ?? US.center, zoom: Math.min(7, (cam?.zoom ?? US.zoom) - 0.1), pitch: 30, bearing: -6, duration: dur, essential: true, curve: 1.05, easing: ease });
      return;
    }
    const cam = m.cameraForBounds(narrow ? US_BOUNDS_TIGHT : US_BOUNDS, { padding: narrow ? { ...pad, left: 4, right: 4 } : pad, bearing: 0, pitch: 0 });
    m.flyTo({ center: cam?.center ?? US.center, zoom: cam?.zoom ?? US.zoom, pitch: narrow ? 28 : US.pitch, bearing: narrow ? -4 : US.bearing, duration: dur, essential: true, padding: { top: 0, left: 0, right: 0, bottom: 0 }, curve: 1.05, easing: ease });
  }, [props.city?.id, routeKey, props.reduceMotion, pad.left, pad.bottom, pad.top, pad.right, box, ready]);

  useEffect(() => {
    if (!props.city) return setCityLive(false);
    setCityLive(false);
    const id = setTimeout(() => setCityLive(true), props.reduceMotion ? 0 : 750);
    return () => clearTimeout(id);
  }, [props.city?.id, props.reduceMotion]);

  // A slow clock for the rings, held still while hidden or while the camera moves.
  useEffect(() => {
    if (props.reduceMotion || !props.active) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 66 && !moving.current) {
        last = now;
        setT(now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [props.reduceMotion, props.active]);

  useEffect(() => {
    pulseAt.current = performance.now();
  }, [props.pulse]);

  // Route drawing: the line draws itself in when a route arrives (Waymo's "almost there").
  const [routeT, setRouteT] = useState(1);
  useEffect(() => {
    if (!routeKey) return;
    if (props.reduceMotion) return setRouteT(1);
    let raf = 0;
    const start = performance.now() + 500;
    const step = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / 1400));
      setRouteT(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    setRouteT(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [routeKey, props.reduceMotion]);

  const opened = useMemo(() => new Set(props.opened), [props.opened]);
  const scored = useMemo(() => props.metros.filter((m) => m.score !== null), [props.metros]);
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
    const top = [...scored].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, narrow ? (zoom > 5 ? 14 : 7) : 12);
    const extra = props.metros.filter((m) => (narrow ? opened.has(m.id) : m.sleeper || opened.has(m.id)));
    const seen = new Set<string>();
    const all = [...extra, ...top].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    const m = map.current;
    if (!m) return all.map((d) => ({ ...d, anchor: 'middle' as const }));
    const kept: { x: number; y: number; w: number }[] = [];
    const W = m.getContainer().clientWidth;
    const out: (MapMetro & { anchor: 'start' | 'middle' | 'end' })[] = [];
    for (const d of all) {
      const p = m.project([d.lon, d.lat]);
      const w = (d.name.length + 3) * 7;
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
    const R = dark ? RAMP_DARK : RAMP_LIGHT;
    const ink: RGB = dark ? [243, 239, 230] : [21, 19, 15];
    const phase = (t % 1800) / 1800;
    const ripple = Math.max(0, 1 - (t - pulseAt.current) / 1600);
    const layers: unknown[] = [];
    const labels: Label[] = [];
    const city = props.city;
    
    if (!city) {
      layers.push(
        new ScatterplotLayer({
          id: 'country-hex',
          data: countryDots,
          getPosition: (d: Dot) => d.pos,
          getRadius: (d: Dot) => d.r,
          radiusUnits: 'meters',
          // Opacity follows heat, so neighbouring cells blend instead of patching.
          getFillColor: (d: Dot) => [...ramp(R, d.v), Math.round((d.strong ? 1 : 0.55) * (90 + 165 * Math.sqrt(Math.max(0, Math.min(1, d.v)))))] as [number, number, number, number],
          updateTriggers: { getFillColor: dark },
          transitions: props.reduceMotion ? undefined : { getRadius: { duration: 1100, enter: () => [0] } },
        }),
      );
      // Only the strongest few sleepers get a star; a sky full of them means nothing.
      const sleepers = props.route?.length ? [] : props.metros.filter((m) => m.sleeper).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4);
      layers.push(
        new ScatterplotLayer({
          id: 'sleeper-ring',
          data: sleepers,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getRadius: 26000 + phase * 9000,
          radiusUnits: 'meters',
          stroked: true,
          filled: false,
          getLineColor: [226, 160, 6, Math.round(255 * (1 - phase * 0.7))],
          lineWidthMinPixels: 2.5,
          updateTriggers: { getRadius: phase, getLineColor: phase },
        }),
        new IconLayer({
          id: 'pin-halo',
          data: [...sleepers.filter((m) => !opened.has(m.id)), ...scored.filter((m) => opened.has(m.id))],
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getIcon: () => halo(dark),
          getSize: narrow ? 60 : 70,
          getPixelOffset: [0, narrow ? -15 : -18],
          sizeUnits: 'pixels',
          updateTriggers: { getIcon: dark, data: props.opened.join() },
        }),
        new IconLayer({
          id: 'sleeper-pin',
          data: sleepers.filter((m) => !opened.has(m.id)),
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getIcon: () => PIN('pin-sleeper'),
          getSize: narrow ? 30 : 36,
          sizeUnits: 'pixels',
          pickable: true,
        }),
        new ScatterplotLayer({
          id: 'metros',
          data: scored,
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getRadius: (d: MapMetro) => (opened.has(d.id) ? 7 : 6),
          radiusUnits: 'pixels',
          getFillColor: (d: MapMetro) => (opened.has(d.id) ? [...ORANGE, 255] : [...ink, zoom > 4.2 ? 90 : 0]) as [number, number, number, number],
          stroked: true,
          getLineColor: (d: MapMetro) => (opened.has(d.id) ? [255, 255, 255, 255] : [0, 0, 0, 0]),
          lineWidthMinPixels: 2,
          pickable: true,
          updateTriggers: { getFillColor: [zoom, props.opened.join(), dark], getRadius: props.opened.join() },
        }),
        // A pushpin in every city with a poster up; its point lands on the city's dot. A city
        // with a date held gets the green check instead.
        new IconLayer({
          id: 'opened-pins',
          data: scored.filter((m) => opened.has(m.id)),
          getPosition: (d: MapMetro) => [d.lon, d.lat],
          getIcon: (d: MapMetro) => PIN(props.held?.includes(d.id) ? 'pin-booked' : 'pin-city'),
          getSize: narrow ? 30 : 36,
          sizeUnits: 'pixels',
          pickable: true,
          updateTriggers: { data: props.opened.join(), getIcon: props.held?.join() },
        }),
      );
      if (!props.route?.length) {
      const twice = new Set(labelled.map((d) => d.name).filter((n, i, a) => a.indexOf(n) !== i));
      labels.push(...labelled.map((d) => ({ key: `m${d.id}`, lon: d.lon, lat: d.lat, text: twice.has(d.name) ? `${d.name}, ${d.state}` : d.name, cls: `ml-metro a-${d.anchor}${d.sleeper ? ' is-sleeper' : ''}${opened.has(d.id) ? ' is-open' : ''}`, pick: { kind: 'metro' as const, id: d.id } })));
      }
      if (props.route?.length) {
        const full = props.route.map((s) => [s.lon, s.lat] as [number, number]);
        const n = full.length - 1;
        const upto = routeT * n;
        const path = full.slice(0, Math.floor(upto) + 1);
        if (upto < n) {
          const i = Math.floor(upto);
          const k = upto - i;
          path.push([full[i][0] + (full[i + 1][0] - full[i][0]) * k, full[i][1] + (full[i + 1][1] - full[i][1]) * k]);
        }
        layers.push(
          new PathLayer({
            id: 'route-glow',
            data: [{ path }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: [...ORANGE, dark ? 70 : 55] as [number, number, number, number],
            getWidth: 26,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            updateTriggers: { getPath: routeT },
          }),
          new PathLayer({
            id: 'route-shadow',
            data: [{ path }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: dark ? [18, 17, 14, 255] : [255, 255, 255, 255],
            getWidth: 10,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            updateTriggers: { getPath: routeT },
          }),
          new PathLayer({
            id: 'route',
            data: [{ path }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: dark ? [243, 239, 230, 255] : [21, 19, 15, 255],
            getWidth: 5,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            updateTriggers: { getPath: routeT },
          }),
        );
        // Waymo-style stop pills: a number, plus the name at the ends of the run.
        props.route.forEach((st, i) => i <= upto + 0.01 && labels.push({ key: `r${i}`, lon: st.lon, lat: st.lat, num: i + 1, text: i === 0 || i === n ? st.city : '', cls: `ml-stop${i === 0 || i === n ? ' named' : ''}` }));
      }
    }

    if (city && cityLive) {
      const grow = props.reduceMotion ? undefined : { getRadius: { duration: 650, enter: () => [0] } };
      layers.push(
        new ScatterplotLayer({
          id: 'city-hex',
          transitions: grow,
          data: cityDots,
          getPosition: (d: Dot) => d.pos,
          getRadius: (d: Dot) => d.r,
          radiusUnits: 'meters',
          getFillColor: (d: Dot) => [...ramp(R, d.v), d.strong ? 170 : 80] as [number, number, number, number],
          updateTriggers: { getFillColor: dark },
        }),
      );
      if (city.outline?.length) {
        layers.push(
          new PathLayer({
            id: 'city-outline',
            data: [{ path: city.outline }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: [...ink, 70] as [number, number, number, number],
            getWidth: 1.5,
            widthUnits: 'pixels',
            updateTriggers: { getColor: dark },
          }),
        );
      }
      type Hood = MapCity['neighborhoods'][number];
      const hoods = city.neighborhoods.filter((n) => n.lat !== null && n.lon !== null);
      const top = hoods.filter((n) => n.rank <= 3);
      const best = hoods.find((n) => n.rank === 1);
      if (best) {
        layers.push(
          new ScatterplotLayer({
            id: 'hood-pulse',
            data: [best],
            getPosition: (d: Hood) => [d.lon!, d.lat!],
            getRadius: 500 + phase * 900,
            radiusUnits: 'meters',
            filled: false,
            stroked: true,
            getLineColor: [...ORANGE, Math.round(255 * (1 - phase))],
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
          getPosition: (d: Hood) => [d.lon!, d.lat!],
          getRadius: (d: Hood) => (d.rank <= 3 ? 8 : 4),
          radiusUnits: 'pixels',
          getFillColor: (d: Hood) => (d.rank <= 3 ? [...ORANGE, 255] : [...ink, 120]) as [number, number, number, number],
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
          pickable: true,
          updateTriggers: { getFillColor: dark },
        }),
      );
      (zoom > 11.6 ? hoods.slice(0, 8) : top).forEach((d) => labels.push({ key: `h${d.name}`, lon: d.lon!, lat: d.lat!, text: d.name, num: d.rank, cls: `ml-hood${d.rank <= 3 ? ' is-top' : ''}`, pick: { kind: 'neighborhood', id: d.name } }));
      type Room = MapCity['rooms'][number];
      const rooms = city.rooms.filter((r) => r.lat !== null && r.lon !== null);
      layers.push(
        new ScatterplotLayer({
          id: 'rooms',
          transitions: grow,
          data: rooms,
          getPosition: (d: Room) => [d.lon!, d.lat!],
          getRadius: 9,
          radiusUnits: 'pixels',
          getFillColor: [58, 123, 242, 255],
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2.5,
          pickable: true,
        }),
      );
      if (zoom > 11.4) rooms.forEach((d) => labels.push({ key: `v${d.id}`, lon: d.lon!, lat: d.lat!, text: d.name, cls: 'ml-room', pick: { kind: 'room', id: d.id } }));
    }

    // Fan signatures: per-neighbourhood dots, white with an orange ring (never one dot per fan).
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
          getLineColor: [...ORANGE, Math.round(255 * ripple)],
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
          getLineColor: (d: MapDot) => [...ORANGE, d.confirmed ? 255 : 170] as [number, number, number, number],
          getLineWidth: (d: MapDot) => (d.confirmed ? 3 : 1.5),
          lineWidthUnits: 'pixels',
        }),
      );
    }

    // On Tour the run is the only story: the heat, the pins and the fans step aside, and the
    // route glows on a quiet map (Bump's roadtrip, Anydistance's routes).
    const tour = !city && !!props.route?.length;
    const QUIET = new Set(['country-hex', 'sleeper-ring', 'sleeper-pin', 'metros', 'opened-pins', 'claim-ripple', 'claims']);
    overlay.current.setProps({
      layers: (tour ? (layers as { id: string }[]).filter((l) => !QUIET.has(l.id)) : layers) as never,
      onClick: (info: { layer?: { id: string } | null; object?: unknown }) => {
        if (!info.object || !info.layer) return;
        const id = info.layer.id;
        const o = info.object as Record<string, unknown>;
        if (id === 'metros' || id === 'metro-labels' || id === 'opened-pins' || id === 'sleeper-pin') props.onPick({ kind: 'metro', id: String(o.id) });
        else if (id === 'rooms' || id === 'room-labels') props.onPick({ kind: 'room', id: String(o.id) });
        else if (id === 'hoods') props.onPick({ kind: 'neighborhood', id: String(o.name) });
      },
      getCursor: ({ isHovering }: { isHovering: boolean }) => (isHovering ? 'pointer' : 'grab'),
    } as never);
    syncLabels(map.current, marks.current, declutter(map.current, labels), (p) => pickRef.current(p));
  }, [ready, countryDots, cityDots, props.hexes, props.metros, props.dots, props.city, props.route, dark, t, zoom, labelled, scored, opened, props.held, narrow, cityLive, routeT, props.onPick]);

  return <div ref={el} className="crowd-map" />;
}

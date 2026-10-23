'use dom';

/**
 * The Crowd Map (FR-4, FR-5, FR-21; PRD 8.3), built on mapcn (MapLibre GL).
 *
 * Country: Qloo heat as a heatmap glow in Wanted's ramp (stage purple, flame, amber), which
 * turns into 3D H3 hex columns as you zoom in. Top cities carry rank pills; sleepers carry a
 * gold tin star; cities with a poster up carry a purple pill with their signature count. The
 * tour route is a mapcn MapRoute with numbered stops.
 * City: extruded street-level hexes, Qloo's ranked neighborhoods (ranks, never percentages)
 * with a pulsing ring on #1, and room pins.
 * Fan signatures sit on top as white dots with a purple ring, rippling when new ones land.
 *
 * Runs as an Expo DOM component, so the same code renders on the web and inside a WebView
 * on iOS and Android.
 */
import { cellToBoundary, cellToLatLng } from 'h3-js';
import type * as MapLibreGL from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DOMProps } from 'expo/dom';
import { Map, MapMarker, MapRoute, MarkerContent, useMap } from '@/components/ui/map';
import { MAP_CSS } from '@/components/ui/map-css';
import { MX_SVG } from '../icons/mx.native.generated';

export type MapMetro = { id: string; name: string; state: string; lat: number; lon: number; score: number | null; heat: number | null; rank: number | null; sleeper: boolean };
export type MapDot = { lat: number; lon: number; count: number; neighborhood: string; city: string; confirmed: boolean };
export type MapCity = {
  id: string;
  lat: number;
  lon: number;
  hexes: { h3: string; heat: number }[];
  neighborhoods: { name: string; rank: number; lat: number | null; lon: number | null }[];
  rooms: { id: string; name: string; lat: number | null; lon: number | null; rank: number }[];
  outline: [number, number][] | null;
};
export type MapRouteStop = { lat: number; lon: number; city: string };

export type CrowdMapProps = {
  hexes: { h3: string; heat: number; score: number | null }[];
  metros: MapMetro[];
  opened: string[];
  /** Cities whose fan proof crossed the threshold. */
  proven?: string[];
  dots: MapDot[];
  city: MapCity | null;
  route: MapRouteStop[] | null;
  dark: boolean;
  reduceMotion: boolean;
  /** Bumps when a new signature lands, to ripple the dots. */
  pulse: number;
  /** Screen space covered by the app's panels, so the camera centers in what's visible. */
  padding: { top: number; left: number; bottom: number; right: number };
  onPick: (pick: { kind: 'metro' | 'room' | 'neighborhood'; id: string }) => void;
  dom?: DOMProps;
};

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const US = { center: [-96.5, 38.3] as [number, number], zoom: 3.1, pitch: 30, bearing: -6 };
/** Contiguous US, west/south/east/north. On phones, trimmed so the country is as large as it can be. */
const US_BOUNDS: [number, number, number, number] = [-124.6, 25.0, -67.0, 49.2];
const US_BOUNDS_TIGHT: [number, number, number, number] = [-123.2, 26.0, -68.2, 48.6];

/** Wanted's heat ramp for the glow: transparent, stage purple, flame, sunset, amber, a hot cream core. */
const GLOW: MapLibreGL.ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0, 'rgba(155,48,224,0)',
  0.1, 'rgba(155,48,224,0.32)',
  0.28, 'rgba(180,92,240,0.62)',
  0.48, '#FF4D2E',
  0.66, '#FF6A1A',
  0.84, '#FFB000',
  1, '#FFE6A8',
];
/** The token heat ramp (#2B2D42, #FFB000, #FF4D2E) for hexes. */
const RAMP = (key: string): MapLibreGL.ExpressionSpecification => ['interpolate', ['linear'], ['get', key], 0, '#2B2D42', 0.25, '#7A2FB0', 0.5, '#FFB000', 1, '#FF4D2E'];

const svg = (name: string, variant: 'linear' | 'bold', color: string, size: number) =>
  MX_SVG[name][variant].replace(/currentColor/g, color).replace('<svg ', `<svg width="${size}" height="${size}" `).replace(/width="24" height="24" /, '');

function Icon({ name, variant = 'bold', color = '#fff', size = 14 }: { name: string; variant?: 'linear' | 'bold'; color?: string; size?: number }) {
  return <span aria-hidden style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svg(name, variant, color, size) }} />;
}

const EXTRA_CSS = `
.wm-pill { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px 0 7px; border-radius: 999px; white-space: nowrap;
  background: rgba(20,20,24,0.78); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12);
  font: 600 12px/1 "Archivo-SemiBold", system-ui, sans-serif; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.45); transform: translateY(-6px) }
.wm-pill b { font: 700 11px/1 "ChivoMono-Bold", ui-monospace, monospace; color: #FFB000 }
.wm-pill.sleeper { color: #F5C542; border-color: rgba(245,197,66,0.45) }
.wm-pill.poster { background: rgba(155,48,224,0.92); border-color: rgba(255,255,255,0.35); height: 28px; padding: 0 10px 0 8px }
.wm-pill.poster b { color: #fff; font-size: 12px }
.wm-pill.proven { background: linear-gradient(180deg,#2FD06B,#1E9E4F); }
.wm-pin { width: 8px; height: 8px; border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,.55); margin-top: -2px }
.wm-dot { position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,.5) }
.wm-anchor { position: relative; display: flex; flex-direction: column; align-items: center }
.wm-hood { display: flex; flex-direction: column; align-items: center; gap: 4px; transform: translateY(-10px) }
.wm-badge { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: #FFB000; color: #1A120B;
  font: 700 13px/1 "ChivoMono-Bold", ui-monospace, monospace; border: 2px solid #fff; box-shadow: 0 4px 14px rgba(0,0,0,.5) }
.wm-badge.minor { width: 18px; height: 18px; background: rgba(255,255,255,0.9); font-size: 10px; border-width: 1.5px }
.wm-label { padding: 3px 8px; border-radius: 8px; background: rgba(20,20,24,0.8); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font: 600 12px/1.2 "Archivo-SemiBold", system-ui, sans-serif; color: #FFE0A3; white-space: nowrap; border: 1px solid rgba(255,255,255,.1) }
.wm-label.room { color: #CFE5FF }
.wm-ring { position: absolute; left: 50%; top: 13px; width: 26px; height: 26px; margin-left: -13px; border-radius: 50%; border: 3px solid #FF4D2E; animation: wm-ring 1.8s ease-out infinite; pointer-events: none }
@keyframes wm-ring { from { transform: scale(1); opacity: 1 } to { transform: scale(3.4); opacity: 0 } }
.wm-room { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(180deg,#1F8AFF,#006AEE); border: 2px solid #fff; box-shadow: 0 4px 14px rgba(0,0,0,.5) }
.wm-stop { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: #9B30E0; border: 2px solid #fff; color: #fff; font: 700 10px/1 "ChivoMono-Bold", ui-monospace, monospace }

.wm-stop.small { width: 10px; height: 10px; border-width: 2px }
@media (prefers-reduced-motion: reduce) { .wm-ring { animation: none; opacity: .6 } }
`;

export default function CrowdMap(props: CrowdMapProps) {
  return (
    <div className="wanted-map" style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <style>{MAP_CSS + EXTRA_CSS}</style>
      <div style={{ position: 'absolute', inset: 0, opacity: props.dark ? 0.35 : 1, transition: 'opacity 900ms ease', filter: props.dark ? 'grayscale(1) brightness(0.55)' : 'none' }}>
        <Map theme="dark" styles={{ dark: STYLE, light: STYLE }} center={US.center} zoom={US.zoom} pitch={US.pitch} bearing={US.bearing} maxPitch={70}>
          <QuietBasemap />
          <Camera city={props.city} padding={props.padding} reduceMotion={props.reduceMotion} />
          {!props.dark && !props.city ? <CountryHeat hexes={props.hexes} /> : null}
          {!props.dark && !props.city && props.route?.length ? <Route stops={props.route} /> : null}
          {!props.dark && !props.city ? <MetroMarkers {...props} /> : null}
          {!props.dark && props.city ? <CityLayers city={props.city} onPick={props.onPick} /> : null}
          {!props.dark ? <Signatures dots={props.city ? props.dots.filter((d) => d.city === props.city!.id) : props.dots} inCity={!!props.city} pulse={props.pulse} reduceMotion={props.reduceMotion} /> : null}
        </Map>
      </div>
    </div>
  );
}

/** Dim the basemap's labels so the heat carries the story. */
function QuietBasemap() {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.type === 'symbol') {
        try {
          map.setPaintProperty(layer.id, 'text-opacity', 0.5);
        } catch {}
      }
    }
  }, [map, isLoaded]);
  return null;
}

/** Dive into the city, or back out to the country, centered in what the panels leave visible. */
function Camera({ city, padding, reduceMotion }: { city: MapCity | null; padding: CrowdMapProps['padding']; reduceMotion: boolean }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const duration = reduceMotion ? 0 : 2200;
    const narrow = map.getContainer().clientWidth < 600;
    if (city) {
      map.flyTo({ center: [city.lon, city.lat], zoom: narrow ? 10.4 : 10.8, pitch: 52, bearing: -14, duration, essential: true, padding });
      return;
    }
    const cam = map.cameraForBounds(narrow ? US_BOUNDS_TIGHT : US_BOUNDS, { padding: narrow ? { ...padding, left: 4, right: 4 } : padding, bearing: 0, pitch: 0 });
    map.flyTo({ center: cam?.center ?? US.center, zoom: (cam?.zoom ?? US.zoom) + (narrow ? 0.12 : 0), pitch: narrow ? 26 : 38, bearing: US.bearing, duration, essential: true });
  }, [map, isLoaded, city?.id, reduceMotion, padding.top, padding.bottom, padding.left, padding.right]);
  return null;
}

/** Adds a GeoJSON source with its layers once, keeps its data current, removes both on unmount. */
function useGeo(id: string, data: GeoJSON.FeatureCollection, layers: Omit<MapLibreGL.LayerSpecification, 'source'>[]) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data });
    for (const l of layers) if (!map.getLayer(l.id)) map.addLayer({ ...l, source: id } as MapLibreGL.LayerSpecification);
    return () => {
      try {
        for (const l of [...layers].reverse()) if (map.getLayer(l.id)) map.removeLayer(l.id);
        if (map.getSource(id)) map.removeSource(id);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, id]);
  useEffect(() => {
    (map?.getSource(id) as MapLibreGL.GeoJSONSource | undefined)?.setData(data);
  }, [map, id, data]);
  return map;
}

function hexPolygon(h3: string): [number, number][] {
  const ring = cellToBoundary(h3, true) as [number, number][];
  return [...ring, ring[0]];
}

/** Country heat: a glow at country zoom that hands over to 3D hex columns as you zoom in. */
function CountryHeat({ hexes }: { hexes: CrowdMapProps['hexes'] }) {
  const points = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: hexes.map((h) => {
        const [lat, lon] = cellToLatLng(h.h3);
        return { type: 'Feature', properties: { w: h.score !== null ? h.score / 100 : h.heat * 0.45 }, geometry: { type: 'Point', coordinates: [lon, lat] } };
      }),
    }),
    [hexes],
  );
  const cells = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: hexes.map((h) => ({ type: 'Feature', properties: { v: h.score !== null ? h.score / 100 : h.heat * 0.55, heat: h.heat }, geometry: { type: 'Polygon', coordinates: [hexPolygon(h.h3)] } })),
    }),
    [hexes],
  );
  useGeo('wm-heat', points, [
    {
      id: 'wm-heat-glow',
      type: 'heatmap',
      maxzoom: 7,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'w'], 0, 0, 0.3, 0.12, 0.6, 0.55, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 1.3, 4, 1.9, 6, 2.6],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 6, 3.5, 13, 5, 22, 7, 36],
        'heatmap-color': GLOW,
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4.6, 0.95, 6.2, 0.2],
      },
    },
  ]);
  useGeo('wm-cells', cells, [
    {
      id: 'wm-cells-3d',
      type: 'fill-extrusion',
      minzoom: 4.4,
      paint: {
        'fill-extrusion-color': RAMP('v'),
        'fill-extrusion-height': ['*', ['^', ['get', 'heat'], 2.2], 70000],
        'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 4.4, 0, 5.6, 0.88],
      },
    },
  ]);
  return null;
}

/** The van's route, stop by stop, in stage purple. */
function Route({ stops }: { stops: MapRouteStop[] }) {
  const { map } = useMap();
  const [close, setClose] = useState(false);
  useEffect(() => {
    if (!map) return;
    const on = () => setClose(map.getZoom() > 4.8);
    on();
    map.on('zoomend', on);
    return () => {
      map.off('zoomend', on);
    };
  }, [map]);
  return (
    <>
      <MapRoute id="wm-route" coordinates={stops.map((s) => [s.lon, s.lat])} color="#B45CF0" width={3.5} opacity={0.95} interactive={false} />
      {stops.map((s, i) => (
        <MapMarker key={`${s.city}-${i}`} longitude={s.lon} latitude={s.lat}>
          <MarkerContent>
            <div className={`wm-stop${close ? '' : ' small'}`} aria-label={`Stop ${i + 1}, ${s.city}`}>
              {close ? i + 1 : null}
            </div>
          </MarkerContent>
        </MapMarker>
      ))}
    </>
  );
}

/** Rank pills, sleeper stars and poster pills, decluttered in screen space. */
function MetroMarkers(props: CrowdMapProps) {
  const { map } = useMap();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!map) return;
    const on = () => setFrame((f) => f + 1);
    map.on('moveend', on);
    map.on('resize', on);
    return () => {
      map.off('moveend', on);
      map.off('resize', on);
    };
  }, [map]);
  const opened = useMemo(() => new Set(props.opened), [props.opened]);
  const proven = useMemo(() => new Set(props.proven ?? []), [props.proven]);
  const signatures = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of props.dots) out[d.city] = (out[d.city] ?? 0) + d.count;
    return out;
  }, [props.dots]);
  const shown = useMemo(() => {
    if (!map) return [];
    const narrow = map.getContainer().clientWidth < 600;
    const zoom = map.getZoom();
    const scored = props.metros.filter((m) => m.score !== null);
    const top = [...scored].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, narrow ? (zoom > 5 ? 14 : 6) : 12);
    const lead = props.metros.filter((m) => opened.has(m.id));
    const stars = props.metros.filter((m) => m.sleeper);
    const seen = new Set<string>();
    const all = [...lead, ...top, ...stars].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    const kept: { x: number; y: number; w: number }[] = [];
    const out: (MapMetro & { compact: boolean })[] = [];
    for (const d of all) {
      const p = map.project([d.lon, d.lat]);
      const w = opened.has(d.id) ? (d.name.length + 5) * 7.5 : (d.name.length + 3) * 7;
      const W = map.getContainer().clientWidth;
      // Labels that would run off the screen edge stay off; the heat still shows the city.
      if (p.x - w / 2 < 6 || p.x + w / 2 > W - 6) continue;
      const hit = kept.some((k) => Math.abs(k.x - p.x) < (k.w + w) / 2 + 4 && Math.abs(k.y - p.y) < 26);
      // A star that would collide still shows, without its label.
      if (hit && !d.sleeper) continue;
      if (!hit) kept.push({ x: p.x, y: p.y, w });
      out.push({ ...d, compact: hit });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, props.metros, opened, frame]);
  return (
    <>
      {shown.map((m) => {
        const isPoster = opened.has(m.id);
        const label = isPoster ? (
          <span className={`wm-pill poster${proven.has(m.id) ? ' proven' : ''}`}>
            <Icon name={proven.has(m.id) ? 'check' : 'signature'} size={13} />
            {m.name} <b>{signatures[m.id] ?? 0}</b>
          </span>
        ) : m.sleeper ? (
          m.compact ? (
            <Icon name="star" color="#F5C542" size={18} />
          ) : (
            <span className="wm-pill sleeper">
              <Icon name="star" color="#F5C542" size={13} />
              {m.name}
            </span>
          )
        ) : (
          <span className="wm-pill">
            {m.rank ? <b>{m.rank}</b> : null}
            {m.name}
          </span>
        );
        return (
          <MapMarker key={m.id} longitude={m.lon} latitude={m.lat} anchor="bottom" onClick={() => props.onPick({ kind: 'metro', id: m.id })}>
            <MarkerContent>
              <div className="wm-anchor" role="button" aria-label={`${m.name}, ${m.state}${m.rank ? `, rank ${m.rank}` : ''}${m.sleeper ? ', sleeper city' : ''}. Dive in.`}>
                {label}
                <span className="wm-pin" />
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}

function CityLayers({ city, onPick }: { city: MapCity; onPick: CrowdMapProps['onPick'] }) {
  const { map } = useMap();
  // Room names join the neighborhood labels only once there's room for both.
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!map) return;
    const on = () => setNear(map.getZoom() >= 11.6);
    on();
    map.on('zoomend', on);
    return () => {
      map.off('zoomend', on);
    };
  }, [map]);
  const cells = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: 'FeatureCollection', features: city.hexes.map((h) => ({ type: 'Feature', properties: { heat: h.heat }, geometry: { type: 'Polygon', coordinates: [hexPolygon(h.h3)] } })) }),
    [city.hexes],
  );
  const outline = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: 'FeatureCollection', features: city.outline?.length ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: city.outline } }] : [] }),
    [city.outline],
  );
  useGeo('wm-city', cells, [
    {
      id: 'wm-city-3d',
      type: 'fill-extrusion',
      paint: {
        'fill-extrusion-color': RAMP('heat'),
        'fill-extrusion-height': ['*', ['^', ['get', 'heat'], 1.6], 1100],
        'fill-extrusion-opacity': 0.82,
      },
    },
  ]);
  useGeo('wm-city-outline', outline, [{ id: 'wm-city-outline-line', type: 'line', paint: { 'line-color': 'rgba(255,255,255,0.35)', 'line-width': 1.5, 'line-dasharray': [2, 2] } }]);
  const hoods = city.neighborhoods.filter((n) => n.lat !== null && n.lon !== null).slice(0, 7);
  const rooms = city.rooms.filter((r) => r.lat !== null && r.lon !== null);
  return (
    <>
      {rooms.map((r) => (
        <MapMarker key={r.id} longitude={r.lon!} latitude={r.lat!} onClick={() => onPick({ kind: 'room', id: r.id })}>
          <MarkerContent>
            <div className="wm-hood" role="button" aria-label={`Room: ${r.name}`} style={{ transform: near ? 'translateY(12px)' : 'none' }}>
              <div className="wm-room">
                <Icon name="building" size={16} />
              </div>
              {near ? <span className="wm-label room">{r.name}</span> : null}
            </div>
          </MarkerContent>
        </MapMarker>
      ))}
      {hoods.map((n) => (
        <MapMarker key={n.name} longitude={n.lon!} latitude={n.lat!} anchor="bottom" onClick={() => onPick({ kind: 'neighborhood', id: n.name })}>
          <MarkerContent>
            <div className="wm-hood" aria-label={`Neighborhood ${n.name}, Qloo rank ${n.rank}`}>
              {n.rank <= 3 ? <span className="wm-label">{n.name}</span> : null}
              <div style={{ position: 'relative' }}>
                {n.rank === 1 ? <span className="wm-ring" style={{ top: 0 }} /> : null}
                <div className={`wm-badge${n.rank > 3 ? ' minor' : ''}`}>{n.rank}</div>
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      ))}
    </>
  );
}

/** Aggregate signature dots per neighborhood (never individual fans); a ripple when new ones land. */
function Signatures({ dots, inCity, pulse, reduceMotion }: { dots: MapDot[]; inCity: boolean; pulse: number; reduceMotion: boolean }) {
  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: 'FeatureCollection', features: dots.map((d) => ({ type: 'Feature', properties: { count: d.count, confirmed: d.confirmed ? 1 : 0 }, geometry: { type: 'Point', coordinates: [d.lon, d.lat] } })) }),
    [dots],
  );
  const base: MapLibreGL.ExpressionSpecification = inCity ? ['+', 5, ['*', ['sqrt', ['get', 'count']], 2.6]] : ['+', 3, ['min', 4, ['sqrt', ['get', 'count']]]];
  const map = useGeo(`wm-sig-${inCity ? 'city' : 'us'}`, data, [
    { id: `wm-sig-ripple-${inCity ? 'city' : 'us'}`, type: 'circle', paint: { 'circle-radius': base, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#B45CF0', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0 } },
    {
      id: `wm-sig-${inCity ? 'city' : 'us'}-dot`,
      type: 'circle',
      paint: {
        'circle-radius': base,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#9B30E0',
        'circle-stroke-width': ['case', ['==', ['get', 'confirmed'], 1], 3, 1.5],
        'circle-pitch-alignment': 'map',
      },
    },
  ]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!map || reduceMotion) return;
    const id = `wm-sig-ripple-${inCity ? 'city' : 'us'}`;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1600);
      try {
        map.setPaintProperty(id, 'circle-radius', ['+', base, 26 * k]);
        map.setPaintProperty(id, 'circle-stroke-opacity', 1 - k);
      } catch {
        return;
      }
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);
  return null;
}

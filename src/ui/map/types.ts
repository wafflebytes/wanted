/** Props shared by the web (deck.gl) and native (SVG) Crowd Maps. */
import type { DOMProps } from 'expo/dom';

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
  /** Where the artist pinned the city's posters (web only). */
  spots?: { id: string; name: string; lat: number; lon: number }[];
};
/** The map underneath the dots. All Esri raster tiles (no key); the web's dark one is OpenFreeMap vectors. */
export type Basemap = 'dark' | 'satellite' | 'terrain' | 'streets';
export const BASEMAPS: { key: Basemap; label: string; layer: string; maxZoom: number }[] = [
  { key: 'dark', label: 'Dark', layer: 'Canvas/World_Dark_Gray_Base', maxZoom: 16 },
  { key: 'satellite', label: 'Satellite', layer: 'World_Imagery', maxZoom: 18 },
  { key: 'terrain', label: 'Terrain', layer: 'World_Terrain_Base', maxZoom: 13 },
  { key: 'streets', label: 'Streets', layer: 'World_Street_Map', maxZoom: 18 },
];
export const basemapTile = (layer: string) => `https://services.arcgisonline.com/ArcGIS/rest/services/${layer}/MapServer/tile/{z}/{y}/{x}`;

export type MapRoute = { lat: number; lon: number; city: string }[];

export type CrowdMapProps = {
  hexes: { h3: string; heat: number; score: number | null }[];
  metros: MapMetro[];
  opened: string[];
  dots: MapDot[];
  city: MapCity | null;
  route: MapRoute | null;
  dark: boolean;
  basemap?: Basemap;
  reduceMotion: boolean;
  /** Bumps when a new signature lands, to ripple the dots. */
  pulse: number;
  /** Screen space covered by the app's panels, so the camera centers in what's visible. */
  padding: { top: number; left: number; bottom: number; right: number };
  onPick: (pick: { kind: 'metro' | 'room' | 'neighborhood'; id: string }) => void;
  dom?: DOMProps;
};

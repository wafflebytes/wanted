/** Small geo helpers shared by the server, the planner and the map. */

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box for a radius around a point, for a cheap prefilter before haversine. */
export function bbox(lat: number, lon: number, km: number) {
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.2, Math.cos(rad(lat))));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

type Ring = [number, number][];

/** Parses POLYGON / MULTIPOLYGON WKT into rings of [lon, lat] (outer rings only). */
export function parseWktOuterRings(wkt: string): Ring[] {
  const rings: Ring[] = [];
  const body = wkt.trim();
  const isMulti = body.toUpperCase().startsWith('MULTIPOLYGON');
  // Split polygons: for MULTIPOLYGON (((a)),((b))) take the first ring of each polygon.
  const polygons = isMulti ? body.slice(body.indexOf('(') + 1, body.lastIndexOf(')')).split(/\)\)\s*,\s*\(\(/) : [body];
  for (const poly of polygons) {
    const first = poly.replace(/^[^(]*\(+/, '').split(/\)\s*,\s*\(/)[0].replace(/\)+$/, '');
    const ring: Ring = [];
    for (const pair of first.split(',')) {
      const [x, y] = pair.trim().split(/\s+/).map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) ring.push([x, y]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** Area-weighted centroid of a ring ([lon, lat]). */
export function ringCentroid(ring: Ring): [number, number] {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    x += (ring[j][0] + ring[i][0]) * f;
    y += (ring[j][1] + ring[i][1]) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-12) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [x / (3 * a), y / (3 * a)];
}

/** Centroid and approximate area (deg^2) of the largest outer ring in a WKT shape. */
export function wktSummary(wkt: string): { lon: number; lat: number; areaDeg2: number; ring: Ring } | null {
  // Small neighborhoods come back as POINT (lon lat) with no polygon.
  const pt = /^\s*POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(wkt);
  if (pt) {
    const lon = Number(pt[1]);
    const lat = Number(pt[2]);
    return Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat, areaDeg2: 0, ring: [] } : null;
  }
  const rings = parseWktOuterRings(wkt);
  if (!rings.length) return null;
  let best = rings[0];
  let bestArea = ringArea(best);
  for (const r of rings.slice(1)) {
    const a = ringArea(r);
    if (a > bestArea) {
      best = r;
      bestArea = a;
    }
  }
  const [lon, lat] = ringCentroid(best);
  return { lon, lat, areaDeg2: bestArea, ring: best };
}

/** Douglas-Peucker simplification on [lon, lat] rings. */
export function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const [x1, y1] = ring[s];
    const [x2, y2] = ring[e];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    for (let i = s + 1; i < e; i++) {
      // A closed ring starts and ends on the same point; measure from that point instead.
      const d = len < 1e-12 ? Math.hypot(ring[i][0] - x1, ring[i][1] - y1) : Math.abs(dy * ring[i][0] - dx * ring[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tolerance && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

/** Point-in-ring test ([lon, lat]). */
export function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi) inside = !inside;
  }
  return inside;
}

/** Road-distance estimate and van drive hours between two points (FR-9 fallback). */
export function driveEstimate(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
  roadFactor = 1.25,
  kmh = 88,
): { km: number; hours: number } {
  const km = haversineKm(aLat, aLon, bLat, bLon) * roadFactor;
  return { km, hours: km / kmh };
}

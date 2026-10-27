'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deal } from '@/lib/types';
import type { CityData, MapData } from '@/ui/types';
import { useApi, useDark, usePrefersReducedMotion } from '@web/lib/hooks';
import { stage, useStage } from '@web/lib/stage';

const CrowdMap = dynamic(() => import('./CrowdMap'), { ssr: false });

/** Mounted once the first map tab opens, then kept: hidden tabs pause its clock. */
export function MapStage({ slug }: { slug: string }) {
  const s = useStage();
  const [mounted, setMounted] = useState(false);
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (s.show) setMounted(true);
  }, [s.show]);
  const dark = useDark();
  const reduce = usePrefersReducedMotion();
  const map = useApi<MapData>(mounted ? `/artist/${slug}/map` : null);
  const deals = useApi<{ deals: Deal[] }>(mounted ? `/artist/${slug}/deals` : null, { every: 30_000 });
  const held = useMemo(() => [...new Set(deals.data?.deals.filter((d) => d.status === 'held').map((d) => d.city) ?? [])], [deals.data]);
  const city = useApi<CityData>(s.city ? `/artist/${slug}/city/${s.city}` : null);
  const cityWait = useApi<CityData>(s.city && city.data?.neighborhoodsPending ? `/artist/${slug}/city/${s.city}?wait=1` : null);
  const cd = cityWait.data && !cityWait.data.neighborhoodsPending ? cityWait.data : city.data;
  const metros = useMemo(() => map.data?.metros.map((m) => ({ id: m.id, name: m.name, state: m.state, lat: m.lat, lon: m.lon, score: m.score, heat: m.heat, rank: m.rank, sleeper: m.sleeper })) ?? [], [map.data]);
  const cityProp = useMemo(
    () =>
      s.city && cd && cd.metro.id === s.city
        ? {
            id: cd.metro.id,
            lat: cd.metro.lat,
            lon: cd.metro.lon,
            hexes: cd.hexes,
            neighborhoods: (cd.neighborhoods ?? []).map((n) => ({ name: n.name, rank: n.rank, lat: n.lat, lon: n.lon })),
            rooms: cd.rooms.map((r) => ({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, rank: r.rank })),
            outline: cd.outline,
          }
        : null,
    [s.city, cd],
  );
  const [w, setW] = useState(390);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const wide = w >= 900;
  const padding = useMemo(() => (wide ? { top: 80, left: 520, bottom: 60, right: 40 } : { top: s.top, left: 24, bottom: s.bottom + 12, right: 24 }), [wide, s.top, s.bottom]);
  const pickRef = useRef(stage.pick);
  if (!mounted) return null;
  return (
    <div className={`stage ${s.show ? 'on' : ''} ${painted ? 'painted' : ''}`} aria-hidden={!s.show}>
      {map.data && (
        <CrowdMap
          hexes={map.data.hexes}
          metros={metros}
          opened={map.data.opened}
          held={held}
          dots={map.data.dots}
          city={cityProp}
          route={s.city ? null : s.route}
          dark={dark}
          active={s.show}
          reduceMotion={reduce}
          pulse={s.pulse}
          padding={padding}
          onPick={pickRef.current}
          onReady={() => setPainted(true)}
        />
      )}
      <div className="stage-veil" />
    </div>
  );
}

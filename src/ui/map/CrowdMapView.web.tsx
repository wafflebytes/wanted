/**
 * On the web the map is loaded only in the browser, after mount: maplibre and deck.gl touch
 * `window` and WebGL at import time, which the server render can't provide. The chunk
 * loads while Gus's first line is on screen.
 */
import { type ComponentType, useEffect, useState } from 'react';
import type { CrowdMapProps } from './types';

export function CrowdMapView(props: CrowdMapProps) {
  const [Map, setMap] = useState<ComponentType<CrowdMapProps> | null>(null);
  useEffect(() => {
    let live = true;
    import('./CrowdMap.dom').then((m) => live && setMap(() => m.default));
    return () => {
      live = false;
    };
  }, []);
  return Map ? <Map {...props} /> : null;
}

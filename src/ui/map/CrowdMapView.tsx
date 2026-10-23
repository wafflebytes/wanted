/** On iOS and Android the map is an Expo DOM component in a WebView. */
import CrowdMap, { type CrowdMapProps } from './CrowdMap.dom';

export function CrowdMapView(props: CrowdMapProps) {
  return <CrowdMap {...props} />;
}

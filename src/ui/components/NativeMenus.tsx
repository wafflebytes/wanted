/** Web and Android keep the in-app menus; the native iOS menus live in NativeMenus.ios.tsx. */
import type { Basemap } from '@/ui/map/types';

export function ActsMenuNative(_: { slug: string; name: string }): null {
  return null;
}
export function LayersMenuNative(_: { value: Basemap; options: { key: Basemap; label: string }[]; onChange: (b: Basemap) => void }): null {
  return null;
}

/** MX Icons on iOS and Android: the pack's SVG markup (pre-rendered by scripts/build-icons.ts) via react-native-svg. */
import { SvgXml } from 'react-native-svg';
import type { IconName, IconVariant } from './names';
import { MX_SVG } from './mx.native.generated';

export type IconProps = { name: IconName; size?: number; color?: string; variant?: Extract<IconVariant, 'linear' | 'bold'>; label?: string };

/** MX Icons only ships a circled close; Apple's is a bare ✕. */
const PLAIN: Partial<Record<IconName, Record<'linear' | 'bold', string>>> = {
  close: { linear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', bold: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>' },
};

export function Icon({ name, size = 20, color = '#fff', variant = 'linear', label }: IconProps) {
  const xml = PLAIN[name]?.[variant] ?? MX_SVG[name]?.[variant] ?? MX_SVG[name]?.linear;
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} color={color} accessibilityLabel={label} accessible={!!label} importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} />;
}

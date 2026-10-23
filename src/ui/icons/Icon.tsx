/** MX Icons on iOS and Android: the pack's SVG markup (pre-rendered by scripts/build-icons.ts) via react-native-svg. */
import { SvgXml } from 'react-native-svg';
import type { IconName, IconVariant } from './names';
import { MX_SVG } from './mx.native.generated';

export type IconProps = { name: IconName; size?: number; color?: string; variant?: Extract<IconVariant, 'linear' | 'bold'>; label?: string };

export function Icon({ name, size = 20, color = '#fff', variant = 'linear', label }: IconProps) {
  const xml = MX_SVG[name]?.[variant] ?? MX_SVG[name]?.linear;
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} color={color} accessibilityLabel={label} accessible={!!label} importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} />;
}

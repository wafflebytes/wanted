/** MX Icons on the web: the pack's own React components. */
import type { IconName, IconVariant } from './names';
import { MX } from './mx.web.generated';

export type IconProps = { name: IconName; size?: number; color?: string; variant?: Extract<IconVariant, 'linear' | 'bold'>; label?: string };

export function Icon({ name, size = 20, color = '#fff', variant = 'linear', label }: IconProps) {
  const C = MX[name][variant] ?? MX[name].linear;
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, lineHeight: 0 }}>
      <C size={size} color={color} />
    </span>
  );
}

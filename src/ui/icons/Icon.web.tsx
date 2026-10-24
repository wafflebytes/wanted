/** MX Icons on the web: the pack's own React components. */
import type { IconName, IconVariant } from './names';
import { MX } from './mx.web.generated';

export type IconProps = { name: IconName; size?: number; color?: string; variant?: Extract<IconVariant, 'linear' | 'bold'>; label?: string };

/** MX Icons only ships a circled close; Apple's is a bare ✕. */
function PlainClose({ size, color, bold }: { size: number; color: string; bold: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth={bold ? 2.6 : 2} strokeLinecap="round" />
    </svg>
  );
}

export function Icon({ name, size = 20, color = '#fff', variant = 'linear', label }: IconProps) {
  const C = name === 'close' ? (p: { size: number; color: string }) => <PlainClose {...p} bold={variant === 'bold'} /> : (MX[name][variant] ?? MX[name].linear);
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, lineHeight: 0 }}>
      <C size={size} color={color} />
    </span>
  );
}

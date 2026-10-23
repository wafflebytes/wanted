/** border-beam around the one card that matters right now (a city that just proved itself, a strong Pitch). */
import { BorderBeam } from 'border-beam';
import type { BeamProps } from './Beam';

export function Beam({ children, active = true, variant = 'sunset', radius = 28 }: BeamProps) {
  if (!active) return <>{children}</>;
  return (
    <BorderBeam colorVariant={variant} theme="dark" borderRadius={radius} size="md">
      <div style={{ borderRadius: radius }}>{children}</div>
    </BorderBeam>
  );
}

/**
 * border-beam (libraries.dev) around the one thing that matters right now: Gus at work, a city
 * whose proof just crossed the threshold, a strong Pitch. Recolored to Wanted's tokens: the
 * library ships no custom palette, so `stage` rotates its ocean preset onto stage purple and
 * `proof` its forest preset onto the proof green, through the beam's own `css` hook.
 */
import { BorderBeam } from 'border-beam';
import type { BeamProps } from './Beam';

const PRESET = { stage: 'ocean', heat: 'sunset', proof: 'forest', gold: 'gold' } as const;
const SHIFT: Record<keyof typeof PRESET, string> = {
  stage: 'hue-rotate(38deg) saturate(1.35)',
  heat: 'saturate(1.15)',
  proof: 'hue-rotate(-8deg) saturate(1.2)',
  gold: 'none',
};

export function Beam({ children, active = true, variant = 'stage', radius = 28, size = 'md', strength = 1, duration }: BeamProps) {
  if (!active) return <>{children}</>;
  const css = `[data-beam="{id}"]::before, [data-beam="{id}"]::after, [data-beam="{id}"] [data-beam-bloom] { filter: ${SHIFT[variant]}; }`;
  return (
    <BorderBeam colorVariant={PRESET[variant]} theme="dark" borderRadius={radius} size={size} strength={strength} duration={duration} css={css} hueRange={variant === 'stage' ? 40 : 24}>
      <div style={{ borderRadius: radius }}>{children}</div>
    </BorderBeam>
  );
}

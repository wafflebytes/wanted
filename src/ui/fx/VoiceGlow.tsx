/** Native stand-in for voice-glow: the stage-purple beam while Gus listens. */
import type { ReactNode } from 'react';
import { Beam } from './Beam';

export type VoiceGlowProps = { children: ReactNode; active: boolean; stream?: MediaStream | null; level?: number | (() => number); radius?: number };

export function VoiceGlow({ children, active, radius = 28 }: VoiceGlowProps) {
  return (
    <Beam active={active} variant="stage" radius={radius}>
      {children}
    </Beam>
  );
}

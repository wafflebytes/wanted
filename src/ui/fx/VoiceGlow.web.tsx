/**
 * voice-glow (libraries.dev) in Wanted's colors: stage purple at the core, then purple-hi,
 * sunset and amber outward, with a cream band. It rises with the live mic stream while you
 * talk to Gus, and with Gus's own level while he answers.
 */
import { VoiceBeam } from 'voice-glow';
import type { VoiceGlowProps } from './VoiceGlow';

const COLORS = ['#9B30E0', '#B45CF0', '#B45CF0', '#FF6A1A', '#FF6A1A', '#FFB000', '#FFB000'];

export function VoiceGlow({ children, active, stream, level, radius = 28 }: VoiceGlowProps) {
  return (
    <VoiceBeam
      type="mobile"
      theme="dark"
      active={active}
      stream={stream ?? null}
      level={stream ? undefined : level}
      colors={COLORS}
      bandColors={{ core: '#F4E9D3', above: '#B45CF0', mid: '#FF6A1A', below: '#FFB000' }}
      borderRadius={radius}
      idle={0.12}
    >
      <div style={{ borderRadius: radius }}>{children}</div>
    </VoiceBeam>
  );
}

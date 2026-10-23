/** Gus's thinking state (thinking-orbs): "searching" in Scout, "solving" in routing, "composing" in Pitch. */
import { ThinkingOrb } from 'thinking-orbs';
import type { OrbProps } from './Orb';

export function Orb({ state = 'working', size = 32, color }: OrbProps) {
  return <ThinkingOrb state={state} size={size} theme="dark" color={color} aria-label="Gus is thinking" />;
}

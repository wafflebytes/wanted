'use client';
/**
 * Gus, your tour manager: flat cap, moustache, a vest full of pockets, lanyard and walkie.
 * From 64 px up he's the full figure in a pose for his mood; below that only his face reads,
 * so small places (the island, the Gus button) show the face and move it a little instead.
 * The art is built by scripts/build-art.py into web/public/art.
 */
export type GusMood =
  | 'idle' | 'listening' | 'thinking' | 'talking' | 'proud' | 'worried' | 'sleeping' | 'done' | 'wave'
  | 'working' | 'waiting' | 'phone';

const POSE: Record<GusMood, string> = {
  idle: 'gus-idle',
  listening: 'gus-listening',
  thinking: 'gus-thinking',
  talking: 'gus-tour-manager',
  wave: 'gus-tour-manager',
  proud: 'gus-proud',
  done: 'gus-proud',
  worried: 'gus-oops',
  sleeping: 'gus-paused',
  working: 'gus-working',
  waiting: 'gus-waiting',
  phone: 'gus-phone',
};

const LINE: Partial<Record<GusMood, string>> = {
  listening: 'Gus, listening',
  thinking: 'Gus, thinking',
  working: 'Gus, at work',
  proud: 'Gus, pleased',
  done: 'Gus, pleased',
  worried: 'Gus, worried',
  sleeping: 'Gus, off for the night',
  waiting: 'Gus, waiting on you',
  phone: 'Gus, on the phone',
};

export function Gus({ mood = 'idle', size = 64, className, level = 0, label }: { mood?: GusMood; size?: number; className?: string; sticker?: boolean; level?: number; label?: string }) {
  const face = size < 64;
  const src = `/art/${face ? 'gus-glyph' : POSE[mood]}.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={face ? 'face' : POSE[mood]}
      src={src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      title={label ? undefined : LINE[mood]}
      draggable={false}
      className={`gus gus-${mood} ${face ? 'gus-face' : 'gus-pose'} ${className ?? ''}`}
      style={face && mood === 'listening' ? { transform: `scale(${1 + Math.min(1, level) * 0.12})` } : undefined}
    />
  );
}

'use client';
/**
 * Gus, the road case who books your tour. A black flight case with aluminium trim, ball
 * corners and a handle; the face is just eyes and a mouth, so he reads at 20 px and at 160.
 * Moods: idle, listening, thinking, talking, proud, worried, sleeping, done, wave.
 */
import { useId } from 'react';

export type GusMood = 'idle' | 'listening' | 'thinking' | 'talking' | 'proud' | 'worried' | 'sleeping' | 'done' | 'wave';

export function Gus({ mood = 'idle', size = 64, className, sticker = true, level = 0 }: { mood?: GusMood; size?: number; className?: string; sticker?: boolean; level?: number }) {
  const id = useId().replace(/:/g, '');
  const u = (s: string) => `${s}-${id}`;
  const small = size < 36;
  const look = mood === 'thinking' ? { x: -2.2, y: -2.6 } : mood === 'listening' ? { x: 0, y: -1.6 } : { x: 0, y: 0 };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`gus gus-${mood} ${className ?? ''}`} aria-hidden>
      <defs>
        <linearGradient id={u('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B3732" />
          <stop offset="0.5" stopColor="#24211D" />
          <stop offset="1" stopColor="#141210" />
        </linearGradient>
        <linearGradient id={u('trim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FAF8F4" />
          <stop offset="0.45" stopColor="#B7B1A6" />
          <stop offset="1" stopColor="#E9E5DE" />
        </linearGradient>
        <radialGradient id={u('ball')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#C9C3B8" />
          <stop offset="1" stopColor="#8A8478" />
        </radialGradient>
        <radialGradient id={u('cheek')}>
          <stop offset="0" stopColor="#FF5A1F" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF5A1F" stopOpacity="0" />
        </radialGradient>
      </defs>
      {!small && <ellipse cx="50" cy="94" rx="34" ry="4" fill="#3A2A14" opacity="0.18" />}
      <g className="gus-body">
        {/* handle */}
        <rect x="36" y="7" width="28" height="11" rx="5.5" fill="none" stroke={`url(#${u('trim')})`} strokeWidth="4.5" />
        <rect x="30" y="14" width="40" height="5" rx="2" fill={`url(#${u('trim')})`} />
        {/* case */}
        <rect x="10" y="17" width="80" height="72" rx="13" fill={`url(#${u('body')})`} />
        <rect x="10" y="17" width="80" height="72" rx="13" fill="none" stroke={`url(#${u('trim')})`} strokeWidth="3" />
        {!small && <path d="M14 50h72" stroke={`url(#${u('trim')})`} strokeWidth="2" opacity="0.55" />}
        <path d="M18 24c10-3 30-4 48-2" stroke="#fff" strokeOpacity="0.16" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* ball corners */}
        {[[14, 21], [86, 21], [14, 85], [86, 85]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={small ? 5 : 6} fill={`url(#${u('ball')})`} />
        ))}
        {/* latches */}
        {!small && (
          <>
            <rect x="6" y="44" width="6" height="12" rx="2" fill={`url(#${u('trim')})`} />
            <rect x="88" y="44" width="6" height="12" rx="2" fill={`url(#${u('trim')})`} />
          </>
        )}
        {/* sticker */}
        {sticker && !small && (
          <g transform="rotate(-10 72 74)">
            <rect x="60" y="68" width="24" height="11" rx="2.5" fill="#FF5A1F" />
            <text x="72" y="76.2" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="6.4" fill="#fff" letterSpacing="0.3">
              WANTED
            </text>
          </g>
        )}
        {/* face */}
        <g className="gus-face">
          {(mood === 'proud' || mood === 'done') && (
            <>
              <circle cx="27" cy="58" r="7" fill={`url(#${u('cheek')})`} />
              <circle cx="73" cy="58" r="7" fill={`url(#${u('cheek')})`} />
            </>
          )}
          <Eyes mood={mood} look={look} />
          <Mouth mood={mood} level={level} />
          {mood === 'worried' && (
            <>
              <path d="M29 37l11-4M71 37l-11-4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>
      {mood === 'sleeping' && !small && (
        <text x="86" y="14" fontFamily="var(--display)" fontWeight="800" fontSize="12" fill="#A29E95" className="gus-z">
          z
        </text>
      )}
    </svg>
  );
}

function Eyes({ mood, look }: { mood: GusMood; look: { x: number; y: number } }) {
  if (mood === 'proud' || mood === 'done' || mood === 'wave') {
    return (
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M30 48q6-7 12 0" />
        <path d="M58 48q6-7 12 0" />
      </g>
    );
  }
  if (mood === 'sleeping') {
    return (
      <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M30 47q6 5 12 0" />
        <path d="M58 47q6 5 12 0" />
      </g>
    );
  }
  return (
    <g className="gus-eyes">
      <ellipse cx="36" cy="45" rx="7" ry="8.5" fill="#fff" />
      <ellipse cx="64" cy="45" rx="7" ry="8.5" fill="#fff" />
      <g className="gus-pupils" style={{ transform: `translate(${look.x}px, ${look.y}px)` }}>
        <circle cx="37" cy="46.5" r="3.6" fill="#15130F" />
        <circle cx="65" cy="46.5" r="3.6" fill="#15130F" />
        <circle cx="38.3" cy="45" r="1.1" fill="#fff" />
        <circle cx="66.3" cy="45" r="1.1" fill="#fff" />
      </g>
    </g>
  );
}

function Mouth({ mood, level }: { mood: GusMood; level: number }) {
  switch (mood) {
    case 'proud':
    case 'done':
    case 'wave':
      return <path d="M38 62q12 12 24 0z" fill="#FF5A1F" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />;
    case 'talking':
      return <ellipse className="gus-talk" cx="50" cy="64" rx="6" ry={3 + level * 4} fill="#FF5A1F" stroke="#fff" strokeWidth="2.2" />;
    case 'listening':
      return <ellipse cx="50" cy="64" rx="3.4" ry="3.4" fill="none" stroke="#fff" strokeWidth="2.6" />;
    case 'thinking':
      return <path d="M43 65h12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />;
    case 'worried':
      return <path d="M41 67q9-6 18 0" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" fill="none" />;
    case 'sleeping':
      return <ellipse cx="50" cy="64" rx="2.4" ry="2" fill="#fff" opacity="0.7" />;
    default:
      return <path d="M42 62q8 6 16 0" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" fill="none" />;
  }
}

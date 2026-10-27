'use client';
/**
 * Soft-lit 3D objects (the Airbnb-2025 language), drawn as SVG until the generated art lands.
 * When `/art/<name>.png` is listed in ART_FILES (docs/design/ASSET-PROMPTS.md), it wins.
 * Every object sits on the same light: key from the top left, a warm bounce from below,
 * a soft contact shadow, one orange accent.
 */
import { useId, type ReactNode } from 'react';

/** PNGs that exist in web/public/art. Add a name here when its render is dropped in. */
const ART_FILES = new Set<string>([]);

export type ArtName =
  | 'map' | 'van' | 'poster' | 'mail' | 'logbook' | 'pass' | 'dial'
  | 'ticket' | 'pick' | 'cassette'
  | 'room' | 'route' | 'mic' | 'reply' | 'phone' | 'coin' | 'megaphone' | 'stapler'
  | 'seal' | 'pin';

type Draw = (u: (s: string) => string) => ReactNode;

const shadow = (u: (s: string) => string, cx = 60, cy = 106, rx = 38, ry = 6) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${u('sh')})`} />
);

/** Shared defs: contact shadow, gloss, and the orange the whole set shares. */
const Defs = ({ u }: { u: (s: string) => string }) => (
  <defs>
    <radialGradient id={u('sh')}>
      <stop offset="0" stopColor="#3A2A14" stopOpacity="0.32" />
      <stop offset="1" stopColor="#3A2A14" stopOpacity="0" />
    </radialGradient>
    <linearGradient id={u('or')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#FF8A4C" />
      <stop offset="0.55" stopColor="#FF5A1F" />
      <stop offset="1" stopColor="#D9400D" />
    </linearGradient>
    <radialGradient id={u('orb')} cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#FFB487" />
      <stop offset="0.45" stopColor="#FF5A1F" />
      <stop offset="1" stopColor="#B83208" />
    </radialGradient>
    <linearGradient id={u('paper')} x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stopColor="#FFF8EA" />
      <stop offset="1" stopColor="#EAD9B8" />
    </linearGradient>
    <linearGradient id={u('gloss')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
    <linearGradient id={u('metal')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#F4F2EE" />
      <stop offset="0.5" stopColor="#B9B4AA" />
      <stop offset="1" stopColor="#E6E2DA" />
    </linearGradient>
    <linearGradient id={u('glass')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#5C6B7C" />
      <stop offset="1" stopColor="#222A33" />
    </linearGradient>
    <linearGradient id={u('ink')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3A3631" />
      <stop offset="1" stopColor="#14120F" />
    </linearGradient>
  </defs>
);

const DRAW: Record<ArtName, Draw> = {
  poster: (u) => (
    <>
      {shadow(u, 62, 108, 34, 5)}
      <g transform="rotate(-5 60 60)">
        <path d="M28 14h64a4 4 0 0 1 4 4v80l-14 8H28a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill={`url(#${u('paper')})`} />
        <path d="M24 98h0a4 4 0 0 0 4 4h54l14-8-0 0V18" fill="none" stroke="#C9B18A" strokeOpacity="0.5" />
        <path d="M96 94l-14 12 2-11z" fill="#D6C29E" />
        <path d="M82 106l2-11 12-1z" fill="#FFF6E4" />
        <text x="60" y="32" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="14" letterSpacing="0.5" fill="#2A1D12">WANTED</text>
        <rect x="38" y="38" width="44" height="34" rx="3" fill="#DCC69E" />
        <circle cx="60" cy="51" r="7.5" fill="#8C6B45" />
        <path d="M45 72c2-9 8-13 15-13s13 4 15 13z" fill="#8C6B45" />
        <rect x="36" y="78" width="48" height="3" rx="1.5" fill="#B49770" />
        <rect x="42" y="85" width="36" height="3" rx="1.5" fill="#CDB48D" />
        <g transform="rotate(14 80 90)">
          <circle cx="80" cy="90" r="9" fill="none" stroke="#FF5A1F" strokeWidth="2.2" opacity="0.9" />
          <path d="M80 84.5l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" fill="#FF5A1F" opacity="0.9" />
        </g>
      </g>
      <ellipse cx="59" cy="18" rx="5" ry="2" fill="#000" opacity="0.15" />
      <circle cx="58" cy="14" r="5.5" fill={`url(#${u('orb')})`} />
      <circle cx="56.3" cy="12.3" r="1.6" fill="#fff" opacity="0.8" />
    </>
  ),
  van: (u) => (
    <>
      {shadow(u, 60, 98, 46, 6)}
      <path d="M18 46c0-8 6-14 14-14h44c6 0 10 2 13 7l12 16c2 3 3 6 3 9v14c0 5-4 9-9 9H27c-5 0-9-4-9-9z" fill={`url(#${u('or')})`} />
      <path d="M18 64h86v6H18z" fill="#FFF3E6" opacity="0.92" />
      <path d="M22 42c1-5 5-7 10-7h44c4 0 7 1.5 9 5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <rect x="26" y="40" width="22" height="16" rx="4" fill={`url(#${u('glass')})`} />
      <rect x="52" y="40" width="22" height="16" rx="4" fill={`url(#${u('glass')})`} />
      <path d="M78 40h5c2 0 3.5 1 4.6 2.4l8.4 11.6c.6.9 0 2-1 2H78z" fill={`url(#${u('glass')})`} />
      <path d="M29 42l6 0-7 11z M55 42l6 0-7 11z" fill="#fff" opacity="0.25" />
      <circle cx="99" cy="72" r="3" fill="#FFE29A" />
      <rect x="96" y="80" width="10" height="4" rx="2" fill="#B83208" />
      <circle cx="38" cy="86" r="11" fill="#1F1B17" />
      <circle cx="38" cy="86" r="5" fill="#CFC8BC" />
      <circle cx="84" cy="86" r="11" fill="#1F1B17" />
      <circle cx="84" cy="86" r="5" fill="#CFC8BC" />
      <rect x="30" y="26" width="40" height="6" rx="3" fill="#2A2622" />
      <rect x="34" y="22" width="9" height="6" rx="2" fill="#E6DAC4" />
      <rect x="45" y="20" width="12" height="8" rx="2" fill="#2E6D4F" />
    </>
  ),
  map: (u) => (
    <>
      {shadow(u, 60, 104, 42, 6)}
      <path d="M18 34l28-8v64l-28 8z" fill="#F7EEDC" />
      <path d="M46 26l28 8v64l-28-8z" fill="#E4D4B6" />
      <path d="M74 34l28-8v64l-28 8z" fill="#FBF3E4" />
      <path d="M22 70c8-4 12 4 18-2s6-10 6-10" fill="none" stroke="#7FB4E0" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 52c6 2 9-3 14 0s6 8 6 8" fill="none" stroke="#7FB4E0" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="48" rx="7" ry="5" fill="#A9CF9A" />
      <ellipse cx="88" cy="78" rx="8" ry="5" fill="#A9CF9A" />
      <path d="M26 86C38 80 44 70 56 66s20 4 28-4 12-16 14-20" fill="none" stroke="#FF5A1F" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.1 6" />
      <path d="M46 26v64M74 34v64" stroke="#C9B48E" strokeOpacity="0.6" />
      <ellipse cx="60" cy="66" rx="5" ry="1.8" fill="#000" opacity="0.2" />
      <path d="M60 64c-7-8-11-13-11-19a11 11 0 0 1 22 0c0 6-4 11-11 19z" fill={`url(#${u('orb')})`} />
      <circle cx="60" cy="45" r="4.2" fill="#fff" />
      <path d="M53 37a8 8 0 0 1 6-3" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  mail: (u) => (
    <>
      {shadow(u, 60, 100, 44, 6)}
      <g transform="rotate(-6 60 64)">
        <rect x="16" y="36" width="88" height="58" rx="8" fill={`url(#${u('paper')})`} />
        <rect x="19" y="39" width="82" height="52" rx="6" fill="none" stroke="#E5484D" strokeWidth="3" strokeDasharray="6 6" />
        <rect x="19" y="39" width="82" height="52" rx="6" fill="none" stroke="#3A7BF2" strokeWidth="3" strokeDasharray="6 6" strokeDashoffset="6" />
        <path d="M20 42l40 28 40-28" fill="none" stroke="#C9B48E" strokeWidth="2" strokeLinejoin="round" />
        <rect x="76" y="46" width="16" height="19" rx="1.5" fill="#FF5A1F" stroke="#fff" strokeWidth="1.6" strokeDasharray="2 1.6" />
        <path d="M84 50.5l1.3 2.7 3 .3-2.2 2 .6 2.9-2.7-1.5-2.7 1.5.6-2.9-2.2-2 3-.3z" fill="#fff" />
        <rect x="30" y="76" width="30" height="3" rx="1.5" fill="#C9B48E" />
        <rect x="30" y="82" width="22" height="3" rx="1.5" fill="#D9C7A6" />
      </g>
      <circle cx="58" cy="70" r="10" fill={`url(#${u('orb')})`} />
      <path d="M53 66.5l2.2 7 2.8-5.2 2.8 5.2 2.2-7" fill="none" stroke="#FFE3D2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  logbook: (u) => (
    <>
      {shadow(u, 60, 104, 36, 6)}
      <defs>
        <linearGradient id={u('lea')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A5233" />
          <stop offset="1" stopColor="#4A2817" />
        </linearGradient>
      </defs>
      <path d="M36 16h50a6 6 0 0 1 6 6v74a6 6 0 0 1-6 6H36z" fill="#F4ECDC" />
      <path d="M86 20v78M89 22v74" stroke="#D9CBB0" />
      <rect x="28" y="14" width="58" height="86" rx="7" fill={`url(#${u('lea')})`} />
      <rect x="32" y="18" width="50" height="78" rx="5" fill="none" stroke="#C99A73" strokeOpacity="0.45" strokeDasharray="2.5 2.5" />
      <rect x="70" y="14" width="6" height="86" fill="#2B1810" opacity="0.85" />
      <text x="50" y="62" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="12" fill="#2B1810" opacity="0.45" letterSpacing="1">LOG</text>
      <path d="M54 100v12l4-3 4 3v-12z" fill={`url(#${u('or')})`} />
      <path d="M30 18c8-2 20-3 30-2" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  pass: (u) => (
    <>
      {shadow(u, 60, 108, 30, 5)}
      <path d="M50 2c0 10 2 16 6 20M70 2c0 10-2 16-6 20" stroke={`url(#${u('or')})`} strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="53" y="18" width="14" height="10" rx="3" fill={`url(#${u('metal')})`} />
      <g transform="rotate(4 60 66)">
        <rect x="30" y="28" width="60" height="78" rx="9" fill="#fff" />
        <rect x="30" y="28" width="60" height="78" rx="9" fill="none" stroke="#E7E1D6" />
        <path d="M30 37a9 9 0 0 1 9-9h42a9 9 0 0 1 9 9v13H30z" fill={`url(#${u('or')})`} />
        <rect x="54" y="32" width="12" height="3.5" rx="1.75" fill="#fff" opacity="0.85" />
        <text x="60" y="47" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="8.5" fill="#fff" letterSpacing="0.6">ALL ACCESS</text>
        <rect x="44" y="56" width="32" height="26" rx="6" fill="#1D1A16" />
        <circle cx="54" cy="68" r="3" fill="#fff" />
        <circle cx="66" cy="68" r="3" fill="#fff" />
        <path d="M56 75q4 3 8 0" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M40 92h2M44 92h1M47 92h3M52 92h1M55 92h2M59 92h1M62 92h3M67 92h1M70 92h2M74 92h1M77 92h3" stroke="#1D1A16" strokeWidth="6" />
      </g>
      <path d="M36 32l46 0" stroke={`url(#${u('gloss')})`} strokeWidth="0" />
    </>
  ),
  dial: (u) => (
    <>
      {shadow(u, 60, 100, 34, 6)}
      <defs>
        <radialGradient id={u('knob')} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#E3DED4" />
          <stop offset="1" stopColor="#A9A296" />
        </radialGradient>
      </defs>
      {Array.from({ length: 11 }, (_, i) => {
        const a = (-225 + i * 27) * (Math.PI / 180);
        return <line key={i} x1={60 + Math.cos(a) * 40} y1={58 + Math.sin(a) * 40} x2={60 + Math.cos(a) * 45} y2={58 + Math.sin(a) * 45} stroke={i < 7 ? '#FF5A1F' : '#C9C2B6'} strokeWidth="3" strokeLinecap="round" />;
      })}
      <circle cx="60" cy="62" r="32" fill="#8E877B" />
      <circle cx="60" cy="58" r="32" fill={`url(#${u('knob')})`} />
      <circle cx="60" cy="58" r="24" fill="none" stroke="#fff" strokeOpacity="0.6" />
      <line x1="60" y1="58" x2="78" y2="44" stroke="#FF5A1F" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="58" r="4" fill="#D2CBBF" />
    </>
  ),
  ticket: (u) => (
    <>
      {shadow(u, 60, 98, 40, 5)}
      <g transform="rotate(-12 60 60)">
        <path d="M18 40h84v12a8 8 0 0 0 0 16v12H18V68a8 8 0 0 0 0-16z" fill={`url(#${u('or')})`} />
        <path d="M78 42v36" stroke="#FFE3D2" strokeWidth="2" strokeDasharray="3 3" />
        <text x="48" y="57" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="11" fill="#fff" letterSpacing="0.8">ADMIT</text>
        <text x="48" y="71" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="11" fill="#fff" letterSpacing="0.8">ONE</text>
        <path d="M90 54l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" fill="#fff" />
        <path d="M22 44h52" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  ),
  pick: (u) => (
    <>
      {shadow(u, 60, 100, 28, 5)}
      <defs>
        <linearGradient id={u('pk')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B3732" />
          <stop offset="1" stopColor="#0F0E0C" />
        </linearGradient>
      </defs>
      <g transform="rotate(16 60 56)">
        <path d="M60 94C46 80 28 58 30 38c2-14 16-20 30-20s28 6 30 20c2 20-16 42-30 56z" fill={`url(#${u('pk')})`} />
        <path d="M40 32c6-6 16-8 26-6" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M60 40l3.4 7 7.6.8-5.7 5.1 1.6 7.5L60 56.6l-6.9 3.8 1.6-7.5-5.7-5.1 7.6-.8z" fill="#FF5A1F" />
      </g>
    </>
  ),
  cassette: (u) => (
    <>
      {shadow(u, 60, 98, 44, 5)}
      <g transform="rotate(8 60 60)">
        <rect x="14" y="30" width="92" height="60" rx="8" fill={`url(#${u('ink')})`} />
        <rect x="22" y="36" width="76" height="34" rx="4" fill="#F6EEDD" />
        <rect x="22" y="36" width="76" height="9" rx="3" fill="#FF5A1F" />
        <rect x="38" y="50" width="44" height="16" rx="8" fill="#2A2622" />
        <circle cx="47" cy="58" r="5" fill="#F6EEDD" />
        <circle cx="73" cy="58" r="5" fill="#F6EEDD" />
        <path d="M32 90l6-12h44l6 12z" fill="#2A2622" />
        <path d="M20 34h80" stroke="#fff" strokeOpacity="0.2" strokeWidth="2" />
      </g>
    </>
  ),
  room: (u) => (
    <>
      {shadow(u, 60, 102, 40, 5)}
      <path d="M24 50h72v48H24z" fill="#F4E6D0" />
      <path d="M24 50h72v6H24z" fill="#E2CFB0" />
      <path d="M18 30h84l-6 20H24z" fill={`url(#${u('or')})`} />
      <rect x="30" y="34" width="60" height="10" rx="2" fill="#FFF3E6" />
      {[36, 46, 56, 66, 76, 84].map((x) => (
        <circle key={x} cx={x} cy="39" r="1.8" fill="#FFB547" />
      ))}
      <rect x="50" y="68" width="20" height="30" rx="3" fill="#2A2622" />
      <rect x="30" y="64" width="14" height="14" rx="2" fill={`url(#${u('glass')})`} />
      <rect x="76" y="64" width="14" height="14" rx="2" fill={`url(#${u('glass')})`} />
      <circle cx="66" cy="84" r="1.5" fill="#E6C78F" />
    </>
  ),
  route: (u) => (
    <>
      {shadow(u, 60, 104, 30, 5)}
      <rect x="57" y="22" width="6" height="82" rx="3" fill="#8C6B45" />
      <path d="M30 30h48l10 9-10 9H30z" fill={`url(#${u('or')})`} />
      <path d="M90 54H42l-10 9 10 9h48z" fill="#2E6D4F" />
      <rect x="38" y="36" width="28" height="4" rx="2" fill="#fff" opacity="0.9" />
      <rect x="52" y="61" width="28" height="4" rx="2" fill="#fff" opacity="0.9" />
    </>
  ),
  mic: (u) => (
    <>
      {shadow(u, 60, 104, 24, 5)}
      <defs>
        <radialGradient id={u('grill')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#C8C2B6" />
          <stop offset="1" stopColor="#8E877B" />
        </radialGradient>
        <pattern id={u('mesh')} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="#6E675C" opacity="0.5" />
        </pattern>
      </defs>
      <rect x="53" y="56" width="14" height="40" rx="6" fill={`url(#${u('ink')})`} />
      <rect x="50" y="56" width="20" height="8" rx="3" fill="#FF5A1F" />
      <circle cx="60" cy="36" r="22" fill={`url(#${u('grill')})`} />
      <circle cx="60" cy="36" r="22" fill={`url(#${u('mesh')})`} />
      <path d="M44 30a17 17 0 0 1 12-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
    </>
  ),
  reply: (u) => (
    <>
      {shadow(u, 60, 102, 38, 5)}
      <path d="M22 34a14 14 0 0 1 14-14h48a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14H54l-16 14 2-14h-4a14 14 0 0 1-14-14z" fill="#fff" />
      <path d="M22 34a14 14 0 0 1 14-14h48a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14H54l-16 14 2-14h-4a14 14 0 0 1-14-14z" fill="none" stroke="#E7E1D6" />
      <circle cx="44" cy="47" r="5" fill="#FF5A1F" />
      <circle cx="60" cy="47" r="5" fill="#FF8A4C" />
      <circle cx="76" cy="47" r="5" fill="#FFB487" />
    </>
  ),
  phone: (u) => (
    <>
      {shadow(u, 60, 102, 40, 5)}
      <path d="M26 64c0-12 14-20 34-20s34 8 34 20v24a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8z" fill={`url(#${u('or')})`} />
      <circle cx="60" cy="74" r="13" fill="#FFF3E6" />
      <circle cx="60" cy="74" r="4" fill="#E2CFB0" />
      <path d="M18 40c0-10 18-18 42-18s42 8 42 18c0 5-4 8-10 8h-6c-4 0-6-3-6-6v-2c-6-2-12-3-20-3s-14 1-20 3v2c0 3-2 6-6 6h-6c-6 0-10-3-10-8z" fill={`url(#${u('ink')})`} />
      <path d="M30 30c10-4 20-5 30-5" stroke="#fff" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  coin: (u) => (
    <>
      {shadow(u, 60, 104, 36, 6)}
      <defs>
        <linearGradient id={u('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE39A" />
          <stop offset="0.5" stopColor="#F2B705" />
          <stop offset="1" stopColor="#C98A00" />
        </linearGradient>
      </defs>
      {[88, 80, 72].map((y) => (
        <g key={y}>
          <ellipse cx="60" cy={y + 6} rx="30" ry="9" fill="#B07800" />
          <rect x="30" y={y} width="60" height="6" fill="#C98A00" />
          <ellipse cx="60" cy={y} rx="30" ry="9" fill={`url(#${u('gold')})`} />
        </g>
      ))}
      <g transform="rotate(-14 66 42)">
        <circle cx="66" cy="42" r="22" fill="#C98A00" />
        <circle cx="64" cy="40" r="22" fill={`url(#${u('gold')})`} />
        <circle cx="64" cy="40" r="16" fill="none" stroke="#FFF1C4" strokeOpacity="0.7" strokeWidth="2" />
        <text x="64" y="47" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="20" fill="#9A6A00">$</text>
      </g>
    </>
  ),
  megaphone: (u) => (
    <>
      {shadow(u, 60, 102, 38, 5)}
      <path d="M30 50l50-22v56L30 70z" fill={`url(#${u('or')})`} />
      <ellipse cx="80" cy="56" rx="9" ry="28" fill="#B83208" />
      <ellipse cx="80" cy="56" rx="6" ry="23" fill="#2A2622" />
      <rect x="18" y="48" width="16" height="24" rx="5" fill={`url(#${u('ink')})`} />
      <path d="M38 72l6 22h8l-4-24z" fill="#2A2622" />
      <path d="M34 52l40-18" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 40q8 16 0 32M102 32q12 24 0 48" stroke="#FF8A4C" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  stapler: (u) => (
    <>
      {shadow(u, 60, 100, 42, 5)}
      <rect x="18" y="80" width="84" height="12" rx="6" fill={`url(#${u('ink')})`} />
      <path d="M22 72c0-8 6-14 14-14h50c8 0 14 6 14 14v6H22z" fill={`url(#${u('or')})`} />
      <path d="M28 64c4-3 10-4 20-4h30" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="88" cy="78" r="5" fill={`url(#${u('metal')})`} />
    </>
  ),
  seal: (u) => (
    <>
      {shadow(u, 60, 100, 32, 5)}
      <defs>
        <radialGradient id={u('wax')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFD27A" />
          <stop offset="0.5" stopColor="#E3A20A" />
          <stop offset="1" stopColor="#9A6400" />
        </radialGradient>
      </defs>
      <path d="M60 18c8 0 10 6 16 8s12-1 15 6-3 10-1 17 8 10 4 16-11 4-16 8-6 13-15 13-10-8-16-11-14 0-17-7 4-10 2-17-8-11-3-17 12 0 17-5 6-11 14-11z" fill={`url(#${u('wax')})`} />
      <circle cx="60" cy="57" r="22" fill="none" stroke="#9A6400" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M50 57l7 7 14-15" stroke="#FFF4D1" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pin: (u) => (
    <>
      <ellipse cx="60" cy="102" rx="10" ry="3" fill="#000" opacity="0.2" />
      <path d="M60 100c-18-20-28-32-28-48a28 28 0 0 1 56 0c0 16-10 28-28 48z" fill={`url(#${u('orb')})`} />
      <circle cx="60" cy="52" r="11" fill="#fff" />
    </>
  ),
};

export function Art({ name, size = 76, className, style, title }: { name: ArtName; size?: number; className?: string; style?: React.CSSProperties; title?: string }) {
  const id = useId().replace(/:/g, '');
  const u = (s: string) => `${s}-${id}`;
  if (ART_FILES.has(name)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/art/${name}.png`} width={size} height={size} alt={title ?? ''} className={className} style={style} draggable={false} />;
  }
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} style={style} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <Defs u={u} />
      {DRAW[name](u)}
    </svg>
  );
}

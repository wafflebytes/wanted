/**
 * Share images (FR-18, FR-23b, Rap Sheet): WANTED poster (1080x1920 story, 1200x630 link
 * preview, 1024x1536 print), Signature Card, and the Rap Sheet. Rendered with satori to SVG
 * and resvg to PNG. Every image carries "Made with Wanted. Find out where you're wanted."
 */
import type { ReactNode } from 'react';
import { cityEdition, MADE_WITH, POSTER_BOXES, POSTER_H, POSTER_INK, POSTER_RED, POSTER_W, posterArtFor, SIGNATURE_FONTS, signatureSpot } from '../lib/poster';
import type { ClaimView } from '../lib/types';
import { nodeRequire } from './node-require';

type FontDef = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' };

const fs = () => process.getBuiltinModule('node:fs') as typeof import('node:fs');
const path = () => process.getBuiltinModule('node:path') as typeof import('node:path');
// The repo root: where the app runs from locally, one up when Next serves from web/ (Vercel).
let rootDir: string | null = null;
const root = () => (rootDir ??= [process.cwd(), path().join(process.cwd(), '..')].find((d) => fs().existsSync(path().join(d, 'assets/og'))) ?? process.cwd());

let fontCache: FontDef[] | null = null;
function fonts(): FontDef[] {
  if (fontCache) return fontCache;
  const read = (f: string) => fs().readFileSync(path().join(root(), 'assets/fonts', `${f}.ttf`));
  fontCache = [
    { name: 'Archivo', data: read('Archivo-Medium'), weight: 500, style: 'normal' },
    { name: 'Archivo', data: read('Archivo-Bold'), weight: 700, style: 'normal' },
    { name: 'Archivo Expanded', data: read('Archivo-ExpandedExtraBold'), weight: 800, style: 'normal' },
    { name: 'Archivo Expanded', data: read('Archivo-ExpandedBlack'), weight: 900, style: 'normal' },
    { name: 'Instrument Serif', data: read('InstrumentSerif-Regular'), weight: 400, style: 'normal' },
    { name: 'Chivo Mono', data: read('ChivoMono-Regular'), weight: 400, style: 'normal' },
    { name: 'Chivo Mono', data: read('ChivoMono-Bold'), weight: 700, style: 'normal' },
    { name: 'Caveat-SemiBold', data: read('Caveat-SemiBold'), weight: 600, style: 'normal' },
    { name: 'NothingYouCouldDo-Regular', data: read('NothingYouCouldDo-Regular'), weight: 400, style: 'normal' },
    { name: 'HomemadeApple-Regular', data: read('HomemadeApple-Regular'), weight: 400, style: 'normal' },
  ];
  return fontCache;
}

const imgCache = new Map<string, string>();
function img(name: string): string {
  const hit = imgCache.get(name);
  if (hit) return hit;
  const file = ['png', 'jpg'].map((e) => path().join(root(), 'assets/og', `${name}.${e}`)).find((p) => fs().existsSync(p));
  if (!file) throw new Error(`missing og asset ${name}`);
  const uri = `data:image/${file.endsWith('jpg') ? 'jpeg' : 'png'};base64,${fs().readFileSync(file).toString('base64')}`;
  imgCache.set(name, uri);
  return uri;
}

/** Real artists get their Qloo photo as a sepia print (PRD Appendix B, item 5). */
const portraitCache = new Map<string, string | null>();
async function portraitFor(artist: { portrait: string | null; imageUrl: string | null }): Promise<string | null> {
  if (artist.portrait) return img(artist.portrait);
  if (!artist.imageUrl) return null;
  if (portraitCache.has(artist.imageUrl)) return portraitCache.get(artist.imageUrl)!;
  try {
    const res = await fetch(artist.imageUrl);
    if (!res.ok) throw new Error(String(res.status));
    const mod = nodeRequire<{ default?: typeof import('sharp').default } & typeof import('sharp').default>('sharp');
    const sharp = mod.default ?? mod;
    const out = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(640, 612, { fit: 'cover', position: 'attention' })
      .greyscale()
      .linear(1.15, -12)
      .tint({ r: 112, g: 74, b: 40 })
      .png()
      .toBuffer();
    const uri = `data:image/png;base64,${out.toString('base64')}`;
    portraitCache.set(artist.imageUrl, uri);
    return uri;
  } catch {
    portraitCache.set(artist.imageUrl, null);
    return null;
  }
}

async function render(node: ReactNode, width: number, height: number): Promise<Buffer> {
  const satori = nodeRequire<{ default: (n: ReactNode, o: unknown) => Promise<string> }>('satori').default;
  const { Resvg } = nodeRequire<typeof import('@resvg/resvg-js')>('@resvg/resvg-js');
  const svg = await satori(node, { width, height, fonts: fonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

// ---------- poster ----------

export type PosterData = {
  artistName: string;
  cityId?: string;
  cityName: string;
  state: string;
  count: number;
  wear: 0 | 1 | 2 | 3;
  topNeighborhoods: string[];
  signatures: ClaimView[];
  played: boolean;
  portrait: string | null;
  imageUrl: string | null;
  link: string;
  isDemo: boolean;
};

const abs = (b: { x: number; y: number; w: number; h: number }, s: number) => ({
  position: 'absolute' as const,
  left: b.x * s,
  top: b.y * s,
  width: b.w * s,
  height: b.h * s,
});

function fitSize(text: string, boxW: number, base: number, charW = 0.78) {
  return Math.min(base, Math.floor(boxW / Math.max(1, text.length * charW)));
}

/** The poster itself at scale s (1 = 1024 x 1536). */
function Poster({ d, s, portrait }: { d: PosterData; s: number; portrait: string | null }) {
  const art = posterArtFor(d.cityId, d.state);
  const B = art?.layout ?? POSTER_BOXES;
  const custom = !!art;
  const name = d.artistName.toUpperCase();
  const city = `IN ${d.cityName.toUpperCase()}, ${d.state}`;
  const hoods = d.topNeighborhoods.slice(0, 3);
  return (
    <div style={{ position: 'relative', display: 'flex', width: POSTER_W * s, height: POSTER_H * s }}>
      <img src={img(art ? `posters/${art.file}` : `poster-${d.wear}`)} width={POSTER_W * s} height={POSTER_H * s} style={{ position: 'absolute', left: 0, top: 0 }} />
      <div style={{ ...abs(B.portrait, s), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {portrait ? (
          <img src={portrait} style={{ width: B.portrait.w * s, height: B.portrait.h * s, objectFit: 'cover', opacity: 0.94 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: POSTER_INK, opacity: 0.85 }}>
            <svg width={300 * s} height={300 * s} viewBox="0 0 100 100">
              <circle cx="50" cy="36" r="20" fill={POSTER_INK} opacity="0.85" />
              <path d="M12 98 C14 70 32 60 50 60 C68 60 86 70 88 98 Z" fill={POSTER_INK} opacity="0.85" />
            </svg>
            <div style={{ fontFamily: 'Chivo Mono', fontSize: 22 * s, letterSpacing: 4 * s, marginTop: 10 * s }}>PORTRAIT ON FILE</div>
          </div>
        )}
      </div>
      <div style={{ ...abs(B.name, s), display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 900, color: POSTER_INK, fontSize: fitSize(name, B.name.w, Math.min(58, B.name.h * 0.92), custom ? 0.88 : 0.78) * s, letterSpacing: -1 * s, lineHeight: 1 }}>{name}</div>
      </div>
      <div style={{ ...abs(B.city, s), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 800, color: d.cityId ? cityEdition(d.cityId).ink : POSTER_RED, fontSize: fitSize(city, B.city.w, Math.min(40, B.city.h * 0.62), custom ? 0.9 : 0.78) * s, letterSpacing: 1 * s }}>{city}</div>
      </div>
      <div style={{ ...abs(B.reward, s), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Instrument Serif', color: POSTER_INK, fontSize: Math.min(44, B.reward.h * 0.85) * s, letterSpacing: 1 * s }}>One sold-out show.</div>
      </div>
      {hoods.length ? (
        <div style={{ ...abs(B.wantedIn, s), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Instrument Serif', color: POSTER_INK, fontSize: fitSize(`Most wanted in ${hoods.join(', ')}`, B.wantedIn.w, Math.min(30, B.wantedIn.h * 0.65), 0.42) * s }}>
            {`Most wanted in ${hoods.join(', ')}`}
          </div>
        </div>
      ) : null}
      {d.signatures.slice(0, 28).map((c) => {
        const spot = signatureSpot(c.number, art?.layout);
        return (
          <div
            key={c.number}
            style={{
              position: 'absolute',
              left: spot.x * s,
              top: spot.y * s,
              display: 'flex',
              transform: `rotate(${spot.rot}deg)`,
              fontFamily: SIGNATURE_FONTS[c.font % 3],
              fontSize: spot.size * s,
              color: c.number % 5 === 0 ? '#1d3a6b' : '#2a1a10',
              opacity: 0.86,
            }}
          >
            {`${c.initials} #${c.number}`}
          </div>
        );
      })}
      <div
        style={{
          ...abs(B.count, s),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          background: 'linear-gradient(145deg, #fff4c9 0%, #d9a640 38%, #8a5a12 70%, #f5d27a 100%)',
          border: `${4 * s}px solid #4a2c0c`,
          transform: 'rotate(-8deg)',
        }}
      >
        <div style={{ fontFamily: 'Chivo Mono', fontWeight: 700, fontSize: (d.count > 999 ? 40 : 54) * s, color: '#2b1806', lineHeight: 1 }}>{String(d.count)}</div>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 800, fontSize: 17 * s, color: '#2b1806', letterSpacing: 2 * s }}>SIGNED</div>
      </div>
      {d.played ? (
        <img src={img('stamp-caught-live')} width={820 * s} height={410 * s} style={{ position: 'absolute', left: 100 * s, top: 560 * s, transform: 'rotate(-12deg)', opacity: 0.92 }} />
      ) : null}
      {d.isDemo ? (
        <div style={{ position: 'absolute', left: 120 * s, top: 1462 * s, display: 'flex', fontFamily: 'Chivo Mono', fontSize: 18 * s, color: POSTER_INK, opacity: 0.7 }}>
          DEMO DATA
        </div>
      ) : null}
    </div>
  );
}

function Footer({ width, link, size = 1 }: { width: number; link: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width, color: '#fff7e8' }}>
      <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 800, fontSize: 30 * size, letterSpacing: 2 }}>SIGN IT</div>
      <div style={{ fontFamily: 'Chivo Mono', fontSize: 26 * size, marginTop: 6, color: '#ffd27a' }}>{link.replace(/^https?:\/\//, '')}</div>
      <div style={{ fontFamily: 'Instrument Serif', fontSize: 30 * size, marginTop: 14, opacity: 0.9 }}>{MADE_WITH}</div>
    </div>
  );
}

export async function renderPoster(d: PosterData, format: 'story' | 'wide' | 'poster'): Promise<Buffer> {
  const portrait = await portraitFor({ portrait: d.portrait, imageUrl: d.imageUrl });
  if (format === 'poster') return render(<Poster d={d} s={1} portrait={portrait} />, POSTER_W, POSTER_H);
  if (format === 'story') {
    const s = 900 / POSTER_W;
    const first = d.artistName.split(' ')[0];
    return render(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1080, height: 1920, backgroundColor: '#140a04' }}>
        <img src={img('backdrop')} width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
<div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, backgroundColor: 'rgba(10,5,2,0.5)' }} />
        <div style={{ display: 'flex', marginTop: 90, transform: 'rotate(-1.2deg)' }}>
          <Poster d={d} s={s} portrait={portrait} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 56, width: 900, position: 'relative' }}>
          <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 64, lineHeight: 1.05, color: '#fff7e8', textAlign: 'center' }}>{`${d.cityName} wants ${first}.`}</div>
          <div style={{ display: 'flex', marginTop: 28, padding: '20px 44px', borderRadius: 999, backgroundColor: '#ff6a1a', fontFamily: 'Archivo', fontWeight: 700, fontSize: 38, color: '#1a0c03' }}>Sign the poster</div>
          <div style={{ display: 'flex', marginTop: 22, fontFamily: 'Chivo Mono', fontSize: 28, color: '#ffd27a' }}>{d.link.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>,
      1080,
      1920,
    );
  }
  // 1200 x 630 link preview.
  const s = 600 / POSTER_H;
  return render(
    <div style={{ display: 'flex', width: 1200, height: 630, backgroundColor: '#24140a' }}>
      <img src={img('backdrop')} width={1200} height={1800} style={{ position: 'absolute', left: 0, top: -400, objectFit: 'cover' }} />
<div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundColor: 'rgba(10,5,2,0.5)' }} />
      <div style={{ display: 'flex', marginLeft: 70, marginTop: 15 }}>
        <Poster d={d} s={s} portrait={portrait} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: 60, width: 640, color: '#fff7e8', position: 'relative' }}>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 900, fontSize: 76, lineHeight: 0.95, color: '#ffcf6b' }}>WANTED</div>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 800, fontSize: 40, marginTop: 8 }}>{`IN ${d.cityName.toUpperCase()}`}</div>
        <div style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 44, marginTop: 22 }}>{d.artistName}</div>
        <div style={{ fontFamily: 'Archivo', fontWeight: 500, fontSize: 32, marginTop: 10, opacity: 0.9 }}>Reward: one sold-out show.</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
          <div style={{ fontFamily: 'Chivo Mono', fontWeight: 700, fontSize: 34, color: '#ffcf6b' }}>{`${d.count} signed`}</div>
          <div style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 26, marginLeft: 24, padding: '10px 22px', borderRadius: 999, backgroundColor: '#ff6a1a', color: '#1a0c03' }}>
            Sign the poster
          </div>
        </div>
        <div style={{ fontFamily: 'Archivo', fontWeight: 500, fontSize: 21, marginTop: 30, opacity: 0.7 }}>{MADE_WITH}</div>
      </div>
    </div>,
    1200,
    630,
  );
}

// ---------- signature card ----------

export type CardData = {
  artistName: string;
  cityId?: string;
  cityName: string;
  state: string;
  claim: ClaimView;
  played: { venue: string | null } | null;
  total: number;
  wear: 0 | 1 | 2 | 3;
  portrait: string | null;
  imageUrl: string | null;
  topNeighborhoods: string[];
  link: string;
};

const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();

export async function renderCard(d: CardData, format: 'story' | 'wide'): Promise<Buffer> {
  const portrait = await portraitFor({ portrait: d.portrait, imageUrl: d.imageUrl });
  const where = d.claim.neighborhood ? `${d.claim.neighborhood}, ${d.cityName}` : d.cityName;
  const when = [d.claim.deputy ? 'Deputy' : null, `Signed ${fmtDate(d.claim.createdAt)}`].filter(Boolean).join(' · ');
  const poster: PosterData = {
    artistName: d.artistName,
    cityId: d.cityId,
    cityName: d.cityName,
    state: d.state,
    count: d.total,
    wear: d.wear,
    topNeighborhoods: d.topNeighborhoods,
    signatures: [d.claim],
    played: false,
    portrait: d.portrait,
    imageUrl: d.imageUrl,
    link: d.link,
    isDemo: d.claim.isDemo,
  };
  const caught = d.played
    ? `CAUGHT LIVE · You were one of ${d.total} people who brought ${d.artistName.split(' ')[0]} to ${d.cityName}`
    : null;

  if (format === 'wide') {
    const s = 560 / POSTER_H;
    return render(
      <div style={{ display: 'flex', width: 1200, height: 630, backgroundColor: '#140c06' }}>
        <img src={img('backdrop')} width={1200} height={1800} style={{ position: 'absolute', left: 0, top: -500, objectFit: 'cover', opacity: 0.55 }} />
<div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundColor: 'rgba(10,5,2,0.5)' }} />
        <div style={{ display: 'flex', marginLeft: 70, marginTop: 35, transform: 'rotate(-3deg)' }}>
          <Poster d={poster} s={s} portrait={portrait} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: 70, width: 620, color: '#fff7e8', position: 'relative' }}>
          <div style={{ fontFamily: 'Chivo Mono', fontSize: 26, color: '#ffcf6b', letterSpacing: 3 }}>SIGNATURE</div>
          <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 900, fontSize: 120, lineHeight: 1 }}>{`#${d.claim.number}`}</div>
          <div style={{ display: 'flex', fontFamily: 'Archivo', fontWeight: 700, fontSize: 34, marginTop: 14 }}>{d.artistName}</div>
          <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 30, marginTop: 4, opacity: 0.9 }}>{`${where} · ${when}`}</div>
          {caught ? <div style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 26, marginTop: 18, color: '#ff5a3c' }}>{caught}</div> : null}
          <div style={{ fontFamily: 'Instrument Serif', fontSize: 22, marginTop: 26, opacity: 0.7 }}>{MADE_WITH}</div>
        </div>
        {d.claim.deputy ? <img src={img('deputy-star')} width={150} height={150} style={{ position: 'absolute', right: 40, top: 30 }} /> : null}
      </div>,
      1200,
      630,
    );
  }

  const s = 760 / POSTER_W;
  return render(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1080, height: 1920, backgroundColor: '#140a04' }}>
      <img src={img('backdrop')} width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
<div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, backgroundColor: 'rgba(10,5,2,0.5)' }} />
      <div style={{ display: 'flex', marginTop: 90, transform: 'rotate(-2deg)' }}>
        <Poster d={poster} s={s} portrait={portrait} />
      </div>
      {d.claim.deputy ? <img src={img('deputy-star')} width={230} height={230} style={{ position: 'absolute', right: 80, top: 1030, transform: 'rotate(12deg)' }} /> : null}
      {d.played ? <img src={img('stamp-caught-live')} width={900} height={450} style={{ position: 'absolute', left: 90, top: 540, transform: 'rotate(-14deg)' }} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 70, width: 900, position: 'relative' }}>
        <div style={{ display: 'flex', fontFamily: 'Chivo Mono', fontSize: 30, color: '#ffcf6b', letterSpacing: 6 }}>SIGNATURE</div>
        <div style={{ display: 'flex', fontFamily: 'Archivo Expanded', fontWeight: 900, fontSize: 190, lineHeight: 1, color: '#fff7e8' }}>{`#${d.claim.number}`}</div>
        <div style={{ display: 'flex', fontFamily: 'Archivo', fontWeight: 700, fontSize: 44, marginTop: 14, color: '#fff7e8' }}>{d.artistName}</div>
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 42, marginTop: 6, color: '#fff7e8', opacity: 0.9, textAlign: 'center' }}>{`${where} · ${when}`}</div>
        {caught ? <div style={{ display: 'flex', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, marginTop: 24, color: '#ff7a5c', textAlign: 'center' }}>{caught}</div> : null}
        <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 28, marginTop: 36, color: '#fff7e8', opacity: 0.65 }}>{MADE_WITH}</div>
      </div>
    </div>,
    1080,
    1920,
  );
}

// ---------- rap sheet ----------

export type RapSheetData = {
  artistName: string;
  isDemo: boolean;
  mugshot: string | null;
  imageUrl: string | null;
  stops: { city: string; state: string; date: string | null; room: string | null; signatures: number; line: string; caught: boolean }[];
  totalSignatures: number;
  neighborhoods: number;
  headline: string;
};

export async function renderRapSheet(d: RapSheetData): Promise<Buffer> {
  const mug = d.mugshot ? img(d.mugshot) : await portraitFor({ portrait: null, imageUrl: d.imageUrl });
  const rows = d.stops.slice(0, 10);
  return render(
    <div style={{ display: 'flex', flexDirection: 'column', width: 1080, height: 1920, backgroundColor: '#f3ead6', color: '#1d140c', padding: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '6px solid #1d140c', paddingBottom: 14 }}>
        <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 900, fontSize: 88, letterSpacing: -2 }}>RAP SHEET</div>
        <div style={{ fontFamily: 'Chivo Mono', fontSize: 24, marginBottom: 12 }}>{d.isDemo ? 'DEMO DATA' : 'WANTED · TOUR RECORD'}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 34 }}>
        <div style={{ display: 'flex', position: 'relative', width: 400, height: 480, overflow: 'hidden', border: '4px solid #1d140c', backgroundColor: '#e8dcc0' }}>
          {mug ? <img src={mug} width={400} height={480} style={{ objectFit: 'cover' }} /> : null}
          <div style={{ position: 'absolute', left: 90, top: 300, width: 220, height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#151515', color: '#f2f2f2' }}>
            <div style={{ fontFamily: 'Chivo Mono', fontWeight: 700, fontSize: 22 }}>{d.artistName.toUpperCase().slice(0, 16)}</div>
            <div style={{ fontFamily: 'Chivo Mono', fontSize: 16, marginTop: 4 }}>{`WANTED IN ${rows.length}`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, width: 520 }}>
          <div style={{ fontFamily: 'Chivo Mono', fontSize: 22, opacity: 0.7 }}>NAME</div>
          <div style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 50 }}>{d.artistName}</div>
          <div style={{ fontFamily: 'Chivo Mono', fontSize: 22, opacity: 0.7, marginTop: 20 }}>CHARGES</div>
          <div style={{ fontFamily: 'Instrument Serif', fontSize: 40, lineHeight: 1.15 }}>{d.headline}</div>
          <div style={{ display: 'flex', marginTop: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 40 }}>
              <div style={{ fontFamily: 'Chivo Mono', fontWeight: 700, fontSize: 56 }}>{String(d.totalSignatures)}</div>
              <div style={{ fontFamily: 'Chivo Mono', fontSize: 20 }}>SIGNATURES</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'Chivo Mono', fontWeight: 700, fontSize: 56 }}>{String(d.neighborhoods)}</div>
              <div style={{ fontFamily: 'Chivo Mono', fontSize: 20 }}>NEIGHBORHOODS</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid #1d140c', padding: '14px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 32 }}>{`${r.city}, ${r.state}`}</div>
              <div style={{ fontFamily: 'Chivo Mono', fontSize: 24 }}>{`${r.date ?? ''}  ${r.signatures} SIG`}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontFamily: 'Chivo Mono', fontSize: 22, opacity: 0.8 }}>{r.room ?? 'room TBD'}</div>
              {r.caught ? <div style={{ fontFamily: 'Archivo Expanded', fontWeight: 900, fontSize: 20, color: POSTER_RED }}>CAUGHT LIVE</div> : null}
            </div>
            <div style={{ fontFamily: 'Instrument Serif', fontSize: 26, marginTop: 4 }}>{`Gus: ${r.line}`}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 50, left: 60, right: 60, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Instrument Serif', fontSize: 28 }}>{MADE_WITH}</div>
        <img src={img('gus-mark')} width={96} height={96} style={{ borderRadius: 20 }} />
      </div>
    </div>,
    1080,
    1920,
  );
}

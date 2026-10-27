/**
 * Share images (FR-18, FR-23b, Rap Sheet): WANTED poster (1080x1920 story, 1200x630 link
 * preview, 1024x1536 print), Signature Card, the artist's story posts and the Rap Sheet.
 * Rendered with satori to SVG and resvg to PNG, in the app's own look: Wanted Rounded, cream
 * paper and orange, raised dark cards on a warm ground lit like the map's heat, and our art.
 * Every image carries "Made with Wanted. Find out where you're wanted."
 */
import type { ReactNode } from 'react';
import { MADE_WITH, POSTER_H, POSTER_W, SIGNATURE_FONTS } from '../lib/poster';
import type { ClaimView } from '../lib/types';
import { nodeRequire } from './node-require';

type FontDef = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' };

const fs = () => process.getBuiltinModule('node:fs') as typeof import('node:fs');
const path = () => process.getBuiltinModule('node:path') as typeof import('node:path');
// The repo root: where the app runs from locally, one up when Next serves from web/ (Vercel).
let rootDir: string | null = null;
const root = () => (rootDir ??= [process.cwd(), path().join(process.cwd(), '..')].find((d) => fs().existsSync(path().join(d, 'assets/og'))) ?? process.cwd());

const FACE = 'Wanted Rounded';

let fontCache: FontDef[] | null = null;
function fonts(): FontDef[] {
  if (fontCache) return fontCache;
  const read = (f: string) => fs().readFileSync(path().join(root(), 'assets/fonts', `${f}.ttf`));
  fontCache = [
    { name: FACE, data: read('WantedRounded-600'), weight: 600, style: 'normal' },
    { name: FACE, data: read('WantedRounded-700'), weight: 700, style: 'normal' },
    { name: FACE, data: read('WantedRounded-800'), weight: 800, style: 'normal' },
    { name: FACE, data: read('WantedRounded-900'), weight: 900, style: 'normal' },
    // Fans' signatures stay handwritten.
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
  const file = assetFile(name);
  if (!file) throw new Error(`missing og asset ${name}`);
  const uri = `data:image/${file.endsWith('jpg') ? 'jpeg' : 'png'};base64,${fs().readFileSync(file).toString('base64')}`;
  imgCache.set(name, uri);
  return uri;
}
const assetFile = (name: string) => ['png', 'jpg'].map((e) => path().join(root(), 'assets/og', `${name}.${e}`)).find((p) => fs().existsSync(p));

const sharpLib = () => {
  const mod = nodeRequire<{ default?: typeof import('sharp').default } & typeof import('sharp').default>('sharp');
  return mod.default ?? mod;
};

// ---------- the look ----------

const C = {
  ground: '#12110E',
  raise: 'linear-gradient(180deg, #2D2B26 0%, #1F1E1A 100%)',
  ink: '#F3EFE6',
  ink2: '#A8A397',
  ink3: '#77726A',
  veil: 'rgba(255,248,230,0.09)',
  wanted: '#FF5A1F',
  wantedText: '#FF8A4C',
  paper: '#F6EFE3',
  paperInk: '#1B1712',
  paperInk2: '#6E6457',
  paperOrange: '#E2470F',
};

/** The warm dark ground, lit from where the card sits like a hot city on the map. */
const ground = (w: number, h: number, at = '50% 36%') => ({
  display: 'flex' as const,
  width: w,
  height: h,
  backgroundColor: C.ground,
  backgroundImage: `radial-gradient(circle at ${at}, rgba(255,106,26,0.36), rgba(214,84,30,0.12) 36%, rgba(18,17,14,0) 64%)`,
  fontFamily: FACE,
  color: C.ink,
});

const bare = (link: string) => link.replace(/^https?:\/\//, '');

function Kicker({ children, size = 26, color = C.wantedText }: { children: string; size?: number; color?: string }) {
  return <div style={{ display: 'flex', fontWeight: 700, fontSize: size, letterSpacing: size * 0.08, color }}>{children.toUpperCase()}</div>;
}

/** The light key and the link under it: the one thing to do. */
function Key({ label, link, size = 1 }: { label: string; link: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 104 * size, padding: `0 ${52 * size}px`, borderRadius: 999, backgroundColor: C.ink, color: C.paperInk, fontWeight: 800, fontSize: 38 * size }}>
        {label}
      </div>
      <div style={{ display: 'flex', marginTop: 24 * size, fontWeight: 700, fontSize: 30 * size, color: C.ink2 }}>{bare(link)}</div>
    </div>
  );
}

/** Fifty lit segments, the same meter the app shows under every poster. */
function Meter({ count, width, height = 26, on = C.wanted, off = C.veil }: { count: number; width: number; height?: number; on?: string; off?: string }) {
  const gap = 4;
  const w = (width - gap * 49) / 50;
  return (
    <div style={{ display: 'flex', width, height }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{ width: w, height, marginLeft: i ? gap : 0, borderRadius: Math.min(4, w / 2), backgroundColor: i < count ? on : off }} />
      ))}
    </div>
  );
}

/** The top of every post: a little island with Gus and who it's about. */
function Island({ text, size = 1 }: { text: string; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 84 * size, padding: `0 ${34 * size}px 0 ${12 * size}px`, borderRadius: 999, backgroundColor: '#000', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
      <img src={img('gus-glyph')} width={60 * size} height={60 * size} />
      <div style={{ display: 'flex', marginLeft: 16 * size, fontWeight: 700, fontSize: 30 * size, color: C.ink }}>{text}</div>
    </div>
  );
}

function MadeWith({ size = 24 }: { size?: number }) {
  return <div style={{ display: 'flex', fontWeight: 600, fontSize: size, color: C.ink3 }}>{MADE_WITH}</div>;
}

// ---------- portrait print ----------

/**
 * The artist as a two-tone print in our inks: shadows in poster ink, mids in Wanted orange,
 * highlights in the paper. Same treatment for our own portraits and for Qloo photos.
 */
const printCache = new Map<string, string | null>();
async function printFor(artist: { portrait: string | null; imageUrl: string | null }): Promise<string | null> {
  const key = artist.portrait ?? artist.imageUrl;
  if (!key) return null;
  if (printCache.has(key)) return printCache.get(key)!;
  try {
    let src: Buffer;
    if (artist.portrait) {
      const f = assetFile(artist.portrait);
      if (!f) throw new Error('missing portrait');
      src = fs().readFileSync(f);
    } else {
      const res = await fetch(artist.imageUrl!);
      if (!res.ok) throw new Error(String(res.status));
      src = Buffer.from(await res.arrayBuffer());
    }
    const W = 840;
    const H = 700;
    const { data } = await sharpLib()(src).flatten({ background: C.paper }).resize(W, H, { fit: 'cover', position: 'attention' }).greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
    const stops: [number, [number, number, number]][] = [
      [0, [27, 23, 18]],
      [0.5, [226, 71, 15]],
      [0.78, [244, 160, 110]],
      [1, [246, 239, 227]],
    ];
    const lut = Array.from({ length: 256 }, (_, v) => {
      const t = v / 255;
      const i = Math.max(0, stops.findIndex(([at]) => at >= t) - 1);
      const [a, ca] = stops[i];
      const [b, cb] = stops[Math.min(i + 1, stops.length - 1)];
      const k = b === a ? 0 : (t - a) / (b - a);
      return ca.map((x, j) => Math.round(x + (cb[j] - x) * k));
    });
    const out = Buffer.alloc(W * H * 3);
    for (let p = 0; p < W * H; p++) {
      const c = lut[data[p]];
      out[p * 3] = c[0];
      out[p * 3 + 1] = c[1];
      out[p * 3 + 2] = c[2];
    }
    const png = await sharpLib()(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
    const uri = `data:image/png;base64,${png.toString('base64')}`;
    printCache.set(key, uri);
    return uri;
  } catch {
    printCache.set(key, null);
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

/** Font size that keeps a line inside its box (Wanted Rounded runs about 0.6em a letter). */
function fit(text: string, boxW: number, base: number, charW = 0.6) {
  return Math.min(base, Math.floor(boxW / Math.max(1, text.length * charW)));
}

const rand = (n: number, k: number) => {
  const s = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The poster itself at scale s (1 = 1024 x 1536): cream paper inside an orange rule, WANTED
 * up top, the artist as a two-tone print with the count on a seal, who and where, the
 * reward, and the fans' signatures piling up along the bottom.
 */
function Poster({ d, s, print }: { d: PosterData; s: number; print: string | null }) {
  const city = `in ${d.cityName}, ${d.state}`;
  const hoods = d.topNeighborhoods.slice(0, 3);
  const most = hoods.length ? `Most wanted in ${hoods.join(', ')}` : null;
  const inner = POSTER_W - 80;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: POSTER_W * s, height: POSTER_H * s, borderRadius: 36 * s, backgroundColor: C.paper, fontFamily: FACE, color: C.paperInk }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: (inner - 12) * s, height: (POSTER_H - 92) * s, borderRadius: 22 * s, border: `${6 * s}px solid ${C.paperOrange}`, paddingTop: 34 * s }}>
        <div style={{ display: 'flex', fontWeight: 900, fontSize: 206 * s, lineHeight: 1, letterSpacing: -6 * s }}>WANTED</div>
        <div style={{ display: 'flex', marginTop: 8 * s, fontWeight: 800, fontSize: fit(city, inner - 80, 56, 0.56) * s, color: C.paperOrange }}>{city}</div>

        <div style={{ position: 'relative', display: 'flex', marginTop: 34 * s, width: 840 * s, height: 700 * s, borderRadius: 28 * s, overflow: 'hidden', backgroundColor: '#E9DCC8' }}>
          {print ? (
            <img src={print} width={840 * s} height={700 * s} />
          ) : (
            <div style={{ display: 'flex', width: 840 * s, height: 700 * s, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paperOrange }}>
              <div style={{ display: 'flex', fontWeight: 900, fontSize: 300 * s, color: C.paper }}>{d.artistName.slice(0, 1).toUpperCase()}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', marginTop: 30 * s, fontWeight: 900, fontSize: fit(d.artistName, inner - 80, 104, 0.6) * s, lineHeight: 1, letterSpacing: -2 * s }}>{d.artistName}</div>
        <div style={{ display: 'flex', marginTop: 18 * s, fontWeight: 800, fontSize: 42 * s, color: C.paperInk }}>Reward: one sold-out show.</div>
        {most ? <div style={{ display: 'flex', marginTop: 10 * s, fontWeight: 700, fontSize: fit(most, inner - 100, 28, 0.5) * s, color: C.paperInk2 }}>{most}</div> : null}
      </div>

      {/* The seal: how many have signed, lifted off the corner of the print. */}
      <div
        style={{
          position: 'absolute',
          left: 760 * s,
          top: 830 * s,
          width: 200 * s,
          height: 200 * s,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: C.wanted,
          border: `${8 * s}px solid ${C.paper}`,
          boxShadow: `0 ${10 * s}px ${24 * s}px rgba(60,20,4,0.35)`,
          transform: 'rotate(-8deg)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', fontWeight: 900, fontSize: (d.count > 999 ? 56 : 76) * s, lineHeight: 1 }}>{String(d.count)}</div>
        <div style={{ display: 'flex', fontWeight: 800, fontSize: 24 * s, marginTop: 2 * s }}>signed</div>
      </div>

      {d.signatures.slice(0, 15).map((c, i) => {
        const x = 96 + (i % 5) * 166 + rand(c.number, 2) * 40 + (Math.floor(i / 5) % 2) * 60;
        const y = 1384 + Math.floor(i / 5) * 38 + rand(c.number, 4) * 10;
        return (
          <div
            key={c.number}
            style={{
              position: 'absolute',
              left: x * s,
              top: y * s,
              display: 'flex',
              transform: `rotate(${-7 + rand(c.number, 3) * 14}deg)`,
              fontFamily: SIGNATURE_FONTS[c.font % 3],
              fontSize: (22 + rand(c.number, 1) * 6) * s,
              color: c.number % 5 === 0 ? '#1D3A6B' : C.paperInk,
              opacity: 0.78,
            }}
          >
            {`${c.initials} #${c.number}`}
          </div>
        );
      })}

      {d.played ? (
        <div
          style={{
            position: 'absolute',
            left: 170 * s,
            top: 600 * s,
            display: 'flex',
            padding: `${18 * s}px ${44 * s}px`,
            borderRadius: 30 * s,
            border: `${10 * s}px solid ${C.paperOrange}`,
            color: C.paperOrange,
            backgroundColor: 'rgba(246,239,227,0.82)',
            fontWeight: 900,
            fontSize: 120 * s,
            letterSpacing: -2 * s,
            transform: 'rotate(-12deg)',
          }}
        >
          Caught live
        </div>
      ) : null}
      {d.isDemo ? <div style={{ position: 'absolute', right: 64 * s, top: 54 * s, display: 'flex', fontWeight: 700, fontSize: 18 * s, color: C.paperInk2 }}>Demo</div> : null}
    </div>
  );
}

export async function renderPoster(d: PosterData, format: 'story' | 'wide' | 'poster'): Promise<Buffer> {
  const print = await printFor({ portrait: d.portrait, imageUrl: d.imageUrl });
  if (format === 'poster') return render(<Poster d={d} s={1} print={print} />, POSTER_W, POSTER_H);
  const first = d.artistName.split(' ')[0];
  const sentence = d.count >= 50 ? `${d.count} signed. Gus is asking the rooms.` : `${d.count} signed. At fifty, Gus asks the rooms.`;
  if (format === 'story') {
    const s = 820 / POSTER_W;
    return render(
      <div style={{ ...ground(1080, 1920, '50% 34%'), flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', marginTop: 96 }}>
          <Island text={`${d.artistName} · ${d.cityName}`} />
        </div>
        <div style={{ display: 'flex', marginTop: 56, transform: 'rotate(-2deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', borderRadius: 30 }}>
          <Poster d={d} s={s} print={print} />
        </div>
        <div style={{ display: 'flex', marginTop: 64, fontWeight: 800, fontSize: 76, lineHeight: 1.05, letterSpacing: -1.5 }}>{`${d.cityName} wants ${first}.`}</div>
        <div style={{ display: 'flex', marginTop: 16, fontWeight: 600, fontSize: 34, color: C.ink2 }}>{sentence}</div>
        <div style={{ display: 'flex', marginTop: 44 }}>
          <Key label="Sign the poster" link={d.link} />
        </div>
      </div>,
      1080,
      1920,
    );
  }
  // 1200 x 630 link preview.
  const s = 560 / POSTER_H;
  return render(
    <div style={{ ...ground(1200, 630, '24% 50%'), alignItems: 'center' }}>
      <div style={{ display: 'flex', marginLeft: 76, transform: 'rotate(-2deg)', boxShadow: '0 30px 60px rgba(0,0,0,0.55)', borderRadius: 14 }}>
        <Poster d={d} s={s} print={print} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 64, width: 640 }}>
        <Kicker>{`Wanted in ${d.cityName}`}</Kicker>
        <div style={{ display: 'flex', marginTop: 12, fontWeight: 800, fontSize: fit(d.artistName, 640, 78, 0.58), lineHeight: 1.04, letterSpacing: -1.5 }}>{d.artistName}</div>
        <div style={{ display: 'flex', marginTop: 12, fontWeight: 600, fontSize: 30, color: C.ink2 }}>Reward: one sold-out show.</div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 34 }}>
          <div style={{ display: 'flex', fontWeight: 900, fontSize: 64, lineHeight: 1, color: C.wantedText }}>{String(d.count)}</div>
          <div style={{ display: 'flex', marginLeft: 14, fontWeight: 700, fontSize: 28, color: C.ink2 }}>signed so far</div>
        </div>
        <div style={{ display: 'flex', marginTop: 16 }}>
          <Meter count={d.count} width={560} height={18} />
        </div>
        <div style={{ display: 'flex', marginTop: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 64, padding: '0 32px', borderRadius: 999, backgroundColor: C.ink, color: C.paperInk, fontWeight: 800, fontSize: 26 }}>Sign the poster</div>
        </div>
      </div>
    </div>,
    1200,
    630,
  );
}

// ---------- announcements: the artist's own story posts ----------

/**
 * What the artist posts when something happens: the draw is picked, or the city got its show.
 * Story size (1080 x 1920), built like the app's hero cards: a raised card with our art breaking
 * out of the corner, a kicker, the one line that matters, one number with its meter and a
 * sentence. Under it the light key and the link fans use to sign, so every post brings in the
 * next city.
 */
export type AnnounceData = PosterData &
  ({ kind: 'winner'; number: number; neighborhood: string | null; prize: string; entries: number } | { kind: 'booked'; venue: string; date: string });

export async function renderAnnounce(d: AnnounceData): Promise<Buffer> {
  const first = d.artistName.split(' ')[0];
  const booked = d.kind === 'booked';
  const [day, md] = booked ? (d.date.includes(', ') ? d.date.split(', ') : ['', d.date]) : ['', ''];
  return render(
    <div style={{ ...ground(1080, 1920, '50% 40%'), flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', marginTop: 120 }}>
        <Island text={`${d.artistName} · ${d.cityName}, ${d.state}`} />
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 796, padding: '84px 72px 72px', borderRadius: 64, backgroundImage: C.raise, boxShadow: 'inset 0 2px 0 rgba(255,248,230,0.08), 0 40px 90px rgba(0,0,0,0.6)' }}>
        <img
          src={img(booked ? 'art-door' : 'art-ticket')}
          width={booked ? 330 : 360}
          height={booked ? 330 : 360}
          style={{ position: 'absolute', right: booked ? -10 : -40, top: booked ? -210 : -200, transform: booked ? 'rotate(6deg)' : 'rotate(-10deg)' }}
        />
        <Kicker size={28}>{booked ? `Booked · ${d.cityName}` : `The ${d.cityName} draw`}</Kicker>
        {booked ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
            <div style={{ display: 'flex', fontWeight: 800, fontSize: 112, lineHeight: 1.02, letterSpacing: -3 }}>{md}</div>
            <div style={{ display: 'flex', fontWeight: 800, fontSize: 64, lineHeight: 1.08, letterSpacing: -1.5, color: C.ink2 }}>{day}</div>
            <div style={{ display: 'flex', marginTop: 26, fontWeight: 700, fontSize: fit(`at ${d.venue}`, 790, 56, 0.56), lineHeight: 1.1 }}>{`at ${d.venue}`}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
            <div style={{ display: 'flex', fontWeight: 900, fontSize: 220, lineHeight: 0.92, letterSpacing: -8 }}>{`#${d.number}`}</div>
            <div style={{ display: 'flex', marginTop: 22, fontWeight: 800, fontSize: 60, lineHeight: 1.08, letterSpacing: -1.2 }}>{d.neighborhood ? `${d.neighborhood}, you won.` : 'You won.'}</div>
            <div style={{ display: 'flex', marginTop: 14, fontWeight: 600, fontSize: 34, lineHeight: 1.3, color: C.ink2 }}>{d.prize}</div>
          </div>
        )}

        <div style={{ display: 'flex', height: 2, marginTop: 56, marginBottom: 48, backgroundColor: 'rgba(255,248,230,0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', fontWeight: 900, fontSize: 112, lineHeight: 1, letterSpacing: -3, color: C.wantedText }}>{String(booked ? d.count : d.entries)}</div>
          <div style={{ display: 'flex', marginLeft: 20, fontWeight: 700, fontSize: 38, color: C.ink2 }}>{booked ? 'fans signed for this' : 'chances in the hat'}</div>
        </div>
        {booked ? (
          <div style={{ display: 'flex', marginTop: 24 }}>
            <Meter count={d.count} width={796} height={30} />
          </div>
        ) : null}
        <div style={{ display: 'flex', marginTop: 24, fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: C.ink2 }}>
          {booked ? `${d.cityName} asked, so ${first} is coming.` : 'Picked fairly, one chance per signature.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', marginBottom: 54, fontWeight: 800, fontSize: 52, letterSpacing: -1 }}>{booked ? 'Want your city next?' : 'Your city next?'}</div>
      <Key label="Sign a poster" link={d.link} />
      <div style={{ display: 'flex', marginTop: 44, marginBottom: 90 }}>
        <MadeWith />
      </div>
    </div>,
    1080,
    1920,
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

const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

export async function renderCard(d: CardData, format: 'story' | 'wide'): Promise<Buffer> {
  const print = await printFor({ portrait: d.portrait, imageUrl: d.imageUrl });
  const where = d.claim.neighborhood ? `${d.claim.neighborhood}, ${d.cityName}` : d.cityName;
  const when = `Signed ${fmtDate(d.claim.createdAt)}`;
  const first = d.artistName.split(' ')[0];
  const poster: PosterData = {
    artistName: d.artistName,
    cityId: d.cityId,
    cityName: d.cityName,
    state: d.state,
    count: d.total,
    wear: d.wear,
    topNeighborhoods: d.topNeighborhoods,
    signatures: [d.claim],
    played: !!d.played,
    portrait: d.portrait,
    imageUrl: d.imageUrl,
    link: d.link,
    isDemo: d.claim.isDemo,
  };
  const line = d.played ? `You were one of ${d.total} who brought ${first} to ${d.cityName}.` : `One of ${d.total} bringing ${first} to ${d.cityName}.`;
  const kicker = d.claim.deputy ? 'Deputy signature' : 'Signature';

  if (format === 'wide') {
    const s = 560 / POSTER_H;
    return render(
      <div style={{ ...ground(1200, 630, '24% 50%'), alignItems: 'center' }}>
        <div style={{ display: 'flex', marginLeft: 76, transform: 'rotate(-3deg)', boxShadow: '0 30px 60px rgba(0,0,0,0.55)', borderRadius: 14 }}>
          <Poster d={poster} s={s} print={print} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 64, width: 640 }}>
          <Kicker>{kicker}</Kicker>
          <div style={{ display: 'flex', marginTop: 6, fontWeight: 900, fontSize: 132, lineHeight: 1, letterSpacing: -4 }}>{`#${d.claim.number}`}</div>
          <div style={{ display: 'flex', marginTop: 12, fontWeight: 800, fontSize: 36 }}>{d.artistName}</div>
          <div style={{ display: 'flex', marginTop: 6, fontWeight: 600, fontSize: 26, color: C.ink2 }}>{`${where} · ${when}`}</div>
          <div style={{ display: 'flex', marginTop: 22, fontWeight: 700, fontSize: 26, lineHeight: 1.25, color: d.played ? C.wantedText : C.ink2 }}>{line}</div>
          <div style={{ display: 'flex', marginTop: 30 }}>
            <MadeWith size={20} />
          </div>
        </div>
        {d.claim.deputy ? <img src={img('art-seal')} width={140} height={140} style={{ position: 'absolute', right: 40, top: 30, transform: 'rotate(10deg)' }} /> : null}
      </div>,
      1200,
      630,
    );
  }

  const s = 700 / POSTER_W;
  return render(
    <div style={{ ...ground(1080, 1920, '50% 32%'), flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', marginTop: 96 }}>
        <Island text={`${d.artistName} · ${d.cityName}`} />
      </div>
      <div style={{ position: 'relative', display: 'flex', marginTop: 56 }}>
        <div style={{ display: 'flex', transform: 'rotate(-2deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', borderRadius: 26 }}>
          <Poster d={poster} s={s} print={print} />
        </div>
        {d.claim.deputy ? <img src={img('art-seal')} width={220} height={220} style={{ position: 'absolute', right: -90, top: 640, transform: 'rotate(12deg)' }} /> : null}
      </div>
      <div style={{ display: 'flex', marginTop: 64 }}>
        <Kicker size={28}>{kicker}</Kicker>
      </div>
      <div style={{ display: 'flex', marginTop: 4, fontWeight: 900, fontSize: 180, lineHeight: 1, letterSpacing: -6 }}>{`#${d.claim.number}`}</div>
      <div style={{ display: 'flex', marginTop: 14, fontWeight: 700, fontSize: 36, color: C.ink2 }}>{`${where} · ${when}`}</div>
      <div style={{ display: 'flex', marginTop: 20, width: 880, justifyContent: 'center', textAlign: 'center', fontWeight: 800, fontSize: 40, lineHeight: 1.2, color: d.played ? C.wantedText : C.ink }}>{line}</div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', marginBottom: 90 }}>
        <MadeWith />
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

/** The whole run on one page: the artist's print, two numbers, then every stop. */
export async function renderRapSheet(d: RapSheetData): Promise<Buffer> {
  const print = await printFor({ portrait: d.mugshot, imageUrl: d.imageUrl });
  const rows = d.stops.slice(0, 10);
  return render(
    <div style={{ ...ground(1080, 1920, '30% 12%') }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 952, height: 1792, margin: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Island text={d.artistName} />
        <div style={{ display: 'flex', fontWeight: 700, fontSize: 24, color: C.ink3 }}>{d.isDemo ? 'Demo' : 'The run so far'}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 48 }}>
        <div style={{ display: 'flex', width: 360, height: 420, borderRadius: 40, overflow: 'hidden', backgroundColor: C.paperOrange }}>
          {print ? <img src={print} width={504} height={420} style={{ marginLeft: -72 }} /> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 44, width: 548 }}>
          <Kicker>Wanted</Kicker>
          <div style={{ display: 'flex', marginTop: 8, fontWeight: 800, fontSize: fit(d.artistName, 548, 64, 0.58), lineHeight: 1.04, letterSpacing: -1.5 }}>{d.artistName}</div>
          <div style={{ display: 'flex', marginTop: 16, fontWeight: 600, fontSize: 30, lineHeight: 1.3, color: C.ink2 }}>{d.headline}</div>
          <div style={{ display: 'flex', marginTop: 34 }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 52 }}>
              <div style={{ display: 'flex', fontWeight: 900, fontSize: 76, lineHeight: 1, color: C.wantedText }}>{String(d.totalSignatures)}</div>
              <div style={{ display: 'flex', marginTop: 6, fontWeight: 700, fontSize: 24, color: C.ink2 }}>signatures</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontWeight: 900, fontSize: 76, lineHeight: 1 }}>{String(d.neighborhoods)}</div>
              <div style={{ display: 'flex', marginTop: 6, fontWeight: 700, fontSize: 24, color: C.ink2 }}>neighborhoods</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48, padding: '12px 40px', borderRadius: 48, backgroundImage: C.raise, boxShadow: 'inset 0 2px 0 rgba(255,248,230,0.08), 0 30px 60px rgba(0,0,0,0.5)' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderTop: i ? '2px solid rgba(255,248,230,0.07)' : '0px solid transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', fontWeight: 800, fontSize: 34 }}>{`${r.city}, ${r.state}`}</div>
              <div style={{ display: 'flex', fontWeight: 700, fontSize: 26, color: C.ink2 }}>{[r.date, r.signatures ? `${r.signatures} signed` : null].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ display: 'flex', fontWeight: 600, fontSize: 25, color: C.ink2 }}>{r.room ?? 'Room to come'}</div>
              {r.caught ? <div style={{ display: 'flex', fontWeight: 800, fontSize: 22, color: C.wantedText }}>Caught live</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <MadeWith />
      </div>
    </div>,
    1080,
    1920,
  );
}

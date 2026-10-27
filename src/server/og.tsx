/**
 * Share images (FR-18, FR-23b, Rap Sheet): WANTED poster (1080x1920 story, 1200x630 link
 * preview, 1024x1536 print), Signature Card, the artist's story posts and the Rap Sheet.
 * Rendered with satori to SVG and resvg to PNG, in the app's own look: Wanted Rounded, cream
 * paper and orange, raised dark cards on a warm ground lit like the map's heat, and our art.
 * Every image carries "Made with Wanted. Find out where you're wanted."
 */
import type { ReactNode } from 'react';
import { MADE_WITH, POSTER_H, POSTER_W, SIGNATURE_FONTS, regionFor } from '../lib/poster';
import type { ClaimView } from '../lib/types';
import { nodeRequire } from './node-require';
import { SCENE_H, SCENE_W, sceneFor, type SceneTheme } from './scenes';

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

/**
 * The warm dark ground, lit from where the card sits like a hot city on the map. Given a city,
 * the ground takes that city's night: its ink, lit in its own color.
 */
const ground = (w: number, h: number, at = '50% 36%', city?: SceneTheme) => ({
  display: 'flex' as const,
  width: w,
  height: h,
  backgroundColor: city ? mix(city.ink, '#000000', 0.35) : C.ground,
  backgroundImage: city
    ? `radial-gradient(circle at ${at}, ${alpha(city.accent, 0.42)}, ${alpha(city.accent, 0.12)} 38%, ${alpha(city.accent, 0)} 66%)`
    : `radial-gradient(circle at ${at}, rgba(255,106,26,0.36), rgba(214,84,30,0.12) 36%, rgba(18,17,14,0) 64%)`,
  fontFamily: FACE,
  color: C.ink,
});

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const alpha = (hex: string, a: number) => `rgba(${rgb(hex).join(',')},${a})`;
const mix = (a: string, b: string, k: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

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

// ---------- the artist and their city ----------

/**
 * What a poster is made of: the city's painted scene and its palette, and the artist. Our demo
 * act stands in the scene in full; any other act is their photo, round, pinned up in it.
 */
type Art = { scene: string; theme: SceneTheme; figure: string | null; face: string | null };

const sceneCache = new Map<string, string>();
function scenePng(cityId: string | undefined, state: string): { uri: string; theme: SceneTheme } {
  const sc = sceneFor(cityId, regionFor(state));
  const key = sc.svg.length + (cityId ?? state);
  let uri = sceneCache.get(key);
  if (!uri) {
    const { Resvg } = nodeRequire<typeof import('@resvg/resvg-js')>('@resvg/resvg-js');
    uri = `data:image/png;base64,${Buffer.from(new Resvg(sc.svg, { fitTo: { mode: 'width', value: SCENE_W } }).render().asPng()).toString('base64')}`;
    sceneCache.set(key, uri);
  }
  return { uri, theme: sc.theme };
}

const OUR_ACT = new Set(['maya-engraving', 'maya-mugshot']);
const photoCache = new Map<string, string | null>();
async function photo(url: string): Promise<string | null> {
  if (photoCache.has(url)) return photoCache.get(url)!;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const png = await sharpLib()(Buffer.from(await res.arrayBuffer())).resize(600, 600, { fit: 'cover', position: 'attention' }).png().toBuffer();
    const uri = `data:image/png;base64,${png.toString('base64')}`;
    photoCache.set(url, uri);
    return uri;
  } catch {
    photoCache.set(url, null);
    return null;
  }
}

async function artFor(d: { cityId?: string; state: string; portrait: string | null; imageUrl: string | null }): Promise<Art> {
  const { uri, theme } = scenePng(d.cityId, d.state);
  if (d.portrait && OUR_ACT.has(d.portrait)) return { scene: uri, theme, figure: img('maya-full'), face: img('maya-avatar') };
  return { scene: uri, theme, figure: null, face: d.imageUrl ? await photo(d.imageUrl) : null };
}

/** The full-length figure's width over its height. */
const FIGURE_RATIO = 728 / 1503;

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
 * The poster itself at scale s (1 = 1024 x 1536). The city fills the top, painted, with WANTED
 * across its sky and the artist standing in it, hair over the letters. Below, a paper panel in
 * the city's own colors: who, the reward, where they're most wanted, and the fans' signatures.
 * The count sits on a seal where the two meet.
 */
const PANEL_Y = 1010;
function Poster({ d, s, art }: { d: PosterData; s: number; art: Art }) {
  const t = art.theme;
  const hoods = d.topNeighborhoods.slice(0, 3);
  const most = hoods.length ? `Most wanted in ${hoods.join(', ')}` : null;
  const cx = t.standAt * POSTER_W;
  const figH = 1060;
  const figW = figH * FIGURE_RATIO;
  const name = d.artistName;
  return (
    <div style={{ position: 'relative', display: 'flex', width: POSTER_W * s, height: POSTER_H * s, borderRadius: 40 * s, overflow: 'hidden', backgroundColor: t.paper, fontFamily: FACE, color: t.ink }}>
      <img src={art.scene} width={SCENE_W * s} height={SCENE_H * s} style={{ position: 'absolute', left: 0, top: 0 }} />
      <div style={{ position: 'absolute', left: 0, top: 56 * s, width: POSTER_W * s, display: 'flex', justifyContent: 'center', fontWeight: 800, fontSize: 30 * s, letterSpacing: 7 * s, color: t.word }}>
        {`${d.cityName}, ${d.state}`.toUpperCase()}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 96 * s, width: POSTER_W * s, display: 'flex', justifyContent: 'center', fontWeight: 900, fontSize: 212 * s, lineHeight: 1, letterSpacing: -7 * s, color: t.word, textShadow: `0 ${6 * s}px ${30 * s}px rgba(30,10,40,0.22)` }}>
        WANTED
      </div>

      {art.figure ? (
        <img src={art.figure} width={figW * s} height={figH * s} style={{ position: 'absolute', left: (cx - figW / 2) * s, top: 236 * s, transform: t.flip ? 'scaleX(-1)' : 'none' }} />
      ) : (
        <div style={{ position: 'absolute', left: (cx - 270) * s, top: 400 * s, width: 540 * s, height: 540 * s, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, overflow: 'hidden', border: `${14 * s}px solid ${t.paper}`, backgroundColor: t.accent, boxShadow: `0 ${24 * s}px ${60 * s}px rgba(20,10,30,0.4)` }}>
          {art.face ? <img src={art.face} width={512 * s} height={512 * s} /> : <div style={{ display: 'flex', fontWeight: 900, fontSize: 260 * s, color: t.paper }}>{name.slice(0, 1).toUpperCase()}</div>}
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, top: PANEL_Y * s, bottom: 0, display: 'flex', flexDirection: 'column', padding: `${58 * s}px ${72 * s}px 0`, backgroundColor: t.paper, borderRadius: `${48 * s}px ${48 * s}px 0 0`, boxShadow: `0 ${-18 * s}px ${50 * s}px rgba(20,10,30,0.25)` }}>
        <div style={{ display: 'flex', fontWeight: 900, fontSize: fit(name, 640, 112, 0.6) * s, lineHeight: 1, letterSpacing: -3 * s }}>{name}</div>
        <div style={{ display: 'flex', marginTop: 16 * s, fontWeight: 800, fontSize: 42 * s, color: t.accent }}>Reward: one sold-out show.</div>
        {most ? <div style={{ display: 'flex', marginTop: 10 * s, fontWeight: 700, fontSize: fit(most, 880, 28, 0.5) * s, color: t.ink2 }}>{most}</div> : null}
        <div style={{ display: 'flex', height: 2 * s, marginTop: 30 * s, backgroundColor: t.ink, opacity: 0.1 }} />
      </div>

      {d.signatures.slice(0, 10).map((c, i) => {
        const x = 84 + (i % 5) * 172 + rand(c.number, 2) * 30 + (Math.floor(i / 5) % 2) * 50;
        const y = 1400 + Math.floor(i / 5) * 54 + rand(c.number, 4) * 10;
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
              fontSize: (26 + rand(c.number, 1) * 6) * s,
              color: c.number % 4 === 0 ? t.accent : t.ink,
              opacity: 0.82,
            }}
          >
            {`${c.initials} #${c.number}`}
          </div>
        );
      })}

      {/* The seal: how many have signed, where the city meets the paper. */}
      <div
        style={{
          position: 'absolute',
          left: 772 * s,
          top: 896 * s,
          width: 206 * s,
          height: 206 * s,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: t.accent,
          border: `${9 * s}px solid ${t.paper}`,
          boxShadow: `0 ${12 * s}px ${28 * s}px rgba(20,10,30,0.35)`,
          transform: 'rotate(-8deg)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', fontWeight: 900, fontSize: (d.count > 999 ? 56 : 78) * s, lineHeight: 1 }}>{String(d.count)}</div>
        <div style={{ display: 'flex', fontWeight: 800, fontSize: 25 * s, marginTop: 2 * s }}>signed</div>
      </div>

      {d.played ? (
        <div style={{ position: 'absolute', left: 120 * s, top: 640 * s, display: 'flex', padding: `${16 * s}px ${44 * s}px`, borderRadius: 30 * s, border: `${10 * s}px solid ${t.accent}`, color: t.accent, backgroundColor: t.paper, fontWeight: 900, fontSize: 116 * s, letterSpacing: -2 * s, transform: 'rotate(-12deg)', boxShadow: `0 ${16 * s}px ${40 * s}px rgba(20,10,30,0.3)` }}>
          Caught live
        </div>
      ) : null}
      {d.isDemo ? <div style={{ position: 'absolute', right: 40 * s, top: 24 * s, display: 'flex', fontWeight: 700, fontSize: 18 * s, color: t.word, opacity: 0.8 }}>Demo</div> : null}
    </div>
  );
}

export async function renderPoster(d: PosterData, format: 'story' | 'wide' | 'poster'): Promise<Buffer> {
  const art = await artFor(d);
  if (format === 'poster') return render(<Poster d={d} s={1} art={art} />, POSTER_W, POSTER_H);
  const first = d.artistName.split(' ')[0];
  const sentence = d.count >= 50 ? `${d.count} signed. Gus is asking the rooms.` : `${d.count} signed. At fifty, Gus asks the rooms.`;
  if (format === 'story') {
    const s = 820 / POSTER_W;
    return render(
      <div style={{ ...ground(1080, 1920, '50% 34%', art.theme), flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', marginTop: 96 }}>
          <Island text={`${d.artistName} · ${d.cityName}`} />
        </div>
        <div style={{ display: 'flex', marginTop: 56, transform: 'rotate(-2deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', borderRadius: 30 }}>
          <Poster d={d} s={s} art={art} />
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
    <div style={{ ...ground(1200, 630, '24% 50%', art.theme), alignItems: 'center' }}>
      <div style={{ display: 'flex', marginLeft: 76, transform: 'rotate(-2deg)', boxShadow: '0 30px 60px rgba(0,0,0,0.55)', borderRadius: 14 }}>
        <Poster d={d} s={s} art={art} />
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
  const art = await artFor(d);
  const t = art.theme;
  const figH = 660;
  const figW = figH * FIGURE_RATIO;
  const booked = d.kind === 'booked';
  const [day, md] = booked ? (d.date.includes(', ') ? d.date.split(', ') : ['', d.date]) : ['', ''];
  return render(
    <div style={{ ...ground(1080, 1920, '50% 40%', t), flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', marginTop: 96, marginBottom: 120 }}>
        <Island text={`${d.artistName} · ${d.cityName}, ${d.state}`} />
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 796, padding: '84px 72px 72px', borderRadius: 64, backgroundImage: C.raise, boxShadow: 'inset 0 2px 0 rgba(255,248,230,0.08), 0 40px 90px rgba(0,0,0,0.6)' }}>
        {/* The city, painted, with the artist stepping up out of it. */}
        <div style={{ display: 'flex', width: 796, height: 330, borderRadius: 40, overflow: 'hidden', marginBottom: 44 }}>
          <img src={art.scene} width={796} height={(796 * SCENE_H) / SCENE_W} style={{ marginTop: -330 }} />
        </div>
        <div style={{ position: 'absolute', left: 72, top: -110, width: 796, height: 524, display: 'flex', overflow: 'hidden' }}>
          {art.figure ? (
            <img src={art.figure} width={figW} height={figH} style={{ position: 'absolute', left: 398 - figW / 2 + (t.standAt - 0.5) * 300, top: 50, transform: t.flip ? 'scaleX(-1)' : 'none' }} />
          ) : art.face ? (
            <img src={art.face} width={300} height={300} style={{ position: 'absolute', left: 248, top: 260, borderRadius: 999, border: `10px solid ${C.ink}` }} />
          ) : null}
        </div>
        {booked ? null : <img src={img('art-ticket')} width={260} height={260} style={{ position: 'absolute', right: -60, top: 270, transform: 'rotate(-10deg)' }} />}
        <Kicker size={28} color={mix(t.accent, '#FFFFFF', 0.35)}>{booked ? `Booked · ${d.cityName}` : `The ${d.cityName} draw`}</Kicker>
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
          <div style={{ display: 'flex', fontWeight: 900, fontSize: 112, lineHeight: 1, letterSpacing: -3, color: mix(t.accent, '#FFFFFF', 0.35) }}>{String(booked ? d.count : d.entries)}</div>
          <div style={{ display: 'flex', marginLeft: 20, fontWeight: 700, fontSize: 38, color: C.ink2 }}>{booked ? 'fans signed for this' : 'chances in the hat'}</div>
        </div>
        {booked ? (
          <div style={{ display: 'flex', marginTop: 24 }}>
            <Meter count={d.count} width={796} height={30} on={t.accent} />
          </div>
        ) : null}
        <div style={{ display: 'flex', marginTop: 24, fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: C.ink2 }}>
          {booked ? `${d.cityName} asked, so ${first} is coming.` : 'Picked fairly, one chance per signature.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', marginTop: 56, marginBottom: 44, fontWeight: 800, fontSize: 52, letterSpacing: -1 }}>{booked ? 'Want your city next?' : 'Your city next?'}</div>
      <Key label="Sign a poster" link={d.link} />
      <div style={{ display: 'flex', marginTop: 40, marginBottom: 72 }}>
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
  const art = await artFor(d);
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
      <div style={{ ...ground(1200, 630, '24% 50%', art.theme), alignItems: 'center' }}>
        <div style={{ display: 'flex', marginLeft: 76, transform: 'rotate(-3deg)', boxShadow: '0 30px 60px rgba(0,0,0,0.55)', borderRadius: 14 }}>
          <Poster d={poster} s={s} art={art} />
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
    <div style={{ ...ground(1080, 1920, '50% 32%', art.theme), flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', marginTop: 96 }}>
        <Island text={`${d.artistName} · ${d.cityName}`} />
      </div>
      <div style={{ position: 'relative', display: 'flex', marginTop: 56 }}>
        <div style={{ display: 'flex', transform: 'rotate(-2deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', borderRadius: 26 }}>
          <Poster d={poster} s={s} art={art} />
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

/** The whole run on one page: the artist, two numbers, then every stop. */
export async function renderRapSheet(d: RapSheetData): Promise<Buffer> {
  const face = d.mugshot && OUR_ACT.has(d.mugshot) ? img('maya-avatar') : d.imageUrl ? await photo(d.imageUrl) : null;
  const rows = d.stops.slice(0, 10);
  return render(
    <div style={{ ...ground(1080, 1920, '30% 12%') }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 952, height: 1792, margin: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Island text={d.artistName} />
        <div style={{ display: 'flex', fontWeight: 700, fontSize: 24, color: C.ink3 }}>{d.isDemo ? 'Demo' : 'The run so far'}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 48 }}>
        <div style={{ display: 'flex', width: 360, height: 360, borderRadius: 999, overflow: 'hidden', backgroundColor: C.paperOrange, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          {face ? <img src={face} width={360} height={360} /> : null}
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

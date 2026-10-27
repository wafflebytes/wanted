/**
 * The city behind the poster. Each city Gus has opened gets its own painted scene (Burlington's
 * maples over Lake Champlain, Santa Cruz's Giant Dipper...), and every other city gets its
 * region's. A scene is plain SVG built from soft layered shapes, and it hands the rest of the
 * poster its palette, the way an event page takes its colors from its cover.
 */

export const SCENE_W = 1024;
export const SCENE_H = 1100;

export type SceneTheme = {
  /** The poster paper under the scene. */
  paper: string;
  ink: string;
  ink2: string;
  /** The city's own color: the city line and the rules. */
  accent: string;
  /** WANTED, set over the sky. */
  word: string;
  /** Where the artist stands, 0 to 1 across. */
  standAt: number;
  /** Turn the artist to face the landmark. */
  flip?: boolean;
};

export type Scene = { svg: string; theme: SceneTheme };

const W = SCENE_W;
const H = SCENE_H;

// ---------- small brushes ----------

/** Seeded 0..1. */
const rnd = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

/** A soft ridge from left to right, closed to the bottom. */
function ridge(y: number, amp: number, seed: number, fill: string, step = 128, bottom = H) {
  const r = rnd(seed);
  const pts: [number, number][] = [];
  for (let x = -step; x <= W + step; x += step) pts.push([x, y - r() * amp]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
  }
  d += ` L${W + step},${bottom} L${-step},${bottom} Z`;
  return `<path d="${d}" fill="${fill}"/>`;
}

/** Sharp peaks: [x, height] pairs on a base line. */
function peaks(base: number, list: [number, number, number][], fill: string, snow?: string) {
  return list
    .map(([x, h, w]) => {
      const top = base - h;
      const body = `<path d="M${x - w},${base} L${x - w * 0.18},${top + h * 0.08} Q${x},${top - 6} ${x + w * 0.18},${top + h * 0.1} L${x + w},${base} Z" fill="${fill}"/>`;
      const cap = snow
        ? `<path d="M${x - w * 0.36},${top + h * 0.34} L${x - w * 0.18},${top + h * 0.08} Q${x},${top - 6} ${x + w * 0.18},${top + h * 0.1} L${x + w * 0.38},${top + h * 0.36} L${x + w * 0.16},${top + h * 0.28} L${x},${top + h * 0.4} L${x - w * 0.14},${top + h * 0.27} Z" fill="${snow}"/>`
        : '';
      return body + cap;
    })
    .join('');
}

function sky(id: string, stops: [number, string][]) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}

function sun(x: number, y: number, r: number, core: string, glow: string) {
  return `<defs><radialGradient id="sun${x}${y}"><stop offset="0" stop-color="${glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r * 3.4}" fill="url(#sun${x}${y})"/><circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`;
}

function cloud(x: number, y: number, s: number, fill: string, op = 0.9) {
  return `<g opacity="${op}" fill="${fill}"><ellipse cx="${x}" cy="${y}" rx="${70 * s}" ry="${26 * s}"/><circle cx="${x - 26 * s}" cy="${y - 14 * s}" r="${30 * s}"/><circle cx="${x + 18 * s}" cy="${y - 24 * s}" r="${38 * s}"/><circle cx="${x + 52 * s}" cy="${y - 6 * s}" r="${24 * s}"/></g>`;
}

/** A layered pine: three stacked rounded triangles on a stub. */
function pine(x: number, base: number, h: number, fill: string, trunk = '#3a2a22') {
  const w = h * 0.42;
  const tiers = [0, 0.3, 0.56]
    .map((t, i) => {
      const top = base - h + t * h * 0.9;
      const bot = top + h * (0.5 - i * 0.06);
      const hw = w * (1 - i * 0.22);
      return `<path d="M${x},${top} Q${x + hw * 0.2},${top + 6} ${x + hw},${bot} Q${x},${bot + 10} ${x - hw},${bot} Q${x - hw * 0.2},${top + 6} ${x},${top} Z" fill="${fill}"/>`;
    })
    .reverse()
    .join('');
  return `<rect x="${x - h * 0.03}" y="${base - h * 0.12}" width="${h * 0.06}" height="${h * 0.14}" fill="${trunk}"/>${tiers}`;
}

/** A round leafy tree: a few overlapping blobs with a lit side. */
function roundTree(x: number, base: number, r: number, fills: string[], trunk = '#4a2a20', seed = 1) {
  const g = rnd(seed);
  const blobs = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    const cx = x + Math.cos(a) * r * 0.45 + (g() - 0.5) * r * 0.2;
    const cy = base - r * 1.5 + Math.sin(a) * r * 0.35;
    return `<circle cx="${cx}" cy="${cy}" r="${r * (0.5 + g() * 0.2)}" fill="${fills[i % fills.length]}"/>`;
  }).join('');
  return `<path d="M${x - r * 0.08},${base} L${x - r * 0.05},${base - r * 1.2} L${x + r * 0.05},${base - r * 1.2} L${x + r * 0.08},${base} Z" fill="${trunk}"/>${blobs}<circle cx="${x - r * 0.2}" cy="${base - r * 1.75}" r="${r * 0.38}" fill="${fills[0]}"/>`;
}

/** A maple leaf, for the air. */
function leaf(x: number, y: number, s: number, rot: number, fill: string) {
  return `<path transform="translate(${x},${y}) rotate(${rot}) scale(${s})" fill="${fill}" d="M0,-20 L5,-9 L14,-13 L11,-3 L20,0 L11,4 L13,12 L3,9 L1,20 L-1,20 L-3,9 L-13,12 L-11,4 L-20,0 L-11,-3 L-14,-13 L-5,-9 Z"/>`;
}

/** Water with soft bands and a run of light under the sun. */
function water(top: number, bottom: number, from: string, to: string, shine: string, sunX: number, id: string) {
  const bands = Array.from({ length: 9 }, (_, i) => {
    const y = top + 14 + i * ((bottom - top) / 9);
    const w = 220 - i * 14 + (i % 2) * 40;
    return `<rect x="${sunX - w / 2 + (i % 3) * 18 - 18}" y="${y}" width="${w}" height="${5 + i * 0.6}" rx="3" fill="${shine}" opacity="${0.75 - i * 0.06}"/>`;
  }).join('');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect x="0" y="${top}" width="${W}" height="${bottom - top}" fill="url(#${id})"/>${bands}`;
}

function windows(x: number, y: number, w: number, h: number, seed: number, lit: string) {
  const g = rnd(seed);
  let out = '';
  for (let yy = y + 14; yy < y + h - 10; yy += 22)
    for (let xx = x + 10; xx < x + w - 10; xx += 18) if (g() > 0.55) out += `<rect x="${xx}" y="${yy}" width="8" height="10" rx="2" fill="${lit}" opacity="${0.55 + g() * 0.45}"/>`;
  return out;
}

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;

// ---------- the cities ----------

function burlington(): Scene {
  const leaves = Array.from({ length: 14 }, (_, i) => {
    const g = rnd(i + 3);
    return leaf(40 + g() * 940, 300 + g() * 420, 0.7 + g() * 0.7, g() * 360, ['#E8542A', '#F5A623', '#C93A2A'][i % 3]);
  }).join('');
  return {
    theme: { paper: '#FFF3E4', ink: '#3A1F2E', ink2: '#8A6266', accent: '#D9472A', word: '#FFF6EA', standAt: 0.56 },
    svg: svg(
      sky('s', [[0, '#4E3F8F'], [0.32, '#B4588C'], [0.5, '#F0806E'], [0.6, '#FFC37E']]) +
        sun(690, 610, 82, '#FFE8B4', '#FFC37E') +
        cloud(160, 420, 1.2, '#F7A3A0', 0.55) +
        cloud(880, 380, 1, '#F7A3A0', 0.45) +
        ridge(600, 70, 7, '#9C6AA4', 120, 700) +
        ridge(626, 50, 11, '#7B4F8E', 90, 700) +
        // the far shore: a white steeple over the town
        `<g fill="#F6E7F0" opacity="0.9"><rect x="146" y="560" width="26" height="66"/><path d="M142,562 L159,500 L176,562 Z"/></g>` +
        water(640, 860, '#F3A07C', '#A6587F', '#FFE3B0', 690, 'w') +
        // a sailboat on the lake
        `<path d="M300,700 L300,612 L352,694 Z" fill="#FFF3E4"/><path d="M296,616 L296,700 L262,690 Z" fill="#FFD9B8"/><path d="M252,704 L366,704 L352,718 L268,718 Z" fill="#5B2E43"/>` +
        ridge(850, 30, 3, '#6E3A33', 160) +
        ridge(900, 24, 5, '#552B2A', 200) +
        roundTree(70, 900, 120, ['#E8542A', '#F07B2E', '#C93A2A'], '#4A2420', 2) +
        roundTree(960, 920, 140, ['#F5A623', '#E8542A', '#F07B2E'], '#4A2420', 5) +
        roundTree(210, 940, 80, ['#C93A2A', '#E8542A', '#B12E2A'], '#4A2420', 9) +
        leaves,
    ),
  };
}

function columbus(): Scene {
  const towers: [number, number, number][] = [
    [470, 260, 70],
    [550, 330, 60],
    [620, 220, 80],
    [710, 300, 56],
    [776, 380, 70],
    [856, 250, 64],
    [930, 320, 70],
    [60, 240, 70],
    [140, 300, 60],
  ];
  const base = 690;
  const city = towers.map(([x, h, w], i) => `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="${i % 2 ? '#3C2F63' : '#33295A'}"/>${windows(x, base - h, w, h, i + 4, '#FFD37A')}`).join('');
  // LeVeque Tower: tiers and a spire
  const leveque = `<g fill="#2A2150"><rect x="250" y="400" width="110" height="290"/><rect x="266" y="330" width="78" height="80"/><rect x="282" y="282" width="46" height="56"/><path d="M290,284 L305,200 L320,284 Z"/></g>${windows(250, 400, 110, 290, 21, '#FFD37A')}<circle cx="305" cy="200" r="5" fill="#FF6B57"/>`;
  return {
    theme: { paper: '#FFF2EE', ink: '#231B3A', ink2: '#6E5F7E', accent: '#C8102E', word: '#FFF4EE', standAt: 0.58 },
    svg: svg(
      sky('s', [[0, '#1F2260'], [0.3, '#5D3F8E'], [0.52, '#E57A6E'], [0.64, '#FFC27A']]) +
        sun(560, 640, 70, '#FFE1A8', '#FFAE6E') +
        Array.from({ length: 30 }, (_, i) => {
          const g = rnd(i + 40);
          return `<circle cx="${g() * W}" cy="${g() * 280}" r="${1 + g() * 2}" fill="#fff" opacity="${0.4 + g() * 0.5}"/>`;
        }).join('') +
        city +
        leveque +
        water(690, 860, '#C9707A', '#3A3070', '#FFD39A', 560, 'w') +
        // the Main Street Bridge: one leaning white arch
        `<path d="M120,760 Q520,560 900,760" fill="none" stroke="#F4EEF6" stroke-width="12" stroke-linecap="round"/><rect x="80" y="756" width="860" height="14" rx="6" fill="#2A2150"/>` +
        Array.from({ length: 9 }, (_, i) => `<line x1="${200 + i * 80}" y1="${756}" x2="${200 + i * 80}" y2="${700 - Math.sin(((i + 1) / 10) * Math.PI) * 60}" stroke="#F4EEF6" stroke-width="3"/>`).join('') +
        ridge(860, 26, 4, '#2E5B4E', 180) +
        ridge(910, 20, 8, '#244A40', 220) +
        roundTree(90, 920, 120, ['#2F6B4F', '#3E8160', '#25563F'], '#2B1E1A', 3) +
        roundTree(950, 930, 130, ['#3E8160', '#2F6B4F', '#4C9468'], '#2B1E1A', 6),
    ),
  };
}

function ithaca(): Scene {
  const stripes = (x0: number, x1: number, y0: number, y1: number, c: string) =>
    Array.from({ length: Math.floor((y1 - y0) / 26) }, (_, i) => `<rect x="${x0}" y="${y0 + i * 26 + 10}" width="${x1 - x0}" height="5" rx="2" fill="${c}" opacity="0.5"/>`).join('');
  const falls = Array.from({ length: 12 }, (_, i) => {
    const x = 352 + i * 13;
    return `<rect x="${x}" y="300" width="${8 + (i % 3) * 3}" height="${470 + (i % 4) * 14}" rx="5" fill="${i % 2 ? '#FFFFFF' : '#CFEFF6'}" opacity="${0.75 + (i % 3) * 0.08}"/>`;
  }).join('');
  return {
    theme: { paper: '#F1F6EC', ink: '#1E3A33', ink2: '#5F7A6E', accent: '#E0702B', word: '#FFFFFF', standAt: 0.7 },
    svg: svg(
      sky('s', [[0, '#2F7FA6'], [0.28, '#7FC4D9'], [0.5, '#D6EDE4'], [0.62, '#F3F1D8']]) +
        cloud(560, 400, 1.1, '#FFFFFF', 0.85) +
        cloud(120, 380, 0.8, '#FFFFFF', 0.75) +
        ridge(420, 60, 13, '#B9C99A', 140) +
        // the gorge walls, layered shale
        `<path d="M-10,250 L230,280 Q300,300 330,340 L340,1100 L-10,1100 Z" fill="#8B7461"/>` +
        stripes(-10, 330, 290, 1100, '#6E5A4B') +
        `<path d="M1034,230 L640,270 Q560,290 540,340 L530,1100 L1034,1100 Z" fill="#7D6857"/>` +
        stripes(540, 1034, 290, 1100, '#625042') +
        // the falls and their mist
        `<rect x="330" y="300" width="210" height="520" fill="#9ED6E3"/>` +
        falls +
        `<ellipse cx="435" cy="790" rx="190" ry="50" fill="#FFFFFF" opacity="0.7"/><ellipse cx="400" cy="770" rx="120" ry="36" fill="#FFFFFF" opacity="0.6"/>` +
        water(800, 920, '#5FA9B5', '#2E6F7E', '#D8F3F5', 435, 'w') +
        // the clock tower on the hill
        `<g fill="#5A4A6A"><rect x="808" y="140" width="40" height="140"/><path d="M800,144 L828,80 L856,144 Z"/></g><circle cx="828" cy="170" r="10" fill="#F3F1D8"/>` +
        // autumn trees on the rims
        [40, 120, 200, 600, 700, 920, 990].map((x, i) => roundTree(x, x < 400 ? 300 : 270, 46 + (i % 3) * 12, i % 2 ? ['#E0702B', '#F2A23A', '#C8502A'] : ['#F2A23A', '#E8C547', '#E0702B'], '#4a2a20', i + 11)).join('') +
        ridge(940, 30, 21, '#3F5E45', 200) +
        ridge(990, 20, 22, '#2F4D38', 240),
    ),
  };
}

function portland(): Scene {
  const waves = Array.from({ length: 16 }, (_, i) => {
    const g = rnd(i + 70);
    const x = g() * W;
    const y = 640 + g() * 260;
    return `<path d="M${x},${y} q14,-10 28,0 q14,10 28,0" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
  }).join('');
  const gulls = [
    [200, 220],
    [260, 260],
    [600, 180],
  ]
    .map(([x, y]) => `<path d="M${x - 16},${y} q8,-10 16,0 q8,-10 16,0" fill="none" stroke="#2B4A66" stroke-width="4" stroke-linecap="round"/>`)
    .join('');
  return {
    theme: { paper: '#EFF6FB', ink: '#14304A', ink2: '#5D7891', accent: '#D8432A', word: '#FFFFFF', standAt: 0.4, flip: true },
    svg: svg(
      sky('s', [[0, '#2F74B8'], [0.3, '#76B5E6'], [0.5, '#BFE0F4'], [0.6, '#FFE7CF']]) +
        sun(180, 560, 60, '#FFF4D8', '#FFE0B0') +
        cloud(520, 420, 1.2, '#FFFFFF', 0.9) +
        cloud(960, 470, 0.9, '#FFFFFF', 0.85) +
        water(600, 1100, '#4D97C9', '#1F5C8A', '#FFF1D6', 180, 'w') +
        waves +
        gulls +
        // the beam
        `<path d="M830,318 L1040,250 L1040,330 Z" fill="#FFF6C8" opacity="0.5"/>` +
        // rocks and grass on the headland
        `<path d="M560,1100 Q600,820 720,760 Q800,700 900,690 Q980,680 1040,700 L1040,1100 Z" fill="#4B5A5E"/>` +
        `<path d="M640,1100 Q680,880 780,820 Q880,770 1040,780 L1040,1100 Z" fill="#3A474B"/>` +
        `<path d="M690,760 Q800,690 1040,690 L1040,720 Q860,720 760,780 Z" fill="#7BA05B"/>` +
        // keeper's house
        `<rect x="700" y="640" width="110" height="70" fill="#FFFFFF"/><path d="M690,644 L755,596 L820,644 Z" fill="#C4402C"/><rect x="722" y="660" width="18" height="22" fill="#2B4A66"/><rect x="770" y="660" width="18" height="22" fill="#2B4A66"/>` +
        // Portland Head Light
        `<path d="M806,700 L816,360 L846,360 L856,700 Z" fill="#FFFFFF"/><path d="M806,700 L816,360 L828,360 L822,700 Z" fill="#E4EEF4"/><rect x="808" y="330" width="46" height="34" rx="4" fill="#1E2B33"/><rect x="814" y="336" width="34" height="22" fill="#FFF3B0"/><path d="M806,332 L831,300 L856,332 Z" fill="#1E2B33"/><rect x="800" y="360" width="62" height="10" rx="3" fill="#1E2B33"/>`,
    ),
  };
}

function poughkeepsie(): Scene {
  const piers = Array.from({ length: 7 }, (_, i) => {
    const x = 20 + i * 166;
    return `<path d="M${x - 12},470 L${x + 12},470 L${x + 22},720 L${x - 22},720 Z" fill="#3B3650"/>`;
  }).join('');
  const truss = Array.from({ length: 34 }, (_, i) => `<path d="M${i * 32},440 L${i * 32 + 16},470 L${i * 32 + 32},440" fill="none" stroke="#3B3650" stroke-width="5"/>`).join('');
  return {
    theme: { paper: '#FFF5E6', ink: '#2A2438', ink2: '#7A6A78', accent: '#C9562B', word: '#FFF8EC', standAt: 0.55 },
    svg: svg(
      sky('s', [[0, '#5E83C2'], [0.3, '#C9A0C0'], [0.48, '#F6A15C'], [0.6, '#FFD27A']]) +
        sun(760, 560, 74, '#FFF0C0', '#FFD27A') +
        cloud(260, 200, 1.2, '#FBD3C4', 0.6) +
        ridge(560, 90, 31, '#B46A6A', 140, 740) +
        ridge(600, 60, 32, '#8E4E5E', 110, 740) +
        water(640, 900, '#E8A06A', '#3F6A98', '#FFE7B0', 760, 'w') +
        piers +
        `<rect x="0" y="430" width="${W}" height="14" fill="#2E2A40"/><rect x="0" y="468" width="${W}" height="10" fill="#2E2A40"/>` +
        truss +
        // lamps along the walkway
        Array.from({ length: 12 }, (_, i) => `<circle cx="${40 + i * 86}" cy="424" r="4" fill="#FFE6A0"/>`).join('') +
        ridge(880, 40, 33, '#6C3B3A', 180) +
        roundTree(80, 930, 110, ['#E07A2E', '#F2A23A', '#C8502A'], '#4a2a20', 30) +
        roundTree(960, 940, 120, ['#C8502A', '#E07A2E', '#B04028'], '#4a2a20', 31) +
        ridge(940, 20, 34, '#4E2A2C', 220),
    ),
  };
}

function santaCruz(): Scene {
  // The Giant Dipper: a white lattice under a rolling track.
  const track = (x: number) => 520 - Math.max(0, Math.sin((x / 420) * Math.PI)) * 190 - Math.max(0, Math.sin(((x - 380) / 220) * Math.PI)) * 70 * (x > 380 && x < 600 ? 1 : 0);
  let lattice = '';
  for (let x = -20; x <= 560; x += 22) {
    const y = track(x);
    lattice += `<line x1="${x}" y1="${y}" x2="${x}" y2="760" stroke="#FFFFFF" stroke-width="3" opacity="0.92"/>`;
    for (let yy = y + 30; yy < 760; yy += 44) lattice += `<line x1="${x}" y1="${yy}" x2="${x + 22}" y2="${yy + 44}" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>`;
  }
  let d = '';
  for (let x = -20; x <= 560; x += 10) d += `${x === -20 ? 'M' : 'L'}${x},${track(x)} `;
  const palm = (x: number, base: number, h: number, lean: number) => {
    const tx = x + lean;
    const ty = base - h;
    const fronds = [-150, -110, -60, -20, 20, 60, 110, 150]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        const ex = tx + Math.sin(r) * 120;
        const ey = ty - Math.cos(r) * 40 + Math.abs(Math.sin(r)) * 50;
        return `<path d="M${tx},${ty} Q${(tx + ex) / 2},${ty - 50} ${ex},${ey}" fill="none" stroke="#2B3F3A" stroke-width="16" stroke-linecap="round"/>`;
      })
      .join('');
    return `<path d="M${x - 8},${base} Q${x + lean * 0.4},${base - h * 0.5} ${tx},${ty} L${tx + 8},${ty} Q${x + lean * 0.4 + 12},${base - h * 0.5} ${x + 8},${base} Z" fill="#4A3A34"/>${fronds}`;
  };
  return {
    theme: { paper: '#FFF2EE', ink: '#2B2140', ink2: '#7E6680', accent: '#E4405F', word: '#FFFFFF', standAt: 0.6 },
    svg: svg(
      sky('s', [[0, '#4F64C4'], [0.3, '#C77DB4'], [0.5, '#F58FA0'], [0.62, '#FFC48A']]) +
        sun(820, 590, 80, '#FFE8B8', '#FFB58A') +
        cloud(640, 200, 1.1, '#FFC3C8', 0.5) +
        water(620, 820, '#F39A9A', '#3A6FA8', '#FFE2B8', 820, 'w') +
        lattice +
        `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#E4405F" stroke-width="4"/>` +
        // a car cresting the first hill
        `<rect x="186" y="${track(200) - 30}" width="46" height="26" rx="8" fill="#E4405F"/><rect x="232" y="${track(250) - 30}" width="46" height="26" rx="8" fill="#F5B83D"/>` +
        // the boardwalk and the sand
        `<rect x="0" y="752" width="${W}" height="18" fill="#7A4B3A"/>` +
        `<path d="M0,800 Q300,770 600,800 T1024,790 L1024,1100 L0,1100 Z" fill="#F3C98B"/><path d="M0,880 Q400,850 1024,890 L1024,1100 L0,1100 Z" fill="#E8B577"/>` +
        palm(900, 900, 420, -60) +
        palm(990, 920, 330, -20),
    ),
  };
}

// ---------- the regions ----------

function northeast(): Scene {
  return {
    theme: { paper: '#F4F1E8', ink: '#22302A', ink2: '#6A776E', accent: '#C9562B', word: '#FFFFFF', standAt: 0.55 },
    svg: svg(
      sky('s', [[0, '#6F9BCB'], [0.4, '#F2B48A'], [0.58, '#FFDDA6']]) +
        sun(300, 560, 70, '#FFF0C8', '#FFD8A0') +
        peaks(620, [[180, 260, 220], [520, 330, 260], [860, 240, 230]], '#7C7FA8') +
        ridge(640, 50, 41, '#5D6C8E', 120, 760) +
        water(660, 860, '#F2BC8E', '#4C6E92', '#FFF0C8', 300, 'w') +
        ridge(860, 30, 42, '#2F4A3C', 160) +
        [40, 110, 180, 860, 930, 1000].map((x, i) => pine(x, 960 + (i % 2) * 20, 300 + (i % 3) * 60, i % 2 ? '#2C5A43' : '#23493A')).join('') +
        ridge(960, 16, 43, '#1D3A2E', 240),
    ),
  };
}

function midwest(): Scene {
  const rows = Array.from({ length: 8 }, (_, i) => `<path d="M-20,${700 + i * 48} Q512,${660 + i * 50} 1044,${710 + i * 46} L1044,${730 + i * 46} Q512,${684 + i * 50} -20,${724 + i * 48} Z" fill="${i % 2 ? '#C9A23A' : '#E2BE52'}"/>`).join('');
  return {
    theme: { paper: '#FFF6E2', ink: '#2E2618', ink2: '#7A6A4E', accent: '#C23B22', word: '#FFFFFF', standAt: 0.56 },
    svg: svg(
      sky('s', [[0, '#2E6FB8'], [0.32, '#6FA9E0'], [0.5, '#A8D2F0'], [0.62, '#FFE6B8']]) +
        cloud(220, 420, 1.5, '#FFFFFF', 0.95) +
        cloud(800, 380, 1.2, '#FFFFFF', 0.9) +
        ridge(660, 30, 51, '#7FA35A', 200) +
        // the barn and the silo
        `<rect x="90" y="560" width="190" height="120" fill="#C23B22"/><path d="M76,566 L185,486 L294,566 Z" fill="#8E2A1A"/><rect x="160" y="610" width="50" height="70" fill="#FFF3E0"/><path d="M160,610 L210,680 M210,610 L160,680" stroke="#C23B22" stroke-width="5"/><rect x="290" y="470" width="56" height="210" rx="4" fill="#D9D3C7"/><path d="M290,474 Q318,430 346,474 Z" fill="#9AA0A6"/>` +
        rows +
        roundTree(940, 700, 70, ['#4E8A3E', '#5FA04C', '#3F7333'], '#4a2a20', 52),
    ),
  };
}

function south(): Scene {
  const moss = (x: number, y: number) => `<path d="M${x},${y} q-6,30 0,60 q6,30 -2,56" fill="none" stroke="#8FA88A" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
  return {
    theme: { paper: '#FFF3E6', ink: '#2E2230', ink2: '#7C6670', accent: '#D4572E', word: '#FFF6EC', standAt: 0.58 },
    svg: svg(
      sky('s', [[0, '#6B5BA8'], [0.36, '#E58A8A'], [0.56, '#FFC98A']]) +
        sun(640, 600, 90, '#FFEDC0', '#FFC98A') +
        ridge(640, 26, 61, '#7A6A8E', 160, 760) +
        water(650, 860, '#F4B08A', '#6A5A8C', '#FFEDC0', 640, 'w') +
        ridge(860, 24, 62, '#3E4A3A', 180) +
        // a live oak reaching across, hung with moss
        `<path d="M40,1100 Q60,760 120,640 Q200,520 420,470 Q300,560 230,660 Q180,760 190,1100 Z" fill="#3A2E2A"/>` +
        `<g fill="#3F5A3E"><ellipse cx="190" cy="430" rx="230" ry="110"/><ellipse cx="420" cy="440" rx="180" ry="80"/><ellipse cx="60" cy="500" rx="140" ry="90"/></g>` +
        `<g fill="#4F6E4A"><ellipse cx="230" cy="400" rx="140" ry="60"/><ellipse cx="460" cy="420" rx="100" ry="40"/></g>` +
        [140, 210, 300, 380, 470, 80].map((x, i) => moss(x, 480 + (i % 3) * 20)).join('') +
        ridge(960, 16, 63, '#2C3528', 240),
    ),
  };
}

function mountain(): Scene {
  return {
    theme: { paper: '#F2F0F6', ink: '#1F2340', ink2: '#666A88', accent: '#E0702B', word: '#FFFFFF', standAt: 0.56 },
    svg: svg(
      sky('s', [[0, '#1E2552'], [0.35, '#5A5A9A'], [0.55, '#F09A84'], [0.62, '#FFC48A']]) +
        Array.from({ length: 40 }, (_, i) => {
          const g = rnd(i + 90);
          return `<circle cx="${g() * W}" cy="${g() * 320}" r="${1 + g() * 2}" fill="#fff" opacity="${0.4 + g() * 0.6}"/>`;
        }).join('') +
        peaks(700, [[160, 360, 260], [500, 470, 300], [860, 380, 280]], '#5B5E8E', '#F4EEF8') +
        peaks(740, [[340, 260, 240], [720, 240, 260]], '#45487A', '#E4DEF2') +
        ridge(780, 40, 71, '#2D3A4A', 140) +
        // aspens, gold
        [60, 130, 900, 970].map((x, i) => `<rect x="${x - 5}" y="${700}" width="10" height="${260}" fill="#F2EEE6"/>` + roundTree(x, 780, 60 + i * 6, ['#F2B33D', '#E8962E', '#F7CC5A'], '#F2EEE6', 72 + i)).join('') +
        ridge(930, 20, 73, '#202C38', 220),
    ),
  };
}

function northwest(): Scene {
  return {
    theme: { paper: '#EEF4F1', ink: '#16302C', ink2: '#5E7671', accent: '#E0702B', word: '#FFFFFF', standAt: 0.55 },
    svg: svg(
      sky('s', [[0, '#3E6F93'], [0.3, '#7FA9C6'], [0.5, '#CFE2E6'], [0.62, '#F6E8D6']]) +
        // the mountain, out on a clear day
        `<path d="M220,640 Q420,360 500,300 Q540,280 580,300 Q680,380 860,640 Z" fill="#8FA4C0"/><path d="M430,380 Q480,320 500,300 Q540,280 580,300 Q630,340 660,392 Q610,370 590,396 Q560,360 540,392 Q510,360 480,394 Q460,372 430,380 Z" fill="#FFFFFF"/>` +
        cloud(320, 470, 1.6, '#FFFFFF', 0.7) +
        cloud(760, 520, 1.4, '#FFFFFF', 0.6) +
        ridge(660, 40, 81, '#5E7E86', 120, 800) +
        [0, 60, 120, 180, 240, 780, 840, 900, 960, 1020].map((x, i) => pine(x, 760 + (i % 3) * 30, 260 + (i % 4) * 60, i % 2 ? '#2A5148' : '#1F433B')).join('') +
        ridge(860, 30, 82, '#1D3A33', 160) +
        [30, 100, 920, 990].map((x, i) => pine(x, 1000, 420 + i * 20, '#173530')).join('') +
        ridge(990, 14, 83, '#122B26', 240),
    ),
  };
}

function california(): Scene {
  const palm = (x: number, h: number) =>
    `<path d="M${x - 6},1000 L${x - 3},${1000 - h} L${x + 3},${1000 - h} L${x + 6},1000 Z" fill="#3A2A3A"/>` +
    [-140, -100, -60, -20, 20, 60, 100, 140]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return `<path d="M${x},${1000 - h} Q${x + Math.sin(r) * 50},${1000 - h - 40} ${x + Math.sin(r) * 100},${1000 - h - Math.cos(r) * 30 + 40}" fill="none" stroke="#3A2A3A" stroke-width="12" stroke-linecap="round"/>`;
      })
      .join('');
  return {
    theme: { paper: '#FFF2EC', ink: '#2B1F38', ink2: '#80687E', accent: '#E4405F', word: '#FFFFFF', standAt: 0.5 },
    svg: svg(
      sky('s', [[0, '#5B4FB0'], [0.32, '#E07AA8'], [0.5, '#FF9E7A'], [0.62, '#FFD08A']]) +
        sun(512, 620, 120, '#FFE9B0', '#FFC27A') +
        // the sun's stripes, a California sunset
        [600, 630, 655].map((y, i) => `<rect x="380" y="${y}" width="264" height="${8 - i * 2}" fill="#FF9E7A"/>`).join('') +
        water(650, 860, '#F4A07E', '#4B4C9A', '#FFE9B0', 512, 'w') +
        `<path d="M0,840 Q300,800 600,840 T1024,830 L1024,1100 L0,1100 Z" fill="#E9A87A"/>` +
        palm(90, 560) +
        palm(170, 470) +
        palm(930, 600) +
        palm(1000, 500) +
        ridge(960, 14, 91, '#B97A62', 240),
    ),
  };
}

const CITIES: Record<string, () => Scene> = {
  'burlington-vt': burlington,
  'columbus-oh': columbus,
  'ithaca-ny': ithaca,
  'portland-me': portland,
  'poughkeepsie-ny': poughkeepsie,
  'santa-cruz-ca': santaCruz,
};

const REGIONS: Record<string, () => Scene> = { northeast, midwest, south, mountain, northwest, california };

const cache = new Map<string, Scene>();
/** The scene for a city: its own if Gus has painted it, else its region's. */
export function sceneFor(cityId: string | undefined, region: string | null): Scene {
  const key = cityId && CITIES[cityId] ? cityId : (region ?? 'northeast');
  const hit = cache.get(key);
  if (hit) return hit;
  const scene = (CITIES[key] ?? REGIONS[key] ?? northeast)();
  cache.set(key, scene);
  return scene;
}

export const PAINTED = [...Object.keys(CITIES), ...Object.keys(REGIONS)];

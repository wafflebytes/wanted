/**
 * Groundedness checker (FR-25, PRD 16.5 G5): every number and every known venue, city,
 * neighborhood or act in Gus's output must appear in the evidence he was given.
 */

export type Evidence = {
  /** Every number Gus may cite (shares as 0..1 or percents, counts, ratios, hours, dates). */
  numbers: number[];
  /** Names Gus may mention (cities, rooms, neighborhoods, acts, days). */
  names: string[];
};

export type GroundingReport = { ok: boolean; unknownNumbers: string[]; unknownNames: string[] };

const NUMBER_RE = /(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s*%|x\b)?/g;

function representations(e: number): string[] {
  const out = new Set<string>();
  const add = (v: number) => {
    for (const d of [0, 1, 2]) out.add(v.toFixed(d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
  };
  add(e);
  if (Math.abs(e) <= 1.5) add(e * 100);
  return [...out];
}

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const WORD = `(?:${[...Object.keys(UNITS), ...Object.keys(TENS), 'hundred', 'thousand', 'point'].join('|')})`;
const SPELLED_RE = new RegExp(`\\b${WORD}(?:[\\s-]+${WORD})*\\b`, 'gi');

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19,
  twentieth: 20, thirtieth: 30,
};
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const ORD_RE = new RegExp(`\\b(${MONTHS})\\s+((?:twenty|thirty)[\\s-])?(${Object.keys(ORDINALS).join('|')})\\b`, 'gi');
const suffix = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

/**
 * Writes numbers as digits the way a tour manager texts: "51.2", "13.1 hours", "December
 * 10th". Words for one to nine stay words (that's just prose). Applied to every LLM line
 * before the grounding check, so the check and the reader see the same thing.
 */
export function digitize(text: string): string {
  let out = text.replace(ORD_RE, (_m, month: string, tens: string | undefined, ord: string) => {
    const n = (tens ? TENS[tens.trim().replace(/-$/, '').toLowerCase()] : 0) + ORDINALS[ord.toLowerCase()];
    return `${month} ${n}${suffix(n)}`;
  });
  // A bare date ordinal after a range ("December 10th to nineteenth").
  out = out.replace(new RegExp(`\\b(to|through|until|and)\\s+((?:twenty|thirty)[\\s-])?(${Object.keys(ORDINALS).join('|')})\\b`, 'gi'), (m, w: string, tens: string | undefined, ord: string) => {
    const n = (tens ? TENS[tens.trim().replace(/-$/, '').toLowerCase()] : 0) + ORDINALS[ord.toLowerCase()];
    return n >= 10 ? `${w} ${n}${suffix(n)}` : m;
  });
  out = out.replace(SPELLED_RE, (m) => {
    const n = parseSpelled(m);
    if (n === null) return m;
    if (n < 10 && !/point/i.test(m)) return m;
    return String(n);
  });
  return out;
}

/**
 * Reads a spelled-out number ("thirteen point one", "twenty-one", "two hundred") so a model
 * can't slip an invented number past the check by writing it in words.
 */
export function parseSpelled(phrase: string): number | null {
  const words = phrase.toLowerCase().split(/[\s-]+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let i = 0;
  let any = false;
  for (; i < words.length && words[i] !== 'point'; i++) {
    const w = words[i];
    if (w in UNITS) current += UNITS[w];
    else if (w in TENS) current += TENS[w];
    else if (w === 'hundred') current = (current || 1) * 100;
    else if (w === 'thousand') {
      total += (current || 1) * 1000;
      current = 0;
    } else return null;
    any = true;
  }
  let value = total + current;
  if (words[i] === 'point') {
    let frac = '';
    for (i++; i < words.length; i++) {
      const d = UNITS[words[i]];
      if (d === undefined || d > 9) return null;
      frac += String(d);
    }
    if (!frac) return any ? value : null;
    value = Number(`${value}.${frac}`);
  }
  return any ? value : null;
}

/** Years, small counting words like "1 room" and "2 nights" are allowed without evidence. */
function isFreeNumber(n: number, raw: string) {
  if (/^(19|20)\d\d$/.test(raw)) return true;
  return Number.isInteger(n) && n >= 0 && n <= 3;
}

/** Metro names that are also everyday English words. */
const COMMON_WORD_CITIES = new Set(['reading', 'mobile', 'normal', 'orange', 'florence', 'columbia', 'victoria', 'eugene', 'tyler', 'jackson', 'lafayette', 'champaign', 'springfield', 'auburn', 'athens']);

export function checkGrounded(text: string, evidence: Evidence, universe: string[] = []): GroundingReport {
  const allowed = new Set<string>();
  for (const e of evidence.numbers) for (const r of representations(e)) allowed.add(r);

  const unknownNumbers: string[] = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[1].replace(/,/g, '');
    const n = Number(raw);
    if (!Number.isFinite(n) || isFreeNumber(n, raw)) continue;
    const norm = raw.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    if (!allowed.has(norm)) unknownNumbers.push(m[0].trim());
  }
  for (const m of text.matchAll(SPELLED_RE)) {
    const n = parseSpelled(m[0]);
    if (n === null || isFreeNumber(n, String(n))) continue;
    const norm = String(n).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    if (!allowed.has(norm)) unknownNumbers.push(m[0].trim());
  }

  const evidenceNames = new Set(evidence.names.map((n) => n.toLowerCase()));
  const unknownNames: string[] = [];
  const padded = ` ${text} `;
  for (const name of universe) {
    const lower = name.toLowerCase();
    if (lower.length < 4 || evidenceNames.has(lower)) continue;
    // Skip universe names that are substrings of an allowed name ("Portland" inside "Portland, Maine").
    if ([...evidenceNames].some((n) => n.includes(lower))) continue;
    // City names are proper nouns, so match case-sensitively: "thanks for reading" is not Reading, PA.
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^A-Za-z])${esc}(?![A-Za-z])`, 'g');
    for (const m of padded.matchAll(re)) {
      // A common word that happens to be a city ("Reading", "Mobile", "Normal") at the start
      // of a sentence is just a capitalized word.
      const before = padded.slice(0, (m.index ?? 0) + m[1].length).trimEnd();
      const sentenceStart = before === '' || /[.!?:\n]$/.test(before);
      if (COMMON_WORD_CITIES.has(lower) && sentenceStart) continue;
      unknownNames.push(name);
      break;
    }
  }
  return { ok: !unknownNumbers.length && !unknownNames.length, unknownNumbers, unknownNames };
}

/** Collects every finite number in a nested evidence object. */
export function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => numbersIn(v, out));
  else if (typeof value === 'string') {
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  }
  return out;
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

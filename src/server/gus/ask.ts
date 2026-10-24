/**
 * Gus, the companion: one spoken or typed ask in, one short answer and at most one action
 * out. Speech goes through Fish Audio's transcriber; the model only picks among actions the
 * app can actually take, and every city it names must be one of the artist's scored metros.
 * If every model is down, a rules pass still answers ("take me to Chicago" never needs a model).
 */
import type { ArtistRow } from '../artists';
import { recordOutbound } from '../outbound';
import { env, redact } from '../env';
import { mapData } from '../service';
import { chat, parseJson } from './llm';

export type GusAction =
  | { type: 'tab'; tab: 'map' | 'tour' | 'pulse' | 'posters'; label: string }
  | { type: 'city'; id: string; name: string; label: string }
  | { type: 'pitch'; id: string; name: string; label: string }
  | { type: 'link'; url: string; label: string };

export type GusAnswer = { heard: string; reply: string; mood: 'idle' | 'proud' | 'unimpressed' | 'thinking'; action: GusAction | null; model: string };

export class AsrError extends Error {}

/** Fish Audio speech-to-text. Audio bytes in, transcript out. */
export async function transcribe(audio: Blob): Promise<string> {
  const key = env.fishKey;
  if (!key) throw new AsrError('Gus can’t hear right now (no voice key).');
  const form = new FormData();
  form.append('audio', audio, 'ask.m4a');
  form.append('language', 'en');
  form.append('tag_audio_events', 'false');
  recordOutbound({ kind: 'asr', url: 'https://api.fish.audio/v1/asr', body: `audio ${audio.size} bytes` });
  const res = await fetch('https://api.fish.audio/v1/asr', { method: 'POST', headers: { Authorization: `Bearer ${key}`, model: 'transcribe-1-pro' }, body: form });
  const text = await res.text();
  if (!res.ok) throw new AsrError(`Gus didn’t catch that (${res.status}). ${redact(text).slice(0, 80)}`);
  const out = JSON.parse(text) as { text?: string };
  return (out.text ?? '').replace(/<\|[^|]*\|>/g, '').trim();
}

const TABS: Record<string, GusAction & { type: 'tab' }> = {
  map: { type: 'tab', tab: 'map', label: 'Open the map' },
  tour: { type: 'tab', tab: 'tour', label: 'Open your tour' },
  pulse: { type: 'tab', tab: 'pulse', label: 'Open Fan Mail' },
  posters: { type: 'tab', tab: 'posters', label: 'Open your posters' },
};

type Metro = { id: string; name: string; state: string; rank: number | null; sleeper: boolean; score: number | null };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function findCity(text: string, metros: Metro[]): Metro | null {
  const t = ` ${norm(text)} `;
  let best: Metro | null = null;
  for (const m of metros) {
    const n = norm(m.name.split(/[-–/]/)[0]);
    if (n.length > 2 && t.includes(` ${n} `) && (!best || n.length > norm(best.name).length)) best = m;
  }
  return best;
}

function stayLink(city: Metro, kind: 'stay' | 'eat'): GusAction {
  const q = encodeURIComponent(`${city.name}, ${city.state}`);
  return kind === 'stay'
    ? { type: 'link', url: `https://www.booking.com/searchresults.html?ss=${q}`, label: `Find a place to stay in ${city.name}` }
    : { type: 'link', url: `https://www.opentable.com/s?term=${q}`, label: `Find dinner in ${city.name}` };
}

/** The no-model answer: keyword intents over the artist's own data. */
export function liteAnswer(heard: string, metros: Metro[], name: string): Omit<GusAnswer, 'heard' | 'model'> {
  const t = norm(heard);
  const city = findCity(heard, metros);
  const top = metros.filter((m) => m.rank !== null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  if (city && /(stay|hotel|sleep|airbnb|room for the night)/.test(t)) return { reply: `Here’s where to crash in ${city.name}. Stay close to the venue, not the airport.`, mood: 'idle', action: stayLink(city, 'stay') };
  if (city && /(eat|dinner|food|restaurant|lunch)/.test(t)) return { reply: `Eat early in ${city.name}. Nobody plays well on a full stomach at 10 pm.`, mood: 'idle', action: stayLink(city, 'eat') };
  if (city && /(pitch|email|book|venue|promoter|write to|rooms|reach out|talent buyer)/.test(t)) return { reply: `I’ll draft the pitch for ${city.name} with your proof in it.`, mood: 'proud', action: { type: 'pitch', id: city.id, name: city.name, label: 'Draft the pitch' } };
  if (city) {
    const r = city.rank ? `It ranks number ${city.rank} for you.` : 'It’s on the board.';
    return { reply: `${city.name}. ${r}${city.sleeper ? ' And it’s a sleeper, so nobody else is looking.' : ''}`, mood: city.sleeper ? 'proud' : 'idle', action: { type: 'city', id: city.id, name: city.name, label: `Go to ${city.name}` } };
  }
  if (/(tour|route|drive|van|dates)/.test(t)) return { reply: 'Your route’s on the Tour tab. I already flagged the long drives.', mood: 'idle', action: TABS.tour };
  if (/(poster|sign|signature|fans)/.test(t)) return { reply: 'Posters are where fans prove it. Let’s see who’s signing.', mood: 'idle', action: TABS.posters };
  if (/(crowd|who|talking|pulse|chatter|people)/.test(t)) return { reply: 'Your fan mail has who they are and what they’re saying right now.', mood: 'idle', action: TABS.pulse };
  if (/(sleeper|surprise|underrated|hidden)/.test(t)) {
    const s = metros.find((m) => m.sleeper);
    if (s) return { reply: `Your sleeper is ${s.name}. Your people are there and nobody’s booking it.`, mood: 'proud', action: { type: 'city', id: s.id, name: s.name, label: `Go to ${s.name}` } };
  }
  if (/(best|top|where|which city|start)/.test(t) && top[0]) return { reply: `Start with ${top[0].name}. That’s where ${name}’s crowd is thickest.`, mood: 'proud', action: { type: 'city', id: top[0].id, name: top[0].name, label: `Go to ${top[0].name}` } };
  return { reply: 'Ask me about a city, your route, or who’s signing. I’ll take you there.', mood: 'unimpressed', action: null };
}

const SCHEMA = {
  name: 'gus_answer',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'mood', 'intent', 'city'],
    properties: {
      reply: { type: 'string', description: 'One or two short spoken sentences in Gus’s voice. Under 30 words. No numbers you were not given.' },
      mood: { type: 'string', enum: ['idle', 'proud', 'unimpressed'] },
      intent: { type: 'string', enum: ['none', 'map', 'tour', 'pulse', 'posters', 'city', 'pitch', 'stay', 'eat'] },
      city: { type: 'string', description: 'Exact city name from the list when intent is city, pitch, stay or eat; otherwise empty.' },
    },
  },
};

export async function answer(artist: ArtistRow, heard: string, screen: string | null): Promise<GusAnswer> {
  const map = await mapData(artist);
  const metros: Metro[] = map.metros.map((m) => ({ id: m.id, name: m.name, state: m.state, rank: m.rank ?? null, sleeper: !!m.sleeper, score: m.score ?? null }));
  const ranked = metros.filter((m) => m.rank !== null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const lite = () => ({ heard, model: 'gus-lite', ...liteAnswer(heard, metros, artist.name) });
  if (!heard.trim()) return { heard, model: 'gus-lite', reply: 'I didn’t catch anything. Hold me and talk.', mood: 'unimpressed', action: null };
  try {
    const facts = [
      `Act: ${artist.name}.`,
      `Screen: ${screen ?? 'map'}.`,
      `Top cities by fit: ${ranked.slice(0, 12).map((m) => `${m.name} (#${m.rank}${m.sleeper ? ', sleeper' : ''})`).join(', ')}.`,
      `Posters up in: ${map.opened.length ? map.opened.map((id) => metros.find((m) => m.id === id)?.name ?? id).join(', ') : 'none yet'}.`,
    ].join('\n');
    const r = await chat({
      messages: [
        {
          role: 'system',
          content:
            'You are Gus, a gravelly veteran tour manager living inside the Wanted app. Dry, warm, brief. You answer the artist out loud and can open one screen. Use only the facts given. Never invent numbers, venues or people. If they ask to book a hotel or dinner, pick intent stay or eat; you open a search, you never claim to have booked anything.',
        },
        { role: 'user', content: `${facts}\n\nThe artist said: "${heard.slice(0, 400)}"` },
      ],
      schema: SCHEMA,
      temperature: 0.5,
      maxTokens: 220,
    });
    const out = parseJson<{ reply: string; mood: GusAnswer['mood']; intent: string; city: string }>(r.content);
    if (!out?.reply) return lite();
    const city = out.city ? (findCity(out.city, metros) ?? findCity(heard, metros)) : null;
    let action: GusAction | null = null;
    if (out.intent in TABS) action = TABS[out.intent];
    else if (city && out.intent === 'city') action = { type: 'city', id: city.id, name: city.name, label: `Go to ${city.name}` };
    else if (city && out.intent === 'pitch') action = { type: 'pitch', id: city.id, name: city.name, label: 'Draft the pitch' };
    else if (city && (out.intent === 'stay' || out.intent === 'eat')) action = stayLink(city, out.intent);
    return { heard, reply: out.reply.slice(0, 240), mood: out.mood ?? 'idle', action, model: r.model };
  } catch {
    return lite();
  }
}

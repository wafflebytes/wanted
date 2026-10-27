/**
 * Gus as a remote MCP server (streamable HTTP, stateless, JSON responses). Add
 * `<origin>/api/mcp` as a custom connector in Claude or ChatGPT and they can ask where an act
 * is wanted, read a city, check deals, put a question to Gus himself, and send him to ask
 * rooms. Nothing here can spend money: a deposit only ever happens after the artist says yes
 * in the app, against the exact offer they reviewed (deals.ts). Fan data never leaves: the
 * tools return counts by city, never names or contacts.
 */
import type { ArtistRow } from './artists';
import { tick } from './ambient';
import { dealsFor, startDeal } from './deals';
import { answer } from './gus/ask';
import { MCP_VIEW_HTML } from './mcp-view.gen';
import { METROS } from './score';
import { cityData, mapData, requireArtist } from './service';

const DEMO = 'maya-ortiz';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const origin = () => process.env.WANTED_PUBLIC_ORIGIN ?? 'https://trywanted.vercel.app';
/** MCP Apps: every tool's answer also draws as Gus's card inside Claude (src/server/mcp-view.html). */
const UI_EXT = 'io.modelcontextprotocol/ui';
const UI_MIME = 'text/html;profile=mcp-app';
const VIEW_URI = 'ui://wanted/gus-card.html';
const icons = () => [{ src: `${origin()}/icon.png`, mimeType: 'image/png', sizes: ['512x512'] }];

type Args = Record<string, unknown>;
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  annotations: { readOnlyHint: boolean; openWorldHint: boolean; destructiveHint?: boolean };
  run: (artist: ArtistRow, args: Args) => Promise<{ text: string; data: unknown }>;
};

const act = { type: 'string', description: `The act's Wanted slug. Defaults to the demo act, "${DEMO}".` };
const city = { type: 'string', description: 'A US city by name ("Burlington", "Portland, ME") or Wanted id ("burlington-vt").' };

function metroFor(q: unknown) {
  const s = String(q ?? '').trim().toLowerCase();
  if (!s) throw new ToolError('Say which city.');
  const [name, st] = s.split(',').map((x) => x.trim());
  const hit =
    METROS.find((m) => m.id === s) ??
    METROS.find((m) => m.name.toLowerCase() === name && (!st || m.state.toLowerCase() === st)) ??
    METROS.find((m) => m.name.toLowerCase().startsWith(name));
  if (!hit) throw new ToolError(`I don't know a city called "${q}". Try a bigger nearby city.`);
  return hit;
}

class ToolError extends Error {}

const TOOLS: Tool[] = [
  {
    name: 'where_am_i_wanted',
    title: 'Where is this act wanted',
    description:
      "The US cities where an act's sound already has fans, ranked from Qloo's taste graph (heat against a panel of other acts), with fan signatures on each city's WANTED poster as proof. Use it for 'where should I play' or 'where are my fans'.",
    inputSchema: { type: 'object', properties: { act, limit: { type: 'number', description: 'How many cities, 1 to 25. Default 10.' } } },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async run(artist, args) {
      const m = await mapData(artist);
      const n = Math.max(1, Math.min(25, Number(args.limit) || 10));
      const signed = new Map(m.proof.map((p) => [p.city, p.signatures]));
      const rows = m.metros
        .slice()
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        .slice(0, n)
        .map((c) => ({
          id: c.id,
          city: `${c.name}, ${c.state}`,
          rank: c.rank,
          heatPercentile: c.heatPct == null ? null : Math.round(c.heatPct * 100),
          sleeper: c.sleeper,
          posterUp: m.opened.includes(c.id),
          signatures: signed.get(c.id) ?? 0,
        }));
      const text = [
        `${artist.name}: top ${rows.length} cities by Qloo taste heat.`,
        ...rows.map((r) => `${r.rank}. ${r.city}: hotter than ${r.heatPercentile ?? '?'}% of cities${r.sleeper ? ' (sleeper: more fans than its size suggests)' : ''}${r.posterUp ? `, poster up, ${r.signatures} signed` : ''}.`),
        `Map: ${origin()}/a/${artist.slug}`,
      ].join('\n');
      return { text, data: { view: 'cities', act: artist.slug, actName: artist.name, cities: rows } };
    },
  },
  {
    name: 'city_brief',
    title: 'One city for this act',
    description:
      "One city for an act: the neighborhoods where its crowd lives and the rooms that fit its taste (both from Qloo), each room's likely size and open nights, and how many fans signed the poster there.",
    inputSchema: { type: 'object', properties: { act, city }, required: ['city'] },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async run(artist, args) {
      const metro = metroFor(args.city);
      const d = await cityData(artist, metro.id, true);
      const hoods = (d.neighborhoods ?? []).slice(0, 5).map((h) => h.name);
      const rooms = (d.rooms ?? []).slice(0, 6).map((r) => ({
        id: r.id,
        name: r.name,
        neighborhood: r.neighborhood,
        size: r.sizeGuess,
        openDays: r.openDays,
        pulledBy: r.pulledBy?.map((p) => p.name) ?? null,
      }));
      const text = [
        `${artist.name} in ${metro.name}, ${metro.state}.`,
        d.score?.heatPct != null ? `Hotter than ${Math.round(d.score.heatPct * 100)}% of US cities for this sound.` : null,
        hoods.length ? `Where the crowd lives: ${hoods.join(', ')}.` : 'No street-level heat from Qloo here yet.',
        rooms.length ? `Rooms that fit:\n${rooms.map((r, i) => `${i + 1}. ${r.name}${r.neighborhood ? ` (${r.neighborhood})` : ''}${r.size ? `, ${r.size}` : ''}`).join('\n')}` : 'No fitting rooms from Qloo here.',
        d.proof ? `${d.proof.signatures} fans signed the poster.` : 'No poster up yet.',
      ]
        .filter(Boolean)
        .join('\n');
      return {
        text,
        data: {
          view: 'city',
          act: artist.slug,
          actName: artist.name,
          city: metro.id,
          cityName: `${metro.name}, ${metro.state}`,
          heatPercentile: d.score?.heatPct != null ? Math.round(d.score.heatPct * 100) : null,
          neighborhoods: hoods,
          rooms,
          signatures: d.proof?.signatures ?? 0,
        },
      };
    },
  },
  {
    name: 'deals',
    title: 'Dates Gus is negotiating',
    description:
      "Every date Gus is negotiating with rooms for an act: talking, waiting on the artist's yes, or held. With the terms (door split, deposit) and whether they sit inside the artist's limits. The venue side is a simulation.",
    inputSchema: { type: 'object', properties: { act } },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async run(artist) {
      await tick(artist);
      const all = (await dealsFor(artist.id)).filter((d) => d.status !== 'passed');
      const rows = all.map((d) => ({
        id: d.id,
        room: d.roomName,
        city: d.cityName,
        status: d.status,
        date: d.terms?.date ?? null,
        split: d.terms?.split ?? null,
        deposit: d.terms?.deposit ?? null,
        withinLimits: d.withinLimits,
        lastLetter: d.thread.filter((l) => l.kind === 'letter').at(-1)?.text ?? null,
      }));
      const say = { talking: 'still talking', waiting: 'agreed, waiting on your yes in the app', held: 'held, deposit paid (test money)', declined: 'you said no' } as const;
      const text = rows.length
        ? rows.map((r) => `${r.room}, ${r.city}: ${say[r.status as keyof typeof say] ?? r.status}${r.split != null ? `. ${r.split}% of the door, $${r.deposit} to hold${r.date ? `, ${r.date}` : ''}` : ''}.`).join('\n')
        : 'No dates in talks right now.';
      return { text: `${text}\nApprove or pass in the app: ${origin()}/a/${artist.slug}`, data: { view: 'deals', act: artist.slug, actName: artist.name, deals: rows } };
    },
  },
  {
    name: 'ask_gus',
    title: 'Ask Gus',
    description:
      "Put a question to Gus, the act's tour manager. He runs his own lookups (Qloo's taste graph, the act's fan signatures, the rooms) and answers in a sentence or two, with what he checked. Good for openers, who the fans are, which city next, what changed.",
    inputSchema: { type: 'object', properties: { act, question: { type: 'string', description: 'The question, in plain words.' } }, required: ['question'] },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async run(artist, args) {
      const q = String(args.question ?? '').slice(0, 400).trim();
      if (!q) throw new ToolError('Ask Gus something.');
      const a = await answer(artist, q, null);
      const checked = a.steps.filter((s) => s.status === 'done' && s.found).map((s) => `${s.label}: ${s.found}`);
      const text = [a.reply, checked.length ? `\nWhat Gus checked:\n${checked.map((c) => `- ${c}`).join('\n')}` : null, a.action ? `\nHe'd suggest: ${a.action.label}.` : null].filter(Boolean).join('\n');
      return { text, data: { view: 'gus', act: artist.slug, actName: artist.name, reply: a.reply, mood: a.mood, steps: a.steps, action: a.action } };
    },
  },
  {
    name: 'ask_rooms',
    title: 'Send Gus to ask a room',
    description:
      "Send Gus to ask the best-fitting room in a city (or a named room id from city_brief) for a date. He negotiates inside the artist's limits in the background; the call shows live in the act's app. This never spends money: the deposit needs the artist's yes in the app on the exact offer.",
    inputSchema: { type: 'object', properties: { act, city, room: { type: 'string', description: 'Optional room id from city_brief.' } }, required: ['city'] },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    async run(artist, args) {
      const metro = metroFor(args.city);
      const d = await startDeal(artist, metro.id, args.room ? String(args.room) : null);
      return {
        text: `Gus is calling ${d.roomName} in ${d.cityName} now. Nothing gets paid without your yes in the app: ${origin()}/a/${artist.slug}`,
        data: { view: 'calling', act: artist.slug, actName: artist.name, deal: { id: d.id, room: d.roomName, city: d.cityName, status: d.status } },
      };
    },
  },
];

/** Starters that show up in Claude's menu for this connector. */
const PROMPTS: { name: string; title: string; description: string; arguments: { name: string; description: string; required: boolean }[]; text: (act: string, city?: string) => string }[] = [
  {
    name: 'where_am_i_wanted',
    title: 'Where am I wanted?',
    description: 'The cities where your sound already has a crowd.',
    arguments: [{ name: 'act', description: `Your Wanted slug (demo: ${DEMO})`, required: false }],
    text: (act) => `Ask Gus where ${act} is wanted. Show me the cities and tell me which one I should play first and why.`,
  },
  {
    name: 'plan_a_night',
    title: 'Plan a night in a city',
    description: 'Where the crowd lives in one city and the rooms that fit.',
    arguments: [
      { name: 'city', description: 'The city, like Burlington', required: true },
      { name: 'act', description: `Your Wanted slug (demo: ${DEMO})`, required: false },
    ],
    text: (act, city) => `Ask Gus about ${city || 'Burlington'} for ${act}: where the crowd lives, which rooms fit and which are open on a Tuesday.`,
  },
  {
    name: 'whats_waiting',
    title: 'What needs my yes?',
    description: 'The dates Gus is negotiating and what is waiting on you.',
    arguments: [{ name: 'act', description: `Your Wanted slug (demo: ${DEMO})`, required: false }],
    text: (act) => `Check with Gus which dates he's negotiating for ${act} and what's waiting on my yes.`,
  },
];

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };
const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const fail = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function one(m: Rpc) {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return fail(m?.id, -32600, 'Invalid request');
  const id = m.id;
  switch (m.method) {
    case 'initialize': {
      const want = String(m.params?.protocolVersion ?? '');
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false }, extensions: { [UI_EXT]: { mimeTypes: [UI_MIME] } } },
        serverInfo: {
          name: 'wanted-gus',
          title: 'Gus from Wanted',
          version: '1.0.0',
          websiteUrl: origin(),
          // Gus's face, so the connector shows him in Claude's tool list instead of a blank tile.
          icons: [...icons(), { src: `${origin()}/apple-icon.png`, mimeType: 'image/png', sizes: ['180x180'] }],
        },
        instructions: `Gus is a tour manager for independent musicians. He knows where an act is wanted (Qloo's taste graph plus fan signatures), which rooms fit, and the dates he's negotiating. Every tool takes an optional act slug; the demo act is "${DEMO}". Money never moves from here: the artist approves deposits in the app.`,
      });
    }
    case 'ping':
      return ok(id, {});
    case 'resources/list':
      return ok(id, { resources: [{ uri: VIEW_URI, name: 'gus_card', title: 'Gus’s card', description: 'How Gus shows his answers inside the chat.', mimeType: UI_MIME }] });
    case 'resources/templates/list':
      return ok(id, { resourceTemplates: [] });
    case 'resources/read': {
      if (m.params?.uri !== VIEW_URI) return fail(id, -32002, 'Resource not found');
      const o = origin();
      return ok(id, {
        contents: [
          {
            uri: VIEW_URI,
            mimeType: UI_MIME,
            text: MCP_VIEW_HTML.split('__ORIGIN__').join(o),
            // Gus's art and our rounded font come from the app; nothing else is reached.
            _meta: { ui: { csp: { connectDomains: [], resourceDomains: [o] }, prefersBorder: false } },
          },
        ],
      });
    }
    case 'prompts/list':
      return ok(id, { prompts: PROMPTS.map(({ text: _t, ...p }) => p) });
    case 'prompts/get': {
      const p = PROMPTS.find((x) => x.name === m.params?.name);
      if (!p) return fail(id, -32602, `Unknown prompt: ${String(m.params?.name)}`);
      const a = (m.params?.arguments ?? {}) as Record<string, string>;
      return ok(id, { description: p.description, messages: [{ role: 'user', content: { type: 'text', text: p.text(a.act || DEMO, a.city) } }] });
    }
    case 'tools/list':
      return ok(id, { tools: TOOLS.map(({ run: _run, ...t }) => ({ ...t, icons: icons(), _meta: { ui: { resourceUri: VIEW_URI, visibility: ['model', 'app'] } } })) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === m.params?.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${String(m.params?.name)}`);
      const args = (m.params?.arguments ?? {}) as Args;
      try {
        const artist = await requireArtist(String(args.act || DEMO));
        const { text, data } = await tool.run(artist, args);
        return ok(id, { content: [{ type: 'text', text }], structuredContent: data, isError: false });
      } catch (e) {
        const msg = e instanceof ToolError || (e instanceof Error && 'status' in e) ? e.message : 'Gus hit a snag. Try again in a moment.';
        if (!(e instanceof ToolError)) console.error('[mcp]', tool.name, e);
        return ok(id, { content: [{ type: 'text', text: msg }], isError: true });
      }
    }
    default:
      return id === undefined ? null : fail(id, -32601, `Method not found: ${m.method}`);
  }
}

/** One POST: a message or a batch. Notifications get no reply; a body with none gets 202. */
export async function handleMcp(body: unknown): Promise<unknown | null> {
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => one(m as Rpc)))).filter((r) => r !== null);
    return out.length ? out : null;
  }
  return one(body as Rpc);
}

export const mcpTools = TOOLS.map((t) => t.name);

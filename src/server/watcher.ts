/**
 * Gus watcher (FR-22): runs on every new signature, no cron. Recomputes the city's proof
 * ratio; when a city crosses the threshold (50 signatures and ratio >= 1.5 by default),
 * Gus posts one inbox message with one recommended action. Fires once per crossing, with a
 * 24-hour cooldown per city. Only aggregate counts reach the LLM.
 */
import type { InboxMessage } from '../lib/types';
import { getArtist, openedCities } from './artists';
import { shapeRooms } from './city';
import { proofFor } from './claims';
import { config } from './config';
import { id } from './crypto';
import { all, one, run } from './db';
import { autoBook } from './autobook';
import { thresholdMessage } from './gus/agent';
import { log } from './logbook';
import { rooms as qlooRooms } from './qloo/api';
import { metroById } from './score';

export type WatchOutcome = { fired: boolean; reason: string; message?: InboxMessage };

export async function onSignature(artistId: string, city: string, opts: { includeDemo?: boolean; now?: number; awaitChain?: boolean } = {}): Promise<WatchOutcome> {
  const artist = await getArtist(artistId);
  if (!artist) return { fired: false, reason: 'no artist' };
  const includeDemo = opts.includeDemo ?? artist.isDemo;
  const now = opts.now ?? Date.now();
  const proof = (await proofFor(artist.id, { includeDemo })).find((p) => p.city === city);
  if (!proof) return { fired: false, reason: 'city not opened' };

  const state = await one<{ last_fired_at: number | null; crossed: number }>(
    'select last_fired_at, crossed from watcher_state where artist_id = ? and city = ?',
    [artist.id, city],
  );
  const wasCrossed = !!state?.crossed;
  await run(
    `insert into watcher_state(artist_id, city, last_fired_at, last_ratio, crossed) values(?, ?, ?, ?, ?)
     on conflict(artist_id, city) do update set last_ratio = excluded.last_ratio, crossed = excluded.crossed`,
    [artist.id, city, state?.last_fired_at ?? null, proof.ratio, proof.crossed ? 1 : 0],
  );
  if (!proof.crossed) return { fired: false, reason: 'below threshold' };
  if (wasCrossed) return { fired: false, reason: 'already crossed' };
  if (state?.last_fired_at && now - state.last_fired_at < config.proof.cooldownMs) return { fired: false, reason: 'cooldown' };

  const metro = metroById(city)!;
  const opened = (await openedCities(artist.id)).find((c) => c.city === city);
  let topRoom: { id: string; name: string } | null = null;
  try {
    const r = await qlooRooms(artist.sound.entities, metro.query, artist.kind === 'comedy', `artist:${artist.id}`);
    const shaped = shapeRooms(r.data, artist.sound, null, artist.roomBand);
    if (shaped.rooms[0]) topRoom = { id: shaped.rooms[0].id, name: shaped.rooms[0].name };
  } catch {
    // The alert still goes out; the action becomes "add to route" instead of "pitch".
  }

  const { body, model } = await thresholdMessage({
    artistName: artist.name,
    city: metro.name,
    signatures: proof.signatures,
    signatureShare: proof.signatureShare ?? 0,
    heatShare: proof.heatShare ?? 0,
    ratio: proof.ratio ?? 0,
    topRoom: topRoom?.name ?? null,
    topNeighborhoods: opened?.topNeighborhoods ?? [],
  });

  const message: InboxMessage = {
    id: id('m_'),
    kind: 'threshold',
    body,
    action: topRoom
      ? { label: `Pitch ${topRoom.name}`, kind: 'pitch', city, roomId: topRoom.id }
      : { label: `Add ${metro.name} to the route`, kind: 'add-city', city },
    evidence: {
      city,
      signatures: proof.signatures,
      demoSignatures: proof.demoSignatures,
      signatureShare: proof.signatureShare,
      heatShare: proof.heatShare,
      ratio: proof.ratio,
      threshold: { minSignatures: config.proof.minSignatures, ratio: config.proof.ratioThreshold },
      model,
    },
    createdAt: now,
    read: false,
  };
  await run('insert into gus_inbox(id, artist_id, kind, body, action, evidence, created_at) values(?, ?, ?, ?, ?, ?, ?)', [
    message.id,
    artist.id,
    message.kind,
    message.body,
    JSON.stringify(message.action),
    JSON.stringify(message.evidence),
    now,
  ]);
  await run('update watcher_state set last_fired_at = ? where artist_id = ? and city = ?', [now, artist.id, city]);
  await log(artist.id, {
    kind: 'decision',
    city,
    title: `${metro.name} filled its poster: ${proof.signatures} people signed`,
    detail: `That’s more than we’d expect for a city this size, so it’s worth booking.${artist.isDemo ? ' (Demo data.)' : ''}`,
    source: 'fans',
    level: 1,
  });
  // Then Gus goes to work on his own (9.3c); the fan's request doesn't wait for it.
  const chain = autoBook(artist, city).catch((e) => console.error('[autobook]', String(e)));
  if (opts.awaitChain) await chain;
  return { fired: true, reason: 'crossed', message };
}

export async function inbox(artistId: string, limit = 50): Promise<InboxMessage[]> {
  const rows = await all<{ id: string; kind: string; body: string; action: string | null; evidence: string | null; created_at: number; read: number }>(
    'select * from gus_inbox where artist_id = ? order by created_at desc limit ?',
    [artistId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as InboxMessage['kind'],
    body: r.body,
    action: r.action ? JSON.parse(r.action) : null,
    evidence: r.evidence ? JSON.parse(r.evidence) : null,
    createdAt: r.created_at,
    read: !!r.read,
  }));
}

export async function postInbox(artistId: string, msg: Omit<InboxMessage, 'id' | 'read'>) {
  const mid = id('m_');
  await run('insert into gus_inbox(id, artist_id, kind, body, action, evidence, created_at) values(?, ?, ?, ?, ?, ?, ?)', [
    mid,
    artistId,
    msg.kind,
    msg.body,
    msg.action ? JSON.stringify(msg.action) : null,
    msg.evidence ? JSON.stringify(msg.evidence) : null,
    msg.createdAt,
  ]);
  return mid;
}

export async function markRead(artistId: string, messageId?: string) {
  if (messageId) await run('update gus_inbox set read = 1 where artist_id = ? and id = ?', [artistId, messageId]);
  else await run('update gus_inbox set read = 1 where artist_id = ?', [artistId]);
}

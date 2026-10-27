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
import { run, transaction } from './db';
import { runBookingJob } from './jobs';
import { thresholdMessage } from './gus/agent';
import { log } from './logbook';
import { mandateFor } from './mandate';
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

  // Persist the crossing and its work atomically. Concurrent signatures cannot enqueue twice.
  const jobId = id('job_');
  const gate = await transaction(async (tx) => {
    const found = await tx.execute({ sql: 'select last_fired_at, crossed from watcher_state where artist_id = ? and city = ?', args: [artist.id, city] });
    const state = found.rows[0];
    const crossed = !!state?.crossed;
    await tx.execute({ sql: `insert into watcher_state(artist_id, city, last_fired_at, last_ratio, crossed) values(?, ?, ?, ?, ?) on conflict(artist_id, city) do update set last_ratio = excluded.last_ratio, crossed = excluded.crossed`, args: [artist.id, city, state?.last_fired_at ?? null, proof.ratio, proof.crossed ? 1 : 0] });
    if (!proof.crossed) return 'below threshold';
    if (crossed) return 'already crossed';
    if (state?.last_fired_at && now - Number(state.last_fired_at) < config.proof.cooldownMs) return 'cooldown';
    await tx.execute({ sql: 'update watcher_state set last_fired_at = ? where artist_id = ? and city = ?', args: [now, artist.id, city] });
    await tx.execute({ sql: "insert into gus_jobs(id, artist_id, city, state, created_at, updated_at) values(?, ?, ?, 'queued', ?, ?)", args: [jobId, artist.id, city, now, now] });
    return 'crossed';
  });
  if (gate !== 'crossed') return { fired: false, reason: gate };

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
  // When Gus may talk to venues himself, his offer card says it all; this one goes under "earlier".
  message.read = (await mandateFor(artist.id)).autoAsk;
  await run('insert into gus_inbox(id, artist_id, kind, body, action, evidence, created_at, read) values(?, ?, ?, ?, ?, ?, ?, ?)', [
    message.id,
    artist.id,
    message.kind,
    message.body,
    JSON.stringify(message.action),
    JSON.stringify(message.evidence),
    now,
    message.read ? 1 : 0,
  ]);
  await run('update watcher_state set last_fired_at = ? where artist_id = ? and city = ?', [now, artist.id, city]);
  await log(artist.id, {
    kind: 'decision',
    city,
    title: `${metro.name} filled its poster: ${proof.signatures} people signed`,
    detail: `Interest over-indexed against the heat share. It’s a reason to look at venues there, not a promise of ticket sales.${artist.isDemo ? ' (Demo signatures.)' : ''}`,
    source: 'fans',
    level: 1,
  });
  // The queue owns the chain, not a detached Promise. An interrupted attempt is recoverable.
  await runBookingJob(jobId);
  return { fired: true, reason: 'crossed', message };
}

export { inbox, postInbox, markRead } from './inbox';

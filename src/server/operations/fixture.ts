import type { ArtistRow } from '../artists';
import type { Candidate, Evidence, Opportunity, RankingView, PressureTest, SensitivityReport } from '../../lib/operations';
import { currentEvidence, pressureResult, qualify, validateRanking } from '../../lib/operations';
import type { SoundEntity } from '../../lib/types';
import { id } from '../crypto';
import { defaultDate } from '../deals';
import { transaction } from '../db';
import { searchActs, rankCandidateRoster } from '../qloo/api';
import { HttpError } from '../http';
import { wakeAgentTask } from './task-store';
import { cancelTaskAttention } from './attention';
import { deskFor, insertOpportunity, changeFixtureScene } from './store';

export const deskId = (artistId: string) => `desk:${artistId}:burlington`;
const NAMES = ['Lucy Dacus', 'Snail Mail', 'Thundercat', 'Kamasi Washington'];
async function exact(name: string, scope: string): Promise<{ entity: SoundEntity; genres: string[] } | null> {
  try {
    const r = await searchActs(name, 'artist', scope, 6);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const e = r.data.find((x) => norm(x.name) === norm(name));
    return e ? { entity: { id: e.id, name: e.name }, genres: e.genres } : null;
  } catch { return null; }
}
export async function ensureFixture(artist: ArtistRow, showId = deskId(artist.id)): Promise<void> {
  if (!artist.isDemo) throw new HttpError(403, 'Booking desk currently has a fixture inbox only. Real operator authentication is not connected.');
  if (await deskFor(artist.id, showId)) return;
  const scope = `artist:${artist.id}`;
  const resolved = await Promise.all([...NAMES, 'Flying Lotus'].map((n) => exact(n, scope)));
  const now = Date.now();
  const date = defaultDate();
  const ev = <T>(value: T, label: string): Evidence<T> => ({ value, label, source: 'fixture', observedAt: now, expiresAt: now + 7 * 86_400_000 });
  const roster: Candidate[] = NAMES.map((name, i) => ({
    id: `fixture-c${i + 1}`, name,
    mapping: { status: resolved[i] ? 'verified' : 'unresolved', entityId: resolved[i]?.entity.id ?? null },
    locality: ev('burlington-vt', 'Fictional circuit membership, NOT actual locality'),
    live: ev(true, 'Fictional operator live-suitability check'),
    format: 'music', capacity: ev(150, 'Fictional support scale, NOT actual draw'),
    fee: ev([120, 160, 140, 180][i], 'Fictional fee, NOT an artist quote'),
    availability: ev({ date, status: 'available' as const }, 'Fictional date availability, NOT a real calendar'),
    intake: ev('fixture-inbox', 'Local fixture connector, no real contact'), genres: resolved[i]?.genres ?? [],
  }));
  const show: Opportunity = { id: showId, artistId: artist.id, mode: 'fixture', version: 1, city: 'burlington-vt', date, format: 'music', roomCapacity: 150, maxFee: 200, status: 'planning', roster, act: artist.sound.entities, scene: resolved[4] ? [resolved[4]!.entity] : [], sceneEvidence: ev('Flying Lotus is an illustrative contrasting context, NOT verified Burlington scene history.', 'Illustrative scene reference'), updatedAt: now };
  await insertOpportunity(artist, show);
}
export async function runPressure(artist: ArtistRow, policy: PressureTest['policyName'] = 'balanced', showId = deskId(artist.id)): Promise<PressureTest> {
  const desk = await deskFor(artist.id, showId);
  if (!desk) throw new HttpError(404, 'Create the fixture desk first.');
  const show = desk.opportunity;
  const now = Date.now();
  const pool = show.roster.filter((c) => qualify(c, show, now).status === 'eligible').map((c) => c.mapping.entityId!);
  const view = async (signal: SoundEntity[]): Promise<RankingView> => {
    if (!pool.length || !signal.length) return { scores: [], receipt: null, error: 'No eligible mapped roster or resolved context. No invented scores.' };
    let receipt: RankingView['receipt'] = null;
    try {
      const result = await rankCandidateRoster(signal, pool, `artist:${artist.id}`);
      receipt = result.receipt;
      if (receipt.stale) throw new Error('Cultural result is stale. Refresh or request operator review.');
      return { scores: validateRanking(pool, result.data), receipt, error: null };
    } catch (e) { return { scores: [], receipt, error: e instanceof Error ? e.message : 'Cultural ranking unavailable.' }; }
  };
  const sceneValid = currentEvidence(show.sceneEvidence, now, show.mode);
  const [act, scene, joint] = await Promise.all([view(show.act), view(sceneValid ? show.scene : []), view(sceneValid ? [...new Map([...show.act, ...show.scene].map((s) => [s.id, s])).values()] : [])]);
  const result = pressureResult(show, { act, scene, joint }, now, policy);
  // Don't publish a completed ranking against a changed offer.
  await transaction(async (tx) => {
    const r = await tx.execute({ sql: 'select version from ops_opportunities where id = ? and artist_id = ?', args: [show.id, artist.id] });
    if (Number(r.rows[0]?.version) !== show.version) throw new HttpError(409, 'Show changed during ranking. Run the current version again.');
    await tx.execute({ sql: 'insert into kv(key, value, updated_at) values(?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at', args: [`pressure:${artist.id}:${show.id}`, JSON.stringify(result), now] });
    await tx.execute({ sql: 'delete from kv where key = ?', args: [`sensitivity:${artist.id}:${show.id}`] });
    const eventId = id('oe_');
    const event = { id: eventId, opportunityId: show.id, version: show.version, kind: 'cultural-check', detail: `Qloo comparison over ${pool.length} eligible mapped candidates. Policy: ${policy}. ${result.selectedId ? 'Bridge selected under Wanted’s rule.' : 'No bridge selected; unknown or failed evidence is not a score.'}`, createdAt: now };
    await tx.execute({ sql: 'insert into ops_events(id, artist_id, opportunity_id, source_key, body, created_at) values(?, ?, ?, ?, ?, ?)', args: [event.id, artist.id, show.id, event.id, JSON.stringify(event), now] });
  });
  return result;
}

/** Explicit fixture reconfirmation, not inferred from a changed date or general opening hours. */
export async function reconfirmFixture(artist: ArtistRow, expectedVersion: number, showId = deskId(artist.id)) {
  if (!artist.isDemo) throw new HttpError(403, 'Only fictional eligibility can be reset here.');
  await transaction(async (tx) => {
    const r = await tx.execute({ sql: 'select body from ops_opportunities where id = ? and artist_id = ?', args: [showId, artist.id] });
    if (!r.rows[0]) throw new HttpError(404, 'No fixture desk.');
    const show = JSON.parse(String(r.rows[0].body)) as Opportunity;
    if (show.version !== expectedVersion || show.status === 'canceled') throw new HttpError(409, 'Show changed or canceled.');
    const now = Date.now();
    for (const c of show.roster) if (c.availability) c.availability = { ...c.availability, value: { date: show.date, status: 'available' }, observedAt: now, expiresAt: now + 7 * 86_400_000 };
    // Evidence changes are new business versions too: invalidate pending actions.
    show.version++; show.updatedAt = now;
    await tx.execute({ sql: 'update ops_opportunities set body = ?, version = ?, updated_at = ? where id = ? and artist_id = ?', args: [JSON.stringify(show), show.version, now, show.id, artist.id] });
    const rows = await tx.execute({ sql: 'select id, body from ops_actions where artist_id = ? and opportunity_id = ?', args: [artist.id, show.id] });
    for (const row of rows.rows) {
      const a = JSON.parse(String(row.body)); a.approval = null; if (!a.receipt && a.state !== 'uncertain') a.state = 'invalidated'; a.reason = 'Fixture evidence reconfirmed in a new version. Prepare a current request.';
      await tx.execute({ sql: 'update ops_actions set body = ?, updated_at = ? where id = ?', args: [JSON.stringify(a), now, row.id] });
    }
    await wakeAgentTask(tx, show, 'Operator reconfirmed fictional date evidence. Resume the bill job.', now);
    const event = { id: `reconfirm:${show.id}:${show.version}`, opportunityId: show.id, version: show.version, kind: 'fixture-reconfirmed', detail: 'Fictional availability explicitly reconfirmed. No real artist contacted.', createdAt: now };
    await tx.execute({ sql: 'insert into ops_events(id, artist_id, opportunity_id, source_key, body, created_at) values(?, ?, ?, ?, ?, ?)', args: [event.id, artist.id, show.id, event.id, JSON.stringify(event), now] });
  });
}

export async function resetFixture(artist: ArtistRow, showId: string) {
  if (!artist.isDemo) throw new HttpError(403, 'Only fixture cases can be reset.');
  await transaction(async (tx) => {
    await cancelTaskAttention(tx, `support:${showId}`, artist.id, Date.now());
    await tx.execute({ sql: 'delete from ops_attention where artist_id = ? and opportunity_id = ?', args: [artist.id, showId] });
    const keys = await tx.execute({ sql: 'select business_key from ops_actions where artist_id = ? and opportunity_id = ?', args: [artist.id, showId] });
    for (const row of keys.rows) await tx.execute({ sql: 'delete from ops_effects where business_key = ? and artist_id = ?', args: [row.business_key, artist.id] });
    for (const table of ['ops_agent_tasks', 'ops_actions', 'ops_events']) await tx.execute({ sql: `delete from ${table} where artist_id = ? and opportunity_id = ?`, args: [artist.id, showId] });
    await tx.execute({ sql: 'delete from ops_opportunities where artist_id = ? and id = ?', args: [artist.id, showId] });
    await tx.execute({ sql: 'delete from kv where key in (?, ?)', args: [`pressure:${artist.id}:${showId}`, `sensitivity:${artist.id}:${showId}`] });
  });
  await ensureFixture(artist, showId);
}

/** A controlled taste counterfactual: operating inventory stays identical. */
export async function setFixtureScene(artist: ArtistRow, showId: string, expectedVersion: number, context: 'left-field' | 'indie') {
  if (!artist.isDemo) throw new HttpError(403, 'Only fixture contexts can be changed here.');
  const name = context === 'indie' ? 'Bon Iver' : 'Flying Lotus';
  const found = await exact(name, `artist:${artist.id}`);
  if (!found) throw new HttpError(409, 'Scene identity could not be resolved. No invented Qloo ID.');
  const now = Date.now();
  await changeFixtureScene(artist, showId, expectedVersion, [found.entity], { value: `${name} is an illustrative contrast, NOT verified local scene history.`, source: 'fixture', label: 'Operator-selected illustrative context', observedAt: now, expiresAt: now + 7 * 86_400_000 });
}

/** Leave-one-reference-out robustness, not an attendance confidence interval. */
export async function checkSensitivity(artist: ArtistRow, showId: string): Promise<SensitivityReport> {
  const desk = await deskFor(artist.id, showId);
  if (!desk?.pressure || desk.pressure.views.scene.error) throw new HttpError(409, 'Run a valid current-version pressure test first.');
  const show = desk.opportunity;
  if (show.act.length < 2) throw new HttpError(409, 'At least two resolved act references are needed for a leave-one-out check.');
  const now = Date.now();
  const pool = show.roster.filter((c) => qualify(c, show, now).status === 'eligible').map((c) => c.mapping.entityId!);
  const variants = await Promise.all(show.act.map(async (removed) => {
    let act: RankingView = { scores: [], receipt: null, error: null };
    try {
      const r = await rankCandidateRoster(show.act.filter((e) => e.id !== removed.id), pool, `artist:${artist.id}`);
      act.receipt = r.receipt;
      if (r.receipt.stale) throw new Error('Stale ranking');
      act.scores = validateRanking(pool, r.data);
    } catch (e) { act.error = e instanceof Error ? e.message : 'Sensitivity query unavailable'; }
    const result = pressureResult(show, { act, scene: desk.pressure!.views.scene, joint: { scores: [], receipt: null, error: 'Joint view not needed for this policy' } }, now, desk.pressure!.policyName);
    return { removedReference: removed.name, selectedId: result.selectedId, act, error: act.error };
  }));
  const status = variants.some((v) => v.error) ? 'inconclusive' : variants.every((v) => v.selectedId === desk.pressure!.selectedId) ? 'stable' : 'sensitive';
  const report: SensitivityReport = { version: show.version, baselineSelectedId: desk.pressure.selectedId, variants, status, detail: status === 'stable' ? 'This bill choice survives removing either act reference on this roster. That is input robustness, not proof of live draw.' : status === 'sensitive' ? 'The bill choice depends on an act reference. Ask the operator to refine the taste context before treating it as a strong recommendation.' : 'At least one required sensitivity score is missing. No confidence claim.', observedAt: now };
  await transaction(async (tx) => {
    const r = await tx.execute({ sql: 'select version from ops_opportunities where id = ? and artist_id = ?', args: [show.id, artist.id] });
    if (Number(r.rows[0]?.version) !== show.version) throw new HttpError(409, 'Show changed during the check.');
    await tx.execute({ sql: 'insert into kv(key, value, updated_at) values(?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at', args: [`sensitivity:${artist.id}:${show.id}`, JSON.stringify(report), now] });
  });
  return report;
}

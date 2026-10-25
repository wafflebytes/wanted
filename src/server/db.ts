/**
 * libSQL access. Local dev uses a SQLite file under .data/; production uses Turso.
 * Fan claims, the Qloo cache and Gus's inbox all live here, never in the repo.
 */
import type { Client, InArgs, Row } from '@libsql/client';
import { env } from './env';
import { nodeRequire } from './node-require';

export const SCHEMA = [
  `create table if not exists artists (
    id text primary key,
    slug text unique not null,
    name text not null,
    kind text not null default 'music',
    sound text not null,
    image_url text,
    portrait text,
    home_base text,
    room_band text,
    contact_email text,
    is_demo integer not null default 0,
    created_at integer not null
  )`,
  `create table if not exists claims (
    id text primary key,
    artist_id text not null,
    city text not null,
    hex text,
    neighborhood text,
    device_hash text not null,
    referrer text,
    ref_code text not null,
    contact_enc text,
    signer_initials text,
    font integer not null default 0,
    number integer not null,
    is_demo integer not null default 0,
    early_access integer not null default 0,
    ip_hash text,
    created_at integer not null,
    unique(artist_id, city, device_hash)
  )`,
  `create index if not exists claims_artist_city on claims(artist_id, city)`,
  `create index if not exists claims_ref on claims(ref_code)`,
  `create table if not exists opened_cities (
    artist_id text not null,
    city text not null,
    heat_share real,
    heat real,
    top_neighborhoods text,
    opened_at integer not null,
    played_at integer,
    played_venue text,
    primary key(artist_id, city)
  )`,
  `create table if not exists gus_inbox (
    id text primary key,
    artist_id text not null,
    kind text not null,
    body text not null,
    action text,
    evidence text,
    created_at integer not null,
    read integer not null default 0
  )`,
  `create index if not exists inbox_artist on gus_inbox(artist_id, created_at)`,
  `create table if not exists deals (
    id text primary key,
    artist_id text not null,
    city text not null,
    body text not null,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create index if not exists deals_artist on deals(artist_id, created_at)`,
  `create table if not exists watcher_state (
    artist_id text not null,
    city text not null,
    last_fired_at integer,
    last_ratio real,
    crossed integer not null default 0,
    primary key(artist_id, city)
  )`,
  `create table if not exists qloo_cache (
    key text primary key,
    path text not null,
    body text not null,
    created_at integer not null
  )`,
  `create table if not exists qloo_trace (
    id text primary key,
    scope text,
    endpoint text not null,
    method text not null,
    params text not null,
    status integer,
    latency_ms integer,
    cached integer not null default 0,
    cache_date integer,
    purpose text,
    result_count integer,
    created_at integer not null
  )`,
  `create index if not exists trace_scope on qloo_trace(scope, created_at)`,
  `create table if not exists metro_scores (
    sound_hash text not null,
    metro_id text not null,
    heat real,
    lift real,
    score real,
    cells integer,
    primary key(sound_hash, metro_id)
  )`,
  `create table if not exists baseline_panel (
    metro_id text primary key,
    heat real not null,
    n integer not null,
    updated_at integer not null
  )`,
  `create table if not exists plans (
    id text primary key,
    artist_id text not null,
    body text not null,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create table if not exists llm_cache (
    key text primary key,
    model text not null,
    body text not null,
    created_at integer not null
  )`,
  `create table if not exists voice_cache (
    key text primary key,
    model text not null,
    mime text not null,
    audio text not null,
    created_at integer not null
  )`,
  `create table if not exists kv (
    key text primary key,
    value text not null,
    updated_at integer not null
  )`,
  `create table if not exists bounties (
    artist_id text not null,
    city text not null,
    secret text not null,
    commit_hash text not null,
    prize text not null,
    status text not null default 'open',
    snapshot text,
    snapshot_hash text,
    ticket integer,
    total integer,
    winner_claim_id text,
    winner_number integer,
    drawn_by text,
    drawn_at integer,
    created_at integer not null,
    primary key(artist_id, city)
  )`,
  `create table if not exists gus_log (
    id text primary key,
    artist_id text not null,
    kind text not null,
    city text,
    title text not null,
    detail text,
    source text not null,
    level integer not null default 0,
    ref text,
    created_at integer not null
  )`,
  `create index if not exists gus_log_artist on gus_log(artist_id, created_at)`,
  `create table if not exists gus_calls (
    id text primary key,
    artist_id text not null,
    deal_id text not null,
    city text not null,
    script text not null,
    status text not null,
    outcome text,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create index if not exists gus_calls_artist on gus_calls(artist_id, created_at)`,
  `create table if not exists rate_limits (
    key text not null,
    win integer not null,
    count integer not null,
    primary key(key, win)
  )`,
];

let client: Client | null = null;
let ready: Promise<void> | null = null;

function connect(): Client {
  if (client) return client;
  const { createClient } = nodeRequire<typeof import('@libsql/client')>('@libsql/client');
  const url = env.databaseUrl;
  if (url.startsWith('file:')) {
    const fs = process.getBuiltinModule('node:fs') as typeof import('node:fs');
    const path = process.getBuiltinModule('node:path') as typeof import('node:path');
    fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  }
  client = createClient({ url, authToken: env.databaseToken });
  return client;
}

export async function migrate() {
  const db = connect();
  if (env.databaseUrl.startsWith('file:')) await db.execute('pragma journal_mode = wal');
  await db.batch(SCHEMA.map((sql) => ({ sql, args: [] })), 'write');
}

async function db(): Promise<Client> {
  if (!ready) ready = migrate();
  await ready;
  return connect();
}

export async function all<T = Row>(sql: string, args: InArgs = []): Promise<T[]> {
  const r = await (await db()).execute({ sql, args });
  return r.rows as unknown as T[];
}

export async function one<T = Row>(sql: string, args: InArgs = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InArgs = []) {
  return (await db()).execute({ sql, args });
}

export async function batch(statements: { sql: string; args?: InArgs }[]) {
  return (await db()).batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'write',
  );
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const row = await one<{ value: string }>('select value from kv where key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function kvSet(key: string, value: unknown) {
  await run(
    'insert into kv(key, value, updated_at) values(?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at',
    [key, JSON.stringify(value), Date.now()],
  );
}

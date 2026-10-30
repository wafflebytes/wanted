/** Server-only environment access. Keys never leave the server (PRD 10.5). */
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  get qlooKey() {
    return read('QLOO_API_KEY');
  },
  get openrouterKey() {
    return read('OPENROUTER_API_KEY');
  },
  /** Operator-supplied credential pool (OPENROUTER_API_KEYS, comma separated) plus the primary key. Deduped, order kept. */
  get openrouterKeys(): string[] {
    const pool = (read('OPENROUTER_API_KEYS') ?? '').split(',').map((k) => k.trim()).filter(Boolean);
    return [...new Set([...(read('OPENROUTER_API_KEY') ? [read('OPENROUTER_API_KEY')!] : []), ...pool])];
  },
  get fishKey() {
    return read('FISH_AUDIO_API_KEY');
  },
  /** Stripe, test mode only: a live key is ignored, so Gus can never move real money. */
  get stripeTestKey() {
    const k = read('STRIPE_SECRET_KEY');
    return k?.startsWith('sk_test_') ? k : undefined;
  },
  get setlistKey() {
    return read('SETLIST_API_KEY');
  },
  /** libsql URL. Defaults to a local SQLite file; set to a Turso URL in production. */
  get databaseUrl() {
    return read('TURSO_DATABASE_URL') ?? `file:${process.cwd()}/.data/wanted.db`;
  },
  get databaseToken() {
    return read('TURSO_AUTH_TOKEN');
  },
  /** 32-byte hex key for encrypting fan contact details at rest. */
  get contactKey() {
    return read('WANTED_CONTACT_KEY');
  },
  /** Salt for hashing fan device tokens. */
  get deviceSalt() {
    return read('WANTED_DEVICE_SALT') ?? 'wanted-dev-salt';
  },
  /** Public origin used in share links and OG tags. */
  get publicOrigin() {
    return read('WANTED_PUBLIC_ORIGIN') ?? 'http://localhost:8081';
  },
  /** Demo mode serves cached Qloo results only and never calls Qloo live. */
  get offline() {
    return read('WANTED_OFFLINE') === '1';
  },
};

/** Redacts anything that looks like one of our keys from a string (logs, traces, errors). */
export function redact(text: string): string {
  let out = text;
  for (const key of [env.qlooKey, ...env.openrouterKeys, env.fishKey, env.setlistKey, env.contactKey]) {
    if (key) out = out.split(key).join('[redacted]');
  }
  return out.replace(/hack_[A-Za-z0-9]{6,}/g, 'hack_[redacted]').replace(/sk[-_](or|fish|car)[-_][A-Za-z0-9-]{6,}/g, 'sk-[redacted]');
}

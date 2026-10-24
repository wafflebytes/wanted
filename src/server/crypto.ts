/** Hashing, ids and at-rest encryption for fan data (PRD 4.2, 10.5). Server-only. */
import { env } from './env';

type NodeCrypto = typeof import('node:crypto');
const crypto = () => process.getBuiltinModule('node:crypto') as NodeCrypto;

export function sha256(text: string): string {
  return crypto().createHash('sha256').update(text).digest('hex');
}

/** A fresh random secret, hex (the Bounty's sealed draw seed). */
export function secretHex(bytes = 32): string {
  return crypto().randomBytes(bytes).toString('hex');
}

export function id(prefix = ''): string {
  return prefix + crypto().randomBytes(9).toString('base64url');
}

/** Stable hash of JSON-ish values with sorted keys, used for cache keys. */
export function stableHash(value: unknown): string {
  return sha256(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    return `{${keys
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function deviceHash(token: string): string {
  return sha256(`${env.deviceSalt}:device:${token}`);
}

export function ipHash(ip: string): string {
  return sha256(`${env.deviceSalt}:ip:${ip}`).slice(0, 24);
}

function contactKey(): Buffer {
  const hex = env.contactKey;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, 'hex');
  // Dev fallback: derived from the salt so local data stays readable between restarts.
  return crypto().createHash('sha256').update(`${env.deviceSalt}:contact-key`).digest();
}

/** AES-256-GCM. Output: base64url(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = crypto().randomBytes(12);
  const cipher = crypto().createCipheriv('aes-256-gcm', contactKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, 'base64url');
  const decipher = crypto().createDecipheriv('aes-256-gcm', contactKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

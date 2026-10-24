import 'server-only';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { addEvent, clearEvents, countEvents, createSessionRecord, deleteSessions, kvGet, kvSet, sessionValid } from './store';

// PIN-based admin access. The PIN is never sent to the browser: it is stored
// as a salted scrypt hash on the server; sessions are random tokens kept as
// SHA-256 hashes, delivered in an httpOnly cookie.

const COOKIE = 'lumiere_admin';
const SESSION_DAYS = 14;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

interface PinRecord {
  salt: string;
  hash: string;
}

const hashPin = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString('hex');
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const defaultPin = () => process.env.ADMIN_PIN || '0000';

async function pinRecord(): Promise<PinRecord | null> {
  return kvGet<PinRecord>('auth:pin');
}

export async function isDefaultPin(): Promise<boolean> {
  return (await pinRecord()) === null && defaultPin() === '0000';
}

export async function verifyPin(pin: string): Promise<boolean> {
  const rec = await pinRecord();
  if (!rec) {
    const expected = Buffer.from(defaultPin());
    const given = Buffer.from(pin);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
  const a = Buffer.from(hashPin(pin, rec.salt), 'hex');
  const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setPin(pin: string): Promise<void> {
  const salt = randomBytes(16).toString('hex');
  await kvSet('auth:pin', { salt, hash: hashPin(pin, salt) } satisfies PinRecord);
}

export async function loginBlocked(ip: string): Promise<boolean> {
  return (await countEvents('login-fail', ip, FAIL_WINDOW_MS)) >= MAX_FAILS;
}

export async function recordLoginFail(ip: string) {
  await addEvent('login-fail', ip);
}

export async function clearLoginFails(ip: string) {
  await clearEvents('login-fail', ip);
}

export async function startSession(): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await createSessionRecord(sha256(token), Date.now() + maxAge * 1000);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

export async function endSession(all = false): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (all) await deleteSessions();
  else if (token) await deleteSessions(sha256(token));
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    return await sessionValid(sha256(token));
  } catch {
    return false;
  }
}

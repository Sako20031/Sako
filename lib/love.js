import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';

// Storage + auth for the /ayaulym site. Kept in its own love_* tables so it
// never collides with the barbershop data living in the same database.

const COOKIE = 'love_admin';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_PIN = '0000';

let initPromise = null;

export function ensureLoveDb() {
  if (!initPromise) {
    initPromise = init().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS love_photos (
    id TEXT PRIMARY KEY,
    caption TEXT,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS love_compliments (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS love_audio (
    id TEXT PRIMARY KEY,
    title TEXT,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS love_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS love_sessions (
    token TEXT PRIMARY KEY,
    created_at BIGINT
  )`;
  await sql`INSERT INTO love_settings (key, value) VALUES ('pin', ${DEFAULT_PIN})
    ON CONFLICT (key) DO NOTHING`;
}

export function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession() {
  const token = randomToken();
  await sql`INSERT INTO love_sessions (token, created_at) VALUES (${token}, ${Date.now()})`;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await sql`DELETE FROM love_sessions WHERE token = ${token}`;
  cookies().delete(COOKIE);
}

export async function isLoveAdmin() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  const cutoff = Date.now() - MAX_AGE * 1000;
  const res = await sql`SELECT token FROM love_sessions WHERE token = ${token} AND created_at > ${cutoff}`;
  return res.rows.length > 0;
}

// "data:image/jpeg;base64,AAAA" -> { mime: 'image/jpeg', data: 'AAAA' }
export function parseDataUrl(dataUrl) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)[^,]*;base64,/i.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1].toLowerCase(), data: dataUrl.slice(m[0].length) };
}

export { sql };

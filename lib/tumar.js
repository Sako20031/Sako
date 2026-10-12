import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import defaults from '../public/tumar-files/content.json';

// Storage + auth for the /tumar shop. Kept in its own tumar_* tables so it
// never collides with the barbershop or /ayaulym data in the same database.

const COOKIE = 'tumar_admin';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const DEFAULT_PIN = '0000';

let initPromise = null;

export function ensureTumarDb() {
  if (!initPromise) {
    initPromise = init().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS tumar_products (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    ord INTEGER NOT NULL DEFAULT 0
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_images (
    id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data TEXT NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_orders (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    city TEXT,
    comment TEXT,
    items TEXT,
    total BIGINT,
    status TEXT,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_sessions (
    token TEXT PRIMARY KEY,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tumar_login_fails (
    ip TEXT,
    at BIGINT
  )`;
  await sql`INSERT INTO tumar_settings (key, value) VALUES ('pin', ${DEFAULT_PIN})
    ON CONFLICT (key) DO NOTHING`;

  // First run: copy the built-in catalog into the database so the admin can
  // edit it. The "seeded" flag keeps a deliberately emptied catalog empty.
  const seeded = await sql`SELECT value FROM tumar_settings WHERE key = 'seeded'`;
  if (!seeded.rows.length) {
    let ord = 0;
    for (const p of defaults.products) {
      const { id, ...data } = p;
      await sql`INSERT INTO tumar_products (id, data, ord)
        VALUES (${id}, ${JSON.stringify(data)}, ${ord++})
        ON CONFLICT (id) DO NOTHING`;
    }
    await sql`INSERT INTO tumar_settings (key, value) VALUES ('seeded', '1')
      ON CONFLICT (key) DO NOTHING`;
  }
}

export { defaults };

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
  await sql`INSERT INTO tumar_sessions (token, created_at) VALUES (${token}, ${Date.now()})`;
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
  if (token) await sql`DELETE FROM tumar_sessions WHERE token = ${token}`;
  cookies().delete(COOKIE);
}

export async function isTumarAdmin() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  const cutoff = Date.now() - MAX_AGE * 1000;
  const res = await sql`SELECT token FROM tumar_sessions WHERE token = ${token} AND created_at > ${cutoff}`;
  return res.rows.length > 0;
}

// "data:image/jpeg;base64,AAAA" -> { mime: 'image/jpeg', data: 'AAAA' }
export function parseDataUrl(dataUrl) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)[^,]*;base64,/i.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1].toLowerCase(), data: dataUrl.slice(m[0].length) };
}

export { sql };

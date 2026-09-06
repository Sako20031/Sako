import { cookies } from 'next/headers';
import { sql, ensureDb } from './db';

const COOKIE = 'sb_admin';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession() {
  await ensureDb();
  const token = randomToken();
  await sql`INSERT INTO admin_sessions (token, created_at) VALUES (${token}, ${Date.now()})`;
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
  if (token) {
    await ensureDb();
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  cookies().delete(COOKIE);
}

export async function isAdmin() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return false;
  await ensureDb();
  const cutoff = Date.now() - MAX_AGE * 1000;
  const res = await sql`SELECT token FROM admin_sessions WHERE token = ${token} AND created_at > ${cutoff}`;
  return res.rows.length > 0;
}

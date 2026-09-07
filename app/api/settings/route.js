import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

// Generic branding key/value store — lets this site be re-skinned (name,
// owner, address, hours, avatar) for a different barbershop without any
// further code changes or redeploys, only edits from the admin panel.
const ALLOWED_KEYS = [
  'site_name',
  'owner_name',
  'tagline',
  'address',
  'hours',
  'avatar_url',
];

export async function GET() {
  await ensureDb();
  const { rows } = await sql`SELECT key, value FROM settings WHERE key = ANY(${ALLOWED_KEYS})`;
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return NextResponse.json(out);
}

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json();
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    const value = String(body[key] ?? '').slice(0, 700000);
    await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}`;
  }
  return NextResponse.json({ ok: true });
}

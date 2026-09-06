import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../../lib/db';
import { isAdmin } from '../../../../lib/auth';

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json();
  const pin = String(body.pin || '');
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  await sql`UPDATE settings SET value = ${pin} WHERE key = 'admin_pin'`;
  return NextResponse.json({ ok: true });
}

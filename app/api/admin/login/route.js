import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../../lib/db';
import { createSession } from '../../../../lib/auth';

export async function POST(req) {
  await ensureDb();
  const body = await req.json();
  const pin = String(body.pin || '');
  const row = await sql`SELECT value FROM settings WHERE key = 'admin_pin'`;
  const correct = row.rows[0]?.value;
  if (!correct || pin !== correct) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}

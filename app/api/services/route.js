import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

export async function GET() {
  await ensureDb();
  const { rows } = await sql`SELECT id, name, price, duration, ord FROM services ORDER BY ord ASC`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json();
  const name = String(body.name || '').trim();
  const price = Number(body.price) || 0;
  const duration = Number(body.duration) || 0;
  if (!name) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const { rows } = await sql`SELECT COALESCE(MAX(ord), 0)::int AS m FROM services`;
  const id = 'svc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await sql`INSERT INTO services (id, name, price, duration, ord) VALUES (${id}, ${name}, ${price}, ${duration}, ${rows[0].m + 1})`;
  return NextResponse.json({ ok: true, id });
}

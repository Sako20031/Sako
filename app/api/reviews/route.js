import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../lib/db';

export async function GET() {
  await ensureDb();
  const { rows } = await sql`SELECT name, rating, text, created_at FROM reviews
    ORDER BY created_at DESC LIMIT 40`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  await ensureDb();
  const body = await req.json();
  const name = String(body.name || '').trim().slice(0, 100);
  const text = String(body.text || '').trim().slice(0, 1000);
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
  if (!name || !text) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const id = 'rev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await sql`INSERT INTO reviews (id, name, rating, text, created_at) VALUES (${id}, ${name}, ${rating}, ${text}, ${Date.now()})`;
  return NextResponse.json({ ok: true });
}

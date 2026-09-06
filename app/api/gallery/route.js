import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

export async function GET() {
  await ensureDb();
  const { rows } = await sql`SELECT id, label, data_url FROM gallery ORDER BY created_at DESC LIMIT 30`;
  return NextResponse.json(rows.map((r) => ({ id: r.id, label: r.label, dataUrl: r.data_url })));
}

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json();
  const dataUrl = String(body.dataUrl || '');
  const label = String(body.label || '').slice(0, 100);
  if (!dataUrl.startsWith('data:image/')) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (dataUrl.length > 700000) return NextResponse.json({ error: 'too large' }, { status: 400 });
  const id = 'pic' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await sql`INSERT INTO gallery (id, label, data_url, created_at) VALUES (${id}, ${label}, ${dataUrl}, ${Date.now()})`;
  return NextResponse.json({ ok: true, id });
}

import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../../lib/db';
import { isAdmin } from '../../../../lib/auth';

export async function PUT(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json();
  const name = String(body.name || '').trim();
  const price = Number(body.price) || 0;
  const duration = Number(body.duration) || 0;
  await sql`UPDATE services SET name = ${name}, price = ${price}, duration = ${duration} WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  await sql`DELETE FROM services WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

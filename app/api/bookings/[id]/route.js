import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../../lib/db';
import { isAdmin } from '../../../../lib/auth';

export async function DELETE(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  await sql`DELETE FROM bookings WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

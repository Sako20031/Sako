import { NextResponse } from 'next/server';
import { sql, ensureDb } from '../../../lib/db';
import { isAdmin } from '../../../lib/auth';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET(req) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all');

  if (all) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { rows } = await sql`SELECT id, date, time, service, name, phone FROM bookings
      ORDER BY date ASC, time ASC LIMIT 500`;
    return NextResponse.json(rows);
  }

  const date = searchParams.get('date');
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  const { rows } = await sql`SELECT time FROM bookings WHERE date = ${date}`;
  return NextResponse.json(rows.map((r) => r.time));
}

export async function POST(req) {
  await ensureDb();
  const body = await req.json();
  const date = String(body.date || '');
  const time = String(body.time || '');
  const service = String(body.service || '').slice(0, 200);
  const name = String(body.name || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 60);

  if (!DATE_RE.test(date) || !TIME_RE.test(time) || name.length < 2 || phone.replace(/\D/g, '').length < 7) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const admin = await isAdmin();
  // Walk-ins booked by the admin can be for any date; regular client bookings
  // are also accepted as-is — the UNIQUE(date,time) constraint below is what
  // actually prevents a slot from being double-booked, admin or not.
  void admin;

  const id = date + '_' + time.replace(':', '-');
  const { rows } = await sql`
    INSERT INTO bookings (id, date, time, service, name, phone, created_at)
    VALUES (${id}, ${date}, ${time}, ${service}, ${name}, ${phone}, ${Date.now()})
    ON CONFLICT (date, time) DO NOTHING
    RETURNING id`;

  if (rows.length === 0) return NextResponse.json({ ok: false, reason: 'taken' }, { status: 409 });
  return NextResponse.json({ ok: true, id });
}

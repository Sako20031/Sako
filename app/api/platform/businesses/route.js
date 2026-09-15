import { NextResponse } from 'next/server';
import { isPlatformAdmin } from '../../../../lib/platformAuth';
import { listBusinesses, createBusiness } from '../../../../lib/business';

export async function GET(req) {
  if (!isPlatformAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const businesses = await listBusinesses();
  return NextResponse.json(businesses);
}

export async function POST(req) {
  if (!isPlatformAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  try {
    const business = await createBusiness(body);
    return NextResponse.json(business, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

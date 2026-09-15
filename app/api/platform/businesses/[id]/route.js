import { NextResponse } from 'next/server';
import { isPlatformAdmin } from '../../../../../lib/platformAuth';
import { getBusiness, updateBusiness, deleteBusiness } from '../../../../../lib/business';

export async function GET(req, { params }) {
  if (!isPlatformAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const business = await getBusiness(params.id);
  if (!business) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(business);
}

export async function PATCH(req, { params }) {
  if (!isPlatformAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  const business = await updateBusiness(params.id, body);
  if (!business) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(business);
}

export async function DELETE(req, { params }) {
  if (!isPlatformAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await deleteBusiness(params.id);
  return NextResponse.json({ ok: true });
}

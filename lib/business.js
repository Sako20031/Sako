import { sql, ensureDb } from './db';

export async function getBusinessByPhoneNumberId(phoneNumberId) {
  await ensureDb();
  const { rows } = await sql`SELECT * FROM businesses WHERE whatsapp_phone_number_id = ${phoneNumberId}`;
  return rows[0] || null;
}

export async function listBusinesses() {
  await ensureDb();
  const { rows } = await sql`SELECT id, name, business_type, whatsapp_phone_number_id, address, hours, created_at
    FROM businesses ORDER BY created_at DESC`;
  return rows;
}

export async function getBusiness(id) {
  await ensureDb();
  const { rows } = await sql`SELECT * FROM businesses WHERE id = ${id}`;
  return rows[0] || null;
}

export async function createBusiness(body) {
  await ensureDb();
  const name = String(body.name || '').trim();
  const phoneNumberId = String(body.whatsapp_phone_number_id || '').trim();
  const token = String(body.whatsapp_token || '').trim();
  if (!name || !phoneNumberId || !token) {
    throw Object.assign(new Error('name, whatsapp_phone_number_id and whatsapp_token are required'), { status: 400 });
  }
  const id = 'biz' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await sql`INSERT INTO businesses
    (id, name, business_type, whatsapp_phone_number_id, whatsapp_token, address, hours, assistant_notes, knowledge_base, created_at)
    VALUES (${id}, ${name}, ${body.business_type || null}, ${phoneNumberId}, ${token},
      ${body.address || null}, ${body.hours || null}, ${body.assistant_notes || null}, ${body.knowledge_base || null}, ${Date.now()})`;
  return getBusiness(id);
}

// Whitelisted columns only — takes each field from `body` when present,
// otherwise keeps the existing value (a single fixed-shape UPDATE, since
// @vercel/postgres's sql tag can't parameterize column names).
export async function updateBusiness(id, body) {
  await ensureDb();
  const existing = await getBusiness(id);
  if (!existing) return null;
  const pick = (field) => (field in body ? (body[field] == null ? null : String(body[field])) : existing[field]);

  await sql`UPDATE businesses SET
    name = ${pick('name')},
    business_type = ${pick('business_type')},
    whatsapp_phone_number_id = ${pick('whatsapp_phone_number_id')},
    whatsapp_token = ${pick('whatsapp_token')},
    address = ${pick('address')},
    hours = ${pick('hours')},
    assistant_notes = ${pick('assistant_notes')},
    knowledge_base = ${pick('knowledge_base')}
    WHERE id = ${id}`;
  return getBusiness(id);
}

export async function deleteBusiness(id) {
  await ensureDb();
  await sql`DELETE FROM businesses WHERE id = ${id}`;
}

import { sql } from '@vercel/postgres';

const DEFAULT_SERVICES = [
  { id: 'kids', name: 'Детская стрижка', price: 3000, duration: 45, ord: 1 },
  { id: 'mens', name: 'Мужская стрижка', price: 3000, duration: 60, ord: 2 },
  { id: 'beard', name: 'Стрижка бороды', price: 2000, duration: 30, ord: 3 },
  { id: 'buzz', name: 'Стрижка под машинку', price: 2000, duration: 30, ord: 4 },
];

let initPromise = null;

// Lazily create tables + seed defaults. Cheap to call on every request (all
// statements are idempotent), memoized per warm serverless instance.
export function ensureDb() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    ord INTEGER NOT NULL DEFAULT 0
  )`;
  await sql`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT,
    name TEXT,
    phone TEXT,
    created_at BIGINT,
    UNIQUE(date, time)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gallery (
    id TEXT PRIMARY KEY,
    label TEXT,
    data_url TEXT,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INTEGER,
    text TEXT,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at BIGINT
  )`;
  // Each row is one client business renting the WhatsApp assistant — its own
  // WhatsApp number, its own menu/price list ("knowledge_base"), its own
  // booking calendar. Unrelated to the barbershop site's own tables above.
  await sql`CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business_type TEXT,
    whatsapp_phone_number_id TEXT UNIQUE NOT NULL,
    whatsapp_token TEXT NOT NULL,
    address TEXT,
    hours TEXT,
    assistant_notes TEXT,
    knowledge_base TEXT,
    created_at BIGINT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS business_bookings (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT,
    name TEXT,
    phone TEXT,
    created_at BIGINT,
    UNIQUE(business_id, date, time)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS wa_messages (
    id SERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at BIGINT
  )`;
  // Added after the table's first version (which had no tenant column) —
  // ADD COLUMN IF NOT EXISTS keeps this idempotent for databases that
  // already ran the earlier migration.
  await sql`ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS business_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS wa_messages_business_phone_idx ON wa_messages (business_id, phone, id)`;

  const svcCount = await sql`SELECT count(*)::int AS n FROM services`;
  if (svcCount.rows[0].n === 0) {
    for (const s of DEFAULT_SERVICES) {
      await sql`INSERT INTO services (id, name, price, duration, ord)
        VALUES (${s.id}, ${s.name}, ${s.price}, ${s.duration}, ${s.ord})
        ON CONFLICT (id) DO NOTHING`;
    }
  }

  const pin = await sql`SELECT value FROM settings WHERE key = 'admin_pin'`;
  if (pin.rows.length === 0) {
    await sql`INSERT INTO settings (key, value) VALUES ('admin_pin', '1234')
      ON CONFLICT (key) DO NOTHING`;
  }
}

export { sql };

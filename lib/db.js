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

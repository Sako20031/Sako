import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import pg from 'pg';

// Backend for the TULPAR site and its admin panel. One function, routed by
// ?action=. Framework-agnostic: takes a plain request object and returns
// { status, headers, body } so it runs both on Vercel (api/tulpar.js) and in
// the Vite dev server (vite.config.js).
//
//   GET   cars | settings | image | me | admin-cars | leads | status
//   POST  login | logout | pin | car | car-delete | reorder | image | lead
//         | lead-status | lead-delete | settings

const require = createRequire(import.meta.url);
const defaults = require('../data/defaults.json');

const COOKIE = 'tulpar_admin';
const SESSION_DAYS = 30;
const DEFAULT_PIN = '0000';
const MAX_IMAGE_B64 = 3_000_000;   // ~2.2 MB after decoding; the admin resizes before upload
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const SCHEMA_VERSION = '1';

export const CATEGORIES = ['sedan', 'suv', 'sport', 'ev', 'minivan'];
export const STATUSES = ['stock', 'order', 'sold'];
const LEAD_STATUSES = ['new', 'work', 'done', 'cancel'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const NO_DB = 'База данных не подключена. Vercel → проект → Storage → Create Database (Neon Postgres) → Connect, затем Redeploy.';

let pool = null;
function db() {
  if (!pool) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    pool = new pg.Pool({
      connectionString: url,
      max: 3,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}
const hasDb = () => Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
const q = (text, params) => db().query(text, params);

// ---------- Schema ----------
let initPromise = null;
function ensureDb() {
  if (!initPromise) initPromise = init().catch((e) => { initPromise = null; throw e; });
  return initPromise;
}

async function init() {
  try {
    const { rows } = await q(`SELECT value FROM tulpar_settings WHERE key = 'schema'`);
    if (rows[0]?.value === SCHEMA_VERSION) return;
  } catch { /* first run */ }

  await q(`CREATE TABLE IF NOT EXISTS tulpar_settings (key TEXT PRIMARY KEY, value TEXT)`);
  await q(`CREATE TABLE IF NOT EXISTS tulpar_cars (
    id TEXT PRIMARY KEY, data TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0, created_at BIGINT)`);
  await q(`CREATE TABLE IF NOT EXISTS tulpar_images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL)`);
  await q(`CREATE TABLE IF NOT EXISTS tulpar_sessions (token TEXT PRIMARY KEY, created_at BIGINT)`);
  await q(`CREATE TABLE IF NOT EXISTS tulpar_login_fails (ip TEXT, at BIGINT)`);
  await q(`CREATE TABLE IF NOT EXISTS tulpar_leads (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT, car TEXT, date TEXT, comment TEXT,
    status TEXT, created_at BIGINT)`);

  await q(`INSERT INTO tulpar_settings (key, value) VALUES ('pin', $1) ON CONFLICT (key) DO NOTHING`, [hashPin(DEFAULT_PIN)]);
  await q(`INSERT INTO tulpar_settings (key, value) VALUES ('contacts', $1) ON CONFLICT (key) DO NOTHING`, [JSON.stringify(defaults.settings)]);

  // First run: copy the built-in catalog so the admin can edit it.
  const seeded = await q(`SELECT value FROM tulpar_settings WHERE key = 'seeded'`);
  if (!seeded.rows.length) {
    let ord = 0;
    for (const { id, ...data } of defaults.cars) {
      await q(`INSERT INTO tulpar_cars (id, data, ord, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [id, JSON.stringify(data), ord++, Date.now()]);
    }
    await q(`INSERT INTO tulpar_settings (key, value) VALUES ('seeded', '1') ON CONFLICT (key) DO NOTHING`);
  }
  await q(`INSERT INTO tulpar_settings (key, value) VALUES ('schema', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [SCHEMA_VERSION]);
}

// ---------- Helpers ----------
const newId = (p) => p + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, min = 0, max = 1e12) => {
  const n = Math.round(Number(String(v ?? '').replace(/[^\d.-]/g, '')));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(String(pin), salt, 32).toString('hex')}`;
}
function checkPin(pin, stored) {
  if (!stored) return false;
  if (!stored.includes(':')) return stored === pin;
  const [salt, hash] = stored.split(':');
  const got = crypto.scryptSync(String(pin), salt, 32);
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function cleanPhoto(p) {
  const s = str(p, 400);
  if (/^img_[a-z0-9]+$/.test(s)) return s;
  if (/^\/cars\/[\w.-]+$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/.test(s)) return s;
  return null;
}

export function cleanCar(b) {
  const specs = (Array.isArray(b.specs) ? b.specs : [])
    .map((s) => ({ k: str(s?.k, 60), v: str(s?.v, 120) }))
    .filter((s) => s.k && s.v)
    .slice(0, 30);
  const features = (Array.isArray(b.features) ? b.features : String(b.features ?? '').split('\n'))
    .map((f) => str(f, 120)).filter(Boolean).slice(0, 40);
  return {
    brand: str(b.brand, 60),
    model: str(b.model, 80),
    trim: str(b.trim, 80),
    year: int(b.year, 0, 2100),
    price: int(b.price),
    oldPrice: int(b.oldPrice),
    status: STATUSES.includes(b.status) ? b.status : 'stock',
    hidden: Boolean(b.hidden),
    featured: Boolean(b.featured),
    category: CATEGORIES.includes(b.category) ? b.category : 'sedan',
    color: str(b.color, 60),
    mileage: int(b.mileage, 0, 5_000_000),
    power: int(b.power, 0, 3000),
    engine: str(b.engine, 60),
    fuel: str(b.fuel, 40),
    transmission: str(b.transmission, 60),
    drive: str(b.drive, 40),
    accel: str(b.accel, 30),
    topSpeed: str(b.topSpeed, 30),
    consumption: str(b.consumption, 40),
    description: str(b.description, 3000),
    features,
    specs,
    photos: (Array.isArray(b.photos) ? b.photos : []).map(cleanPhoto).filter(Boolean).slice(0, 20),
  };
}

function cleanSettings(b) {
  return {
    phone: str(b.phone, 40),
    whatsapp: str(b.whatsapp, 20).replace(/\D/g, ''),
    email: str(b.email, 120),
    address: str(b.address, 200),
    hours: str(b.hours, 120),
    instagram: str(b.instagram, 200),
  };
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

async function isAdmin(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || !hasDb()) return false;
  const { rows } = await q(`SELECT created_at FROM tulpar_sessions WHERE token = $1`, [token]);
  return Boolean(rows[0]) && Date.now() - Number(rows[0].created_at) < SESSION_DAYS * 864e5;
}

const sessionCookie = (token, maxAge) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''}`;

async function readCars({ all }) {
  const { rows } = await q(`SELECT id, data, ord FROM tulpar_cars ORDER BY ord ASC, created_at DESC`);
  const cars = rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
  return all ? cars : cars.filter((c) => !c.hidden);
}

async function readSettings() {
  const { rows } = await q(`SELECT value FROM tulpar_settings WHERE key = 'contacts'`);
  return { ...defaults.settings, ...(rows[0] ? JSON.parse(rows[0].value) : {}) };
}

// ---------- Router ----------
const ok = (body, status = 200, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(body) });
const err = (msg, status = 400) => ok({ error: msg }, status);

export async function handle(req) {
  const action = String(req.query.action || '');
  const method = req.method;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  try {
    // ----- Public, works without a database -----
    if (method === 'GET' && action === 'cars') {
      if (!hasDb()) return ok({ cars: defaults.cars.filter((c) => !c.hidden), db: false });
      await ensureDb();
      return ok({ cars: await readCars({ all: false }), db: true });
    }
    if (method === 'GET' && action === 'settings') {
      if (!hasDb()) return ok({ settings: defaults.settings });
      await ensureDb();
      return ok({ settings: await readSettings() });
    }
    if (method === 'GET' && action === 'status') {
      return ok({ db: hasDb() });
    }

    if (!hasDb()) return err(NO_DB, 503);
    await ensureDb();

    if (method === 'GET' && action === 'image') {
      const id = str(req.query.id, 60);
      const { rows } = await q(`SELECT mime, data FROM tulpar_images WHERE id = $1`, [id]);
      if (!rows[0]) return err('not found', 404);
      return {
        status: 200,
        headers: { 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
        body: Buffer.from(rows[0].data, 'base64'),
      };
    }

    if (method === 'POST' && action === 'lead') {
      const name = str(body.name, 100);
      const phone = str(body.phone, 40);
      if (name.length < 2 || phone.replace(/\D/g, '').length < 10) return err('Укажите имя и телефон');
      const id = newId('lead_');
      await q(`INSERT INTO tulpar_leads (id, name, phone, car, date, comment, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'new', $7)`,
        [id, name, phone, str(body.car, 160), str(body.date, 40), str(body.comment, 1000), Date.now()]);
      return ok({ ok: true, id });
    }

    if (method === 'POST' && action === 'login') {
      const ip = str(req.ip, 80) || 'unknown';
      const since = Date.now() - FAIL_WINDOW_MS;
      const fails = await q(`SELECT COUNT(*)::int AS n FROM tulpar_login_fails WHERE ip = $1 AND at > $2`, [ip, since]);
      if (fails.rows[0].n >= MAX_FAILS) return err('Слишком много попыток. Подождите 15 минут.', 429);
      const { rows } = await q(`SELECT value FROM tulpar_settings WHERE key = 'pin'`);
      if (!checkPin(str(body.pin, 40), rows[0]?.value)) {
        await q(`INSERT INTO tulpar_login_fails (ip, at) VALUES ($1, $2)`, [ip, Date.now()]);
        await q(`DELETE FROM tulpar_login_fails WHERE at < $1`, [since]);
        return err('Неверный PIN', 401);
      }
      const token = crypto.randomBytes(24).toString('hex');
      await q(`INSERT INTO tulpar_sessions (token, created_at) VALUES ($1, $2)`, [token, Date.now()]);
      const defaultPin = checkPin(DEFAULT_PIN, rows[0]?.value);
      return ok({ ok: true, defaultPin }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
    }

    if (method === 'GET' && action === 'me') {
      return ok({ admin: await isAdmin(req) });
    }

    // ----- Admin only below -----
    if (!(await isAdmin(req))) return err('forbidden', 403);

    if (method === 'POST' && action === 'logout') {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      await q(`DELETE FROM tulpar_sessions WHERE token = $1`, [token]);
      return ok({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (method === 'POST' && action === 'pin') {
      const pin = str(body.pin, 40);
      if (!/^\d{4,12}$/.test(pin)) return err('PIN — от 4 до 12 цифр');
      await q(`UPDATE tulpar_settings SET value = $1 WHERE key = 'pin'`, [hashPin(pin)]);
      await q(`DELETE FROM tulpar_sessions WHERE token <> $1`, [parseCookies(req.headers.cookie)[COOKIE]]);
      return ok({ ok: true });
    }

    if (method === 'GET' && action === 'admin-cars') {
      return ok({ cars: await readCars({ all: true }) });
    }
    if (method === 'POST' && action === 'car') {
      const car = cleanCar(body);
      if (!car.brand || !car.model) return err('Укажите марку и модель');
      if (body.id) {
        const id = str(body.id, 60);
        const r = await q(`UPDATE tulpar_cars SET data = $1 WHERE id = $2`, [JSON.stringify(car), id]);
        if (!r.rowCount) return err('not found', 404);
        return ok({ car: { id, ...car } });
      }
      const id = newId('car_');
      const { rows } = await q(`SELECT COALESCE(MIN(ord), 0) - 1 AS ord FROM tulpar_cars`);
      await q(`INSERT INTO tulpar_cars (id, data, ord, created_at) VALUES ($1, $2, $3, $4)`, [id, JSON.stringify(car), rows[0].ord, Date.now()]);
      return ok({ car: { id, ...car } });
    }
    if (method === 'POST' && action === 'car-delete') {
      const id = str(body.id, 60);
      const { rows } = await q(`SELECT data FROM tulpar_cars WHERE id = $1`, [id]);
      if (!rows[0]) return err('not found', 404);
      const photos = JSON.parse(rows[0].data).photos || [];
      await q(`DELETE FROM tulpar_cars WHERE id = $1`, [id]);
      const own = photos.filter((p) => p.startsWith('img_'));
      if (own.length) await q(`DELETE FROM tulpar_images WHERE id = ANY($1)`, [own]);
      return ok({ ok: true });
    }
    if (method === 'POST' && action === 'reorder') {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map((i) => str(i, 60)).slice(0, 500);
      for (let i = 0; i < ids.length; i++) await q(`UPDATE tulpar_cars SET ord = $1 WHERE id = $2`, [i, ids[i]]);
      return ok({ ok: true });
    }
    if (method === 'POST' && action === 'image') {
      const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ''));
      if (!m || !IMAGE_TYPES.includes(m[1])) return err('Нужна картинка JPG, PNG или WebP');
      if (m[2].length > MAX_IMAGE_B64) return err('Фото слишком большое');
      const id = newId('img_');
      await q(`INSERT INTO tulpar_images (id, mime, data) VALUES ($1, $2, $3)`, [id, m[1], m[2]]);
      return ok({ id });
    }
    if (method === 'POST' && action === 'image-delete') {
      // Only images no car references any more
      const id = str(body.id, 60);
      const { rows } = await q(`SELECT 1 FROM tulpar_cars WHERE data LIKE $1 LIMIT 1`, [`%"${id}"%`]);
      if (!rows.length) await q(`DELETE FROM tulpar_images WHERE id = $1`, [id]);
      return ok({ ok: true });
    }

    if (method === 'GET' && action === 'leads') {
      const { rows } = await q(`SELECT * FROM tulpar_leads ORDER BY created_at DESC LIMIT 500`);
      return ok({ leads: rows.map((r) => ({ ...r, created_at: Number(r.created_at) })) });
    }
    if (method === 'POST' && action === 'lead-status') {
      const status = LEAD_STATUSES.includes(body.status) ? body.status : 'new';
      await q(`UPDATE tulpar_leads SET status = $1 WHERE id = $2`, [status, str(body.id, 60)]);
      return ok({ ok: true });
    }
    if (method === 'POST' && action === 'lead-delete') {
      await q(`DELETE FROM tulpar_leads WHERE id = $1`, [str(body.id, 60)]);
      return ok({ ok: true });
    }

    if (method === 'POST' && action === 'settings') {
      const s = cleanSettings(body);
      await q(`UPDATE tulpar_settings SET value = $1 WHERE key = 'contacts'`, [JSON.stringify(s)]);
      return ok({ settings: s });
    }

    return err('unknown action', 404);
  } catch (e) {
    console.error('[tulpar]', e);
    return err('Ошибка сервера', 500);
  }
}

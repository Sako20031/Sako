import { NextResponse } from 'next/server';
import {
  sql,
  defaults,
  ensureTumarDb,
  isTumarAdmin,
  createSession,
  destroySession,
  newId,
  parseDataUrl,
} from '../../../../lib/tumar';

// One small router for everything the /tumar page needs:
//   GET    me | content | image/:id | orders | subscribers | status
//   POST   login | logout | pin | texts | hero | contacts | reviews | products | reorder | images | videos | orders | subscribe
//   PATCH  product/:id | order/:id
//   DELETE product/:id | order/:id | subscriber/:id

export const dynamic = 'force-dynamic';

const MAX_IMAGE_B64 = 1_600_000; // ~1.2 MB image
const MAX_VIDEO_B64 = 4_100_000; // ~3 MB video (Vercel body limit is 4.5 MB)
const MAX_TEXTS = 200_000;
const CATS = ['men', 'women', '750', 'steppe'];
const DESIGNS = ['wolf', 'umai', 'tumar', 'baiterek', 'eagle', 'arkar'];
const BADGE_STYLES = ['gold', 'sand', 'brown', 'light'];
const STATUSES = ['new', 'work', 'done', 'cancel'];
const LANGS = ['kz', 'ru', 'en'];
// Customer-facing product fields that also exist as name_kz, name_en, …
const TRANSLATED = { name: 200, type: 100, metal: 100, weight: 50, desc: 2000, badge: 50 };
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

const json = (data, status = 200) => NextResponse.json(data, { status });

// Without a connected Postgres database the shop still renders its built-in
// catalog, and the admin login explains what is missing.
const hasDb = () => Boolean(process.env.POSTGRES_URL);
const NO_DB = 'База данных не подключена: Vercel → проект → Storage → Create Database (Postgres) → Connect, затем Redeploy';
const forbidden = () => json({ error: 'forbidden' }, 403);
const notFound = () => json({ error: 'not found' }, 404);
const bad = (error) => json({ error }, 400);

const str = (v, max) => String(v ?? '').trim().slice(0, max);

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

function cleanProduct(b) {
  const price = Math.round(Number(b.price));
  const translations = {};
  for (const [field, max] of Object.entries(TRANSLATED)) {
    for (const lang of ['kz', 'en']) {
      const v = str(b[`${field}_${lang}`], max);
      if (v) translations[`${field}_${lang}`] = v;
    }
  }
  return {
    ...translations,
    name: str(b.name, 200),
    type: str(b.type, 100),
    metal: str(b.metal, 100),
    weight: str(b.weight, 50),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    desc: str(b.desc, 2000),
    badge: str(b.badge, 50),
    badgeStyle: BADGE_STYLES.includes(b.badgeStyle) ? b.badgeStyle : 'gold',
    edition: str(b.edition, 50),
    cats: (Array.isArray(b.cats) ? b.cats : []).filter((c) => CATS.includes(c)),
    design: DESIGNS.includes(b.design) ? b.design : 'tumar',
    engraving: str(b.engraving, 60),
    image: /^img[a-z0-9]+$/.test(b.image || '') ? b.image : null,
    hidden: Boolean(b.hidden),
  };
}

async function loadProducts() {
  const { rows } = await sql`SELECT id, data FROM tumar_products ORDER BY ord ASC, id ASC`;
  return rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
}

async function loadTexts() {
  const { rows } = await sql`SELECT value FROM tumar_settings WHERE key = 'texts'`;
  try {
    return rows[0] ? JSON.parse(rows[0].value) : {};
  } catch {
    return {};
  }
}

// Background of the hero section: a video and/or the animated steppe scene.
// Until the admin saves their own choice, the bundled yurt video is shown.
async function loadHero() {
  const { rows } = await sql`SELECT value FROM tumar_settings WHERE key = 'hero'`;
  try {
    return rows[0] ? JSON.parse(rows[0].value) : defaults.hero;
  } catch {
    return defaults.hero;
  }
}

const isMediaId = (v) => /^img[a-z0-9]+$/.test(v || '');

async function loadSetting(key) {
  const { rows } = await sql`SELECT value FROM tumar_settings WHERE key = ${key}`;
  if (!rows[0]) return undefined;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return undefined;
  }
}

async function saveSetting(key, data) {
  const value = JSON.stringify(data);
  await sql`INSERT INTO tumar_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}`;
}

// Phone, WhatsApp and e-mail shown on the site. Before the admin saves them
// in Settings, a phone or e-mail already typed over the template's sample
// on the Texts tab is picked up, so it does not have to be entered twice.
function contactsFrom(saved, texts) {
  if (saved) return saved;
  const c = { ...defaults.contacts };
  for (const o of Object.values(texts || {})) {
    const v = o?.ru || o?.v || o?.kz || o?.en;
    if (!v) continue;
    if (o.d === defaults.contacts.phone) c.phone = v;
    if (o.d === defaults.contacts.email) c.email = v;
  }
  return c;
}

function cleanReviews(list) {
  const out = [];
  for (const r of (Array.isArray(list) ? list : []).slice(0, 50)) {
    const review = {
      id: /^[a-z0-9]{1,30}$/i.test(r?.id || '') ? r.id : newId('r'),
      stars: Math.min(5, Math.max(1, Math.round(Number(r?.stars) || 5))),
    };
    for (const [field, max] of [['name', 100], ['meta', 120], ['text', 1500]]) {
      for (const suffix of ['', '_kz', '_en']) {
        const v = str(r?.[field + suffix], max);
        if (v) review[field + suffix] = v;
      }
    }
    if (review.text && review.name) out.push(review);
  }
  return out;
}
// Videos shipped with the site in public/tumar-files.
const isBundledVideo = (v) => /^\/tumar-files\/[\w.-]+\.(mp4|webm)$/.test(v || '');

async function dropImage(id) {
  if (id) await sql`DELETE FROM tumar_images WHERE id = ${id}`;
}

export async function GET(req, { params }) {
  const [what, id] = params.path;
  if (!hasDb()) {
    if (what === 'me') return json({ admin: false, noDb: true });
    if (what === 'content') {
      const { products, hero, reviews, contacts } = defaults;
      return json({ products, texts: {}, hero, reviews, contacts, db: false });
    }
    return notFound();
  }
  await ensureTumarDb();

  if (what === 'me') return json({ admin: await isTumarAdmin() });

  if (what === 'content') {
    const [products, texts, hero, reviews, contacts] = await Promise.all([
      loadProducts(), loadTexts(), loadHero(), loadSetting('reviews'), loadSetting('contacts'),
    ]);
    const res = json({
      products,
      texts,
      hero,
      reviews: reviews ?? defaults.reviews,
      contacts: contactsFrom(contacts, texts),
      db: true,
    });
    // Served from Vercel's CDN: visitors get it instantly instead of waiting
    // for the database, and the CDN refreshes it in the background. The same
    // for everyone (no cookies involved); the admin's browser asks with ?v=…
    // after a save, so the admin always sees their edits immediately.
    res.headers.set('cache-control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=31536000');
    return res;
  }

  if (what === 'image' && id) {
    const { rows } = await sql`SELECT mime, data FROM tumar_images WHERE id = ${id}`;
    if (!rows[0]) return notFound();
    const buf = Buffer.from(rows[0].data, 'base64');
    const headers = {
      'content-type': rows[0].mime,
      'accept-ranges': 'bytes',
      // ids are never reused, so the bytes behind a URL never change
      'cache-control': 'public, max-age=31536000, immutable',
    };
    // Safari only plays <video> from servers that answer byte-range requests.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : buf.length - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : buf.length - 1;
      start = Math.max(0, start);
      end = Math.min(end, buf.length - 1);
      if (start > end) {
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${buf.length}` } });
      }
      return new Response(buf.subarray(start, end + 1), {
        status: 206,
        headers: { ...headers, 'content-range': `bytes ${start}-${end}/${buf.length}`, 'content-length': String(end - start + 1) },
      });
    }
    return new Response(buf, { headers: { ...headers, 'content-length': String(buf.length) } });
  }

  if (!(await isTumarAdmin())) return forbidden();

  if (what === 'orders') {
    const { rows } = await sql`SELECT * FROM tumar_orders ORDER BY created_at DESC`;
    return json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        city: r.city,
        comment: r.comment,
        items: JSON.parse(r.items || '[]'),
        total: Number(r.total),
        status: r.status,
        lang: r.lang || 'ru',
        createdAt: Number(r.created_at),
      }))
    );
  }

  if (what === 'status') {
    const [p, o, n, s] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM tumar_products`,
      sql`SELECT count(*)::int AS n FROM tumar_orders`,
      sql`SELECT count(*)::int AS n FROM tumar_orders WHERE status = 'new'`,
      sql`SELECT count(*)::int AS n FROM tumar_subscribers`,
    ]);
    return json({
      db: true,
      products: p.rows[0].n,
      orders: o.rows[0].n,
      newOrders: n.rows[0].n,
      subscribers: s.rows[0].n,
    });
  }

  if (what === 'subscribers') {
    const { rows } = await sql`SELECT id, email, created_at FROM tumar_subscribers ORDER BY created_at DESC`;
    return json(rows.map((r) => ({ id: r.id, email: r.email, createdAt: Number(r.created_at) })));
  }

  return notFound();
}

export async function POST(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureTumarDb();
  const [what] = params.path;
  const body = await readJson(req);

  if (what === 'login') {
    const ip = clientIp(req);
    const since = Date.now() - FAIL_WINDOW_MS;
    await sql`DELETE FROM tumar_login_fails WHERE at < ${since}`;
    const fails = await sql`SELECT count(*)::int AS n FROM tumar_login_fails WHERE ip = ${ip}`;
    if (fails.rows[0].n >= MAX_FAILS) return json({ error: 'Слишком много попыток. Подождите 15 минут.' }, 429);
    const { rows } = await sql`SELECT value FROM tumar_settings WHERE key = 'pin'`;
    if (!rows[0] || String(body.pin || '') !== rows[0].value) {
      await sql`INSERT INTO tumar_login_fails (ip, at) VALUES (${ip}, ${Date.now()})`;
      return json({ ok: false, error: 'Неверный PIN' }, 401);
    }
    await createSession();
    return json({ ok: true });
  }

  // Public: a customer places an order. Prices come from the database, never
  // from the browser.
  if (what === 'orders') {
    const name = str(body.name, 100);
    const phone = str(body.phone, 40);
    if (!name || !phone) return bad('Укажите имя и телефон');
    const wanted = (Array.isArray(body.items) ? body.items : []).slice(0, 30);
    const products = await loadProducts();
    const items = [];
    for (const w of wanted) {
      const p = products.find((x) => x.id === w.id && !x.hidden);
      const qty = Math.min(20, Math.max(1, Math.round(Number(w.qty) || 1)));
      if (p) items.push({ id: p.id, name: p.name, metal: p.metal, price: p.price, qty });
    }
    if (!items.length) return bad('Корзина пуста');
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const id = newId('o');
    const lang = LANGS.includes(body.lang) ? body.lang : 'ru';
    await sql`INSERT INTO tumar_orders (id, name, phone, city, comment, items, total, status, lang, created_at)
      VALUES (${id}, ${name}, ${phone}, ${str(body.city, 100)}, ${str(body.comment, 500)},
              ${JSON.stringify(items)}, ${total}, 'new', ${lang}, ${Date.now()})`;
    return json({ ok: true, id, total });
  }

  if (what === 'subscribe') {
    const email = str(body.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Неверный e-mail');
    await sql`INSERT INTO tumar_subscribers (id, email, created_at)
      VALUES (${newId('s')}, ${email}, ${Date.now()}) ON CONFLICT (email) DO NOTHING`;
    return json({ ok: true });
  }

  if (!(await isTumarAdmin())) return forbidden();

  if (what === 'logout') {
    await destroySession();
    return json({ ok: true });
  }

  if (what === 'pin') {
    const pin = String(body.pin || '');
    if (!/^\d{4,12}$/.test(pin)) return bad('PIN — от 4 до 12 цифр');
    await sql`UPDATE tumar_settings SET value = ${pin} WHERE key = 'pin'`;
    return json({ ok: true });
  }

  if (what === 'texts') {
    const texts = {};
    // Each override remembers the original Russian text it replaces (d) and
    // holds the edited version per language: { d, ru?, kz?, en? }.
    for (const [k, o] of Object.entries(body.texts || {})) {
      if (!/^[a-z0-9_]{1,60}$/.test(k) || !o || typeof o !== 'object') continue;
      const entry = { d: String(o.d ?? '').slice(0, 5000) };
      for (const lang of LANGS) {
        if (typeof o[lang] === 'string') entry[lang] = o[lang].slice(0, 5000);
      }
      if (Object.keys(entry).length > 1) texts[k] = entry;
    }
    const value = JSON.stringify(texts);
    if (value.length > MAX_TEXTS) return bad('Слишком много текста');
    await sql`INSERT INTO tumar_settings (key, value) VALUES ('texts', ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}`;
    return json({ ok: true });
  }

  if (what === 'hero') {
    const old = await loadHero();
    let video = String(body.video || '').trim().slice(0, 500);
    if (video && !isMediaId(video) && !isBundledVideo(video) && !/^https:\/\/\S+$/.test(video)) {
      return bad('Ссылка на видео должна начинаться с https://');
    }
    const opacity = Math.min(1, Math.max(0.05, Number(body.opacity) || 1));
    const hero = { scene: body.scene !== false, video: video || null, opacity, dark: Boolean(body.dark) };
    const value = JSON.stringify(hero);
    await sql`INSERT INTO tumar_settings (key, value) VALUES ('hero', ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}`;
    if (isMediaId(old.video) && old.video !== hero.video) await dropImage(old.video);
    return json({ ok: true, hero });
  }

  if (what === 'contacts') {
    const contacts = {
      phone: str(body.phone, 40),
      whatsapp: str(body.whatsapp, 40),
      email: str(body.email, 120),
    };
    if (contacts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email)) return bad('Неверный e-mail');
    if (contacts.phone && contacts.phone.replace(/\D/g, '').length < 10) return bad('Проверьте номер телефона');
    if (contacts.whatsapp && contacts.whatsapp.replace(/\D/g, '').length < 10) return bad('Проверьте номер WhatsApp');
    await saveSetting('contacts', contacts);
    return json({ ok: true, contacts });
  }

  if (what === 'reviews') {
    const reviews = cleanReviews(body.reviews);
    await saveSetting('reviews', reviews);
    return json({ ok: true, reviews });
  }

  if (what === 'videos') {
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed || !/^video\/(mp4|webm|quicktime)$/.test(parsed.mime)) return bad('Нужно видео MP4 или WebM');
    if (parsed.data.length > MAX_VIDEO_B64) return bad('Видео слишком большое (максимум ~3 МБ)');
    const id = newId('img');
    await sql`INSERT INTO tumar_images (id, mime, data) VALUES (${id}, ${parsed.mime}, ${parsed.data})`;
    return json({ ok: true, id });
  }

  if (what === 'products') {
    const data = cleanProduct(body);
    if (!data.name) return bad('Укажите название');
    const id = newId('p');
    const { rows } = await sql`SELECT COALESCE(MAX(ord), -1)::int + 1 AS n FROM tumar_products`;
    await sql`INSERT INTO tumar_products (id, data, ord) VALUES (${id}, ${JSON.stringify(data)}, ${rows[0].n})`;
    return json({ ok: true, product: { id, ...data } });
  }

  if (what === 'reorder') {
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String);
    for (let i = 0; i < ids.length; i++) {
      await sql`UPDATE tumar_products SET ord = ${i} WHERE id = ${ids[i]}`;
    }
    return json({ ok: true });
  }

  if (what === 'images') {
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed || !parsed.mime.startsWith('image/')) return bad('Это не картинка');
    if (parsed.data.length > MAX_IMAGE_B64) return bad('Фото слишком большое');
    const id = newId('img');
    await sql`INSERT INTO tumar_images (id, mime, data) VALUES (${id}, ${parsed.mime}, ${parsed.data})`;
    return json({ ok: true, id });
  }

  return notFound();
}

export async function PATCH(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureTumarDb();
  if (!(await isTumarAdmin())) return forbidden();
  const [what, id] = params.path;
  const body = await readJson(req);

  if (what === 'product' && id) {
    const { rows } = await sql`SELECT data FROM tumar_products WHERE id = ${id}`;
    if (!rows[0]) return notFound();
    const old = JSON.parse(rows[0].data);
    const data = cleanProduct(body);
    if (!data.name) return bad('Укажите название');
    await sql`UPDATE tumar_products SET data = ${JSON.stringify(data)} WHERE id = ${id}`;
    if (old.image && old.image !== data.image) await dropImage(old.image);
    return json({ ok: true, product: { id, ...data } });
  }

  if (what === 'order' && id) {
    if (!STATUSES.includes(body.status)) return bad('Неизвестный статус');
    await sql`UPDATE tumar_orders SET status = ${body.status} WHERE id = ${id}`;
    return json({ ok: true });
  }

  return notFound();
}

export async function DELETE(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureTumarDb();
  if (!(await isTumarAdmin())) return forbidden();
  const [what, id] = params.path;
  if (!id) return notFound();

  if (what === 'product') {
    const { rows } = await sql`SELECT data FROM tumar_products WHERE id = ${id}`;
    await sql`DELETE FROM tumar_products WHERE id = ${id}`;
    if (rows[0]) await dropImage(JSON.parse(rows[0].data).image);
  } else if (what === 'order') {
    await sql`DELETE FROM tumar_orders WHERE id = ${id}`;
  } else if (what === 'subscriber') {
    await sql`DELETE FROM tumar_subscribers WHERE id = ${id}`;
  } else {
    return notFound();
  }
  return json({ ok: true });
}

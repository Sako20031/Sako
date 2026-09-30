import { NextResponse } from 'next/server';
import {
  sql,
  ensureLoveDb,
  isLoveAdmin,
  createSession,
  destroySession,
  newId,
  parseDataUrl,
} from '../../../../lib/love';

// One small router for everything the /ayaulym page needs:
//   GET    me | settings | photos | photo/:id | compliments | audio | audio/:id
//   POST   login | logout | pin | settings | photos | compliments | audio
//   PATCH  photo/:id
//   DELETE photo/:id | compliment/:id | audio/:id

export const dynamic = 'force-dynamic';

const SETTING_KEYS = ['avatar', 'subtitle', 'letter', 'invite', 'invite_note'];
const MAX_PHOTO_B64 = 1_600_000; // ~1.2 MB image
const MAX_AUDIO_B64 = 4_200_000; // ~3 MB audio (Vercel body limit is 4.5 MB)

const json = (data, status = 200) => NextResponse.json(data, { status });

// Without a connected Postgres database the page still renders (with its
// built-in texts), and the admin login explains what is missing.
const hasDb = () => Boolean(process.env.POSTGRES_URL);
const NO_DB = 'База данных не подключена: Vercel → проект → Storage → Create Database (Postgres) → Connect, затем Redeploy';
const EMPTY = { settings: {}, photos: [], compliments: [], audio: [] };
const forbidden = () => json({ error: 'forbidden' }, 403);
const notFound = () => json({ error: 'not found' }, 404);
const bad = (error) => json({ error }, 400);

function binary(row) {
  const buf = Buffer.from(row.data, 'base64');
  return new Response(buf, {
    headers: {
      'content-type': row.mime,
      'content-length': String(buf.length),
      // ids are never reused, so the bytes behind a URL never change
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function GET(req, { params }) {
  const [what, id] = params.path;
  if (!hasDb()) {
    if (what === 'me') return json({ admin: false, noDb: true });
    return what in EMPTY ? json(EMPTY[what]) : notFound();
  }
  await ensureLoveDb();

  if (what === 'me') return json({ admin: await isLoveAdmin() });

  if (what === 'settings') {
    const { rows } = await sql`SELECT key, value FROM love_settings WHERE key = ANY(${SETTING_KEYS})`;
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return json(out);
  }

  if (what === 'photos') {
    const { rows } = await sql`SELECT id, caption FROM love_photos ORDER BY created_at DESC`;
    return json(rows);
  }
  if (what === 'photo' && id) {
    const { rows } = await sql`SELECT mime, data FROM love_photos WHERE id = ${id}`;
    return rows[0] ? binary(rows[0]) : notFound();
  }

  if (what === 'compliments') {
    const { rows } = await sql`SELECT id, text FROM love_compliments ORDER BY created_at ASC`;
    return json(rows);
  }

  if (what === 'audio' && !id) {
    const { rows } = await sql`SELECT id, title, created_at FROM love_audio ORDER BY created_at DESC`;
    return json(rows.map((r) => ({ id: r.id, title: r.title, createdAt: Number(r.created_at) })));
  }
  if (what === 'audio' && id) {
    const { rows } = await sql`SELECT mime, data FROM love_audio WHERE id = ${id}`;
    return rows[0] ? binary(rows[0]) : notFound();
  }

  return notFound();
}

export async function POST(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureLoveDb();
  const [what] = params.path;
  const body = await readJson(req);

  if (what === 'login') {
    const { rows } = await sql`SELECT value FROM love_settings WHERE key = 'pin'`;
    if (!rows[0] || String(body.pin || '') !== rows[0].value) return json({ ok: false }, 401);
    await createSession();
    return json({ ok: true });
  }

  if (!(await isLoveAdmin())) return forbidden();

  if (what === 'logout') {
    await destroySession();
    return json({ ok: true });
  }

  if (what === 'pin') {
    const pin = String(body.pin || '');
    if (!/^\d{4}$/.test(pin)) return bad('PIN должен быть из 4 цифр');
    await sql`UPDATE love_settings SET value = ${pin} WHERE key = 'pin'`;
    return json({ ok: true });
  }

  if (what === 'settings') {
    for (const key of Object.keys(body)) {
      if (!SETTING_KEYS.includes(key)) continue;
      const value = String(body[key] ?? '').slice(0, 1_000_000);
      await sql`INSERT INTO love_settings (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = ${value}`;
    }
    return json({ ok: true });
  }

  if (what === 'photos') {
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed || !parsed.mime.startsWith('image/')) return bad('Это не картинка');
    if (parsed.data.length > MAX_PHOTO_B64) return bad('Фото слишком большое');
    const id = newId('p');
    const caption = String(body.caption || '').slice(0, 200);
    await sql`INSERT INTO love_photos (id, caption, mime, data, created_at)
      VALUES (${id}, ${caption}, ${parsed.mime}, ${parsed.data}, ${Date.now()})`;
    return json({ ok: true, id, caption });
  }

  if (what === 'compliments') {
    const texts = (Array.isArray(body.texts) ? body.texts : [body.text])
      .map((t) => String(t || '').trim().slice(0, 500))
      .filter(Boolean);
    if (!texts.length) return bad('Пустой комплимент');
    const added = [];
    let t = Date.now();
    for (const text of texts) {
      const id = newId('c');
      await sql`INSERT INTO love_compliments (id, text, created_at) VALUES (${id}, ${text}, ${t++})`;
      added.push({ id, text });
    }
    return json({ ok: true, added });
  }

  if (what === 'audio') {
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed || !(parsed.mime.startsWith('audio/') || parsed.mime.startsWith('video/'))) {
      return bad('Это не аудио');
    }
    if (parsed.data.length > MAX_AUDIO_B64) return bad('Аудио слишком большое (максимум ~3 МБ)');
    // Voice memos recorded on iPhone come through as video/mp4 containers.
    const mime = parsed.mime.replace(/^video\//, 'audio/');
    const id = newId('a');
    const title = String(body.title || '').slice(0, 200);
    await sql`INSERT INTO love_audio (id, title, mime, data, created_at)
      VALUES (${id}, ${title}, ${mime}, ${parsed.data}, ${Date.now()})`;
    return json({ ok: true, id });
  }

  return notFound();
}

export async function PATCH(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureLoveDb();
  if (!(await isLoveAdmin())) return forbidden();
  const [what, id] = params.path;
  const body = await readJson(req);
  if (what === 'photo' && id) {
    const caption = String(body.caption || '').slice(0, 200);
    await sql`UPDATE love_photos SET caption = ${caption} WHERE id = ${id}`;
    return json({ ok: true });
  }
  if (what === 'audio' && id) {
    const title = String(body.title || '').slice(0, 200);
    await sql`UPDATE love_audio SET title = ${title} WHERE id = ${id}`;
    return json({ ok: true });
  }
  return notFound();
}

export async function DELETE(req, { params }) {
  if (!hasDb()) return json({ error: NO_DB }, 503);
  await ensureLoveDb();
  if (!(await isLoveAdmin())) return forbidden();
  const [what, id] = params.path;
  if (!id) return notFound();
  if (what === 'photo') await sql`DELETE FROM love_photos WHERE id = ${id}`;
  else if (what === 'compliment') await sql`DELETE FROM love_compliments WHERE id = ${id}`;
  else if (what === 'audio') await sql`DELETE FROM love_audio WHERE id = ${id}`;
  else return notFound();
  return json({ ok: true });
}

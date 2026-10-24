import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { Lead, LeadStatus } from '@/types';

// Storage with two backends:
//  • Postgres (Neon) when POSTGRES_URL / DATABASE_URL is set — production.
//  • A JSON file in .data/ for local development and self-hosting.
// On Vercel without a database the store is "none": the site shows built-in
// content, the admin explains what to connect, and leads fall back to WhatsApp.

export type StoreKind = 'postgres' | 'file' | 'none';

export interface Session {
  hash: string;
  expiresAt: number;
}

interface FileDb {
  kv: Record<string, unknown>;
  leads: Lead[];
  sessions: Session[];
  events: { bucket: string; key: string; at: number }[];
  images: Record<string, string>; // id → mime
}

const dbUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

export function storeKind(): StoreKind {
  if (dbUrl()) return 'postgres';
  if (process.env.VERCEL) return 'none';
  return 'file';
}

export class StoreUnavailableError extends Error {
  constructor() {
    super('Хранилище не подключено: Vercel → проект → Storage → Neon (Postgres) → Connect, затем Redeploy.');
  }
}

/* ───────────────────────── Postgres ───────────────────────── */

let sqlClient: ReturnType<typeof neon> | null = null;
const sql = () => (sqlClient ??= neon(dbUrl()));

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const q = sql();
    await q`CREATE TABLE IF NOT EXISTS lumiere_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL)`;
    await q`CREATE TABLE IF NOT EXISTS lumiere_images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, created_at BIGINT NOT NULL)`;
    await q`CREATE TABLE IF NOT EXISTS lumiere_leads (
      id TEXT PRIMARY KEY, submission_key TEXT UNIQUE NOT NULL, created_at BIGINT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL)`;
    await q`CREATE TABLE IF NOT EXISTS lumiere_sessions (hash TEXT PRIMARY KEY, expires_at BIGINT NOT NULL)`;
    await q`CREATE TABLE IF NOT EXISTS lumiere_events (bucket TEXT NOT NULL, key TEXT NOT NULL, at BIGINT NOT NULL)`;
    await q`CREATE INDEX IF NOT EXISTS lumiere_events_idx ON lumiere_events (bucket, key, at)`;
  })().catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

type Row = Record<string, unknown>;
async function pg(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
  await ensureSchema();
  return (await sql()(strings, ...values)) as Row[];
}

/* ───────────────────────── File ───────────────────────── */

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const IMG_DIR = path.join(DATA_DIR, 'images');
let fileLock: Promise<unknown> = Promise.resolve();

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as FileDb;
  } catch {
    return { kv: {}, leads: [], sessions: [], events: [], images: {} };
  }
}

/** Serialises read-modify-write cycles within the process. */
function withFileDb<T>(fn: (db: FileDb) => T | Promise<T>, write = true): Promise<T> {
  const run = fileLock.then(async () => {
    const db = await readFileDb();
    const result = await fn(db);
    if (write) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${DB_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db));
      await fs.rename(tmp, DB_FILE);
    }
    return result;
  });
  fileLock = run.catch(() => undefined);
  return run;
}

function requireStore(): Exclude<StoreKind, 'none'> {
  const k = storeKind();
  if (k === 'none') throw new StoreUnavailableError();
  return k;
}

/* ───────────────────────── Public API ───────────────────────── */

export async function kvGet<T>(key: string): Promise<T | null> {
  const k = storeKind();
  if (k === 'none') return null;
  if (k === 'postgres') {
    const rows = await pg`SELECT value FROM lumiere_kv WHERE key = ${key}`;
    return rows[0] ? (JSON.parse(String(rows[0].value)) as T) : null;
  }
  return withFileDb((db) => (key in db.kv ? (db.kv[key] as T) : null), false);
}

export async function kvGetMany(prefix: string): Promise<Record<string, unknown>> {
  const k = storeKind();
  if (k === 'none') return {};
  if (k === 'postgres') {
    const rows = await pg`SELECT key, value FROM lumiere_kv WHERE key LIKE ${prefix + '%'}`;
    return Object.fromEntries(rows.map((r) => [String(r.key), JSON.parse(String(r.value))]));
  }
  return withFileDb((db) => Object.fromEntries(Object.entries(db.kv).filter(([key]) => key.startsWith(prefix))), false);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (requireStore() === 'postgres') {
    const v = JSON.stringify(value);
    await pg`INSERT INTO lumiere_kv (key, value, updated_at) VALUES (${key}, ${v}, ${Date.now()})
      ON CONFLICT (key) DO UPDATE SET value = ${v}, updated_at = ${Date.now()}`;
    return;
  }
  await withFileDb((db) => {
    db.kv[key] = value;
  });
}

export async function kvDelete(key: string): Promise<void> {
  if (requireStore() === 'postgres') {
    await pg`DELETE FROM lumiere_kv WHERE key = ${key}`;
    return;
  }
  await withFileDb((db) => {
    delete db.kv[key];
  });
}

/* Images */

export async function putImage(id: string, mime: string, base64: string): Promise<void> {
  if (requireStore() === 'postgres') {
    await pg`INSERT INTO lumiere_images (id, mime, data, created_at) VALUES (${id}, ${mime}, ${base64}, ${Date.now()})`;
    return;
  }
  await fs.mkdir(IMG_DIR, { recursive: true });
  await fs.writeFile(path.join(IMG_DIR, id), Buffer.from(base64, 'base64'));
  await withFileDb((db) => {
    db.images[id] = mime;
  });
}

export async function getImage(id: string): Promise<{ mime: string; data: Buffer } | null> {
  const k = storeKind();
  if (k === 'none') return null;
  if (k === 'postgres') {
    const rows = await pg`SELECT mime, data FROM lumiere_images WHERE id = ${id}`;
    return rows[0] ? { mime: String(rows[0].mime), data: Buffer.from(String(rows[0].data), 'base64') } : null;
  }
  const mime = await withFileDb((db) => db.images[id], false);
  if (!mime) return null;
  try {
    return { mime, data: await fs.readFile(path.join(IMG_DIR, id)) };
  } catch {
    return null;
  }
}

/* Leads */

export async function insertLead(lead: Lead, submissionKey: string): Promise<{ lead: Lead; duplicate: boolean }> {
  if (requireStore() === 'postgres') {
    const rows = await pg`INSERT INTO lumiere_leads (id, submission_key, created_at, status, data)
      VALUES (${lead.id}, ${submissionKey}, ${lead.createdAt}, ${lead.status}, ${JSON.stringify(lead)})
      ON CONFLICT (submission_key) DO NOTHING RETURNING id`;
    if (rows.length) return { lead, duplicate: false };
    const existing = await pg`SELECT data FROM lumiere_leads WHERE submission_key = ${submissionKey}`;
    return { lead: JSON.parse(String(existing[0].data)) as Lead, duplicate: true };
  }
  return withFileDb((db) => {
    const found = db.leads.find((l) => (l as Lead & { submissionKey?: string }).submissionKey === submissionKey);
    if (found) return { lead: found, duplicate: true };
    db.leads.unshift({ ...lead, submissionKey } as Lead);
    return { lead, duplicate: false };
  });
}

export async function listLeads(): Promise<Lead[]> {
  if (requireStore() === 'postgres') {
    const rows = await pg`SELECT data, status FROM lumiere_leads ORDER BY created_at DESC LIMIT 500`;
    return rows.map((r) => ({ ...(JSON.parse(String(r.data)) as Lead), status: String(r.status) as LeadStatus }));
  }
  return withFileDb((db) => db.leads.slice(0, 500), false);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  if (requireStore() === 'postgres') {
    const rows = await pg`UPDATE lumiere_leads SET status = ${status} WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
  return withFileDb((db) => {
    const l = db.leads.find((x) => x.id === id);
    if (l) l.status = status;
    return Boolean(l);
  });
}

export async function deleteLead(id: string): Promise<void> {
  if (requireStore() === 'postgres') {
    await pg`DELETE FROM lumiere_leads WHERE id = ${id}`;
    return;
  }
  await withFileDb((db) => {
    db.leads = db.leads.filter((l) => l.id !== id);
  });
}

/* Sessions */

export async function createSessionRecord(hash: string, expiresAt: number): Promise<void> {
  if (requireStore() === 'postgres') {
    await pg`DELETE FROM lumiere_sessions WHERE expires_at < ${Date.now()}`;
    await pg`INSERT INTO lumiere_sessions (hash, expires_at) VALUES (${hash}, ${expiresAt})`;
    return;
  }
  await withFileDb((db) => {
    db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
    db.sessions.push({ hash, expiresAt });
  });
}

export async function sessionValid(hash: string): Promise<boolean> {
  const k = storeKind();
  if (k === 'none') return false;
  if (k === 'postgres') {
    const rows = await pg`SELECT hash FROM lumiere_sessions WHERE hash = ${hash} AND expires_at > ${Date.now()}`;
    return rows.length > 0;
  }
  return withFileDb((db) => db.sessions.some((s) => s.hash === hash && s.expiresAt > Date.now()), false);
}

export async function deleteSessions(hash?: string): Promise<void> {
  if (requireStore() === 'postgres') {
    if (hash) await pg`DELETE FROM lumiere_sessions WHERE hash = ${hash}`;
    else await pg`DELETE FROM lumiere_sessions`;
    return;
  }
  await withFileDb((db) => {
    db.sessions = hash ? db.sessions.filter((s) => s.hash !== hash) : [];
  });
}

/* Rate-limit events */

export async function countEvents(bucket: string, key: string, sinceMs: number): Promise<number> {
  const k = storeKind();
  if (k === 'none') return 0;
  const since = Date.now() - sinceMs;
  if (k === 'postgres') {
    const rows = await pg`SELECT COUNT(*)::int AS n FROM lumiere_events WHERE bucket = ${bucket} AND key = ${key} AND at > ${since}`;
    return Number(rows[0]?.n ?? 0);
  }
  return withFileDb((db) => db.events.filter((e) => e.bucket === bucket && e.key === key && e.at > since).length, false);
}

export async function addEvent(bucket: string, key: string): Promise<void> {
  const k = storeKind();
  if (k === 'none') return;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  if (k === 'postgres') {
    await pg`INSERT INTO lumiere_events (bucket, key, at) VALUES (${bucket}, ${key}, ${Date.now()})`;
    if (Math.random() < 0.05) await pg`DELETE FROM lumiere_events WHERE at < ${cutoff}`;
    return;
  }
  await withFileDb((db) => {
    db.events = db.events.filter((e) => e.at > cutoff);
    db.events.push({ bucket, key, at: Date.now() });
  });
}

export async function clearEvents(bucket: string, key: string): Promise<void> {
  const k = storeKind();
  if (k === 'none') return;
  if (k === 'postgres') {
    await pg`DELETE FROM lumiere_events WHERE bucket = ${bucket} AND key = ${key}`;
    return;
  }
  await withFileDb((db) => {
    db.events = db.events.filter((e) => !(e.bucket === bucket && e.key === key));
  });
}

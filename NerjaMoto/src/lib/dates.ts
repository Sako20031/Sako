/** Date helpers working on plain "YYYY-MM-DD" strings (no time-zone drift). */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function parseIsoDate(value: string): number | null {
  const m = ISO.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  // Rejects impossible dates such as 2026-02-31.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return t;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local "today" as YYYY-MM-DD. */
export const todayIso = (now = new Date()) => toIsoDate(now);

export function addDays(iso: string, days: number): string {
  const t = parseIsoDate(iso);
  if (t === null) return iso;
  const d = new Date(t + days * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Whole calendar days from `start` to `end` (negative if reversed), or null if invalid. */
export function daysBetween(start: string, end: string): number | null {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (a === null || b === null) return null;
  return Math.round((b - a) / DAY_MS);
}

export function formatDate(iso: string, lang: 'es' | 'en', withYear = false): string {
  const t = parseIsoDate(iso);
  if (t === null) return iso;
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(t));
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const fromMinutes = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Time slots from `open` to `close` inclusive, every `step` minutes. */
export function timeSlots(open: string, close: string, step: number): string[] {
  const out: string[] = [];
  for (let t = toMinutes(open); t <= toMinutes(close); t += step) out.push(fromMinutes(t));
  return out;
}

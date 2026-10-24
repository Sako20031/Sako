import type { CompanyConfig, PriceUnit } from '../types/index.ts';

export const UNIT_LABEL: Record<PriceUnit, string> = { m2: 'м²', m: 'м', item: 'шт.', fixed: 'усл.' };

export function formatMoney(n: number, c: CompanyConfig['currency']): string {
  const s = new Intl.NumberFormat(c.locale || 'ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));
  // Non-breaking spaces keep "173 000 ₸" on one line.
  return `${s.replace(/[\s\u202f]/g, '\u00a0')}\u00a0${c.symbol}`;
}

export function formatNumber(n: number, digits = 2): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(n).replace(/[\s\u202f]/g, '\u00a0');
}

export const formatArea = (n: number | null) => (n === null ? '—' : `${formatNumber(n)} м²`);
export const formatLength = (n: number | null) => (n === null ? '—' : `${formatNumber(n)} м`);

/** Parses "4,5" or "4.5" typed on a phone keyboard. Empty → null. */
export function parseDecimal(v: string): number | null {
  const t = v.replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function formatDate(iso: string | number): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Normalises a phone to +<country><national> or returns null if it does not fit the country. */
export function normalizePhone(raw: string, country: CompanyConfig['country']): string | null {
  let d = raw.replace(/\D/g, '');
  const cc = country.dialCode.replace(/\D/g, '');
  if (country.code === 'KZ' && d.length === country.nationalDigits + 1 && d.startsWith('8')) d = cc + d.slice(1);
  if (d.length === country.nationalDigits) d = cc + d;
  if (d.length !== cc.length + country.nationalDigits || !d.startsWith(cc)) return null;
  if (country.code === 'KZ' && !/^7[0-9]/.test(d.slice(cc.length))) return null;
  return `+${d}`;
}

export function prettyPhone(e164: string): string {
  const d = e164.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('7')) return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  return e164;
}

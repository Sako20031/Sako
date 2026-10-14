// Shared between the public site and the admin panel.

export const API = '/api/tulpar';

export const CATEGORY_LABELS = {
  sedan: 'Седан', suv: 'Внедорожник', sport: 'Спорткар', ev: 'Электро', minivan: 'Минивэн',
};
export const STATUS_LABELS = { stock: 'В наличии', order: 'Под заказ', sold: 'Продан' };

export async function api(action, { method = 'GET', body, query = {} } = {}) {
  const qs = new URLSearchParams({ action, ...query }).toString();
  const res = await fetch(`${API}?${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  return data;
}

export const photoUrl = (p) => (p?.startsWith('img_') ? `${API}?action=image&id=${encodeURIComponent(p)}` : p);

export const money = (n) => (n ? `${Number(n).toLocaleString('ru-RU').replace(/ |,/g, ' ')} ₸` : 'Цена по запросу');
export const km = (n) => (n ? `${Number(n).toLocaleString('ru-RU').replace(/ |,/g, ' ')} км` : 'Новый');

export const carName = (c) => [c.brand, c.model].filter(Boolean).join(' ');

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Main specs shown on the car page, in display order.
export function specRows(c) {
  const rows = [
    ['Год', c.year || ''],
    ['Пробег', c.mileage ? km(c.mileage) : (c.year ? 'Новый' : '')],
    ['Мощность', c.power ? `${c.power} л.с.` : ''],
    ['Двигатель', c.engine],
    ['Топливо', c.fuel],
    ['Коробка', c.transmission],
    ['Привод', c.drive],
    ['0–100 км/ч', c.accel],
    ['Макс. скорость', c.topSpeed],
    ['Расход', c.consumption],
    ['Цвет', c.color],
    ['Кузов', CATEGORY_LABELS[c.category]],
  ];
  for (const s of c.specs || []) rows.push([s.k, s.v]);
  return rows.filter(([, v]) => v !== '' && v != null);
}

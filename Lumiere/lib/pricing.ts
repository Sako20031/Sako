// Transparent pricing engine, independent of the UI. The same functions run
// in the browser (live estimate) and on the server (lead recalculation), so a
// client-supplied total is never trusted.
//
// Estimated total = covering + installation + profile + lighting
//                 + elements (curtain, services) + additional work
//                 + minimum-order adjustment − discount.
import type {
  EstimateLine,
  ExtraId,
  LineCategory,
  PricingConfig,
  ProjectEstimate,
  Qty,
  Room,
  RoomEstimate,
  RoomMetrics,
} from '../types/index.ts';
import { roomMetrics } from './geometry.ts';

export const NO_PRICES_MESSAGE = 'Предварительный расчёт будет доступен после настройки цен компании.';
export const DISCLAIMER =
  'Расчёт предварительный. Итоговая стоимость зависит от точных замеров, выбранных материалов, технических особенностей помещения и подтверждения специалистом.';

export const CATEGORY_LABELS: Record<LineCategory, string> = {
  covering: 'Потолочное покрытие',
  installation: 'Монтаж',
  profile: 'Профиль',
  lighting: 'Освещение',
  elements: 'Дополнительные элементы',
  works: 'Дополнительные работы',
};

export const CATEGORY_ORDER: LineCategory[] = ['covering', 'installation', 'profile', 'lighting', 'elements', 'works'];

const money = (n: number) => Math.round(n);
const hasPrice = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function pricingAvailability(p: PricingConfig): { available: boolean; message: string | null } {
  if (p.mode === 'off') return { available: false, message: NO_PRICES_MESSAGE };
  const anyMaterial = p.materials.some((m) => m.enabled && hasPrice(m.pricePerM2));
  if (!hasPrice(p.installationPerM2) || !anyMaterial) return { available: false, message: NO_PRICES_MESSAGE };
  return { available: true, message: null };
}

/** Quantities the calculator can infer from the room geometry. */
export function derivedTechnical(room: Room, metrics: RoomMetrics): Partial<Record<ExtraId, number>> {
  const out: Partial<Record<ExtraId, number>> = {};
  if (metrics.corners) {
    out.internalCorner = metrics.corners.internal;
    out.externalCorner = metrics.corners.external;
  }
  if (room.shape.kind === 'niches' || room.shape.kind === 'protrusions') {
    out.niche = room.shape.modifiers.filter((m) => m.kind === 'niche').length;
    out.protrusion = room.shape.modifiers.filter((m) => m.kind === 'protrusion').length;
  }
  return out;
}

/** The customer's own value wins; otherwise the geometry-derived one; otherwise 0. */
export function effectiveQty(room: Room, metrics: RoomMetrics, id: ExtraId): Qty {
  const own = room.technical[id];
  if (own !== undefined && own !== null) return own;
  return derivedTechnical(room, metrics)[id] ?? 0;
}

export function lightingCompatibility(p: PricingConfig, materialId: string | null, lightingId: string): string | null {
  const m = p.materials.find((x) => x.id === materialId);
  if (!m || !m.incompatibleLighting.includes(lightingId)) return null;
  return m.incompatibilityNote || `Не сочетается с покрытием «${m.name}».`;
}

export function estimateRoom(room: Room, p: PricingConfig): RoomEstimate {
  const metrics = roomMetrics(room);
  const lines: EstimateLine[] = [];
  const issues: string[] = [];
  const inspection: string[] = [];
  const area = metrics.area;
  const perimeter = metrics.perimeter;

  const push = (
    category: LineCategory,
    label: string,
    qty: number | null,
    unit: EstimateLine['unit'],
    unitPrice: number | null | undefined,
    kind: 'estimated' | 'fixed',
    note?: string,
  ) => {
    const priced = hasPrice(unitPrice);
    const amount = priced && qty !== null ? money(qty * unitPrice) : null;
    lines.push({
      category,
      label,
      qty,
      unit,
      unitPrice: priced ? unitPrice : null,
      amount,
      kind: amount === null ? 'pending' : kind,
      note: amount === null ? note ?? (priced ? 'Уточнит специалист' : 'Цена уточняется') : note,
    });
  };

  if (area === null) issues.push('Укажите размеры помещения, чтобы рассчитать площадь.');
  if (metrics.needsMeasurement) inspection.push('Сложная геометрия — размеры подтвердит замерщик');
  if (room.sloped) inspection.push('Наклонные или нестандартные поверхности');

  // 1. Covering
  const material = p.materials.find((m) => m.id === room.materialId && m.enabled) ?? null;
  if (!material) {
    issues.push('Выберите покрытие потолка.');
  } else {
    if (material.requiresInspection) inspection.push(`${material.name}: возможность монтажа уточняется на замере`);
    const before = lines.length;
    push('covering', `Полотно «${material.name}»`, area, 'm2', material.pricePerM2, 'estimated');
    const line = lines[before];
    if (line.amount !== null && hasPrice(material.minCharge) && line.amount < material.minCharge) {
      line.amount = money(material.minCharge);
      line.note = 'Минимальная стоимость покрытия';
    }
    const color = p.colors.find((c) => c.id === room.colorId);
    if (color && color.surchargePerM2 !== 0) {
      if (color.surchargePerM2 === null) {
        lines.push({ category: 'covering', label: `Цвет «${color.name}»`, qty: area, unit: 'm2', unitPrice: null, amount: null, kind: 'pending', note: 'Цвет согласуется со специалистом' });
      } else {
        push('covering', `Цвет «${color.name}»`, area, 'm2', color.surchargePerM2, 'estimated');
      }
    }
  }

  // 2. Installation
  push('installation', 'Монтаж полотна', area, 'm2', p.installationPerM2, 'estimated');
  if (room.height !== null && room.height > p.highCeiling.thresholdM && hasPrice(p.highCeiling.pricePerM2)) {
    push('installation', `Монтаж на высоте более ${p.highCeiling.thresholdM} м`, area, 'm2', p.highCeiling.pricePerM2, 'estimated');
  }

  // 3. Profile
  if (material) {
    const profile = p.profiles.find((x) => x.id === material.profileId);
    if (profile) push('profile', profile.name, perimeter, 'm', profile.pricePerM, 'estimated', perimeter === null ? 'Периметр уточнит замерщик' : undefined);
  }

  // 4. Lighting
  for (const opt of p.lighting) {
    const qty = room.lighting[opt.id] ?? 0;
    if (!opt.enabled || !(qty > 0)) continue;
    const conflict = lightingCompatibility(p, room.materialId, opt.id);
    if (conflict) {
      issues.push(`${opt.name}: ${conflict}`);
      continue;
    }
    if (opt.needsInspection) inspection.push(`${opt.name}: требуется консультация специалиста`);
    if (opt.unit === 'perimeter') {
      push('lighting', opt.name, perimeter, 'm', opt.price, 'estimated', perimeter === null ? 'Длина уточнит замерщик' : undefined);
    } else {
      push('lighting', opt.name, qty, opt.unit === 'item' ? 'item' : 'm', opt.price, opt.unit === 'item' ? 'fixed' : 'estimated');
    }
  }

  // 5. Elements: curtain track, decorative elements and other services
  if (room.curtain.enabled) {
    const c = p.curtains.find((x) => x.id === room.curtain.typeId) ?? p.curtains[0];
    if (c) push('elements', c.name, room.curtain.length, 'm', c.pricePerM, 'estimated', room.curtain.length === null ? 'Укажите длину карниза' : undefined);
  }
  for (const s of p.services) {
    const qty = room.services[s.id] ?? 0;
    if (!s.enabled || !(qty > 0)) continue;
    if (s.unit === 'm2') push('elements', s.name, area, 'm2', s.price, 'estimated');
    else if (s.unit === 'fixed') push('elements', s.name, 1, 'fixed', s.price, 'fixed');
    else push('elements', s.name, qty, s.unit, s.price, s.unit === 'item' ? 'fixed' : 'estimated');
  }

  // 6. Additional work from the company's rules
  for (const ex of p.extras) {
    const q = effectiveQty(room, metrics, ex.id);
    if (q === 'unknown') {
      lines.push({ category: 'works', label: ex.label, qty: null, unit: ex.unit, unitPrice: hasPrice(ex.price) ? ex.price : null, amount: null, kind: 'pending', note: 'Количество определит специалист' });
      continue;
    }
    const billable = Math.max(0, q - (ex.included || 0));
    if (billable > 0) {
      push('works', ex.included ? `${ex.label} (сверх ${ex.included})` : ex.label, billable, ex.unit, ex.price, ex.unit === 'item' ? 'fixed' : 'estimated');
    }
  }

  const subtotal = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const incomplete = area === null || !material || lines.some((l) => l.amount === null);
  return { roomId: room.id, roomName: room.name, metrics, lines, subtotal, incomplete, issues, inspection: [...new Set(inspection)] };
}

export function estimateProject(rooms: Room[], p: PricingConfig): ProjectEstimate {
  const { available, message } = pricingAvailability(p);
  const roomEstimates = rooms.map((r) => estimateRoom(r, p));
  const categoryTotals = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<LineCategory, number>;
  for (const re of roomEstimates) for (const l of re.lines) categoryTotals[l.category] += l.amount ?? 0;
  const subtotal = roomEstimates.reduce((s, r) => s + r.subtotal, 0);
  const minimumAdjustment = hasPrice(p.minimumOrder) && subtotal > 0 && subtotal < p.minimumOrder ? money(p.minimumOrder - subtotal) : 0;
  const base = subtotal + minimumAdjustment;
  const d = p.discount;
  const discount =
    d.enabled && d.percent > 0 && base > 0 && (!hasPrice(d.minTotal) || base >= d.minTotal) ? money((base * Math.min(d.percent, 100)) / 100) : 0;
  const totalArea = roomEstimates.reduce((s, r) => s + (r.metrics.area ?? 0), 0);
  const totalPerimeter = roomEstimates.reduce((s, r) => s + (r.metrics.perimeter ?? 0), 0);
  return {
    available,
    mode: p.mode,
    message,
    rooms: roomEstimates,
    categoryTotals,
    subtotal,
    minimumAdjustment,
    discount,
    total: base - discount,
    incomplete: rooms.length === 0 || roomEstimates.some((r) => r.incomplete),
    totalArea: Math.round(totalArea * 100) / 100,
    totalPerimeter: Math.round(totalPerimeter * 100) / 100,
  };
}

/** Lowest per-m² "from" price for a material (covering + installation + profile on a 4×4 room). */
export function startingPricePerM2(p: PricingConfig, materialId: string): number | null {
  if (!pricingAvailability(p).available) return null;
  const m = p.materials.find((x) => x.id === materialId && x.enabled);
  if (!m || !hasPrice(m.pricePerM2) || !hasPrice(p.installationPerM2)) return null;
  const profile = p.profiles.find((x) => x.id === m.profileId);
  // Reference room 4 × 4 m: 16 m of profile per 16 m², i.e. 1 m per m².
  const perM2Profile = profile && hasPrice(profile.pricePerM) ? profile.pricePerM : 0;
  return money(m.pricePerM2 + p.installationPerM2 + perM2Profile);
}

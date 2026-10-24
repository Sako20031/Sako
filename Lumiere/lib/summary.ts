import type { CompanyConfig, PricingConfig, Project, ProjectEstimate, Room, RoomEstimate } from '../types/index.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER, DISCLAIMER, effectiveQty } from './pricing.ts';
import { formatArea, formatDate, formatLength, formatMoney, formatNumber, UNIT_LABEL } from './format.ts';

const SHAPE_LABEL: Record<Room['shape']['kind'], string> = {
  rect: 'прямоугольная',
  lshape: 'Г-образная',
  protrusions: 'с выступами',
  niches: 'с нишами',
  custom: 'нестандартная',
};

export function describeDims(room: Room): string {
  const s = room.shape;
  if (s.kind === 'rect' || s.kind === 'niches' || s.kind === 'protrusions') {
    const base = s.rect.length && s.rect.width ? `${formatNumber(s.rect.length)} × ${formatNumber(s.rect.width)} м` : '';
    const mods = s.modifiers.length ? `, ${s.modifiers.length} ${s.kind === 'niches' ? 'ниш(и)' : 'выступ(а)'}` : '';
    return base + mods;
  }
  if (s.kind === 'lshape') {
    const l = s.lshape;
    if (l.method === 'cutout' && l.length && l.width) return `${formatNumber(l.length)} × ${formatNumber(l.width)} м без угла ${formatNumber(l.cutLength ?? 0)} × ${formatNumber(l.cutWidth ?? 0)} м`;
    if (l.a.length && l.a.width && l.b.length && l.b.width) return `${formatNumber(l.a.length)} × ${formatNumber(l.a.width)} м + ${formatNumber(l.b.length)} × ${formatNumber(l.b.width)} м`;
    return '';
  }
  return s.custom.mode === 'draw' ? `контур из ${s.custom.points.length} точек` : 'размеры со слов клиента';
}

function roomSelections(room: Room, pricing: PricingConfig) {
  const material = pricing.materials.find((m) => m.id === room.materialId)?.name ?? 'не выбрано';
  const lighting = pricing.lighting
    .filter((o) => (room.lighting[o.id] ?? 0) > 0)
    .map((o) => (o.unit === 'perimeter' ? o.name : `${o.name} — ${formatNumber(room.lighting[o.id])} ${o.unit === 'item' ? 'шт.' : 'м'}`));
  const color = pricing.colors.find((c) => c.id === room.colorId)?.name;
  const curtain = room.curtain.enabled
    ? `${pricing.curtains.find((c) => c.id === room.curtain.typeId)?.name ?? 'карниз'}${room.curtain.length ? `, ${formatNumber(room.curtain.length)} м` : ''}`
    : '';
  return { material, lighting, color, curtain };
}

/** Plain-text project summary for download, print and the lead record. */
export function projectSummaryText(project: Project, est: ProjectEstimate, pricing: PricingConfig, company: CompanyConfig): string {
  const c = company.currency;
  const out: string[] = [];
  out.push(`${company.brandName} — проект ${project.id}`);
  out.push(`Сформирован: ${formatDate(project.updatedAt)}`);
  out.push(`Валюта: ${c.code}`);
  if (est.mode === 'sample') out.push('ВНИМАНИЕ: расчёт выполнен по ПРИМЕРНЫМ ценам, это не предложение компании.');
  out.push('');
  project.rooms.forEach((room, i) => {
    const re = est.rooms.find((r) => r.roomId === room.id) as RoomEstimate;
    const sel = roomSelections(room, pricing);
    out.push(`${i + 1}. ${room.name} (${SHAPE_LABEL[room.shape.kind]})`);
    out.push(`   Размеры: ${describeDims(room) || 'не указаны'}${room.approximate ? ' — примерно' : ''}`);
    if (room.height) out.push(`   Высота: ${formatLength(room.height)}`);
    out.push(`   Площадь: ${formatArea(re.metrics.area)}; периметр: ${formatLength(re.metrics.perimeter)}`);
    if (re.metrics.corners) out.push(`   Углы: внутренних ${re.metrics.corners.internal}, внешних ${re.metrics.corners.external}`);
    out.push(`   Покрытие: ${sel.material}${sel.color ? `, цвет: ${sel.color}` : ''}`);
    if (room.temperature) out.push(`   Свет: ${room.temperature}`);
    out.push(`   Освещение: ${sel.lighting.length ? sel.lighting.join('; ') : 'не выбрано'}`);
    if (sel.curtain) out.push(`   Карниз: ${sel.curtain}`);
    const tech = pricing.extras
      .map((ex) => ({ ex, q: effectiveQty(room, re.metrics, ex.id) }))
      .filter(({ q }) => q === 'unknown' || q > 0)
      .map(({ ex, q }) => `${ex.label}: ${q === 'unknown' ? 'не знаю' : formatNumber(q)}`);
    if (tech.length) out.push(`   Технические детали: ${tech.join('; ')}`);
    if (room.technicalNotes) out.push(`   Заметки по технике: ${room.technicalNotes}`);
    if (room.notes) out.push(`   Комментарий: ${room.notes}`);
    if (est.available) {
      for (const l of re.lines) {
        const qty = l.qty !== null ? `${formatNumber(l.qty)} ${UNIT_LABEL[l.unit]}` : '';
        const price = l.amount !== null ? formatMoney(l.amount, c) : l.note ?? 'уточняется';
        out.push(`     · ${l.label}${qty ? ` — ${qty}` : ''}: ${price}`);
      }
      out.push(`   Итого по комнате: ${formatMoney(re.subtotal, c)}${re.incomplete ? ' + позиции, которые уточнит специалист' : ''}`);
    }
    if (re.inspection.length) out.push(`   Нужно уточнить: ${re.inspection.join('; ')}`);
    out.push('');
  });
  out.push(`Всего: ${formatArea(est.totalArea)}, периметр ${formatLength(est.totalPerimeter)}`);
  if (est.available) {
    for (const cat of CATEGORY_ORDER) if (est.categoryTotals[cat]) out.push(`${CATEGORY_LABELS[cat]}: ${formatMoney(est.categoryTotals[cat], c)}`);
    if (est.minimumAdjustment) out.push(`Доведение до минимального заказа: ${formatMoney(est.minimumAdjustment, c)}`);
    if (est.discount) out.push(`${pricing.discount.label}: −${formatMoney(est.discount, c)}`);
    out.push(`Предварительная итоговая сумма: ${formatMoney(est.total, c)}${est.incomplete ? ' (без позиций, которые уточнит специалист)' : ''}`);
  } else {
    out.push(est.message ?? '');
  }
  if (project.notes) out.push('', `Заметки к проекту: ${project.notes}`);
  out.push('', DISCLAIMER);
  return out.join('\n');
}

/** Short, readable WhatsApp message. Contains no name or phone number. */
export function whatsappMessage(project: Project, est: ProjectEstimate, pricing: PricingConfig, company: CompanyConfig): string {
  const lines: string[] = [`Здравствуйте! Мой проект потолка ${project.id}.`];
  project.rooms.forEach((room, i) => {
    const re = est.rooms[i];
    const sel = roomSelections(room, pricing);
    const dims = describeDims(room);
    lines.push(
      `${i + 1}) ${room.name}: ${dims ? dims + ', ' : ''}${formatArea(re.metrics.area)}; ${sel.material}` +
        (sel.lighting.length ? `; свет: ${sel.lighting.join(', ')}` : '') +
        (sel.curtain ? `; карниз: ${sel.curtain}` : ''),
    );
    if (room.notes) lines.push(`   ${room.notes.slice(0, 200)}`);
  });
  if (est.available && est.total > 0) {
    lines.push(`Предварительно: ${formatMoney(est.total, company.currency)}${est.mode === 'sample' ? ' (по примерным ценам)' : ''}${est.incomplete ? ' + уточнения' : ''}.`);
  }
  if (project.notes) lines.push(project.notes.slice(0, 300));
  lines.push('Хочу уточнить детали и записаться на замер.');
  return lines.join('\n');
}

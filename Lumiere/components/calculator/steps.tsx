'use client';

import { useState } from 'react';
import type { CompanyConfig, ExtraWork, PricingConfig, Room, RoomEstimate, RoomType } from '@/types';
import { ROOM_TYPES } from '@/lib/rooms';
import { derivedTechnical, effectiveQty, lightingCompatibility, pricingAvailability } from '@/lib/pricing';
import { formatArea, formatLength, formatMoney, formatNumber, UNIT_LABEL } from '@/lib/format';
import { Checkbox, NumberField, Stepper, TextArea, TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import { LightingArt } from '@/components/lighting/LightingArt';
import { useProject } from './ProjectProvider';

/* ───────────────────────── Shared ───────────────────────── */

export function StepIntro({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-h3 sm:text-[2.1rem]">{title}</h2>
      {text && <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

function usePrice(pricing: PricingConfig, company: CompanyConfig) {
  const available = pricingAvailability(pricing).available;
  return (n: number | null, unit?: string) => (available && n !== null ? `${formatMoney(n, company.currency)}${unit ? ` / ${unit}` : ''}` : null);
}

const ROOM_ICONS: Record<RoomType, string> = {
  living: 'M3 14v4h18v-4M5 14v-3a2 2 0 012-2h10a2 2 0 012 2v3M3 14a1.5 1.5 0 013 0M18 14a1.5 1.5 0 013 0M5 18v2M19 18v2',
  bedroom: 'M3 18V8M3 14h18v4M21 18v-4a3 3 0 00-3-3h-7v3M6 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  kitchen: 'M4 10h16v10H4zM4 14h16M8 6.5a1 1 0 110-.01M12 6.5a1 1 0 110-.01M16 6.5a1 1 0 110-.01M9 17h1M14 17h1',
  bathroom: 'M3 12h18v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3zM6 12V6a2 2 0 014 0M7 19l-1 2M17 19l1 2',
  hallway: 'M6 21V4h12v17M3 21h18M14.5 12.5h.01',
  kids: 'M12 4l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.3l5-.7z',
  commercial: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h2M14 10h2M8 13h2M14 13h2',
  other: 'M5 5h14v14H5zM12 9v6M9 12h6',
};

function RoomIcon({ type, className = '' }: { type: RoomType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ROOM_ICONS[type]} />
    </svg>
  );
}

/* ───────────────────────── 1. Rooms ───────────────────────── */

export function StepRooms({ estimates, onEdit }: { estimates: RoomEstimate[]; onEdit: (id: string) => void }) {
  const { project, addRoom, updateRoom, duplicate, remove, preset } = useProject();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div>
      <StepIntro title="Какие помещения рассчитываем?" text="Выберите тип комнаты — она появится в проекте. Добавьте столько помещений, сколько нужно: у каждого будут свои размеры, покрытие, свет и отдельная строка в расчёте." />
      {preset && (
        <p className="mb-6 flex items-start gap-2 rounded-[4px] border border-champagne/50 bg-champagne-soft/40 p-4 text-sm">
          <Icon name="check" size={18} className="mt-0.5 shrink-0 text-champagne-deep" />
          <span>
            Выбран дизайн «{preset.name}» — он будет применён к новым комнатам. Покрытие можно изменить на шаге «Покрытие».
          </span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ROOM_TYPES.map((t) => (
          <button key={t.id} type="button" className="tile group p-4 hover:-translate-y-0.5" onClick={() => onEdit(addRoom(t.id).id)}>
            <RoomIcon type={t.id} className="h-8 w-8 text-ink" />
            <span className="mt-3 block font-semibold leading-tight">{t.label}</span>
            <span className="mt-1 block text-xs leading-snug text-muted">{t.hint}</span>
            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-line text-muted transition-colors group-hover:border-ink group-hover:text-ink">
              <Icon name="plus" size={14} />
            </span>
          </button>
        ))}
      </div>

      {project.rooms.length > 0 && (
        <div className="mt-10">
          <h3 className="eyebrow">В проекте — {project.rooms.length}</h3>
          <ul className="mt-4 space-y-2.5">
            {project.rooms.map((room) => {
              const est = estimates.find((e) => e.roomId === room.id);
              return (
                <li key={room.id} className="flex flex-col gap-3 rounded-[4px] border border-line bg-paper p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <RoomIcon type={room.type} className="h-7 w-7 shrink-0 text-warm" />
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor={`name-${room.id}`}>
                        Название комнаты
                      </label>
                      <input
                        id={`name-${room.id}`}
                        className="w-full border-b border-transparent bg-transparent font-semibold hover:border-line focus:border-ink focus:outline-none"
                        value={room.name}
                        maxLength={80}
                        onChange={(e) => updateRoom(room.id, (r) => ({ ...r, name: e.target.value }))}
                        onBlur={(e) => !e.target.value.trim() && updateRoom(room.id, (r) => ({ ...r, name: 'Комната' }))}
                      />
                      <p className="mt-0.5 text-sm text-muted">
                        {est?.metrics.area !== null && est?.metrics.area !== undefined ? `${formatArea(est.metrics.area)} · периметр ${formatLength(est.metrics.perimeter)}` : 'Размеры ещё не указаны'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onEdit(room.id)}>
                      <Icon name="edit" size={16} /> Изменить
                    </button>
                    <button type="button" className="btn btn-outline btn-sm px-3" onClick={() => duplicate(room.id)} aria-label={`Копировать «${room.name}»`} title="Копировать">
                      <Icon name="copy" size={16} />
                    </button>
                    {confirm === room.id ? (
                      <button type="button" className="btn btn-sm bg-danger px-3 text-white" onClick={() => { remove(room.id); setConfirm(null); }}>
                        Удалить?
                      </button>
                    ) : (
                      <button type="button" className="btn btn-outline btn-sm px-3" onClick={() => setConfirm(room.id)} aria-label={`Удалить «${room.name}»`} title="Удалить">
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 3. Technical details ───────────────────────── */

export function StepTechnical({ room, estimate, pricing, company, onChange }: { room: Room; estimate: RoomEstimate; pricing: PricingConfig; company: CompanyConfig; onChange: (fn: (r: Room) => Room) => void }) {
  const price = usePrice(pricing, company);
  const derived = derivedTechnical(room, estimate.metrics);
  const setQty = (id: ExtraWork['id'], v: number | 'unknown' | undefined) =>
    onChange((r) => {
      const technical = { ...r.technical };
      if (v === undefined) delete technical[id];
      else technical[id] = v;
      return { ...r, technical };
    });

  return (
    <div>
      <StepIntro
        title="Технические детали"
        text="Углы, трубы, ниши и сложные примыкания требуют дополнительной работы монтажника: профиль подрезается, полотно аккуратно обводится вокруг препятствий. Всё необязательно — если не уверены, выберите «Не знаю», специалист определит на замере."
      />
      <ul className="divide-y divide-line border-y border-line">
        {pricing.extras.map((ex) => {
          const q = effectiveQty(room, estimate.metrics, ex.id);
          const own = room.technical[ex.id];
          const auto = derived[ex.id];
          const unknown = q === 'unknown';
          const unitPrice = price(ex.price, UNIT_LABEL[ex.unit]);
          return (
            <li key={ex.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
              <div>
                <p className="font-semibold">{ex.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{ex.hint}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {auto !== undefined && own === undefined && <span className="mr-3 text-champagne-deep">Рассчитано по форме комнаты</span>}
                  {unitPrice && (
                    <span>
                      {unitPrice}
                      {ex.included ? `, ${ex.included} входят в базовую работу` : ''}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {!unknown &&
                  (ex.unit === 'item' ? (
                    <Stepper label={ex.label} value={q as number} onChange={(v) => setQty(ex.id, v)} max={200} />
                  ) : (
                    <NumberField label="Длина" unit="м" className="w-32" value={q as number} onChange={(v) => setQty(ex.id, v ?? 0)} />
                  ))}
                <button type="button" aria-pressed={unknown} className="chip !min-h-11" onClick={() => setQty(ex.id, unknown ? undefined : 'unknown')}>
                  Не знаю — помогите определить
                </button>
                {own !== undefined && own !== 'unknown' && auto !== undefined && (
                  <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setQty(ex.id, undefined)}>
                    по форме: {auto}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <TextArea
        className="mt-8"
        label="Заметки для специалиста"
        optional
        placeholder="Например: труба отопления у окна, вытяжка над плитой"
        value={room.technicalNotes}
        maxLength={1000}
        onChange={(e) => onChange((r) => ({ ...r, technicalNotes: e.target.value }))}
      />
    </div>
  );
}

/* ───────────────────────── 4. Material ───────────────────────── */

export function StepMaterial({ room, pricing, company, onChange }: { room: Room; pricing: PricingConfig; company: CompanyConfig; onChange: (fn: (r: Room) => Room) => void }) {
  const price = usePrice(pricing, company);
  const materials = pricing.materials.filter((m) => m.enabled);
  const selected = materials.find((m) => m.id === room.materialId);
  const conflicts = selected
    ? pricing.lighting.filter((l) => (room.lighting[l.id] ?? 0) > 0 && selected.incompatibleLighting.includes(l.id))
    : [];
  return (
    <div>
      <StepIntro title="Покрытие потолка" text="Фактура определяет характер комнаты: мат — спокойствие, глянец — глубина и отражения, сатин — мягкий отблеск. Теневой и парящий варианты отличаются профилем у стены." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Покрытие">
        {materials.map((m) => {
          const on = room.materialId === m.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} className="tile group overflow-hidden" onClick={() => onChange((r) => ({ ...r, materialId: m.id }))}>
              <div className="relative aspect-[16/10] overflow-hidden bg-stone">
                <Photo src={m.image} alt="" fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw" className="img-zoom object-cover" />
                {on && (
                  <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ink text-white">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl">{m.name}</span>
                  {price(m.pricePerM2, 'м²') && <span className="shrink-0 text-sm text-muted">{price(m.pricePerM2, 'м²')}</span>}
                </div>
                <p className="mt-1 text-sm font-medium">{m.short}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.description}</p>
                {m.requiresInspection && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-champagne-deep">
                    <Icon name="ruler" size={14} /> Возможность уточняется на замере
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {conflicts.length > 0 && selected && (
        <p className="mt-6 flex gap-2 rounded-[4px] border border-champagne bg-champagne-soft/50 p-4 text-sm" role="alert">
          <Icon name="warn" size={18} className="mt-0.5 shrink-0 text-champagne-deep" />
          <span>
            {conflicts.map((c) => c.name).join(', ')}: {selected.incompatibilityNote || `не сочетается с покрытием «${selected.name}».`} Эта позиция не войдёт в расчёт, пока вы не измените выбор.
          </span>
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── 5. Lighting ───────────────────────── */

export function StepLighting({ room, estimate, pricing, company, onChange }: { room: Room; estimate: RoomEstimate; pricing: PricingConfig; company: CompanyConfig; onChange: (fn: (r: Room) => Room) => void }) {
  const price = usePrice(pricing, company);
  const options = pricing.lighting.filter((l) => l.enabled);
  const setQty = (id: string, v: number) => onChange((r) => ({ ...r, lighting: { ...r.lighting, [id]: v } }));
  return (
    <div>
      <StepIntro title="Студия света" text="Свет закладывается вместе с потолком, поэтому его лучше спланировать заранее. Отметьте нужные варианты — цена обновится сразу. Подключение и мощность подтвердит специалист." />
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((o) => {
          const qty = room.lighting[o.id] ?? 0;
          const on = qty > 0;
          const conflict = lightingCompatibility(pricing, room.materialId, o.id);
          const line = estimate.lines.find((l) => l.category === 'lighting' && l.label === o.name);
          const unitLabel = o.unit === 'item' ? 'шт.' : 'м';
          return (
            <div key={o.id} className="tile overflow-hidden" data-selected={on && !conflict} aria-disabled={conflict ? true : undefined}>
              <div className="aspect-[16/7] overflow-hidden">
                <LightingArt id={o.id} />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[1.45rem] leading-tight">{o.name}</p>
                    {price(o.price, unitLabel) && <p className="mt-0.5 text-sm text-muted">{price(o.price, unitLabel)}</p>}
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <span className="sr-only">Добавить: {o.name}</span>
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={on}
                      disabled={Boolean(conflict)}
                      onChange={(e) => setQty(o.id, e.target.checked ? (o.unit === 'perimeter' ? 1 : o.defaultQty || 1) : 0)}
                    />
                    <span className="h-7 w-12 rounded-full bg-stone-deep transition-colors peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-champagne-deep peer-disabled:opacity-40" />
                    <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
                <p className="text-sm leading-relaxed text-muted">{o.description}</p>
                {conflict && (
                  <p className="flex gap-2 text-sm text-champagne-deep">
                    <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                    {conflict}
                  </p>
                )}
                {o.needsInspection && !conflict && <p className="text-xs font-semibold text-champagne-deep">Требуется консультация специалиста</p>}
                {on && !conflict && (
                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
                    {o.unit === 'item' && <Stepper label={`Количество: ${o.name}`} value={qty} min={1} max={o.maxQty} onChange={(v) => setQty(o.id, v)} />}
                    {o.unit === 'm' && <NumberField label="Длина" unit="м" className="w-32" value={qty} min={0} onChange={(v) => setQty(o.id, v ?? 0)} />}
                    {o.unit === 'perimeter' && (
                      <p className="text-sm">
                        По периметру: <span className="font-semibold">{formatLength(estimate.metrics.perimeter)}</span>
                      </p>
                    )}
                    {line && (
                      <p className="text-sm">
                        В расчёте: <span className="font-semibold tabular-nums">{line.amount !== null ? formatMoney(line.amount, company.currency) : line.note}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 6. Design details ───────────────────────── */

export function StepDesign({ room, pricing, company, onChange }: { room: Room; pricing: PricingConfig; company: CompanyConfig; onChange: (fn: (r: Room) => Room) => void }) {
  const price = usePrice(pricing, company);
  const material = pricing.materials.find((m) => m.id === room.materialId);
  const services = pricing.services.filter((s) => s.enabled);
  const [more, setMore] = useState(Object.values(room.services).some((v) => v > 0));
  const curtainDefault = room.shape.rect.width ?? room.shape.rect.length ?? null;

  return (
    <div className="space-y-12">
      <StepIntro title="Детали дизайна" text="Цвет, температура света и карниз. Дополнительные элементы — по желанию." />

      <section>
        <h3 className="field-label">Цвет потолка</h3>
        <p className="mb-4 text-sm text-muted">Тип поверхности: {material ? material.name : 'не выбран'}.</p>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Цвет">
          {pricing.colors.map((c) => {
            const on = room.colorId === c.id;
            const extra = c.surchargePerM2 ? price(c.surchargePerM2, 'м²') : null;
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} className="tile flex w-[calc(50%-0.375rem)] items-center gap-3 p-3 sm:w-auto sm:pr-5" onClick={() => onChange((r) => ({ ...r, colorId: c.id }))}>
                <span className="h-10 w-10 shrink-0 rounded-full border border-line-strong" style={{ background: c.id === 'custom' ? 'conic-gradient(#e9dfcf,#b79a72,#3a3a3a,#cfc9bf,#e9dfcf)' : c.hex }} />
                <span>
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">{c.surchargePerM2 === null ? 'по согласованию' : extra ? `+${extra}` : 'без доплаты'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {pricing.temperatures.length > 0 && (
        <section>
          <h3 className="field-label mb-3">Температура света</h3>
          <div className="flex flex-wrap gap-2">
            {pricing.temperatures.map((t, i) => (
              <button key={t} type="button" aria-pressed={room.temperature === t} className="chip" onClick={() => onChange((r) => ({ ...r, temperature: r.temperature === t ? null : t }))}>
                <span className="h-3 w-3 rounded-full" style={{ background: ['#ffcf8a', '#ffe2b8', '#f4f6ff'][i] ?? '#fff' }} />
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="field-label mb-3">Карниз</h3>
        <Checkbox checked={room.curtain.enabled} onChange={(v) => onChange((r) => ({ ...r, curtain: { ...r.curtain, enabled: v, typeId: r.curtain.typeId ?? pricing.curtains[0]?.id ?? null, length: r.curtain.length ?? curtainDefault } }))}>
          Нужен карниз для штор
        </Checkbox>
        {room.curtain.enabled && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {pricing.curtains.map((c) => (
                <button key={c.id} type="button" aria-pressed={room.curtain.typeId === c.id} className="tile p-4" onClick={() => onChange((r) => ({ ...r, curtain: { ...r.curtain, typeId: c.id } }))}>
                  <span className="block font-semibold">{c.name}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted">{c.description}</span>
                  {price(c.pricePerM, 'м') && <span className="mt-2 block text-xs">{price(c.pricePerM, 'м')}</span>}
                </button>
              ))}
            </div>
            <NumberField label="Длина карниза" unit="м" className="max-w-[12rem]" hint="Обычно — ширина окна или стены" value={room.curtain.length} onChange={(v) => onChange((r) => ({ ...r, curtain: { ...r.curtain, length: v } }))} />
          </div>
        )}
      </section>

      {services.length > 0 && (
        <section>
          <button type="button" className="flex w-full items-center justify-between border-y border-line py-4 text-left font-semibold" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            Дополнительные элементы и услуги
            <Icon name="chevronDown" className={`transition-transform ${more ? 'rotate-180' : ''}`} />
          </button>
          {more && (
            <ul className="divide-y divide-line">
              {services.map((s) => {
                const qty = room.services[s.id] ?? 0;
                const set = (v: number) => onChange((r) => ({ ...r, services: { ...r.services, [s.id]: v } }));
                return (
                  <li key={s.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <Checkbox checked={qty > 0} onChange={(v) => set(v ? 1 : 0)}>
                      <span className="font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {s.description}
                        {price(s.price, s.unit === 'fixed' ? undefined : UNIT_LABEL[s.unit]) && ` · ${price(s.price, s.unit === 'fixed' ? undefined : UNIT_LABEL[s.unit])}`}
                      </span>
                    </Checkbox>
                    {qty > 0 && s.unit === 'item' && <Stepper label={s.name} value={qty} min={1} onChange={set} />}
                    {qty > 0 && s.unit === 'm' && <NumberField label="Длина" unit="м" className="w-32" value={qty} onChange={(v) => set(v ?? 0)} />}
                    {qty > 0 && s.unit === 'm2' && <span className="text-sm text-muted">по площади комнаты</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <TextArea label="Комментарий к комнате" optional placeholder="Пожелания по дизайну, ссылки на референсы, сроки" value={room.notes} maxLength={1000} onChange={(e) => onChange((r) => ({ ...r, notes: e.target.value }))} />
    </div>
  );
}

/* ───────────────────────── 7. Review: room cards ───────────────────────── */

export function RoomReviewCard({ room, estimate, pricing, company, available, onEdit }: { room: Room; estimate: RoomEstimate; pricing: PricingConfig; company: CompanyConfig; available: boolean; onEdit: () => void }) {
  const material = pricing.materials.find((m) => m.id === room.materialId);
  const lights = pricing.lighting.filter((o) => (room.lighting[o.id] ?? 0) > 0);
  return (
    <article className="print-break rounded-[6px] border border-line bg-paper">
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h3 className="font-display text-2xl">{room.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatArea(estimate.metrics.area)} · периметр {formatLength(estimate.metrics.perimeter)}
            {room.height ? ` · высота ${formatLength(room.height)}` : ''}
            {room.approximate ? ' · размеры примерные' : ''}
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm no-print" onClick={onEdit}>
          <Icon name="edit" size={16} /> Изменить
        </button>
      </header>
      <div className="grid gap-x-8 gap-y-2 p-5 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted">Покрытие: </span>
          {material?.name ?? <span className="text-danger">не выбрано</span>}
        </p>
        <p>
          <span className="text-muted">Цвет: </span>
          {pricing.colors.find((c) => c.id === room.colorId)?.name ?? '—'}
        </p>
        <p className="sm:col-span-2">
          <span className="text-muted">Освещение: </span>
          {lights.length ? lights.map((o) => (o.unit === 'perimeter' ? o.name : `${o.name} (${formatNumber(room.lighting[o.id])} ${o.unit === 'item' ? 'шт.' : 'м'})`)).join(', ') : 'не выбрано'}
        </p>
        {room.curtain.enabled && (
          <p className="sm:col-span-2">
            <span className="text-muted">Карниз: </span>
            {pricing.curtains.find((c) => c.id === room.curtain.typeId)?.name}
            {room.curtain.length ? `, ${formatLength(room.curtain.length)}` : ''}
          </p>
        )}
        {room.notes && (
          <p className="sm:col-span-2">
            <span className="text-muted">Комментарий: </span>
            {room.notes}
          </p>
        )}
      </div>
      {available && (
        <table className="w-full border-t border-line text-sm">
          <caption className="sr-only">Расчёт по комнате {room.name}</caption>
          <thead className="sr-only">
            <tr>
              <th>Позиция</th>
              <th>Количество</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {estimate.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-2.5 pl-5 pr-2">
                  {l.label}
                  <span className="ml-2 text-xs text-muted">{l.kind === 'estimated' ? 'оценка' : l.kind === 'fixed' ? 'по прайсу' : ''}</span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-muted">{l.qty !== null && l.unit !== 'fixed' ? `${formatNumber(l.qty)} ${UNIT_LABEL[l.unit]}` : ''}</td>
                <td className="whitespace-nowrap py-2.5 pl-2 pr-5 text-right tabular-nums">{l.amount !== null ? formatMoney(l.amount, company.currency) : <span className="text-muted">{l.note}</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong font-semibold">
              <td className="py-3 pl-5" colSpan={2}>
                Итого по комнате
              </td>
              <td className="py-3 pr-5 text-right tabular-nums">{formatMoney(estimate.subtotal, company.currency)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {estimate.issues.length > 0 && (
        <ul className="space-y-1 border-t border-line p-5 text-sm text-champagne-deep">
          {estimate.issues.map((i) => (
            <li key={i} className="flex gap-2">
              <Icon name="info" size={16} className="mt-0.5 shrink-0" />
              {i}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function ProjectNotes() {
  const { project, setNotes } = useProject();
  return <TextField label="Заметки ко всему проекту" optional placeholder="Например: ремонт в процессе, нужен монтаж в мае" value={project.notes} maxLength={1500} onChange={(e) => setNotes(e.target.value)} />;
}

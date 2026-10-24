'use client';

import { useState, type ReactNode } from 'react';
import type { CatalogItem, CompanyConfig, ContentSection, ExtraWork, FaqItem, HeroContent, LightingOption, MaterialOption, PortfolioItem, PricingConfig, RoomType, ServiceOption, SiteContent } from '@/types';
import { ROOM_TYPES } from '@/lib/rooms';
import { randomId } from '@/lib/ids';
import { whatsappNumber } from '@/lib/whatsapp';
import { Icon } from '@/components/ui/Icon';
import { ACheck, AGallery, AImage, ALines, ANumber, ASelect, AText, api, Card, ItemShell, move, slugify } from './ui';

/* ───────────────────────── Section wrapper ───────────────────────── */

type Toast = (msg: string, kind?: 'ok' | 'error') => void;

export function SectionEditor<K extends ContentSection>({
  section,
  value,
  defaults,
  customized,
  onSaved,
  toast,
  children,
}: {
  section: K;
  value: SiteContent[K];
  defaults: SiteContent[K];
  customized: boolean;
  onSaved: (v: SiteContent[K], customized: boolean) => void;
  toast: Toast;
  children: (draft: SiteContent[K], set: (fn: (d: SiteContent[K]) => SiteContent[K]) => void) => ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  const save = async () => {
    setBusy(true);
    try {
      const res = await api<{ data: SiteContent[K] }>(`/api/admin/content/${section}`, { method: 'PUT', json: draft });
      onSaved(res.data, true);
      setDraft(res.data);
      toast('Сохранено — изменения уже на сайте');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка сохранения', 'error');
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!window.confirm('Вернуть этот раздел к исходному содержимому? Ваши изменения в нём будут удалены.')) return;
    setBusy(true);
    try {
      await api(`/api/admin/content/${section}`, { method: 'DELETE' });
      onSaved(defaults, false);
      setDraft(defaults);
      setVersion((v) => v + 1);
      toast('Раздел возвращён к исходному');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div key={version} className="space-y-6">
        {children(draft, (fn) => setDraft((d) => fn(structuredClone(d))))}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm text-muted">{dirty ? 'Есть несохранённые изменения' : customized ? 'Сохранено' : 'Исходное содержимое'}</p>
          <div className="flex gap-2">
            {customized && (
              <button type="button" className="btn btn-outline btn-sm" onClick={reset} disabled={busy}>
                Вернуть исходное
              </button>
            )}
            {dirty && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDraft(value); setVersion((v) => v + 1); }} disabled={busy}>
                Отменить
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty}>
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Pricing ───────────────────────── */

export function PricingEditor({ d, set, currency }: { d: PricingConfig; set: (fn: (d: PricingConfig) => PricingConfig) => void; currency: string }) {
  const cur = currency;
  const upd = <K extends keyof PricingConfig>(k: K, v: PricingConfig[K]) => set((x) => ({ ...x, [k]: v }));
  const updList = <K extends 'materials' | 'lighting' | 'extras' | 'curtains' | 'colors' | 'services' | 'profiles'>(k: K, i: number, patch: Partial<PricingConfig[K][number]>) =>
    set((x) => ({ ...x, [k]: (x[k] as PricingConfig[K][number][]).map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  return (
    <>
      <Card title="Режим цен">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['off', 'Выключены', 'Калькулятор считает площадь, но вместо суммы пишет, что цены настраиваются.'],
              ['sample', 'Примерные', 'Суммы видны с пометкой «пример цен». Для демонстрации.'],
              ['live', 'Цены компании', 'Суммы показываются как предварительный расчёт компании.'],
            ] as const
          ).map(([id, title, text]) => (
            <button key={id} type="button" aria-pressed={d.mode === id} className="tile p-4" onClick={() => upd('mode', id)}>
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-muted">{text}</span>
            </button>
          ))}
        </div>
        {d.mode === 'sample' && <p className="rounded-[4px] bg-champagne-soft/60 p-3 text-sm">Сейчас на сайте примерные цены. Введите свои цены ниже и включите «Цены компании».</p>}
        <p className="text-sm text-muted">Пустое поле цены = «не указано»: позиция попадёт в расчёт как «уточнит специалист».</p>
      </Card>

      <Card title="Базовые правила">
        <div className="grid gap-4 sm:grid-cols-2">
          <ANumber label="Монтаж, за м²" unit={cur} value={d.installationPerM2} onChange={(v) => upd('installationPerM2', v)} />
          <ANumber label="Минимальный заказ" unit={cur} value={d.minimumOrder} onChange={(v) => upd('minimumOrder', v)} hint="Если сумма меньше — добавляется доплата до минимума" />
          <ANumber label="Высокие потолки: от высоты" unit="м" allowNull={false} value={d.highCeiling.thresholdM} onChange={(v) => upd('highCeiling', { ...d.highCeiling, thresholdM: v ?? 3 })} />
          <ANumber label="Доплата за высоту, за м²" unit={cur} value={d.highCeiling.pricePerM2} onChange={(v) => upd('highCeiling', { ...d.highCeiling, pricePerM2: v })} />
        </div>
        <div className="space-y-4 border-t border-line pt-5">
          <ACheck label="Скидка на проект" checked={d.discount.enabled} onChange={(v) => upd('discount', { ...d.discount, enabled: v })} />
          {d.discount.enabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <AText label="Название" value={d.discount.label} onChange={(v) => upd('discount', { ...d.discount, label: v })} />
              <ANumber label="Процент" unit="%" allowNull={false} value={d.discount.percent} onChange={(v) => upd('discount', { ...d.discount, percent: v ?? 0 })} />
              <ANumber label="От суммы" unit={cur} value={d.discount.minTotal} onChange={(v) => upd('discount', { ...d.discount, minTotal: v })} />
            </div>
          )}
        </div>
      </Card>

      <Card title="Покрытия" actions={<AddBtn onClick={() => upd('materials', [...d.materials, newMaterial(d)])} />}>
        {d.materials.map((m, i) => (
          <MaterialItem key={m.id} m={m} i={i} d={d} cur={cur} onChange={(p) => updList('materials', i, p)} onUp={() => upd('materials', move(d.materials, i, -1))} onDown={() => upd('materials', move(d.materials, i, 1))} onDelete={() => upd('materials', d.materials.filter((_, j) => j !== i))} />
        ))}
      </Card>

      <Card title="Профили">
        {d.profiles.map((p, i) => (
          <div key={p.id} className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <AText label="Название" value={p.name} onChange={(v) => updList('profiles', i, { name: v })} />
            <ANumber label="Цена за пог. м" unit={cur} value={p.pricePerM} onChange={(v) => updList('profiles', i, { pricePerM: v })} />
          </div>
        ))}
      </Card>

      <Card title="Освещение" actions={<AddBtn onClick={() => upd('lighting', [...d.lighting, newLighting()])} />}>
        {d.lighting.map((l, i) => (
          <ItemShell key={l.id} title={l.name} subtitle={priceLine(l.price, cur, l.unit === 'item' ? 'шт.' : 'м')} badge={!l.enabled ? <Off /> : null} onUp={() => upd('lighting', move(d.lighting, i, -1))} onDown={() => upd('lighting', move(d.lighting, i, 1))} onDelete={() => upd('lighting', d.lighting.filter((_, j) => j !== i))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AText label="Название" value={l.name} onChange={(v) => updList('lighting', i, { name: v })} />
              <ASelect<LightingOption['unit']> label="Единица" value={l.unit} onChange={(v) => updList('lighting', i, { unit: v })} options={[{ value: 'item', label: 'Штука' }, { value: 'm', label: 'Метр (клиент указывает длину)' }, { value: 'perimeter', label: 'По периметру комнаты' }]} />
              <ANumber label="Цена за единицу" unit={cur} value={l.price} onChange={(v) => updList('lighting', i, { price: v })} />
              <ANumber label="Количество по умолчанию" allowNull={false} value={l.defaultQty} onChange={(v) => updList('lighting', i, { defaultQty: v ?? 1 })} />
            </div>
            <AText label="Описание" multiline value={l.description} onChange={(v) => updList('lighting', i, { description: v })} />
            <ACheck label="Показывать на сайте" checked={l.enabled} onChange={(v) => updList('lighting', i, { enabled: v })} />
            <ACheck label="Требует консультации специалиста" checked={l.needsInspection} onChange={(v) => updList('lighting', i, { needsInspection: v })} />
          </ItemShell>
        ))}
      </Card>

      <Card title="Дополнительные работы">
        <p className="text-sm text-muted">Количество углов клиент видит рассчитанным по форме комнаты. «Входит в базу» — сколько единиц не оплачивается отдельно.</p>
        {d.extras.map((ex: ExtraWork, i) => (
          <ItemShell key={ex.id} title={ex.label} subtitle={priceLine(ex.price, cur, ex.unit === 'item' ? 'шт.' : 'м')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <AText label="Название" value={ex.label} onChange={(v) => updList('extras', i, { label: v })} />
              <ANumber label={`Цена за ${ex.unit === 'item' ? 'шт.' : 'м'}`} unit={cur} value={ex.price} onChange={(v) => updList('extras', i, { price: v })} />
              <ANumber label="Входит в базу" allowNull={false} value={ex.included} onChange={(v) => updList('extras', i, { included: v ?? 0 })} />
            </div>
            <AText label="Пояснение для клиента" multiline value={ex.hint} onChange={(v) => updList('extras', i, { hint: v })} />
          </ItemShell>
        ))}
      </Card>

      <Card title="Карнизы" actions={<AddBtn onClick={() => upd('curtains', [...d.curtains, { id: randomId(6).toLowerCase(), name: 'Новый карниз', description: '', pricePerM: null }])} />}>
        {d.curtains.map((c, i) => (
          <ItemShell key={c.id} title={c.name} subtitle={priceLine(c.pricePerM, cur, 'м')} onDelete={() => upd('curtains', d.curtains.filter((_, j) => j !== i))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AText label="Название" value={c.name} onChange={(v) => updList('curtains', i, { name: v })} />
              <ANumber label="Цена за пог. м" unit={cur} value={c.pricePerM} onChange={(v) => updList('curtains', i, { pricePerM: v })} />
            </div>
            <AText label="Описание" value={c.description} onChange={(v) => updList('curtains', i, { description: v })} />
          </ItemShell>
        ))}
      </Card>

      <Card title="Цвета" actions={<AddBtn onClick={() => upd('colors', [...d.colors, { id: randomId(6).toLowerCase(), name: 'Новый цвет', hex: '#FFFFFF', surchargePerM2: 0 }])} />}>
        {d.colors.map((c, i) => (
          <div key={c.id} className="grid items-end gap-3 sm:grid-cols-[1fr_7rem_12rem_auto]">
            <AText label="Цвет" value={c.name} onChange={(v) => updList('colors', i, { name: v })} />
            <div>
              <label className="field-label">Оттенок</label>
              <input type="color" className="field h-12 p-1" value={c.hex} onChange={(e) => updList('colors', i, { hex: e.target.value.toUpperCase() })} />
            </div>
            <ANumber label="Доплата за м²" unit={cur} value={c.surchargePerM2} onChange={(v) => updList('colors', i, { surchargePerM2: v })} hint="Пусто — «по согласованию»" />
            <button type="button" className="mb-1 grid h-11 w-11 place-items-center text-muted hover:text-danger" aria-label="Удалить цвет" onClick={() => upd('colors', d.colors.filter((_, j) => j !== i))}>
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
        <ALines label="Температура света" value={d.temperatures} onChange={(v) => upd('temperatures', v)} rows={3} />
      </Card>

      <Card title="Дополнительные услуги и элементы" actions={<AddBtn onClick={() => upd('services', [...d.services, { id: randomId(6).toLowerCase(), name: 'Новая услуга', description: '', unit: 'item', price: null, enabled: true }])} />}>
        <p className="text-sm text-muted">Свои правила цены: за м² комнаты, за метр, за штуку или фиксированная сумма.</p>
        {d.services.map((s, i) => (
          <ItemShell key={s.id} title={s.name} subtitle={priceLine(s.price, cur, unitText(s.unit))} badge={!s.enabled ? <Off /> : null} onDelete={() => upd('services', d.services.filter((_, j) => j !== i))}>
            <div className="grid gap-4 sm:grid-cols-3">
              <AText label="Название" value={s.name} onChange={(v) => updList('services', i, { name: v })} />
              <ASelect<ServiceOption['unit']> label="Как считать" value={s.unit} onChange={(v) => updList('services', i, { unit: v })} options={[{ value: 'm2', label: 'За м² комнаты' }, { value: 'm', label: 'За метр' }, { value: 'item', label: 'За штуку' }, { value: 'fixed', label: 'Фиксированная сумма' }]} />
              <ANumber label="Цена" unit={cur} value={s.price} onChange={(v) => updList('services', i, { price: v })} />
            </div>
            <AText label="Описание" value={s.description} onChange={(v) => updList('services', i, { description: v })} />
            <ACheck label="Показывать в калькуляторе" checked={s.enabled} onChange={(v) => updList('services', i, { enabled: v })} />
          </ItemShell>
        ))}
      </Card>
    </>
  );
}

function MaterialItem({ m, i, d, cur, onChange, onUp, onDown, onDelete }: { m: MaterialOption; i: number; d: PricingConfig; cur: string; onChange: (p: Partial<MaterialOption>) => void; onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <ItemShell title={m.name} subtitle={priceLine(m.pricePerM2, cur, 'м²')} badge={!m.enabled ? <Off /> : null} onUp={i > 0 ? onUp : undefined} onDown={onDown} onDelete={onDelete}>
      <div className="grid gap-4 sm:grid-cols-3">
        <AText label="Название" value={m.name} onChange={(v) => onChange({ name: v })} />
        <ANumber label="Полотно, за м²" unit={cur} value={m.pricePerM2} onChange={(v) => onChange({ pricePerM2: v })} />
        <ANumber label="Минимальная стоимость" unit={cur} value={m.minCharge} onChange={(v) => onChange({ minCharge: v })} />
        <ASelect label="Профиль" value={m.profileId} onChange={(v) => onChange({ profileId: v })} options={d.profiles.map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <AText label="Коротко" value={m.short} onChange={(v) => onChange({ short: v })} />
      <AText label="Описание" multiline value={m.description} onChange={(v) => onChange({ description: v })} />
      <AImage label="Фото" value={m.image} onChange={(v) => onChange({ image: v })} />
      <fieldset>
        <legend className="field-label">Не сочетается с освещением</legend>
        <div className="flex flex-wrap gap-2">
          {d.lighting.map((l) => {
            const on = m.incompatibleLighting.includes(l.id);
            return (
              <button key={l.id} type="button" aria-pressed={on} className="chip !min-h-9 !text-[0.8125rem]" onClick={() => onChange({ incompatibleLighting: on ? m.incompatibleLighting.filter((x) => x !== l.id) : [...m.incompatibleLighting, l.id] })}>
                {l.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      {m.incompatibleLighting.length > 0 && <AText label="Пояснение для клиента о несовместимости" value={m.incompatibilityNote} onChange={(v) => onChange({ incompatibilityNote: v })} />}
      <ACheck label="Показывать на сайте" checked={m.enabled} onChange={(v) => onChange({ enabled: v })} />
      <ACheck label="Возможность уточняется на замере" checked={m.requiresInspection} onChange={(v) => onChange({ requiresInspection: v })} />
    </ItemShell>
  );
}

const Off = () => <span className="ml-2 shrink-0 rounded bg-stone px-2 py-0.5 text-xs text-muted">скрыто</span>;
const AddBtn = ({ onClick, label = 'Добавить' }: { onClick: () => void; label?: string }) => (
  <button type="button" className="btn btn-outline btn-sm" onClick={onClick}>
    <Icon name="plus" size={16} /> {label}
  </button>
);
const unitText = (u: ServiceOption['unit']) => ({ m2: 'м²', m: 'м', item: 'шт.', fixed: 'услуга' })[u];
const priceLine = (p: number | null, cur: string, unit: string) => (p === null ? 'цена не указана' : `${p.toLocaleString('ru-RU')} ${cur} / ${unit}`);

function newMaterial(d: PricingConfig): MaterialOption {
  return { id: randomId(6).toLowerCase(), name: 'Новое покрытие', short: '', description: '', image: '', pricePerM2: null, minCharge: null, profileId: d.profiles[0]?.id ?? 'standard', incompatibleLighting: [], incompatibilityNote: '', requiresInspection: false, enabled: true };
}
function newLighting(): LightingOption {
  return { id: randomId(6).toLowerCase(), name: 'Новый вариант', description: '', unit: 'item', price: null, defaultQty: 1, maxQty: 50, needsInspection: false, enabled: true };
}

/* ───────────────────────── Portfolio ───────────────────────── */

export function PortfolioEditor({ d, set }: { d: PortfolioItem[]; set: (fn: (d: PortfolioItem[]) => PortfolioItem[]) => void }) {
  const upd = (i: number, patch: Partial<PortfolioItem>) => set((x) => x.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const add = () =>
    set((x) => [
      { id: randomId(8).toLowerCase(), slug: `rabota-${randomId(5).toLowerCase()}`, kind: 'project', title: 'Новая работа', roomType: 'living', style: '', ceiling: '', lighting: '', materials: '', description: '', cover: '', coverAlt: '', gallery: [], price: '', completedAt: '', published: false },
      ...x,
    ]);
  return (
    <Card title="Работы" actions={<AddBtn onClick={add} label="Добавить работу" />}>
      <p className="text-sm text-muted">Отмечайте реальные объекты как «Выполненный проект», а визуальные идеи — как «Концепт». Новая работа появится на сайте после включения «Опубликовать» и сохранения.</p>
      {d.map((p, i) => (
        <ItemShell
          key={p.id}
          title={p.title}
          subtitle={`${p.kind === 'project' ? 'Проект' : 'Концепт'} · ${ROOM_TYPES.find((r) => r.id === p.roomType)?.label}`}
          badge={!p.published ? <Off /> : null}
          open={!p.cover && p.title === 'Новая работа'}
          onUp={i > 0 ? () => set((x) => move(x, i, -1)) : undefined}
          onDown={i < d.length - 1 ? () => set((x) => move(x, i, 1)) : undefined}
          onDelete={() => set((x) => x.filter((_, j) => j !== i))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AText label="Название" value={p.title} onChange={(v) => upd(i, { title: v, slug: p.slug.startsWith('rabota-') ? slugify(v) + '-' + p.id.slice(0, 4) : p.slug })} />
            <ASelect<PortfolioItem['kind']> label="Тип" value={p.kind} onChange={(v) => upd(i, { kind: v })} options={[{ value: 'project', label: 'Выполненный проект' }, { value: 'concept', label: 'Концепт-дизайн' }]} />
            <ASelect<RoomType> label="Помещение" value={p.roomType} onChange={(v) => upd(i, { roomType: v })} options={ROOM_TYPES.map((r) => ({ value: r.id, label: r.label }))} />
            <AText label="Стиль" value={p.style} onChange={(v) => upd(i, { style: v })} placeholder="Минимализм" />
            <AText label="Потолок" value={p.ceiling} onChange={(v) => upd(i, { ceiling: v })} />
            <AText label="Освещение" value={p.lighting} onChange={(v) => upd(i, { lighting: v })} />
            <AText label="Материалы" value={p.materials} onChange={(v) => upd(i, { materials: v })} />
            <AText label="Адрес страницы" value={p.slug} onChange={(v) => upd(i, { slug: slugify(v) })} hint={`/portfolio/${p.slug}`} />
            {p.kind === 'project' && (
              <>
                <AText label="Стоимость (необязательно)" value={p.price} onChange={(v) => upd(i, { price: v })} placeholder="например, 450 000 ₸" />
                <AText label="Дата (необязательно)" value={p.completedAt} onChange={(v) => upd(i, { completedAt: v })} placeholder="май 2026" />
              </>
            )}
          </div>
          <AText label="Описание" multiline rows={4} value={p.description} onChange={(v) => upd(i, { description: v })} />
          <AImage label="Обложка" value={p.cover} onChange={(v) => upd(i, { cover: v })} aspect="aspect-[4/5]" />
          <AText label="Описание фото (для незрячих и SEO)" value={p.coverAlt} onChange={(v) => upd(i, { coverAlt: v })} />
          <AGallery label="Галерея" value={p.gallery} onChange={(v) => upd(i, { gallery: v })} />
          <ACheck label="Опубликовать на сайте" checked={p.published} onChange={(v) => upd(i, { published: v })} />
        </ItemShell>
      ))}
    </Card>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

export function HeroEditor({ d, set, defaults }: { d: HeroContent; set: (fn: (d: HeroContent) => HeroContent) => void; defaults: HeroContent }) {
  const upd = (patch: Partial<HeroContent>) => set((x) => ({ ...x, ...patch }));
  const [fx, fy] = d.focus.split(' ').map((v) => parseInt(v, 10));
  return (
    <>
      <Card title="Фоновое фото главного экрана">
        <AImage label="Фото" value={d.image} defaultValue={defaults.image} onChange={(v) => upd({ image: v })} aspect="aspect-[16/9]" hint="Лучше горизонтальное фото от 2000 px по ширине. Оно автоматически уменьшится перед загрузкой." />
        <AText label="Описание фото" value={d.imageAlt} onChange={(v) => upd({ imageAlt: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Фокус по горизонтали: {fx}%</span>
            <input type="range" min={0} max={100} value={fx} className="w-full accent-ink" onChange={(e) => upd({ focus: `${e.target.value}% ${fy}%` })} />
          </label>
          <label className="block">
            <span className="field-label">Фокус по вертикали: {fy}%</span>
            <input type="range" min={0} max={100} value={fy} className="w-full accent-ink" onChange={(e) => upd({ focus: `${fx}% ${e.target.value}%` })} />
          </label>
        </div>
        <p className="text-sm text-muted">Фокус определяет, какая часть фото остаётся видимой на телефоне.</p>
      </Card>
      <Card title="Тексты">
        <AText label="Заголовок" value={d.title} onChange={(v) => upd({ title: v })} />
        <AText label="Подзаголовок" multiline value={d.subtitle} onChange={(v) => upd({ subtitle: v })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <AText label="Главная кнопка" value={d.primaryCta} onChange={(v) => upd({ primaryCta: v })} />
          <AText label="Вторая кнопка" value={d.secondaryCta} onChange={(v) => upd({ secondaryCta: v })} />
          <AText label="Ссылка на замер" value={d.measureLink} onChange={(v) => upd({ measureLink: v })} />
        </div>
        <ALines label="Преимущества (до 6)" value={d.benefits} onChange={(v) => upd({ benefits: v.slice(0, 6) })} hint="Только то, что компания действительно выполняет. Каждое — с новой строки." />
      </Card>
    </>
  );
}

/* ───────────────────────── Catalog ───────────────────────── */

export function CatalogEditor({ d, set, materials, currency }: { d: CatalogItem[]; set: (fn: (d: CatalogItem[]) => CatalogItem[]) => void; materials: MaterialOption[]; currency: string }) {
  const upd = (i: number, patch: Partial<CatalogItem>) => set((x) => x.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <Card title="Коллекция">
      <p className="text-sm text-muted">Выключите решения, которые компания не предлагает. Цена «от» по умолчанию считается из цен (покрытие + монтаж + профиль), но её можно задать вручную.</p>
      {d.map((c, i) => (
        <ItemShell key={c.id} title={c.name} subtitle={c.short} badge={!c.enabled ? <Off /> : null} onUp={i > 0 ? () => set((x) => move(x, i, -1)) : undefined} onDown={i < d.length - 1 ? () => set((x) => move(x, i, 1)) : undefined}>
          <ACheck label="Показывать на сайте" checked={c.enabled} onChange={(v) => upd(i, { enabled: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <AText label="Название" value={c.name} onChange={(v) => upd(i, { name: v })} />
            <ASelect label="Покрытие в калькуляторе" value={c.materialId} onChange={(v) => upd(i, { materialId: v })} options={materials.map((m) => ({ value: m.id, label: m.name }))} />
            <ANumber label="Цена «от», за м²" unit={currency} value={c.startingPrice} onChange={(v) => upd(i, { startingPrice: v })} hint="Пусто — рассчитать автоматически" />
          </div>
          <AText label="Коротко" value={c.short} onChange={(v) => upd(i, { short: v })} />
          <AText label="Описание" multiline rows={4} value={c.description} onChange={(v) => upd(i, { description: v })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <ALines label="Помещения" value={c.rooms} onChange={(v) => upd(i, { rooms: v })} />
            <ALines label="Особенности" value={c.features} onChange={(v) => upd(i, { features: v })} />
            <ALines label="Освещение" value={c.lighting} onChange={(v) => upd(i, { lighting: v })} />
          </div>
          <AImage label="Фото" value={c.image} onChange={(v) => upd(i, { image: v })} aspect="aspect-[4/5]" />
          <AText label="Описание фото" value={c.imageAlt} onChange={(v) => upd(i, { imageAlt: v })} />
          <AGallery label="Дополнительные фото" value={c.gallery} onChange={(v) => upd(i, { gallery: v })} />
        </ItemShell>
      ))}
    </Card>
  );
}

/* ───────────────────────── Company ───────────────────────── */

export function CompanyEditor({ d, set }: { d: CompanyConfig; set: (fn: (d: CompanyConfig) => CompanyConfig) => void }) {
  const upd = (patch: Partial<CompanyConfig>) => set((x) => ({ ...x, ...patch }));
  const waOk = whatsappNumber(d.whatsapp);
  return (
    <>
      <Card title="Бренд">
        <div className="grid gap-4 sm:grid-cols-2">
          <AText label="Название компании" value={d.brandName} onChange={(v) => upd({ brandName: v })} />
          <AText label="Текст логотипа" value={d.logoText} onChange={(v) => upd({ logoText: v })} />
        </div>
        <AText label="Слоган" value={d.tagline} onChange={(v) => upd({ tagline: v })} />
        <AImage label="Логотип-картинка (необязательно)" value={d.logoImage} onChange={(v) => upd({ logoImage: v })} aspect="aspect-[3/1]" hint="Если не загружен, используется текстовый логотип." />
      </Card>
      <Card title="Контакты">
        <div className="grid gap-4 sm:grid-cols-2">
          <AText label="Телефон" value={d.phone} onChange={(v) => upd({ phone: v })} placeholder="+7 700 123 45 67" />
          <AText
            label="WhatsApp — только цифры"
            value={d.whatsapp}
            onChange={(v) => upd({ whatsapp: v.replace(/\D/g, '') })}
            placeholder="77001234567"
            hint={waOk ? <span className="text-success">Кнопки WhatsApp на сайте включены</span> : <span className="text-danger">Номер не указан — кнопки WhatsApp на сайте отключены</span>}
          />
          <AText label="E-mail" value={d.email} onChange={(v) => upd({ email: v })} />
          <AText label="Instagram" value={d.instagram} onChange={(v) => upd({ instagram: v })} placeholder="@lumiere.ceilings" />
          <AText label="Адрес" value={d.address} onChange={(v) => upd({ address: v })} />
          <AText label="Часы работы" value={d.hours} onChange={(v) => upd({ hours: v })} placeholder="Пн–Сб, 9:00–19:00" />
        </div>
        <p className="text-sm text-muted">Пустые поля на сайте не показываются. Данные для поисковиков (LocalBusiness) публикуются, только когда указаны телефон и адрес.</p>
      </Card>
      <Card title="Зоны обслуживания" actions={<AddBtn onClick={() => upd({ serviceAreas: [...d.serviceAreas, { slug: `zona-${randomId(4).toLowerCase()}`, name: 'Новый район', description: '' }] })} />}>
        <p className="text-sm text-muted">Для каждой зоны создаётся страница /rayony/… Указывайте только реальные районы работы.</p>
        {d.serviceAreas.map((a, i) => (
          <ItemShell key={a.slug + i} title={a.name} subtitle={`/rayony/${a.slug}`} onDelete={() => upd({ serviceAreas: d.serviceAreas.filter((_, j) => j !== i) })}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AText label="Название" value={a.name} onChange={(v) => upd({ serviceAreas: d.serviceAreas.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
              <AText label="Адрес страницы" value={a.slug} onChange={(v) => upd({ serviceAreas: d.serviceAreas.map((x, j) => (j === i ? { ...x, slug: slugify(v) } : x)) })} />
            </div>
            <AText label="Текст страницы" multiline rows={4} value={a.description} onChange={(v) => upd({ serviceAreas: d.serviceAreas.map((x, j) => (j === i ? { ...x, description: v } : x)) })} />
          </ItemShell>
        ))}
      </Card>
      <Card title="Юридическая информация и гарантия">
        <div className="grid gap-4 sm:grid-cols-2">
          <AText label="Юридическое название" value={d.legalName} onChange={(v) => upd({ legalName: v })} placeholder="ТОО «…»" />
          <AText label="БИН / ИИН" value={d.legalId} onChange={(v) => upd({ legalId: v })} />
        </div>
        <AText label="Условия гарантии" multiline rows={4} value={d.warranty} onChange={(v) => upd({ warranty: v })} hint="Публикуются на странице «О компании». Указывайте только утверждённые условия." />
      </Card>
      <Card title="Страна и валюта">
        <div className="grid gap-4 sm:grid-cols-3">
          <AText label="Код телефона" value={d.country.dialCode} onChange={(v) => upd({ country: { ...d.country, dialCode: v } })} />
          <ANumber label="Цифр в номере без кода" allowNull={false} value={d.country.nationalDigits} onChange={(v) => upd({ country: { ...d.country, nationalDigits: v ?? 10 } })} />
          <AText label="Пример номера" value={d.country.example} onChange={(v) => upd({ country: { ...d.country, example: v } })} />
          <AText label="Валюта (код)" value={d.currency.code} onChange={(v) => upd({ currency: { ...d.currency, code: v.toUpperCase() } })} />
          <AText label="Символ валюты" value={d.currency.symbol} onChange={(v) => upd({ currency: { ...d.currency, symbol: v } })} />
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── Texts ───────────────────────── */

export function FaqEditor({ d, set }: { d: FaqItem[]; set: (fn: (d: FaqItem[]) => FaqItem[]) => void }) {
  return (
    <Card title="Вопросы и ответы" actions={<AddBtn onClick={() => set((x) => [...x, { id: randomId(6).toLowerCase(), question: 'Новый вопрос', answer: 'Ответ' }])} />}>
      {d.map((q, i) => (
        <ItemShell key={q.id} title={q.question} onUp={i > 0 ? () => set((x) => move(x, i, -1)) : undefined} onDown={i < d.length - 1 ? () => set((x) => move(x, i, 1)) : undefined} onDelete={() => set((x) => x.filter((_, j) => j !== i))}>
          <AText label="Вопрос" value={q.question} onChange={(v) => set((x) => x.map((y, j) => (j === i ? { ...y, question: v } : y)))} />
          <AText label="Ответ" multiline rows={5} value={q.answer} onChange={(v) => set((x) => x.map((y, j) => (j === i ? { ...y, answer: v } : y)))} />
        </ItemShell>
      ))}
    </Card>
  );
}

export function BlocksEditor({ title, items, onChange, hint }: { title: string; items: { title: string; text: string }[]; onChange: (v: { title: string; text: string }[]) => void; hint?: string }) {
  return (
    <Card title={title} actions={<AddBtn onClick={() => onChange([...items, { title: 'Заголовок', text: 'Текст' }])} />}>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {items.map((b, i) => (
        <ItemShell key={i} title={b.title} onUp={i > 0 ? () => onChange(move(items, i, -1)) : undefined} onDown={i < items.length - 1 ? () => onChange(move(items, i, 1)) : undefined} onDelete={() => onChange(items.filter((_, j) => j !== i))}>
          <AText label="Заголовок" value={b.title} onChange={(v) => onChange(items.map((y, j) => (j === i ? { ...y, title: v } : y)))} />
          <AText label="Текст" multiline value={b.text} onChange={(v) => onChange(items.map((y, j) => (j === i ? { ...y, text: v } : y)))} />
        </ItemShell>
      ))}
    </Card>
  );
}

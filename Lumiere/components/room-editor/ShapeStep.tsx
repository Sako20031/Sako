'use client';

import type { Modifier, Room, RoomMetrics, ShapeKind, Wall } from '@/types';
import { randomId } from '@/lib/ids';
import { formatNumber } from '@/lib/format';
import { Checkbox, NumberField, SelectField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PolygonEditor } from './PolygonEditor';
import { RoomPlan } from './RoomPlan';

const SHAPES: { id: ShapeKind; label: string; hint: string; icon: string }[] = [
  { id: 'rect', label: 'Прямоугольная', hint: 'Длина × ширина', icon: 'M4 6h16v12H4z' },
  { id: 'lshape', label: 'Г-образная', hint: 'Габариты и вырез или две секции', icon: 'M4 4h9v7h7v9H4z' },
  { id: 'protrusions', label: 'С выступами', hint: 'Короба, колонны у стен', icon: 'M4 5h16v14H4zM9 5v4h4V5' },
  { id: 'niches', label: 'С нишами', hint: 'Ниши, эркеры', icon: 'M4 7h5V4h5v3h6v12H4z' },
  { id: 'custom', label: 'Другая форма', hint: 'Нарисовать контур или указать площадь', icon: 'M5 6l8-2 6 6-3 9-11-2z' },
];

const WALLS: { id: Wall; label: string }[] = [
  { id: 'top', label: 'Верхняя стена (по длине)' },
  { id: 'bottom', label: 'Нижняя стена (по длине)' },
  { id: 'left', label: 'Левая стена (по ширине)' },
  { id: 'right', label: 'Правая стена (по ширине)' },
];

export function ShapeStep({ room, metrics, onChange }: { room: Room; metrics: RoomMetrics; onChange: (fn: (r: Room) => Room) => void }) {
  const s = room.shape;
  const setShape = (patch: Partial<Room['shape']>) => onChange((r) => ({ ...r, shape: { ...r.shape, ...patch } }));

  return (
    <div className="space-y-10">
      <fieldset>
        <legend className="field-label mb-3">Форма помещения</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              aria-pressed={s.kind === sh.id}
              className="tile p-4"
              onClick={() =>
                setShape({
                  kind: sh.id,
                  // Start the room editors with the same base size, if known.
                  modifiers:
                    (sh.id === 'niches' || sh.id === 'protrusions') && s.modifiers.length === 0
                      ? [newModifier(sh.id === 'niches' ? 'niche' : 'protrusion')]
                      : s.modifiers,
                })
              }
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink" fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden="true">
                <path d={sh.icon} strokeLinejoin="round" />
              </svg>
              <span className="mt-3 block font-semibold leading-tight">{sh.label}</span>
              <span className="mt-1 block text-xs leading-snug text-muted">{sh.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {(s.kind === 'rect' || s.kind === 'niches' || s.kind === 'protrusions') && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Длина помещения" unit="м" value={s.rect.length} onChange={(v) => setShape({ rect: { ...s.rect, length: v } })} placeholder="5" />
              <NumberField label="Ширина помещения" unit="м" value={s.rect.width} onChange={(v) => setShape({ rect: { ...s.rect, width: v } })} placeholder="4" />
            </div>
          )}

          {s.kind === 'lshape' && <LShapeForm room={room} setShape={setShape} />}
          {(s.kind === 'niches' || s.kind === 'protrusions') && <ModifiersForm room={room} setShape={setShape} />}

          {s.kind === 'custom' && (
            <div className="space-y-5">
              <div className="flex gap-2" role="group" aria-label="Способ ввода">
                <button type="button" aria-pressed={s.custom.mode === 'draw'} className="chip" onClick={() => setShape({ custom: { ...s.custom, mode: 'draw' } })}>
                  Нарисовать контур
                </button>
                <button type="button" aria-pressed={s.custom.mode === 'manual'} className="chip" onClick={() => setShape({ custom: { ...s.custom, mode: 'manual' } })}>
                  Без рисования
                </button>
              </div>
              {s.custom.mode === 'manual' && (
                <div className="space-y-4 rounded-[4px] border border-line bg-paper p-5">
                  <p className="text-sm text-muted">Если площадь уже известна (например, из плана квартиры), укажите её. Если нет — оставьте поля пустыми: специалист снимет размеры на замере.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Площадь" unit="м²" optional value={s.custom.manualArea} onChange={(v) => setShape({ custom: { ...s.custom, manualArea: v } })} />
                    <NumberField label="Периметр" unit="м" optional value={s.custom.manualPerimeter} onChange={(v) => setShape({ custom: { ...s.custom, manualPerimeter: v } })} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Высота помещения" unit="м" optional value={room.height} onChange={(v) => onChange((r) => ({ ...r, height: v }))} placeholder="2,7" />
          </div>
          <div className="space-y-3">
            <Checkbox checked={room.approximate} onChange={(v) => onChange((r) => ({ ...r, approximate: v }))}>
              Размеры примерные
            </Checkbox>
            <Checkbox checked={room.sloped} onChange={(v) => onChange((r) => ({ ...r, sloped: v }))}>
              Есть наклонные или необычные поверхности (мансарда, скосы, арки)
            </Checkbox>
          </div>

          {metrics.errors.length > 0 && (
            <ul className="space-y-1 rounded-[4px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
              {metrics.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {s.kind === 'custom' && s.custom.mode === 'draw' ? (
            <PolygonEditor points={s.custom.points} onChange={(points) => setShape({ custom: { ...s.custom, points } })} />
          ) : s.kind === 'custom' ? (
            <div className="grid aspect-[4/3] place-items-center rounded-[4px] border border-dashed border-line-strong bg-paper p-8 text-center text-muted">
              <div>
                <Icon name="ruler" size={32} className="mx-auto text-warm" />
                <p className="mt-3">Контур уточнит замерщик</p>
              </div>
            </div>
          ) : (
            <RoomPlan polygon={metrics.polygon} area={metrics.area} />
          )}
          {!(s.kind === 'custom' && s.custom.mode === 'draw') && (
            <div className="grid grid-cols-3 gap-3 rounded-[4px] bg-stone/60 p-4 text-center">
              <Metric label="Площадь" value={metrics.area !== null ? `${formatNumber(metrics.area)} м²` : '—'} />
              <Metric label="Периметр" value={metrics.perimeter !== null ? `${formatNumber(metrics.perimeter)} м` : '—'} />
              <Metric label="Углы" value={metrics.corners ? `${metrics.corners.internal + metrics.corners.external}` : '—'} />
            </div>
          )}
          <p className="flex gap-2 text-sm text-muted">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            Это геометрический расчёт по введённым размерам, а не замер. Точные размеры специалист снимет на месте.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums" aria-live="polite">
        {value}
      </p>
    </div>
  );
}

function newModifier(kind: Modifier['kind']): Modifier {
  return { id: randomId(6), kind, wall: kind === 'niche' ? 'top' : 'right', width: null, depth: null };
}

function LShapeForm({ room, setShape }: { room: Room; setShape: (p: Partial<Room['shape']>) => void }) {
  const l = room.shape.lshape;
  const set = (patch: Partial<typeof l>) => setShape({ lshape: { ...l, ...patch } });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={l.method === 'cutout'} className="chip" onClick={() => set({ method: 'cutout' })}>
          Габариты и вырез
        </button>
        <button type="button" aria-pressed={l.method === 'sections'} className="chip" onClick={() => set({ method: 'sections' })}>
          Разделить на две части
        </button>
      </div>
      {l.method === 'cutout' ? (
        <>
          <p className="text-sm text-muted">Укажите общие габариты комнаты и размер «отсутствующего» угла.</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Общая длина" unit="м" value={l.length} onChange={(v) => set({ length: v })} />
            <NumberField label="Общая ширина" unit="м" value={l.width} onChange={(v) => set({ width: v })} />
            <NumberField label="Длина выреза" unit="м" value={l.cutLength} onChange={(v) => set({ cutLength: v })} />
            <NumberField label="Ширина выреза" unit="м" value={l.cutWidth} onChange={(v) => set({ cutWidth: v })} />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Разделите комнату на два прямоугольника. Часть B измеряйте <strong className="font-semibold text-ink">только за пределами части A</strong> — так площадь не посчитается дважды.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Часть A — длина" unit="м" value={l.a.length} onChange={(v) => set({ a: { ...l.a, length: v } })} />
            <NumberField label="Часть A — ширина" unit="м" value={l.a.width} onChange={(v) => set({ a: { ...l.a, width: v } })} />
            <NumberField label="Часть B — длина вдоль A" unit="м" value={l.b.length} onChange={(v) => set({ b: { ...l.b, length: v } })} />
            <NumberField label="Часть B — глубина" unit="м" value={l.b.width} onChange={(v) => set({ b: { ...l.b, width: v } })} />
          </div>
        </>
      )}
    </div>
  );
}

function ModifiersForm({ room, setShape }: { room: Room; setShape: (p: Partial<Room['shape']>) => void }) {
  const mods = room.shape.modifiers;
  const update = (id: string, patch: Partial<Modifier>) => setShape({ modifiers: mods.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Ниша добавляет площадь потолка, выступ (короб, колонна у стены) — уменьшает. Глубина — насколько элемент уходит в стену или выступает в комнату.</p>
      {mods.map((m, i) => (
        <div key={m.id} className="rounded-[4px] border border-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button type="button" aria-pressed={m.kind === 'niche'} className="chip !min-h-9 !px-3" onClick={() => update(m.id, { kind: 'niche' })}>
                Ниша
              </button>
              <button type="button" aria-pressed={m.kind === 'protrusion'} className="chip !min-h-9 !px-3" onClick={() => update(m.id, { kind: 'protrusion' })}>
                Выступ
              </button>
            </div>
            <button type="button" className="grid h-10 w-10 place-items-center text-muted hover:text-danger" aria-label={`Удалить элемент ${i + 1}`} onClick={() => setShape({ modifiers: mods.filter((x) => x.id !== m.id) })}>
              <Icon name="trash" size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Стена" className="col-span-2" value={m.wall} onChange={(e) => update(m.id, { wall: e.target.value as Wall })}>
              {WALLS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </SelectField>
            <NumberField label="Ширина" unit="м" value={m.width} onChange={(v) => update(m.id, { width: v })} />
            <NumberField label="Глубина" unit="м" value={m.depth} onChange={(v) => update(m.id, { depth: v })} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShape({ modifiers: [...mods, newModifier('niche')] })} disabled={mods.length >= 20}>
          <Icon name="plus" size={16} /> Ниша
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShape({ modifiers: [...mods, newModifier('protrusion')] })} disabled={mods.length >= 20}>
          <Icon name="plus" size={16} /> Выступ
        </button>
      </div>
    </div>
  );
}

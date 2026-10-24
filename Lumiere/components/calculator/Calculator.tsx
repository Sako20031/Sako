'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogItem, CompanyConfig, PricingConfig, Room } from '@/types';
import { estimateProject } from '@/lib/pricing';
import { projectSummaryText } from '@/lib/summary';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { ShapeStep } from '@/components/room-editor/ShapeStep';
import { PriceSummaryBar, PriceSummaryPanel, SampleBadge } from '@/components/price-summary/PriceSummary';
import { LeadForm } from '@/components/lead-form/LeadForm';
import { ProjectProvider, useProject, type DesignPreset } from './ProjectProvider';
import { ProjectNotes, RoomReviewCard, StepDesign, StepIntro, StepLighting, StepMaterial, StepRooms, StepTechnical } from './steps';

const STEPS = [
  { id: 'rooms', label: 'Помещения' },
  { id: 'shape', label: 'Форма и размеры' },
  { id: 'technical', label: 'Технические детали' },
  { id: 'material', label: 'Покрытие' },
  { id: 'lighting', label: 'Освещение' },
  { id: 'design', label: 'Дизайн' },
  { id: 'review', label: 'Итог' },
] as const;
type StepId = (typeof STEPS)[number]['id'];
const ROOM_STEPS: StepId[] = ['shape', 'technical', 'material', 'lighting', 'design'];

interface Props {
  pricing: PricingConfig;
  company: CompanyConfig;
  catalog: CatalogItem[];
}

export function Calculator(props: Props) {
  const params = useSearchParams();
  // Resolve ?design=&color=&light= from the catalog once, on first render.
  const [design] = useState<DesignPreset | null>(() => resolveDesign(params, props.catalog, props.pricing));
  // Applied once: drop ?design= from the address so a reload keeps the customer's later choices.
  useEffect(() => {
    if (design) window.history.replaceState(null, '', window.location.pathname);
  }, [design]);
  return (
    <ProjectProvider design={design}>
      <CalculatorInner {...props} hasDesign={design !== null} />
    </ProjectProvider>
  );
}

function resolveDesign(params: { get(name: string): string | null }, catalog: CatalogItem[], pricing: PricingConfig): DesignPreset | null {
  const slug = params.get('design');
  const item = slug ? catalog.find((c) => c.slug === slug && c.enabled) : null;
  if (!item) return null;
  const lighting: Record<string, number> = {};
  for (const id of (params.get('light') || '').split(',').filter(Boolean)) {
    const opt = pricing.lighting.find((l) => l.id === id && l.enabled);
    if (opt) lighting[id] = opt.unit === 'perimeter' ? 1 : opt.defaultQty || 1;
  }
  const color = params.get('color');
  const colorId = color && pricing.colors.some((c) => c.id === color) ? color : null;
  return { catalogId: item.id, name: item.name, materialId: item.materialId, colorId, lighting };
}

function CalculatorInner({ pricing, company, hasDesign }: Props & { hasDesign: boolean }) {
  const { project, activeRoom, updateRoom, setActive, reset, initialNotice } = useProject();
  // Returning visitors land on their summary; a design from the catalog opens its room's material.
  const [step, setStep] = useState<StepId>(() => (hasDesign && activeRoom ? 'material' : project.rooms.length && !hasDesign ? 'review' : 'rooms'));
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [blocker, setBlocker] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const estimate = useMemo(() => estimateProject(project.rooms, pricing), [project.rooms, pricing]);
  const activeEstimate = estimate.rooms.find((r) => r.roomId === activeRoom?.id);

  const go = (id: StepId) => {
    setBlocker(null);
    setNotice(null);
    setStep(id);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const idx = STEPS.findIndex((s) => s.id === step);
  const next = () => {
    if (step === 'rooms' && project.rooms.length === 0) return setBlocker('Добавьте хотя бы одно помещение.');
    if (step === 'shape' && activeEstimate && !activeEstimate.metrics.valid && !(activeRoom?.shape.kind === 'custom' && activeRoom.shape.custom.mode === 'manual')) {
      return setBlocker('Проверьте размеры. Если точных размеров нет — выберите «Другая форма → Без рисования», и специалист уточнит их на замере.');
    }
    if (step === 'design') {
      // After the last room step: go to the next room or to the summary.
      const i = project.rooms.findIndex((r) => r.id === activeRoom?.id);
      const nextRoom = project.rooms[i + 1];
      if (nextRoom && !estimate.rooms[i + 1]?.metrics.valid) {
        setActive(nextRoom.id);
        go('shape');
        return setNotice(`Теперь — «${nextRoom.name}».`);
      }
    }
    if (idx < STEPS.length - 1) go(STEPS[idx + 1].id);
  };
  const back = () => idx > 0 && go(STEPS[idx - 1].id);
  const editRoom = (id: string) => {
    setActive(id);
    go('shape');
  };
  const change = (fn: (r: Room) => Room) => activeRoom && updateRoom(activeRoom.id, fn);

  const download = () => {
    const text = projectSummaryText(project, estimate, pricing, company);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const needsRoom = ROOM_STEPS.includes(step) && !activeRoom;
  const nextLabel = step === 'design' ? 'К итогу' : step === 'review' ? null : 'Далее';

  return (
    <div className="pb-32 pt-24 lg:pb-24 lg:pt-28">
      <div ref={topRef} className="scroll-mt-20" />
      <div className="container-x">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Конфигуратор потолка</p>
            <h1 className="mt-3 text-h2">Создайте свой потолок</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            {estimate.mode === 'sample' && estimate.available && <SampleBadge />}
            <span>Проект {project.id}</span>
          </div>
        </div>

        {/* Stepper */}
        <nav aria-label="Шаги конфигуратора" className="no-print scroll-x -mx-4 mt-8 border-b border-line px-4 sm:mx-0 sm:px-0">
          <ol className="flex min-w-max gap-1">
            {STEPS.map((s, i) => {
              const current = s.id === step;
              const done = i < idx;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => (s.id === 'rooms' || project.rooms.length ? go(s.id) : setBlocker('Сначала добавьте помещение.'))}
                    aria-current={current ? 'step' : undefined}
                    className={`relative flex items-center gap-2 px-3 py-3.5 text-sm transition-colors ${current ? 'font-semibold text-ink' : done ? 'text-ink-soft' : 'text-muted'} after:absolute after:inset-x-3 after:bottom-[-1px] after:h-0.5 after:bg-ink after:transition-transform ${current ? 'after:scale-x-100' : 'after:scale-x-0'}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[0.7rem] tabular-nums ${current ? 'bg-ink text-white' : done ? 'bg-champagne text-ink' : 'border border-line-strong'}`}>
                      {done ? <Icon name="check" size={12} /> : i + 1}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Room tabs for room-specific steps */}
        {ROOM_STEPS.includes(step) && project.rooms.length > 0 && (
          <div className="no-print scroll-x -mx-4 mt-5 px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-2" role="tablist" aria-label="Помещения">
              {project.rooms.map((r) => (
                <button key={r.id} type="button" role="tab" aria-selected={r.id === activeRoom?.id} aria-current={r.id === activeRoom?.id ? 'true' : undefined} className="chip" onClick={() => setActive(r.id)}>
                  {r.name}
                </button>
              ))}
              <button type="button" className="chip border-dashed text-muted" onClick={() => go('rooms')}>
                <Icon name="plus" size={14} /> Помещение
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div className="no-print mt-5 flex items-start justify-between gap-3 rounded-[4px] border border-champagne/50 bg-champagne-soft/40 px-4 py-3 text-sm" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Скрыть" className="-m-1 p-1">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-14">
          <div key={`${step}-${activeRoom?.id ?? ''}`} className="animate-step min-w-0">
            {needsRoom ? (
              <div className="rounded-[6px] border border-dashed border-line-strong p-8 text-center">
                <p>Сначала добавьте помещение.</p>
                <button type="button" className="btn btn-primary mt-4" onClick={() => go('rooms')}>
                  Добавить помещение
                </button>
              </div>
            ) : step === 'rooms' ? (
              <StepRooms estimates={estimate.rooms} onEdit={editRoom} />
            ) : step === 'shape' && activeRoom && activeEstimate ? (
              <>
                <StepIntro title={`Форма и размеры — ${activeRoom.name}`} text="Укажите размеры в метрах. Для сложных комнат выберите подходящую форму или нарисуйте контур — площадь и периметр пересчитаются сразу." />
                <ShapeStep room={activeRoom} metrics={activeEstimate.metrics} onChange={change} />
              </>
            ) : step === 'technical' && activeRoom && activeEstimate ? (
              <StepTechnical room={activeRoom} estimate={activeEstimate} pricing={pricing} company={company} onChange={change} />
            ) : step === 'material' && activeRoom ? (
              <StepMaterial room={activeRoom} pricing={pricing} company={company} onChange={change} />
            ) : step === 'lighting' && activeRoom && activeEstimate ? (
              <StepLighting room={activeRoom} estimate={activeEstimate} pricing={pricing} company={company} onChange={change} />
            ) : step === 'design' && activeRoom ? (
              <StepDesign room={activeRoom} pricing={pricing} company={company} onChange={change} />
            ) : step === 'review' ? (
              <div className="space-y-8">
                <div className="print-only mb-6">
                  <p className="font-display text-3xl">{company.brandName}</p>
                  <p>
                    Проект {project.id} · {formatDate(project.updatedAt)}
                  </p>
                </div>
                <StepIntro title="Ваш проект" text="Проверьте помещения и расчёт. Проект сохранён в этом браузере — можно вернуться и изменить его в любой момент." />
                {project.rooms.length === 0 ? (
                  <button type="button" className="btn btn-primary" onClick={() => go('rooms')}>
                    Добавить помещение
                  </button>
                ) : (
                  project.rooms.map((r, i) => (
                    <RoomReviewCard key={r.id} room={r} estimate={estimate.rooms[i]} pricing={pricing} company={company} available={estimate.available} onEdit={() => editRoom(r.id)} />
                  ))
                )}
                <div className="no-print">
                  <ProjectNotes />
                </div>
                <div className="no-print flex flex-wrap gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
                    <Icon name="print" size={16} /> Распечатать / PDF
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={download}>
                    <Icon name="download" size={16} /> Скачать описание
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (window.confirm('Начать новый проект? Текущий будет удалён из этого браузера.')) {
                        reset();
                        go('rooms');
                      }
                    }}
                  >
                    <Icon name="undo" size={16} /> Новый проект
                  </button>
                </div>
                <div className="lg:hidden">
                  <PriceSummaryPanel est={estimate} company={company} discountLabel={pricing.discount.label} />
                </div>

                <section id="request" className="no-print scroll-mt-24 rounded-[6px] bg-ink p-6 text-ivory sm:p-10">
                  <p className="eyebrow !text-champagne">Заявка</p>
                  <h2 className="mt-3 text-h2 text-white">Ваш проект почти готов.</h2>
                  <p className="mt-3 max-w-xl text-white/70">Оставьте контакты — специалист уточнит детали и поможет подготовить точный расчёт.</p>
                  <div className="mt-8 rounded-[6px] bg-ivory p-5 text-ink sm:p-8">
                    <LeadForm project={project} estimate={estimate} pricing={pricing} company={company} />
                  </div>
                </section>
              </div>
            ) : null}

            {blocker && (
              <p className="no-print mt-6 flex gap-2 rounded-[4px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
                <Icon name="warn" size={18} className="mt-0.5 shrink-0" />
                {blocker}
              </p>
            )}

            {/* Desktop step navigation */}
            <div className="no-print mt-12 hidden items-center justify-between border-t border-line pt-6 lg:flex">
              <button type="button" className="btn btn-outline" onClick={back} disabled={idx === 0}>
                <Icon name="arrowLeft" size={18} /> Назад
              </button>
              {nextLabel && (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {nextLabel} <Icon name="arrow" size={18} />
                </button>
              )}
            </div>
            {/* Mobile back link (next lives in the sticky bar) */}
            {idx > 0 && (
              <button type="button" className="no-print mt-10 inline-flex items-center gap-2 text-sm text-muted lg:hidden" onClick={back}>
                <Icon name="arrowLeft" size={16} /> Назад: {STEPS[idx - 1].label}
              </button>
            )}
          </div>

          <aside className="no-print hidden lg:block">
            <div className="sticky top-28">
              <PriceSummaryPanel est={estimate} company={company} discountLabel={pricing.discount.label} />
              {step !== 'review' && project.rooms.length > 0 && (
                <button type="button" className="btn btn-outline mt-4 w-full" onClick={() => go('review')}>
                  Итог и отправка проекта
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <PriceSummaryBar
        est={estimate}
        company={company}
        discountLabel={pricing.discount.label}
        action={
          nextLabel ? (
            <button type="button" className="btn btn-primary shrink-0" onClick={next}>
              {nextLabel} <Icon name="arrow" size={18} />
            </button>
          ) : (
            <a href="#request" className="btn btn-primary shrink-0">
              Отправить
            </a>
          )
        }
      />
    </div>
  );
}

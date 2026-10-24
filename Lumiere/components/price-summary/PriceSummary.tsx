'use client';

import { useState } from 'react';
import type { CompanyConfig, ProjectEstimate } from '@/types';
import { CATEGORY_LABELS, CATEGORY_ORDER, DISCLAIMER } from '@/lib/pricing';
import { formatArea, formatLength, formatMoney } from '@/lib/format';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

export function SampleBadge() {
  return (
    <span className="badge-sample" title="Цены приведены для демонстрации и не являются предложением компании">
      <Icon name="info" size={12} /> Пример цен
    </span>
  );
}

/** Full breakdown: categories, rooms, adjustments, notes. */
export function Breakdown({ est, company, discountLabel }: { est: ProjectEstimate; company: CompanyConfig; discountLabel: string }) {
  const money = (n: number) => formatMoney(n, company.currency);
  const pending = est.rooms.flatMap((r) => r.lines.filter((l) => l.kind === 'pending').map((l) => `${r.roomName}: ${l.label}`));
  const inspection = [...new Set(est.rooms.flatMap((r) => r.inspection))];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[4px] bg-stone/60 p-3">
          <dt className="text-muted">Площадь</dt>
          <dd className="mt-0.5 font-display text-xl tabular-nums">{formatArea(est.totalArea)}</dd>
        </div>
        <div className="rounded-[4px] bg-stone/60 p-3">
          <dt className="text-muted">Периметр</dt>
          <dd className="mt-0.5 font-display text-xl tabular-nums">{formatLength(est.totalPerimeter)}</dd>
        </div>
      </dl>

      {!est.available ? (
        <p className="rounded-[4px] border border-line bg-paper p-4 text-[0.9375rem]">{est.message}</p>
      ) : (
        <>
          <ol className="divide-y divide-line border-y border-line text-[0.9375rem]">
            {CATEGORY_ORDER.map((cat, i) => (
              <li key={cat} className="flex items-baseline justify-between gap-4 py-2.5">
                <span>
                  <span className="mr-2 text-xs tabular-nums text-warm">{i + 1}.</span>
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="tabular-nums">{est.categoryTotals[cat] ? money(est.categoryTotals[cat]) : '—'}</span>
              </li>
            ))}
            {est.minimumAdjustment > 0 && (
              <li className="flex items-baseline justify-between gap-4 py-2.5 text-muted">
                <span>До минимального заказа</span>
                <span className="tabular-nums">{money(est.minimumAdjustment)}</span>
              </li>
            )}
            {est.discount > 0 && (
              <li className="flex items-baseline justify-between gap-4 py-2.5 text-success">
                <span>{discountLabel}</span>
                <span className="tabular-nums">−{money(est.discount)}</span>
              </li>
            )}
          </ol>

          {est.rooms.length > 1 && (
            <div>
              <p className="eyebrow">По комнатам</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {est.rooms.map((r) => (
                  <li key={r.roomId} className="flex justify-between gap-3">
                    <span className="truncate">{r.roomName}</span>
                    <span className="tabular-nums text-muted">{r.subtotal ? money(r.subtotal) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {est.available && pending.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold">Уточнит специалист</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            {pending.slice(0, 8).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {pending.length > 8 && <li>и ещё {pending.length - 8}</li>}
          </ul>
        </div>
      )}
      {inspection.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold">Потребуется консультация или замер</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            {inspection.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
      {est.available && (
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">Оценка</span> — зависит от площади и периметра; <span className="font-semibold text-ink">по прайсу</span> — цена за единицу × указанное количество.
        </p>
      )}
    </div>
  );
}

function Total({ est, company, size = 'lg' }: { est: ProjectEstimate; company: CompanyConfig; size?: 'lg' | 'sm' }) {
  if (!est.available) return <span className={size === 'lg' ? 'text-base text-muted' : 'text-sm text-muted'}>Цены настраиваются</span>;
  if (est.total <= 0) return <span className={size === 'lg' ? 'font-display text-4xl text-warm' : 'font-display text-2xl text-warm'}>—</span>;
  return (
    <span className={size === 'lg' ? 'font-display text-[2.6rem] leading-none' : 'font-display text-[1.6rem] leading-none'}>
      <AnimatedNumber value={est.total} format={(n) => formatMoney(n, company.currency)} />
    </span>
  );
}

/** Desktop side panel. */
export function PriceSummaryPanel({ est, company, discountLabel }: { est: ProjectEstimate; company: CompanyConfig; discountLabel: string }) {
  return (
    <section aria-label="Предварительный расчёт" className="rounded-[6px] border border-line bg-paper p-6 xl:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl">Предварительный расчёт</h2>
        {est.mode === 'sample' && est.available && <SampleBadge />}
      </div>
      <div className="mt-5 border-b border-line pb-5" aria-live="polite">
        <p className="text-sm text-muted">Предварительная итоговая сумма</p>
        <p className="mt-2">
          <Total est={est} company={company} />
        </p>
        {est.available && est.incomplete && est.total > 0 && <p className="mt-2 text-sm text-muted">+ позиции, которые уточнит специалист</p>}
      </div>
      <div className="mt-5">
        <Breakdown est={est} company={company} discountLabel={discountLabel} />
      </div>
    </section>
  );
}

/** Mobile: compact sticky bar that opens a detailed bottom sheet. */
export function PriceSummaryBar({ est, company, discountLabel, action }: { est: ProjectEstimate; company: CompanyConfig; discountLabel: string; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/97 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(36_35_33/0.08)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" className="flex min-w-0 flex-1 flex-col items-start text-left" onClick={() => setOpen(true)} aria-haspopup="dialog">
            <span className="flex items-center gap-2 text-xs text-muted">
              Предварительно {est.mode === 'sample' && est.available && <span className="badge-sample !py-0 !text-[0.6rem]">пример</span>}
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <Total est={est} company={company} size="sm" />
              <Icon name="chevronDown" size={18} className="rotate-180 text-muted" />
            </span>
          </button>
          {action}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Предварительный расчёт" sheet>
        <div className="space-y-5 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
          <div className="flex items-end justify-between gap-3">
            <Total est={est} company={company} />
            {est.mode === 'sample' && est.available && <SampleBadge />}
          </div>
          <Breakdown est={est} company={company} discountLabel={discountLabel} />
        </div>
      </Modal>
    </>
  );
}

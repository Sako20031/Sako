'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColorOption, LightingOption } from '@/types';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Reveal } from '@/components/ui/Reveal';
import { DesignDetail } from './DesignDetail';
import type { CatalogEntry } from '@/types';

export function CatalogGallery({
  items,
  categories,
  colors,
  lighting,
  sample,
  filters = true,
  limit,
}: {
  items: CatalogEntry[];
  categories: Record<string, string>;
  colors: ColorOption[];
  lighting: LightingOption[];
  sample: boolean;
  filters?: boolean;
  limit?: number;
}) {
  const [cat, setCat] = useState<string>('all');
  const [room, setRoom] = useState<string>('all');
  const [open, setOpen] = useState<CatalogEntry | null>(null);

  const usedCats = useMemo(() => Object.keys(categories).filter((c) => items.some((i) => i.category === c)), [categories, items]);
  const rooms = useMemo(() => [...new Set(items.flatMap((i) => i.rooms))].slice(0, 10), [items]);
  const shown = items.filter((i) => (cat === 'all' || i.category === cat) && (room === 'all' || i.rooms.includes(room))).slice(0, limit);

  return (
    <div>
      {filters && (
        <div className="mb-10 space-y-3">
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-2" role="group" aria-label="Категория">
              <button type="button" className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
                Все решения
              </button>
              {usedCats.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {categories[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-2" role="group" aria-label="Помещение">
              <span className="mr-1 text-sm text-muted">Помещение:</span>
              {['all', ...rooms].map((r) => (
                <button key={r} type="button" className="chip !min-h-9 !px-3 !text-[0.8125rem]" aria-pressed={room === r} onClick={() => setRoom(r)}>
                  {r === 'all' ? 'Любое' : r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted">Под выбранные фильтры решений нет — попробуйте другое сочетание.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item, i) => (
            <Reveal as="li" key={item.id} delay={(i % 3) * 90} className={i % 3 === 1 ? 'xl:translate-y-12' : ''}>
              <article className="group">
                <button type="button" className="relative block aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-stone text-left" onClick={() => setOpen(item)} aria-label={`Подробнее: ${item.name}`}>
                  <Photo src={item.image} alt={item.imageAlt || item.name} fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 92vw" className="img-zoom object-cover" />
                  <span className="absolute left-4 top-4 rounded-[2px] bg-ivory/90 px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">{categories[item.category] ?? ''}</span>
                </button>
                <div className="pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-[1.75rem] leading-tight">{item.name}</h3>
                  </div>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{item.short}</p>
                  <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted">Помещения:</dt>
                      <dd>{item.rooms.slice(0, 3).join(', ')}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted">Особенности:</dt>
                      <dd>{item.features.join(' · ')}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted">Свет:</dt>
                      <dd>{item.lighting.join(', ')}</dd>
                    </div>
                  </dl>
                  {item.fromPrice && (
                    <p className="mt-4 flex items-center gap-2 font-semibold">
                      {item.fromPrice}
                      {sample && <span className="badge-sample">пример</span>}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(item)}>
                      Посмотреть детали
                    </button>
                    <Link href={`/calculator?design=${item.slug}`} className="btn btn-primary btn-sm">
                      Выбрать этот вариант <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      )}

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? ''} wide>
        {open && <DesignDetail item={open} colors={colors} lighting={lighting} sample={sample} />}
      </Modal>
    </div>
  );
}

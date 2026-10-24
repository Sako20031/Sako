'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PortfolioItem } from '@/types';
import { roomTypeLabel } from '@/lib/rooms';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';

export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const [room, setRoom] = useState('all');
  const [style, setStyle] = useState('all');
  const rooms = useMemo(() => [...new Set(items.map((i) => i.roomType))], [items]);
  const styles = useMemo(() => [...new Set(items.map((i) => i.style).filter(Boolean))], [items]);
  const shown = items.filter((i) => (room === 'all' || i.roomType === room) && (style === 'all' || i.style === style));

  return (
    <div>
      <div className="mb-10 space-y-3">
        <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-2" role="group" aria-label="Тип помещения">
            <span className="mr-1 text-sm text-muted">Помещение:</span>
            {['all', ...rooms].map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={room === r} onClick={() => setRoom(r)}>
                {r === 'all' ? 'Все' : roomTypeLabel(r as PortfolioItem['roomType'])}
              </button>
            ))}
          </div>
        </div>
        {styles.length > 1 && (
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-2" role="group" aria-label="Стиль">
              <span className="mr-1 text-sm text-muted">Стиль:</span>
              {['all', ...styles].map((s) => (
                <button key={s} type="button" className="chip !min-h-9 !px-3 !text-[0.8125rem]" aria-pressed={style === s} onClick={() => setStyle(s)}>
                  {s === 'all' ? 'Любой' : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted">Нет работ с такими параметрами.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 3) * 80}>
              <Link href={`/portfolio/${p.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-stone">
                  <Photo src={p.cover} alt={p.coverAlt || p.title} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw" className="img-zoom object-cover" />
                  <span className={`absolute left-4 top-4 rounded-[2px] px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${p.kind === 'project' ? 'bg-ink text-white' : 'bg-ivory/90'}`}>
                    {p.kind === 'project' ? 'Выполненный проект' : 'Концепт-дизайн'}
                  </span>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">
                  {roomTypeLabel(p.roomType)}
                  {p.style && ` · ${p.style}`}
                </p>
                <h2 className="mt-2 text-[1.6rem] leading-tight">{p.title}</h2>
                <p className="mt-2 text-sm text-muted">{p.ceiling}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}

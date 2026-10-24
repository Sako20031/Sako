'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ColorOption, LightingOption } from '@/types';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';
import type { CatalogEntry } from '@/types';

/** Detailed design view: large photo, description and a quick configuration to add to the project. */
export function DesignDetail({ item, colors, lighting, sample, full = false }: { item: CatalogEntry; colors: ColorOption[]; lighting: LightingOption[]; sample: boolean; full?: boolean }) {
  const [color, setColor] = useState<string>(colors[0]?.id ?? '');
  const [lights, setLights] = useState<string[]>(() => suggestLighting(item, lighting));
  const href = `/calculator?design=${item.slug}${color ? `&color=${color}` : ''}${lights.length ? `&light=${lights.join(',')}` : ''}`;
  const gallery = [item.image, ...item.gallery].filter(Boolean);

  return (
    <div className={full ? 'grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16' : 'grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'}>
      <div className={full ? 'space-y-3' : ''}>
        <div className={`relative overflow-hidden bg-stone ${full ? 'aspect-[4/5] rounded-[6px] sm:aspect-[5/4] lg:aspect-[4/5]' : 'aspect-[4/3] md:aspect-auto md:h-full md:min-h-[32rem]'}`}>
          <Photo src={item.image} alt={item.imageAlt || item.name} fill priority={full} sizes={full ? '(min-width: 1024px) 55vw, 100vw' : '(min-width: 768px) 50vw, 100vw'} className="object-cover" />
          <span className="absolute bottom-3 left-3 rounded-[2px] bg-ink/70 px-2 py-1 text-[0.6875rem] text-white">Иллюстрация решения</span>
        </div>
        {full && gallery.length > 1 && (
          <div className="grid grid-cols-3 gap-3">
            {gallery.slice(1, 4).map((g, i) => (
              <div key={g + i} className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-stone">
                <Photo src={g} alt={`${item.name} — пример ${i + 2}`} fill sizes="20vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={full ? '' : 'p-5 sm:p-8'}>
        {full && <h1 className="text-h1">{item.name}</h1>}
        {item.fromPrice && (
          <p className={`${full ? 'mt-3' : ''} flex flex-wrap items-center gap-2 text-[0.9375rem]`}>
            <span>{item.fromPrice}</span>
            {sample && <span className="badge-sample">пример цен</span>}
          </p>
        )}
        <p className={`${full || item.fromPrice ? 'mt-5' : ''} text-[1.0625rem] leading-relaxed text-ink-soft`}>{item.description}</p>
        <dl className="mt-8 space-y-5 text-[0.9375rem]">
          <Row title="Подходит для" items={item.rooms} />
          <Row title="Характеристики" items={item.features} />
          <Row title="Варианты освещения" items={item.lighting} />
        </dl>

        <div className="mt-8 space-y-5 border-t border-line pt-6">
          {colors.length > 0 && (
            <fieldset>
              <legend className="field-label">Цвет</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c.id} type="button" aria-pressed={color === c.id} title={c.name} className="chip !pl-1.5" onClick={() => setColor(c.id)}>
                    <span className="h-7 w-7 rounded-full border border-line-strong" style={{ background: c.id === 'custom' ? 'conic-gradient(#e9dfcf,#b79a72,#3a3a3a,#cfc9bf,#e9dfcf)' : c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {lighting.length > 0 && (
            <fieldset>
              <legend className="field-label">Освещение</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {lighting.map((l) => {
                  const on = lights.includes(l.id);
                  return (
                    <button key={l.id} type="button" aria-pressed={on} className="chip" onClick={() => setLights((s) => (on ? s.filter((x) => x !== l.id) : [...s, l.id]))}>
                      {on && <Icon name="check" size={14} />}
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={href} className="btn btn-primary sm:flex-1">
            Добавить в мой проект <Icon name="arrow" size={18} />
          </Link>
          {!full && (
            <Link href={`/catalog/${item.slug}`} className="btn btn-outline sm:flex-1">
              Страница решения
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-muted">Фотографии иллюстрируют решение и не являются выполненными объектами компании.</p>
      </div>
    </div>
  );
}

function Row({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <dt className="eyebrow">{title}</dt>
      <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-champagne" /> {i}
          </span>
        ))}
      </dd>
    </div>
  );
}

/** Preselect lighting options whose names appear in the design's lighting list. */
function suggestLighting(item: CatalogEntry, lighting: LightingOption[]): string[] {
  const text = item.lighting.join(' ').toLowerCase();
  return lighting.filter((l) => text.includes(l.name.toLowerCase().split(' ')[0])).map((l) => l.id).slice(0, 2);
}

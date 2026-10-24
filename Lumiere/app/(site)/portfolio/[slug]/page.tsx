import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';
import { roomTypeLabel } from '@/lib/rooms';
import { getContent } from '@/lib/server/content';
import { defaultContent } from '@/config';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return defaultContent.portfolio.map((p) => ({ slug: p.slug }));
}

async function find(slug: string) {
  return (await getContent()).portfolio.find((p) => p.slug === slug && p.published);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await find((await params).slug);
  if (!item) return {};
  return { title: item.title, description: item.description.slice(0, 160), alternates: { canonical: `/portfolio/${item.slug}` }, openGraph: { images: item.cover ? [{ url: item.cover }] : undefined } };
}

export default async function PortfolioItemPage({ params }: Props) {
  const item = await find((await params).slug);
  if (!item) notFound();
  const facts = [
    ['Помещение', roomTypeLabel(item.roomType)],
    ['Стиль', item.style],
    ['Потолок', item.ceiling],
    ['Освещение', item.lighting],
    ['Материалы', item.materials],
    ...(item.kind === 'project' && item.price ? [['Стоимость проекта', item.price]] : []),
    ...(item.kind === 'project' && item.completedAt ? [['Дата', item.completedAt]] : []),
  ].filter(([, v]) => v);
  return (
    <article className="pb-24 pt-28 lg:pt-36">
      <div className="container-x">
        <Link href="/portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <Icon name="arrowLeft" size={16} /> Портфолио
        </Link>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-5">
            <p className="eyebrow">{item.kind === 'project' ? 'Выполненный проект' : 'Концепт-дизайн'}</p>
            <h1 className="mt-4 text-h1">{item.title}</h1>
            <p className="lead mt-6">{item.description}</p>
            <dl className="mt-10 divide-y divide-line border-y border-line text-[0.9375rem]">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {item.kind === 'concept' && <p className="mt-6 text-sm text-muted">Это концепт-дизайн: изображения иллюстрируют решение и не являются фотографиями выполненного объекта.</p>}
            <Link href="/calculator" className="btn btn-primary mt-8">
              Рассчитать похожий потолок <Icon name="arrow" size={18} />
            </Link>
          </header>
          <div className="space-y-4 lg:col-span-7">
            {[item.cover, ...item.gallery].filter(Boolean).map((src, i) => (
              <div key={src + i} className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-stone">
                <Photo src={src} alt={i === 0 ? item.coverAlt || item.title : `${item.title} — фото ${i + 1}`} fill priority={i === 0} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

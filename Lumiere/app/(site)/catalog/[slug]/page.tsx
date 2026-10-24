import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DesignDetail } from '@/components/catalog/DesignDetail';
import { Icon } from '@/components/ui/Icon';
import { catalogEntries } from '@/lib/catalog';
import { getContent } from '@/lib/server/content';
import { defaultContent } from '@/config';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return defaultContent.catalog.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = catalogEntries(await getContent()).find((c) => c.slug === slug);
  if (!item) return {};
  return {
    title: item.name,
    description: item.short,
    alternates: { canonical: `/catalog/${item.slug}` },
    openGraph: { title: item.name, description: item.short, images: item.image ? [{ url: item.image }] : undefined },
  };
}

export default async function DesignPage({ params }: Props) {
  const { slug } = await params;
  const content = await getContent();
  const entries = catalogEntries(content);
  const item = entries.find((c) => c.slug === slug);
  if (!item) notFound();
  const others = entries.filter((e) => e.id !== item.id).slice(0, 3);
  return (
    <div className="pb-24 pt-28 lg:pt-36">
      <div className="container-x">
        <Link href="/catalog" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <Icon name="arrowLeft" size={16} /> Коллекция
        </Link>
        <DesignDetail item={item} colors={content.pricing.colors} lighting={content.pricing.lighting.filter((l) => l.enabled)} sample={content.pricing.mode === 'sample'} full />
        {others.length > 0 && (
          <section className="mt-28 border-t border-line pt-12">
            <h2 className="text-h3">Другие решения</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/catalog/${o.slug}`} className="group block">
                    <p className="font-display text-2xl group-hover:underline">{o.name}</p>
                    <p className="mt-2 text-sm text-muted">{o.short}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

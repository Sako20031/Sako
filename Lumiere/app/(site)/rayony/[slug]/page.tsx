import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/server/content';

// Service-area landing pages exist only for areas the company enters in the
// admin panel — never invented addresses.
type Props = { params: Promise<{ slug: string }> };

async function find(slug: string) {
  const { company } = await getContent();
  return { area: company.serviceAreas.find((a) => a.slug === slug), company };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area, company } = await find((await params).slug);
  if (!area) return {};
  return { title: `Натяжные потолки — ${area.name}`, description: area.description.slice(0, 160) || `${company.brandName}: натяжные потолки и освещение, ${area.name}.`, alternates: { canonical: `/rayony/${area.slug}` } };
}

export default async function AreaPage({ params }: Props) {
  const { area } = await find((await params).slug);
  if (!area) notFound();
  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <div className="container-x max-w-3xl">
        <p className="eyebrow">Зона обслуживания</p>
        <h1 className="mt-4 text-h1">Натяжные потолки — {area.name}</h1>
        {area.description && <p className="lead mt-6 whitespace-pre-line">{area.description}</p>}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/calculator" className="btn btn-primary">
            Рассчитать потолок
          </Link>
          <Link href="/contacts?measure=1#request" className="btn btn-outline">
            Заказать замер
          </Link>
        </div>
      </div>
    </div>
  );
}

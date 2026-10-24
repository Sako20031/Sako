import Link from 'next/link';
import { Hero } from '@/components/home/Hero';
import { FinalCta, Manifesto, PortfolioTeaser, Process, SectionHeading, StudioTeaser, Trust } from '@/components/home/Sections';
import { FaqList } from '@/components/home/FaqList';
import { CatalogGallery } from '@/components/catalog/CatalogGallery';
import { catalogCategories } from '@/config/catalog';
import { catalogEntries } from '@/lib/catalog';
import { getContent } from '@/lib/server/content';
import { siteUrl } from '@/lib/site';

export default async function HomePage() {
  const content = await getContent();
  const entries = catalogEntries(content);
  const { company } = content;
  // LocalBusiness data only when real company details exist.
  const jsonLd =
    company.phone && company.address
      ? {
          '@context': 'https://schema.org',
          '@type': 'HomeAndConstructionBusiness',
          name: company.brandName,
          telephone: company.phone,
          address: company.address,
          email: company.email || undefined,
          url: siteUrl(),
          areaServed: company.serviceAreas.map((a) => a.name),
        }
      : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <Hero hero={content.hero} />
      <Manifesto />
      <section id="collection" className="section pt-0">
        <div className="container-x">
          <SectionHeading
            eyebrow="Коллекция"
            title="Решения для любого пространства"
            text="Покрытия, профили и световые сценарии. Откройте решение, чтобы узнать детали, и добавьте его в свой проект."
            action={
              <Link href="/catalog" className="link-underline font-semibold">
                Вся коллекция
              </Link>
            }
          />
          <CatalogGallery items={entries} categories={catalogCategories} colors={content.pricing.colors} lighting={content.pricing.lighting.filter((l) => l.enabled)} sample={content.pricing.mode === 'sample'} filters={false} limit={6} />
        </div>
      </section>
      <StudioTeaser />
      <Process process={content.process} />
      <PortfolioTeaser items={content.portfolio} />
      <Trust trust={content.trust} />
      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Вопросы</p>
            <h2 className="mt-4 text-h2">Частые вопросы</h2>
            <Link href="/faq" className="link-underline mt-6 inline-block font-semibold">
              Все вопросы
            </Link>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={content.faq.slice(0, 5)} />
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

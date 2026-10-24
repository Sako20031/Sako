import type { Metadata } from 'next';
import Link from 'next/link';
import { Photo } from '@/components/ui/Photo';
import { Process } from '@/components/home/Sections';
import { getContent } from '@/lib/server/content';
import { images } from '@/config/images';

export const metadata: Metadata = {
  title: 'О компании',
  description: 'LUMIÈRE CEILINGS — натяжные потолки, в которых свет становится частью архитектуры.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const { about, process, company } = await getContent();
  return (
    <>
      <div className="pb-20 pt-32 lg:pt-40">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow">О компании</p>
            <h1 className="mt-4 text-h1">{about.title}</h1>
            <p className="lead mt-8">{about.intro}</p>
            <div className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed text-ink-soft">
              {about.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Link href="/calculator" className="btn btn-primary mt-10">
              Создать свой потолок
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-stone lg:col-span-6">
            <Photo src={images.about} alt="Светлый современный интерьер" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
        <div className="container-x mt-24 grid gap-10 border-t border-line pt-12 md:grid-cols-3">
          {about.values.map((v) => (
            <div key={v.title}>
              <h2 className="text-[1.75rem]">{v.title}</h2>
              <p className="mt-3 text-muted">{v.text}</p>
            </div>
          ))}
        </div>
        {(company.legalName || company.warranty) && (
          <div className="container-x mt-20 grid gap-8 md:grid-cols-2">
            {company.legalName && (
              <div>
                <h2 className="text-h3">Реквизиты</h2>
                <p className="mt-3 text-muted">
                  {company.legalName}
                  {company.legalId && <><br />{company.legalId}</>}
                </p>
              </div>
            )}
            {company.warranty && (
              <div>
                <h2 className="text-h3">Гарантия</h2>
                <p className="mt-3 whitespace-pre-line text-muted">{company.warranty}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <Process process={process} />
    </>
  );
}

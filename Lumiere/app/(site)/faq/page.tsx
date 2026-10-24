import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList } from '@/components/home/FaqList';
import { getContent } from '@/lib/server/content';

export const metadata: Metadata = {
  title: 'Частые вопросы',
  description: 'Сколько стоит натяжной потолок, как рассчитать площадь, нужен ли замер и чем отличаются матовые и глянцевые потолки.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const { faq } = await getContent();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })),
  };
  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <p className="eyebrow">Вопросы и ответы</p>
          <h1 className="mt-4 text-h1">Частые вопросы</h1>
          <p className="lead mt-6">Не нашли ответ? Соберите проект в калькуляторе или напишите нам.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/calculator" className="btn btn-primary">
              Открыть калькулятор
            </Link>
            <Link href="/contacts" className="btn btn-outline">
              Связаться с нами
            </Link>
          </div>
        </header>
        <div className="lg:col-span-8">
          <FaqList items={faq} />
        </div>
      </div>
    </div>
  );
}

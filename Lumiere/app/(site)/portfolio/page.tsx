import type { Metadata } from 'next';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { getContent } from '@/lib/server/content';

export const metadata: Metadata = {
  title: 'Портфолио',
  description: 'Концепт-решения и выполненные проекты натяжных потолков: гостиные, спальни, кухни, ванные и коммерческие помещения.',
  alternates: { canonical: '/portfolio' },
};

export default async function PortfolioPage() {
  const { portfolio } = await getContent();
  const items = portfolio.filter((p) => p.published);
  const hasReal = items.some((p) => p.kind === 'project');
  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <div className="container-x">
        <header className="mb-14 max-w-3xl">
          <p className="eyebrow">Портфолио</p>
          <h1 className="mt-4 text-h1">Пространства и свет</h1>
          <p className="lead mt-6">
            {hasReal
              ? 'Выполненные проекты компании и концепт-решения. Каждая карточка подписана.'
              : 'Здесь пока представлены концепт-дизайны — визуальные ориентиры решений. Фотографии реальных объектов компания добавит по мере публикации.'}
          </p>
        </header>
        <PortfolioGrid items={items} />
      </div>
    </div>
  );
}

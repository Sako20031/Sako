import type { Metadata } from 'next';
import { CatalogGallery } from '@/components/catalog/CatalogGallery';
import { catalogCategories } from '@/config/catalog';
import { catalogEntries } from '@/lib/catalog';
import { getContent } from '@/lib/server/content';

export const metadata: Metadata = {
  title: 'Коллекция натяжных потолков',
  description: 'Матовые, глянцевые, сатиновые, теневые и парящие потолки, световые линии, многоуровневые решения и скрытый карниз. Выберите решение и рассчитайте стоимость.',
  alternates: { canonical: '/catalog' },
};

export default async function CatalogPage() {
  const content = await getContent();
  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <div className="container-x">
        <header className="mb-14 max-w-3xl">
          <p className="eyebrow">Коллекция</p>
          <h1 className="mt-4 text-h1">Каталог решений</h1>
          <p className="lead mt-6">Выберите характер потолка — покрытие, профиль и свет. Откройте решение, чтобы настроить цвет и освещение, и добавьте его в проект.</p>
        </header>
        <CatalogGallery items={catalogEntries(content)} categories={catalogCategories} colors={content.pricing.colors} lighting={content.pricing.lighting.filter((l) => l.enabled)} sample={content.pricing.mode === 'sample'} />
        <p className="mt-24 text-sm text-muted">Фотографии в каталоге иллюстрируют решения и не являются выполненными объектами компании.</p>
      </div>
    </div>
  );
}

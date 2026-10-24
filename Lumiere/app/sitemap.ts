import type { MetadataRoute } from 'next';
import { getContent } from '@/lib/server/content';
import { siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const c = await getContent();
  const pages = ['', '/catalog', '/calculator', '/portfolio', '/about', '/faq', '/contacts', '/privacy'];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : p === '/calculator' ? 0.9 : 0.7 })),
    ...c.catalog.filter((i) => i.enabled).map((i) => ({ url: `${base}/catalog/${i.slug}`, priority: 0.6 })),
    ...c.portfolio.filter((p) => p.published).map((p) => ({ url: `${base}/portfolio/${p.slug}`, priority: 0.5 })),
    ...c.company.serviceAreas.map((a) => ({ url: `${base}/rayony/${a.slug}`, priority: 0.5 })),
  ];
}

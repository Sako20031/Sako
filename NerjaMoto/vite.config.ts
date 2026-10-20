import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { business } from './src/config/business';
import { photos } from './src/config/photos';

/**
 * SEO tags that depend on the public URL. Set SITE_URL (e.g. https://nerjamotorent.com)
 * when building for production; without it, canonical/sitemap are left out rather than
 * pointing to a wrong domain.
 */
function seo(siteUrl: string): Plugin {
  const url = siteUrl.replace(/\/$/, '');
  const a = business.address;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: 'Alquiler de scooters Honda en Nerja (Málaga).',
    telephone: business.whatsappDisplay.replace(/\s/g, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      postalCode: a.postalCode,
      addressLocality: a.city,
      addressRegion: a.region,
      addressCountry: a.countryCode,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: business.hours.open,
        closes: business.hours.close,
      },
    ],
    image: photos.hero.src,
    ...(url ? { url } : {}),
  };

  return {
    name: 'nmr-seo',
    transformIndexHtml(html) {
      const tags = [
        `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
        `<meta property="og:image" content="${photos.hero.src}" />`,
        ...(url
          ? [
              `<link rel="canonical" href="${url}/" />`,
              `<link rel="alternate" hreflang="es" href="${url}/" />`,
              `<link rel="alternate" hreflang="en" href="${url}/?lang=en" />`,
              `<link rel="alternate" hreflang="x-default" href="${url}/" />`,
              `<meta property="og:url" content="${url}/" />`,
            ]
          : []),
      ];
      return html.replace('<!--%SEO%-->', tags.join('\n    '));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${url ? `\nSitemap: ${url}/sitemap.xml\n` : ''}`,
      });
      if (url) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${url}/</loc>
    <xhtml:link rel="alternate" hreflang="es" href="${url}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url}/?lang=en"/>
  </url>
</urlset>
`,
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = env.SITE_URL ?? env.VITE_SITE_URL ?? '';
  const single = mode === 'single';
  // `npm run build`        → dist/ (production)
  // `npm run build:single` → dist-single/index.html (one self-contained file, for previews)
  return {
    plugins: [react(), seo(siteUrl), ...(single ? [viteSingleFile()] : [])],
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) },
    build: single ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : undefined,
  };
});

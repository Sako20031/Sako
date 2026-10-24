import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { siteUrl } from '@/lib/site';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'LUMIÈRE CEILINGS — натяжные потолки и архитектурный свет', template: '%s — LUMIÈRE CEILINGS' },
  description:
    'Премиальные натяжные потолки: матовые, сатиновые, теневые, парящие, световые линии. Онлайн-конфигуратор с предварительным расчётом и запись на замер.',
  applicationName: 'LUMIÈRE CEILINGS',
  openGraph: { type: 'website', locale: 'ru_RU', siteName: 'LUMIÈRE CEILINGS' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#F7F5F0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// lang="ru" by default; see README → «Казахский язык» for adding a /kz version.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import Link from 'next/link';
import type { CompanyConfig } from '@/types';
import { Logo } from './Logo';
import { NAV } from './nav';
import { whatsappLink } from '@/lib/whatsapp';

export function Footer({ company }: { company: CompanyConfig }) {
  const wa = whatsappLink(company.whatsapp);
  const year = new Date().getFullYear();
  return (
    <footer className="no-print bg-ink pb-28 pt-16 text-ivory lg:pb-12">
      <div className="container-x">
        <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo company={company} light />
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-white/65">{company.tagline}</p>
            <Link href="/calculator" className="btn btn-accent mt-8">
              Рассчитать стоимость
            </Link>
          </div>
          <nav aria-label="Разделы сайта" className="md:col-span-3">
            <p className="eyebrow !text-champagne">Разделы</p>
            <ul className="mt-5 space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-white/80 transition-colors hover:text-white">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-4">
            <p className="eyebrow !text-champagne">Контакты</p>
            <ul className="mt-5 space-y-3 text-white/80">
              {company.phone ? (
                <li>
                  <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">
                    {company.phone}
                  </a>
                </li>
              ) : (
                <li className="text-white/50">Телефон будет опубликован в ближайшее время</li>
              )}
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    WhatsApp
                  </a>
                </li>
              )}
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`} className="hover:text-white">
                    {company.email}
                  </a>
                </li>
              )}
              {company.instagram && (
                <li>
                  <a href={`https://instagram.com/${company.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Instagram {company.instagram.startsWith('@') ? company.instagram : `@${company.instagram}`}
                  </a>
                </li>
              )}
              {company.address && <li>{company.address}</li>}
              {company.hours && <li className="text-white/60">{company.hours}</li>}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {company.legalName || company.brandName}
            {company.legalId && ` · ${company.legalId}`}
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">
              Политика конфиденциальности
            </Link>
            <Link href="/admin" className="hover:text-white" rel="nofollow">
              Вход
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CompanyConfig } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Logo } from './Logo';
import { NAV } from './nav';

export function Header({ company }: { company: CompanyConfig }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overlay = pathname === '/' && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation (state adjusted during render, as React recommends).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  // Lock page scroll while the menu is open.
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,color] duration-500 ${
        overlay ? 'bg-transparent text-white' : 'bg-ivory/92 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-md'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:text-ink">
        Перейти к содержанию
      </a>
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Logo company={company} light={overlay} />
        <nav aria-label="Основное меню" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative py-2 text-[0.9375rem] font-medium transition-opacity hover:opacity-100 ${active ? 'opacity-100' : 'opacity-75'} after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform ${active ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/calculator" className={`btn btn-sm hidden sm:inline-flex ${overlay ? 'btn-light' : 'btn-primary'}`}>
            Рассчитать потолок
          </Link>
          <button
            type="button"
            className="-mr-2 grid h-12 w-12 place-items-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="animate-fade fixed inset-x-0 bottom-0 top-[4.5rem] z-40 flex flex-col overflow-y-auto bg-ivory px-4 pb-8 pt-6 text-ink lg:hidden">
          <nav aria-label="Мобильное меню">
            <ul className="divide-y divide-line border-y border-line">
              {NAV.map((item, i) => (
                <li key={item.href} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link href={item.href} className="flex items-center justify-between py-4 font-display text-[1.75rem]">
                    {item.label}
                    <Icon name="arrow" className="text-warm" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-3 pt-8">
            <Link href="/calculator" className="btn btn-primary w-full">
              Создать свой потолок
            </Link>
            <Link href="/calculator?measure=1" className="btn btn-outline w-full">
              Заказать бесплатный замер
            </Link>
            {company.phone && (
              <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`} className="block pt-2 text-center text-muted">
                {company.phone}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

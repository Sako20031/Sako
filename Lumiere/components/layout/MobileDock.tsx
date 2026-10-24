'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CompanyConfig } from '@/types';
import { whatsappLink } from '@/lib/whatsapp';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';

/** Thumb-reachable calculator access on phones, on every page except the calculator itself. */
export function MobileDock({ company }: { company: CompanyConfig }) {
  const pathname = usePathname();
  if (pathname.startsWith('/calculator')) return null;
  const wa = whatsappLink(company.whatsapp, 'Здравствуйте! Хочу проконсультироваться по натяжному потолку.');
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
      <div className="flex gap-2">
        <Link href="/calculator" className="btn btn-primary flex-1">
          <Icon name="ruler" />
          Создать свой потолок
        </Link>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-12 shrink-0 px-0" aria-label="Написать в WhatsApp">
            <WhatsAppIcon />
          </a>
        )}
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { CompanyConfig } from '@/types';

export function Logo({ company, light = false }: { company: CompanyConfig; light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex flex-col leading-none" aria-label={`${company.brandName} — на главную`}>
      {company.logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoImage} alt={company.brandName} className="h-9 w-auto" />
      ) : (
        <>
          <span className={`font-display text-[1.65rem] tracking-[0.14em] ${light ? 'text-white' : 'text-ink'}`}>{company.logoText}</span>
          <span className={`mt-1 text-[0.58rem] font-semibold tracking-[0.5em] ${light ? 'text-white/75' : 'text-muted'}`}>CEILINGS</span>
        </>
      )}
    </Link>
  );
}

import Link from 'next/link';
import type { HeroContent } from '@/types';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';

export function Hero({ hero }: { hero: HeroContent }) {
  return (
    <section aria-labelledby="hero-title" className="relative bg-ink text-white">
      <div className="relative h-[62svh] min-h-[22rem] overflow-hidden lg:h-[100svh] lg:min-h-[44rem]">
        <div className="hero-photo absolute inset-0">
          <Photo src={hero.image} alt={hero.imageAlt} fill priority sizes="100vw" quality={85} className="object-cover" style={{ objectPosition: hero.focus }} />
        </div>
        {/* Soft light sweep across the ceiling */}
        <div aria-hidden="true" className="hero-light pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(255_244_224/0.35),transparent_70%)] mix-blend-soft-light" />
        {/* Legibility scrims: top for the header, bottom-left for the copy */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(20_19_17/0.72)_0%,rgb(20_19_17/0.35)_42%,transparent_70%)] lg:block" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent lg:h-1/2" />

        <div className="container-x absolute inset-x-0 bottom-0 hidden pb-36 lg:block">
          <HeroCopy hero={hero} />
        </div>
      </div>

      {/* Mobile copy below the photo, so text never covers the ceiling */}
      <div className="container-x pb-12 pt-8 lg:hidden">
        <HeroCopy hero={hero} />
      </div>

      <div className="border-t border-white/10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:border-white/15 lg:bg-black/20 lg:backdrop-blur-sm">
        <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-4 py-6 text-[0.875rem] text-white/85 sm:grid-cols-4 lg:py-7">
          {hero.benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-champagne/70 text-champagne">
                <Icon name="check" size={12} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HeroCopy({ hero }: { hero: HeroContent }) {
  return (
    <div className="max-w-[44rem] animate-fade-up">
      <p className="eyebrow !text-champagne">LUMIÈRE CEILINGS</p>
      <h1 id="hero-title" className="mt-4 text-display text-white">
        {hero.title}
      </h1>
      <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-white/80 lg:text-lg">{hero.subtitle}</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link href="/calculator" className="btn btn-accent h-14 px-7 text-base">
          {hero.primaryCta} <Icon name="arrow" size={18} />
        </Link>
        <Link href="/catalog" className="btn btn-outline-light h-14 px-7 text-base">
          {hero.secondaryCta}
        </Link>
      </div>
      {hero.measureLink && (
        <Link href="/contacts?measure=1#request" className="link-underline mt-6 inline-block text-[0.9375rem] text-white/80 hover:text-white">
          {hero.measureLink}
        </Link>
      )}
    </div>
  );
}

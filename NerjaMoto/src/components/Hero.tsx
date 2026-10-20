import { ArrowDown, MapPin } from 'lucide-react';
import { useI18n } from '../i18n';
import { whatsappLink } from '../config/business';
import { heroClaims } from '../config/content';
import { media } from '../config/media';
import { rentalConfig } from '../config/rental';
import { formatPrice, fromPrice } from '../lib/pricing';
import { Picture } from './ui/Picture';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

export function Hero() {
  const { t, lang } = useI18n();
  const cheapest = Math.min(...rentalConfig.scooters.map((s) => fromPrice(s)));
  const claims = heroClaims.filter((c) => c.confirmed);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__media">
        <Picture media={media.hero} alt={t.hero.artAlt} className="hero__img" priority sizes="100vw" />
      </div>

      <div className="hero__content wrap">
        <p className="hero__loc">
          <MapPin size={15} aria-hidden="true" /> {t.hero.location}
        </p>
        <h1 id="hero-title" className="hero__title">
          <span>{t.hero.title1}</span>
          <em>{t.hero.title2}</em>
        </h1>
        <p className="hero__lead">{t.hero.lead}</p>
        <div className="hero__ctas">
          <a href="#scooters" className="btn btn--sun">
            {t.hero.primary} <ArrowDown size={18} aria-hidden="true" />
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn--ghost hero__wa">
            <WhatsAppIcon /> {t.hero.secondary}
            <span className="sr-only">{t.a11y.newTab}</span>
          </a>
        </div>
      </div>

      <div className="hero__bar">
        <div className="wrap hero__bar-inner">
          <p className="hero__price">
            <span className="hero__price-label">{t.hero.fromLabel}</span>
            <span className="price hero__price-value">{formatPrice(cheapest, lang)}</span>
            <span className="hero__price-unit">{t.hero.perDay}</span>
            <span className="hero__price-note">{t.hero.priceNote}</span>
          </p>
          <ul className="hero__claims">
            {claims.map((c) => (
              <li key={c.id}>{c.label[lang]}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

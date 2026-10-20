import { ArrowUpRight, Star } from 'lucide-react';
import { useI18n } from '../i18n';
import { business, reviewsUrl } from '../config/business';
import { useReveal } from './ui/useReveal';

/** Only links to Google. The rating is shown once `business.rating.verified` is true. */
export function Reviews() {
  const { t, lang } = useI18n();
  const ref = useReveal<HTMLDivElement>();
  const { rating } = business;
  const value = rating.value.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: 1 });
  return (
    <section className="section reviews" aria-labelledby="reviews-title">
      <div ref={ref} className="wrap reviews__inner reveal">
        <div>
          <p className="eyebrow">{t.reviews.eyebrow}</p>
          <h2 id="reviews-title" className="h-section">{t.reviews.title}</h2>
        </div>
        <div className="reviews__card">
          {rating.verified && (
            <p className="reviews__rating">
              <span className="reviews__stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={20} fill={i < Math.round(rating.value) ? 'currentColor' : 'none'} />
                ))}
              </span>
              <span className="num">{t.reviews.rating(value, rating.count)}</span>
            </p>
          )}
          <p className="lead">{t.reviews.lead}</p>
          <a className="btn btn--ghost" href={reviewsUrl()} target="_blank" rel="noopener noreferrer">
            {t.reviews.cta} <ArrowUpRight size={18} aria-hidden="true" />
            <span className="sr-only">{t.a11y.newTab}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

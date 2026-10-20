import { Check, ArrowRight, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import { rentalConfig, type Scooter } from '../config/rental';
import { scooterArt, type Media } from '../config/media';
import { estimate, formatPrice, fromPrice } from '../lib/pricing';
import { useBooking } from '../state/booking';
import { Stepper } from './ui/Stepper';
import { useReveal } from './ui/useReveal';

export function ScooterImage({ scooter, priority = false }: { scooter: Scooter; priority?: boolean }) {
  const { t } = useI18n();
  const img: Media = scooter.photo ?? scooterArt[scooter.silhouette];
  return (
    <img
      className={scooter.photo ? 'is-photo' : 'is-art'}
      src={img.src}
      srcSet={img.srcSet}
      sizes="(min-width: 900px) 40vw, 90vw"
      width={img.width}
      height={img.height}
      alt={scooter.photo ? t.catalogue.photoAlt(scooter.name) : t.catalogue.artAlt(scooter.name)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

function ScooterRow({ scooter, index }: { scooter: Scooter; index: number }) {
  const { t, lang } = useI18n();
  const { days, setDays, fields, openFor } = useBooking();
  const ref = useReveal<HTMLElement>();
  const quote = estimate(scooter, days, fields.quantity);
  const selected = fields.scooterId === scooter.id;
  const titleId = `scooter-${scooter.id}-title`;

  return (
    <article ref={ref} className={`scooter reveal ${selected ? 'is-selected' : ''}`} aria-labelledby={titleId}>
      <div className="scooter__head">
        <span className="scooter__index num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 id={titleId} className="scooter__name">
          {scooter.name}
        </h3>
        <p className="scooter__cc num">
          {scooter.cc} {t.units.cc}
        </p>
        <p className="scooter__desc">{scooter.description[lang]}</p>
        {selected && (
          <p className="scooter__badge">
            <Check size={14} aria-hidden="true" /> {t.catalogue.selected}
          </p>
        )}
      </div>

      <figure className="scooter__figure">
        <ScooterImage scooter={scooter} />
        <figcaption>{scooter.photo ? t.catalogue.photoNote : t.catalogue.illustrationNote}</figcaption>
      </figure>

      <div className="scooter__buy">
        <p className="scooter__from">
          <span>{t.catalogue.from}</span>
          <strong className="price">{formatPrice(fromPrice(scooter), lang)}</strong>
          <span>{t.catalogue.perDay}</span>
        </p>

        <div className="scooter__calc">
          <span className="scooter__label" id={`${scooter.id}-dur`}>
            {t.catalogue.duration}
          </span>
          <Stepper
            value={days}
            min={1}
            max={rentalConfig.maxDays}
            onChange={setDays}
            display={t.units.days(days)}
            label={`${t.catalogue.duration} — ${scooter.name}`}
          />
        </div>

        <div className="scooter__total">
          <span className="scooter__label">{t.catalogue.estimate}</span>
          <strong className="price scooter__total-value" key={quote.total}>
            {formatPrice(quote.total, lang)}
          </strong>
          <span className="scooter__formula num">
            {formatPrice(quote.dailyRate, lang)} × {t.units.days(days)}
            {quote.quantity > 1 ? ` × ${quote.quantity}` : ''}
          </span>
        </div>

        <button
          type="button"
          className={`btn btn--block ${selected ? 'btn--sun' : 'btn--ocean'}`}
          onClick={() => openFor(scooter.id)}
          aria-haspopup="dialog"
        >
          {t.catalogue.choose} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export function Catalogue() {
  const { t } = useI18n();
  const head = useReveal<HTMLDivElement>();
  return (
    <section className="section catalogue" id="scooters" aria-labelledby="catalogue-title">
      <div className="wrap">
        <div ref={head} className="catalogue__head reveal">
          <p className="eyebrow">{t.catalogue.eyebrow}</p>
          <h2 id="catalogue-title" className="h-section">
            {t.catalogue.title}
          </h2>
          <p className="lead">{t.catalogue.lead}</p>
        </div>

        <div className="catalogue__list">
          {rentalConfig.scooters.map((s, i) => (
            <ScooterRow key={s.id} scooter={s} index={i} />
          ))}
        </div>

        <p className="catalogue__note">
          <Info size={16} aria-hidden="true" />
          <span>
            {t.catalogue.availability} {t.catalogue.previewNote}
          </span>
        </p>
      </div>
    </section>
  );
}

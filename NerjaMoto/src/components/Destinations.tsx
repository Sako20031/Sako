import { ArrowUpRight, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import { business, fullAddress } from '../config/business';
import { destinations, type Destination } from '../config/content';
import { media } from '../config/media';
import { Picture } from './ui/Picture';
import { useReveal } from './ui/useReveal';

const routeUrl = (d: Destination) =>
  'https://www.google.com/maps/dir/?api=1&origin=' +
  encodeURIComponent(`${business.name}, ${fullAddress('es')}`) +
  '&destination=' +
  encodeURIComponent(d.mapsQuery);

function DestinationCard({ d, i }: { d: Destination; i: number }) {
  const { t, lang } = useI18n();
  const ref = useReveal<HTMLElement>();
  return (
    <article ref={ref} className={`dest reveal dest--${i}`} style={{ transitionDelay: `${i * 90}ms` }}>
      <div className="dest__media">
        <Picture media={media[d.art]} alt={t.destinations.artAlt(d.name)} sizes="(min-width: 900px) 33vw, 90vw" />
      </div>
      <div className="dest__body">
        <p className="dest__kicker">{d.kicker[lang]}</p>
        <h3 className="dest__name">{d.name}</h3>
        <p className="dest__text">{d.text[lang]}</p>
        <p className="dest__dist">
          {d.distance ? `${t.destinations.distance}: ${d.distance}` : t.destinations.distanceUnknown}
        </p>
        <a className="link" href={routeUrl(d)} target="_blank" rel="noopener noreferrer">
          {t.destinations.route} <ArrowUpRight size={16} aria-hidden="true" />
          <span className="sr-only">{t.a11y.newTab}</span>
        </a>
      </div>
    </article>
  );
}

export function Destinations() {
  const { t } = useI18n();
  const head = useReveal<HTMLDivElement>();
  return (
    <section className="section destinations" id="rutas" aria-labelledby="dest-title">
      <div className="wrap">
        <div ref={head} className="destinations__head reveal">
          <div>
            <p className="eyebrow">{t.destinations.eyebrow}</p>
            <h2 id="dest-title" className="h-section">{t.destinations.title}</h2>
          </div>
          <p className="lead">{t.destinations.lead}</p>
        </div>
        <div className="destinations__grid">
          {destinations.map((d, i) => (
            <DestinationCard key={d.id} d={d} i={i} />
          ))}
        </div>
        <p className="catalogue__note">
          <Info size={16} aria-hidden="true" /> <span>{t.destinations.disclaimer}</span>
        </p>
      </div>
    </section>
  );
}

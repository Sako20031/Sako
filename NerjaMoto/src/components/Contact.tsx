import { useEffect, useState } from 'react';
import { Clock, Copy, Check, MapPin, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { business, fullAddress, whatsappLink } from '../config/business';
import { toMinutes } from '../lib/dates';
import { WhatsAppIcon } from './ui/WhatsAppIcon';
import { useReveal } from './ui/useReveal';

/** Current time in Nerja (Europe/Madrid), as minutes after midnight. */
function nerjaMinutes(): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  } catch {
    return null;
  }
}

export function Contact() {
  const { t, lang } = useI18n();
  const ref = useReveal<HTMLDivElement>();
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(nerjaMinutes());
    const id = window.setInterval(() => setNow(nerjaMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isOpen = now !== null && now >= toMinutes(business.hours.open) && now < toMinutes(business.hours.close);
  const address = fullAddress(lang);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${business.name}, ${address}`);
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
    window.setTimeout(() => setCopy('idle'), 2500);
  };

  return (
    <section className="section contact" id="contacto" aria-labelledby="contact-title">
      <div ref={ref} className="wrap contact__grid reveal">
        <div>
          <p className="eyebrow">{t.contact.eyebrow}</p>
          <h2 id="contact-title" className="h-section">{t.contact.title}</h2>
        </div>

        <div className="contact__card">
          <dl className="contact__list">
            <div>
              <dt><MapPin size={18} aria-hidden="true" /> {t.contact.address}</dt>
              <dd>
                <address>
                  <strong>{business.name}</strong>
                  <br />
                  {business.address.street}
                  <br />
                  {business.address.postalCode} {business.address.city}, {business.address.region},{' '}
                  {lang === 'es' ? business.address.country : business.address.countryEn}
                </address>
              </dd>
            </div>
            <div>
              <dt><Clock size={18} aria-hidden="true" /> {t.contact.hours}</dt>
              <dd>
                <span className="num">{t.contact.hoursValue}</span>
                {now !== null && (
                  <span className={`status ${isOpen ? 'status--open' : ''}`}>
                    {isOpen ? t.contact.openNow : t.contact.closedNow} · {t.contact.localTime}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt><WhatsAppIcon size={18} /> {t.contact.whatsapp}</dt>
              <dd>
                <a className="num contact__phone" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  {business.whatsappDisplay}
                </a>
              </dd>
            </div>
          </dl>

          <div className="contact__actions">
            <a className="btn btn--wa" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> {t.contact.chat}
              <span className="sr-only">{t.a11y.newTab}</span>
            </a>
            <a className="btn btn--ocean" href={business.mapsUrl} target="_blank" rel="noopener noreferrer">
              {t.contact.maps} <ArrowUpRight size={18} aria-hidden="true" />
              <span className="sr-only">{t.a11y.newTab}</span>
            </a>
            <button type="button" className="btn btn--ghost" onClick={copyAddress}>
              {copy === 'ok' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copy === 'ok' ? t.contact.copied : copy === 'fail' ? t.contact.copyFailed : t.contact.copy}
            </button>
            <span className="sr-only" role="status">{copy === 'ok' ? t.contact.copied : copy === 'fail' ? t.contact.copyFailed : ''}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowUp } from 'lucide-react';
import { useI18n } from '../i18n';
import { business, fullAddress, whatsappLink } from '../config/business';
import { Wordmark } from './ui/Logo';
import { LangSwitch } from './Header';

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div className="footer__brand">
          <Wordmark />
          <p>{t.footer.tagline}</p>
        </div>
        <nav className="footer__nav" aria-label={t.a11y.mainNav}>
          <a href="#scooters">{t.nav.scooters}</a>
          <a href="#historia">{t.nav.story}</a>
          <a href="#rutas">{t.nav.destinations}</a>
          <a href="#faq">{t.nav.faq}</a>
          <a href="#contacto">{t.nav.contact}</a>
        </nav>
        <div className="footer__contact">
          <p>{fullAddress(lang)}</p>
          <p className="num">{t.contact.hoursValue}</p>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="num">
            WhatsApp {business.whatsappDisplay}
          </a>
          <LangSwitch className="lang--dark" />
        </div>
      </div>
      <div className="wrap footer__legal">
        <p>{t.footer.note} {t.footer.imagery}</p>
        <p>
          © {new Date().getFullYear()} {business.name}. {t.footer.rights}{' '}
          <a href="#top" className="footer__top">
            {t.footer.top} <ArrowUp size={14} aria-hidden="true" />
          </a>
        </p>
      </div>
    </footer>
  );
}

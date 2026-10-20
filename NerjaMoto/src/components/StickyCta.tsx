import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { whatsappLink } from '../config/business';
import { useBooking } from '../state/booking';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

/**
 * Mobile-only bottom bar. Appears after the hero, hides while the catalogue,
 * contact section or footer are on screen (they have their own buttons) and
 * while the booking panel is open.
 */
export function StickyCta() {
  const { t } = useI18n();
  const { open } = useBooking();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hidden = new Set<Element>();
    const targets = ['#top', '#scooters', '#contacto', 'footer']
      .map((s) => document.querySelector(s))
      .filter((el): el is Element => !!el);
    if (!('IntersectionObserver' in window) || targets.length === 0) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) hidden.add(e.target);
        else hidden.delete(e.target);
      }
      setVisible(hidden.size === 0);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const show = visible && !open;
  return (
    <div className={`sticky-cta ${show ? 'is-visible' : ''}`} aria-hidden={!show}>
      <a href="#scooters" className="btn btn--sun" tabIndex={show ? 0 : -1}>
        {t.sticky.book}
      </a>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--wa sticky-cta__wa"
        tabIndex={show ? 0 : -1}
        aria-label={t.hero.secondary}
      >
        <WhatsAppIcon size={22} />
      </a>
    </div>
  );
}

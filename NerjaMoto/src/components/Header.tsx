import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LANGS, useI18n } from '../i18n';
import { business, whatsappLink } from '../config/business';
import { Wordmark } from './ui/Logo';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang ${className}`} role="group" aria-label={t.a11y.language}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className="lang__btn"
          aria-pressed={lang === l}
          lang={l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links = [
    { href: '#scooters', label: t.nav.scooters },
    { href: '#historia', label: t.nav.story },
    { href: '#rutas', label: t.nav.destinations },
    { href: '#faq', label: t.nav.faq },
    { href: '#contacto', label: t.nav.contact },
  ];

  return (
    <>
      <header className={`header ${solid || open ? 'header--solid' : 'header--top'}`}>
        <div className="header__inner wrap">
          <a href="#top" className="header__brand" aria-label={`${business.name} — ${t.a11y.home}`} onClick={() => setOpen(false)}>
            <Wordmark />
          </a>

          <nav className="header__nav" aria-label={t.a11y.mainNav}>
            {links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <LangSwitch className="header__lang" />
            <a href="#scooters" className="btn btn--ocean header__cta">
              {t.nav.book}
            </a>
            <button
              ref={menuBtn}
              type="button"
              className="header__menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.a11y.closeMenu : t.a11y.menu}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {/* Outside <header>: its backdrop-filter would make it the containing block of this fixed panel. */}
      <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} hidden={!open}>
        <nav aria-label={t.a11y.mainNav} className="mobile-menu__nav">
          {links.map((l, i) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ transitionDelay: `${60 + i * 40}ms` }}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="mobile-menu__foot">
          <LangSwitch />
          <a href="#scooters" className="btn btn--sun btn--block" onClick={() => setOpen(false)}>
            {t.hero.primary}
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--block">
            <WhatsAppIcon /> {t.hero.secondary}
          </a>
        </div>
      </div>
    </>
  );
}

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import { whatsappLink } from '../config/business';
import { faq, type FaqItem } from '../config/content';
import { WhatsAppIcon } from './ui/WhatsAppIcon';
import { useReveal } from './ui/useReveal';

function Item({ item }: { item: FaqItem }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className={`faq__item ${open ? 'is-open' : ''}`}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-btn`} onClick={() => setOpen((o) => !o)}>
          <span>{item.q[lang]}</span>
          <Plus size={22} aria-hidden="true" className="faq__icon" />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} className="faq__panel" hidden={!open}>
        {item.a ? (
          <p>{item.a[lang]}</p>
        ) : (
          <p className="faq__pending">
            {t.faq.pending}{' '}
            <a className="link" href={whatsappLink(item.q[lang])} target="_blank" rel="noopener noreferrer">
              {t.faq.ask}
              <span className="sr-only">{t.a11y.newTab}</span>
            </a>
          </p>
        )}
      </div>
    </li>
  );
}

export function Faq() {
  const { t } = useI18n();
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="section faq" id="faq" aria-labelledby="faq-title">
      <div ref={ref} className="wrap faq__grid reveal">
        <div className="faq__aside">
          <p className="eyebrow">{t.faq.eyebrow}</p>
          <h2 id="faq-title" className="h-section">{t.faq.title}</h2>
          <p className="faq__more">{t.faq.more}</p>
          <a className="btn btn--wa" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> {t.faq.ask}
            <span className="sr-only">{t.a11y.newTab}</span>
          </a>
        </div>
        <ul className="faq__list">
          {faq.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

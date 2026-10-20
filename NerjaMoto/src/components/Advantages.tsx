import { Bike, MapPin, MessageCircle, ReceiptText } from 'lucide-react';
import { useI18n } from '../i18n';
import { advantages, type Advantage } from '../config/content';
import { useReveal } from './ui/useReveal';

const icons: Record<Advantage['icon'], typeof Bike> = {
  bike: Bike,
  receipt: ReceiptText,
  pin: MapPin,
  chat: MessageCircle,
};

export function Advantages() {
  const { t, lang } = useI18n();
  const ref = useReveal<HTMLDivElement>();
  const items = advantages.filter((a) => a.confirmed);
  return (
    <section className="section advantages" aria-labelledby="adv-title">
      <div ref={ref} className="wrap reveal">
        <p className="eyebrow eyebrow--light">{t.advantages.eyebrow}</p>
        <h2 id="adv-title" className="h-section advantages__title">{t.advantages.title}</h2>
        <ul className="advantages__grid">
          {items.map((a) => {
            const Icon = icons[a.icon];
            return (
              <li key={a.id}>
                <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
                <h3>{a.title[lang]}</h3>
                <p>{a.text[lang]}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

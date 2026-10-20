import { useI18n } from '../i18n';
import { media } from '../config/media';
import { Picture } from './ui/Picture';
import { useReveal } from './ui/useReveal';

export function Story() {
  const { t } = useI18n();
  const ref = useReveal<HTMLDivElement>();
  const art = useReveal<HTMLDivElement>();
  return (
    <section className="section story" id="historia" aria-labelledby="story-title">
      <div className="wrap story__grid">
        <div ref={art} className="story__media reveal">
          <Picture media={media.story} alt={t.story.artAlt} className="story__img" sizes="(min-width: 900px) 45vw, 100vw" />
        </div>
        <div ref={ref} className="story__text reveal">
          <p className="eyebrow">{t.story.eyebrow}</p>
          <h2 id="story-title" className="h-section">{t.story.title}</h2>
          <p className="lead story__lead">{t.story.lead}</p>
          <ol className="story__points">
            {t.story.points.map((p, i) => (
              <li key={p.title}>
                <span className="story__num num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="story__note">{t.story.note}</p>
        </div>
      </div>
    </section>
  );
}

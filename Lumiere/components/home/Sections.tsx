import Link from 'next/link';
import type { PortfolioItem, ProcessContent, TrustContent } from '@/types';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { roomTypeLabel } from '@/lib/rooms';

export function SectionHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-12 grid gap-6 md:mb-16 md:grid-cols-12 md:items-end">
      <div className="md:col-span-7">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-4 text-h2">{title}</h2>
      </div>
      <div className="md:col-span-5 md:pb-2">
        {text && <p className="lead">{text}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function Manifesto() {
  const pillars = [
    { n: '01', title: 'Архитектура', text: 'Потолок продолжает геометрию комнаты: ровные линии, чистые примыкания, продуманные уровни.' },
    { n: '02', title: 'Свет', text: 'Точечный, линейный, контурный — сценарий освещения закладывается вместе с полотном.' },
    { n: '03', title: 'Прозрачность', text: 'Вы видите, из чего складывается стоимость, ещё до звонка специалисту.' },
  ];
  return (
    <section className="section">
      <div className="container-x">
        <Reveal className="max-w-5xl">
          <p className="eyebrow">Философия</p>
          <p className="mt-6 font-display text-[clamp(1.85rem,1.2rem+2.6vw,3.6rem)] leading-[1.12] text-ink">
            Потолок — самая большая свободная поверхность в комнате. <span className="text-warm">Мы превращаем её в источник света, тишины и порядка.</span>
          </p>
        </Reveal>
        <div className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-3 md:gap-12">
          {pillars.map((p, i) => (
            <Reveal key={p.n} delay={i * 100}>
              <p className="font-display text-xl text-champagne-deep">{p.n}</p>
              <h3 className="mt-3 text-[1.75rem]">{p.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StudioTeaser() {
  const features = ['Несколько комнат в одном проекте', 'Г-образные комнаты, ниши и выступы', 'Редактор контура по точкам', 'Свет, карниз и детали дизайна', 'Живой расчёт с разбивкой', 'Отправка в WhatsApp или заявкой'];
  return (
    <section className="overflow-hidden bg-ink text-ivory">
      <div className="container-x section grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow !text-champagne">Студия потолка</p>
          <h2 className="mt-4 text-h2 text-white">Соберите проект за несколько минут</h2>
          <p className="lead mt-6 !text-white/70">Опишите помещения, выберите покрытие и свет — конфигуратор сразу покажет площадь, периметр и предварительную стоимость по правилам компании.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex gap-3 text-[0.9375rem] text-white/85">
                <Icon name="check" size={18} className="mt-0.5 shrink-0 text-champagne" />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/calculator" className="btn btn-accent mt-10">
            Создать свой потолок <Icon name="arrow" size={18} />
          </Link>
        </Reveal>
        <Reveal delay={150}>
          <StudioIllustration />
        </Reveal>
      </div>
    </section>
  );
}

/** A stylised preview of the configurator: plan + live summary. */
function StudioIllustration() {
  return (
    <div className="relative mx-auto max-w-xl" aria-hidden="true">
      <div className="rounded-[8px] border border-white/10 bg-[#2d2b28] p-5 shadow-2xl sm:p-7">
        <div className="flex gap-2">
          {['Гостиная', 'Спальня', 'Кухня'].map((r, i) => (
            <span key={r} className={`rounded-full px-3 py-1.5 text-xs ${i === 0 ? 'bg-ivory text-ink' : 'border border-white/15 text-white/60'}`}>
              {r}
            </span>
          ))}
        </div>
        <svg viewBox="0 0 320 210" className="mt-6 w-full">
          <defs>
            <pattern id="st-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#fff" strokeOpacity="0.06" />
            </pattern>
          </defs>
          <rect width="320" height="210" fill="url(#st-grid)" />
          <path d="M40 30H220V90H280V180H40Z" fill="#b79a72" fillOpacity="0.18" stroke="#e9dfcf" strokeWidth="1.5" />
          {[
            [40, 30],
            [220, 30],
            [220, 90],
            [280, 90],
            [280, 180],
            [40, 180],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#2d2b28" stroke="#e9dfcf" strokeWidth="1.5" />
          ))}
          <text x="130" y="22" fill="#fff" fillOpacity="0.55" fontSize="10" textAnchor="middle">
            4,5 м
          </text>
          <text x="295" y="138" fill="#fff" fillOpacity="0.55" fontSize="10">
            2,25
          </text>
          <text x="150" y="122" fill="#fff" fontSize="22" textAnchor="middle" fontFamily="var(--font-cormorant)">
            24,75 м²
          </text>
        </svg>
      </div>
      <div className="absolute -bottom-8 right-0 w-[62%] rounded-[6px] bg-ivory p-4 text-ink shadow-2xl sm:-right-6 sm:p-5">
        <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-muted">Предварительно</p>
        <div className="mt-3 space-y-1.5 text-xs">
          {['Покрытие', 'Монтаж', 'Профиль', 'Освещение'].map((l, i) => (
            <div key={l} className="flex items-center justify-between gap-3">
              <span>{l}</span>
              <span className="h-1.5 rounded-full bg-stone-deep" style={{ width: `${[56, 40, 30, 46][i]}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-4 h-px bg-line" />
        <p className="mt-3 font-display text-2xl">Итог по проекту</p>
      </div>
    </div>
  );
}

export function Process({ process }: { process: ProcessContent }) {
  return (
    <section className="section bg-paper">
      <div className="container-x">
        <SectionHeading eyebrow="Как мы работаем" title="От идеи до монтажа" text="Понятный путь без лишних визитов: сначала вы видите проект и примерную стоимость, потом специалист уточняет детали." />
        <ol className="grid gap-px overflow-hidden rounded-[6px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {process.steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={(i % 3) * 80} className="bg-paper p-7 sm:p-9">
              <p className="font-display text-[2.75rem] leading-none text-champagne">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-6 text-[1.6rem]">{s.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{s.text}</p>
            </Reveal>
          ))}
        </ol>
        {!process.confirmed && <p className="mt-6 text-sm text-muted">Порядок работы приведён как типовой и уточняется при консультации.</p>}
      </div>
    </section>
  );
}

export function PortfolioTeaser({ items }: { items: PortfolioItem[] }) {
  const shown = items.filter((p) => p.published).slice(0, 3);
  if (!shown.length) return null;
  return (
    <section className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Портфолио"
          title="Пространства, созданные светом"
          text="Концепт-решения и выполненные проекты. Каждая работа подписана, чтобы было понятно, что перед вами."
          action={
            <Link href="/portfolio" className="link-underline font-semibold">
              Всё портфолио
            </Link>
          }
        />
        <div className="grid gap-6 md:grid-cols-12">
          {shown.map((p, i) => (
            <Reveal key={p.id} delay={i * 100} className={i === 0 ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5'}>
              <Link href={`/portfolio/${p.slug}`} className="group block">
                <div className={`relative overflow-hidden rounded-[4px] bg-stone ${i === 0 ? 'aspect-[4/5] md:aspect-auto md:h-[44rem]' : 'aspect-[16/11] md:h-[21.25rem] md:aspect-auto'}`}>
                  <Photo src={p.cover} alt={p.coverAlt || p.title} fill sizes={i === 0 ? '(min-width: 768px) 58vw, 92vw' : '(min-width: 768px) 40vw, 92vw'} className="img-zoom object-cover" />
                  <span className="absolute left-4 top-4 rounded-[2px] bg-ivory/90 px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">{p.kind === 'concept' ? 'Концепт' : 'Проект'}</span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/70">{roomTypeLabel(p.roomType)} · {p.style}</p>
                    <h3 className="mt-2 text-[1.6rem] text-white">{p.title}</h3>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Trust({ trust }: { trust: TrustContent }) {
  return (
    <section className="section border-y border-line bg-stone/50">
      <div className="container-x">
        <SectionHeading eyebrow="Доверие и прозрачность" title="Только проверенная информация" text="Мы не публикуем выдуманные отзывы, рейтинги и сертификаты. Этот раздел заполняется реальными данными компании." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trust.items.map((t, i) => (
            <Reveal key={t.title} delay={i * 80} className="border-t border-ink pt-6">
              <h3 className="text-[1.5rem]">{t.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{t.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="section">
      <div className="container-x">
        <Reveal className="relative overflow-hidden rounded-[8px] bg-champagne-soft px-6 py-14 text-center sm:px-12 sm:py-20">
          <p className="eyebrow">Начните с идеи</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-h2">Узнайте предварительную стоимость своего потолка</h2>
          <p className="lead mx-auto mt-5 max-w-xl">Расчёт займёт несколько минут и ни к чему не обязывает. Контакты оставляете только если захотите.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/calculator" className="btn btn-primary h-14 px-8">
              Создать свой потолок
            </Link>
            <Link href="/contacts?measure=1#request" className="btn btn-outline h-14 px-8">
              Заказать бесплатный замер
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

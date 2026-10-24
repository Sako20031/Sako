import type { Metadata } from 'next';
import { getContent } from '@/lib/server/content';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

// PLACEHOLDER: the company must replace this text with its own policy,
// reviewed for the laws of its country (e.g. the Law of the Republic of
// Kazakhstan "On Personal Data and Its Protection").
export default async function PrivacyPage() {
  const { company } = await getContent();
  const owner = company.legalName || company.brandName;
  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <article className="container-x max-w-3xl">
        <p className="eyebrow">Документ</p>
        <h1 className="mt-4 text-h1">Политика конфиденциальности</h1>
        <p className="mt-6 rounded-[4px] border border-champagne bg-champagne-soft/40 p-4 text-sm">
          Это шаблон. Компания должна заменить его утверждённым текстом политики с реквизитами оператора персональных данных.
        </p>
        <div className="mt-10 space-y-8 text-[1.0625rem] leading-relaxed text-ink-soft">
          <section>
            <h2 className="text-h3 text-ink">Какие данные мы получаем</h2>
            <p className="mt-3">Имя, номер телефона, предпочтительный способ связи и время звонка, а также — по вашему желанию — адрес или район и комментарий. Параметры проекта из калькулятора (размеры помещений, выбранные решения) не являются персональными данными.</p>
          </section>
          <section>
            <h2 className="text-h3 text-ink">Зачем</h2>
            <p className="mt-3">Только чтобы связаться с вами по заявке, согласовать замер и подготовить расчёт. Мы не передаём данные третьим лицам для рекламы.</p>
          </section>
          <section>
            <h2 className="text-h3 text-ink">Где хранятся данные</h2>
            <p className="mt-3">Черновик проекта хранится только в вашем браузере (без имени и телефона). Отправленная заявка хранится в защищённой базе данных компании и доступна только её сотрудникам.</p>
          </section>
          <section>
            <h2 className="text-h3 text-ink">Ваши права</h2>
            <p className="mt-3">Вы можете запросить уточнение или удаление своих данных, связавшись с {owner}{company.email ? ` по адресу ${company.email}` : ''}{company.phone ? ` или по телефону ${company.phone}` : ''}.</p>
          </section>
        </div>
      </article>
    </div>
  );
}

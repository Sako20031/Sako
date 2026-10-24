import type { Metadata } from 'next';
import { LeadForm } from '@/components/lead-form/LeadForm';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import { getContent } from '@/lib/server/content';
import { whatsappLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Контакты и запись на замер',
  description: 'Свяжитесь с LUMIÈRE CEILINGS: консультация, бесплатный замер и точный расчёт стоимости натяжного потолка.',
  alternates: { canonical: '/contacts' },
};

export default async function ContactsPage() {
  const { company, pricing } = await getContent();
  const wa = whatsappLink(company.whatsapp, 'Здравствуйте! Хочу проконсультироваться по натяжному потолку.');
  const rows = [
    company.phone && { icon: 'phone' as const, label: 'Телефон', value: company.phone, href: `tel:${company.phone.replace(/[^\d+]/g, '')}` },
    company.email && { icon: 'chat' as const, label: 'E-mail', value: company.email, href: `mailto:${company.email}` },
    company.address && { icon: 'pin' as const, label: 'Адрес', value: company.address },
    company.hours && { icon: 'clock' as const, label: 'Часы работы', value: company.hours },
  ].filter(Boolean) as { icon: 'phone' | 'chat' | 'pin' | 'clock'; label: string; value: string; href?: string }[];

  return (
    <div className="pb-24 pt-32 lg:pt-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow">Контакты</p>
          <h1 className="mt-4 text-h1">Поговорим о вашем пространстве</h1>
          <p className="lead mt-6">Оставьте заявку на консультацию или замер — специалист свяжется с вами и ответит на вопросы.</p>
          {rows.length > 0 ? (
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {rows.map((r) => (
                <li key={r.label} className="flex items-start gap-4 py-4">
                  <Icon name={r.icon} className="mt-1 shrink-0 text-champagne-deep" />
                  <div>
                    <p className="text-sm text-muted">{r.label}</p>
                    {r.href ? (
                      <a href={r.href} className="text-lg hover:underline">
                        {r.value}
                      </a>
                    ) : (
                      <p className="text-lg">{r.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-[4px] border border-line bg-paper p-5 text-muted">Контактные данные компании будут опубликованы в ближайшее время. Пока вы можете оставить заявку через форму.</p>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-6">
              <WhatsAppIcon /> Написать в WhatsApp
            </a>
          )}
          {company.serviceAreas.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow">Где мы работаем</p>
              <p className="mt-3">{company.serviceAreas.map((a) => a.name).join(', ')}</p>
            </div>
          )}
        </div>
        <section id="request" className="scroll-mt-28 rounded-[6px] border border-line bg-paper p-6 sm:p-10 lg:col-span-7">
          <h2 className="text-h3">Заявка на замер или консультацию</h2>
          <p className="mt-2 text-muted">Если вы уже собрали проект в калькуляторе, отправьте его со страницы итогов — так специалист сразу увидит все детали.</p>
          <div className="mt-8">
            <LeadForm project={null} estimate={null} pricing={pricing} company={company} compact />
          </div>
        </section>
      </div>
    </div>
  );
}

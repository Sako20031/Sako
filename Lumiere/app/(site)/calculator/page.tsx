import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CalculatorClient } from '@/components/calculator/CalculatorClient';
import { catalogEntries } from '@/lib/catalog';
import { getContent } from '@/lib/server/content';

export const metadata: Metadata = {
  title: 'Калькулятор натяжного потолка',
  description: 'Пошаговый конфигуратор: несколько комнат, нестандартная форма, освещение и дизайн. Предварительный расчёт стоимости с подробной разбивкой.',
  alternates: { canonical: '/calculator' },
};

export default async function CalculatorPage() {
  const content = await getContent();
  return (
    <Suspense fallback={<div className="container-x min-h-[60vh] pt-32 text-muted">Загружаем конфигуратор…</div>}>
      <CalculatorClient pricing={content.pricing} company={content.company} catalog={catalogEntries(content)} />
    </Suspense>
  );
}

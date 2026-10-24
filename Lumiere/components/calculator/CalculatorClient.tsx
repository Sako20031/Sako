'use client';

import dynamic from 'next/dynamic';

// The configurator is fully interactive and starts from the draft saved in
// localStorage, so it renders on the client only.
export const CalculatorClient = dynamic(() => import('./Calculator').then((m) => m.Calculator), {
  ssr: false,
  loading: () => <div className="container-x min-h-[70vh] pt-32 text-muted">Загружаем конфигуратор…</div>,
});

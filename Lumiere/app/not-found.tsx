import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-ivory px-4 py-20 text-center">
      <div className="max-w-xl">
        <Link href="/" className="font-display text-2xl tracking-[0.14em]">
          LUMIÈRE
        </Link>
        <p className="mt-16 font-display text-[7rem] leading-none text-champagne">404</p>
        <h1 className="mt-6 text-h2">Такой страницы нет</h1>
        <p className="lead mt-4">Возможно, ссылка устарела. Начните с главной или сразу соберите свой потолок.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            На главную
          </Link>
          <Link href="/calculator" className="btn btn-outline">
            Открыть калькулятор
          </Link>
        </div>
      </div>
    </main>
  );
}

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { MobileDock } from '@/components/layout/MobileDock';
import { getContent } from '@/lib/server/content';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { company } = await getContent();
  return (
    <>
      <Header company={company} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer company={company} />
      <MobileDock company={company} />
    </>
  );
}

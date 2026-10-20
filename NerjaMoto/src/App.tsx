import { useI18n } from './i18n';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Catalogue } from './components/Catalogue';
import { Story } from './components/Story';
import { Destinations } from './components/Destinations';
import { Advantages } from './components/Advantages';
import { Reviews } from './components/Reviews';
import { Faq } from './components/Faq';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { BookingPanel } from './components/BookingPanel';
import { StickyCta } from './components/StickyCta';

export function App() {
  const { t } = useI18n();
  return (
    <>
      <a className="skip-link" href="#main">{t.a11y.skip}</a>
      <Header />
      <main id="main">
        <Hero />
        <Catalogue />
        <Story />
        <Destinations />
        <Advantages />
        <Reviews />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <StickyCta />
      <BookingPanel />
    </>
  );
}

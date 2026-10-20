import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/inter';
import './styles/base.css';
import './styles/layout.css';
import './styles/booking.css';
import { I18nProvider } from './i18n';
import { BookingProvider } from './state/booking';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BookingProvider>
        <App />
      </BookingProvider>
    </I18nProvider>
  </StrictMode>,
);

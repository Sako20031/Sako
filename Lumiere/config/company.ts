import type { CompanyConfig } from '@/types';

// Company details. Empty strings are placeholders: the site hides or softens
// the related UI until real data is entered in the admin panel (Контакты).
export const company: CompanyConfig = {
  brandName: 'LUMIÈRE CEILINGS',
  logoText: 'LUMIÈRE',
  logoImage: '',
  tagline: 'Натяжные потолки и архитектурный свет',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  instagram: '',
  hours: '',
  serviceAreas: [],
  legalName: '',
  legalId: '',
  warranty: '',
  country: { code: 'KZ', dialCode: '+7', nationalDigits: 10, example: '+7 700 123 45 67' },
  currency: { code: 'KZT', symbol: '₸', locale: 'ru-RU' },
};

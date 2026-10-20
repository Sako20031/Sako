import { business } from '../config/business';
import type { Lang } from '../i18n';
import { formatDate } from './dates';
import { formatPrice } from './pricing';

export interface BookingRequest {
  name: string;
  phone: string;
  scooterName: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  days: number;
  quantity: number;
  total: number;
  comments: string;
}

const copy = {
  es: {
    hello: `Hola, ${business.name}. Quiero solicitar una reserva.`,
    name: 'Nombre',
    phone: 'Teléfono de contacto',
    scooter: 'Scooter',
    start: 'Fecha de recogida',
    end: 'Fecha de devolución',
    days: 'Duración',
    dayUnit: (n: number) => (n === 1 ? '1 día' : `${n} días`),
    pickup: 'Hora de recogida',
    ret: 'Hora de devolución',
    qty: 'Cantidad',
    price: 'Precio estimado',
    comments: 'Comentarios',
    ask: '¿Podéis confirmarme la disponibilidad y el precio final?',
    thanks: 'Gracias.',
  },
  en: {
    hello: `Hello, ${business.name}. I would like to request a booking.`,
    name: 'Name',
    phone: 'Contact phone',
    scooter: 'Scooter',
    start: 'Pick-up date',
    end: 'Return date',
    days: 'Duration',
    dayUnit: (n: number) => (n === 1 ? '1 day' : `${n} days`),
    pickup: 'Pick-up time',
    ret: 'Return time',
    qty: 'Quantity',
    price: 'Estimated price',
    comments: 'Comments',
    ask: 'Could you confirm availability and the final price?',
    thanks: 'Thank you.',
  },
} as const;

/** Removes control characters and collapses whitespace in single-line fields. */
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Same for the multi-line comment, but keeps line breaks. */
const cleanMultiline = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function buildBookingMessage(r: BookingRequest, lang: Lang): string {
  const c = copy[lang];
  const lines = [
    c.hello,
    '',
    `${c.name}: ${clean(r.name)}`,
    `${c.phone}: ${clean(r.phone)}`,
    `${c.scooter}: ${r.scooterName}`,
    `${c.start}: ${formatDate(r.startDate, lang, true)}`,
    `${c.end}: ${formatDate(r.endDate, lang, true)}`,
    `${c.days}: ${c.dayUnit(r.days)}`,
    `${c.pickup}: ${r.pickupTime}`,
    `${c.ret}: ${r.returnTime}`,
    `${c.qty}: ${r.quantity}`,
    `${c.price}: ${formatPrice(r.total, lang)}`,
  ];
  const comments = cleanMultiline(r.comments);
  if (comments) lines.push('', `${c.comments}: ${comments}`);
  lines.push('', c.ask, '', c.thanks);
  return lines.join('\n');
}

/** wa.me link with the message safely URL-encoded. */
export function buildWhatsAppUrl(message: string, number: string = business.whatsappNumber): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

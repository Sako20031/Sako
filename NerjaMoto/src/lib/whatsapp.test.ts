import { describe, expect, it } from 'vitest';
import { buildBookingMessage, buildWhatsAppUrl } from './whatsapp';
import { isValidPhone, validateContact } from './validation';

const req = {
  name: 'José Muñoz & Zoë',
  phone: '+44 7700 900123',
  scooterName: 'Honda PCX 125',
  startDate: '2026-10-24',
  endDate: '2026-10-27',
  pickupTime: '10:00',
  returnTime: '10:00',
  days: 3,
  quantity: 1,
  total: 120,
  comments: '¿Dos cascos?\nLlegamos #tarde?',
};

describe('WhatsApp message', () => {
  it('contains every booking field in Spanish', () => {
    const m = buildBookingMessage(req, 'es');
    expect(m).toContain('Hola, Nerja Moto Rent. Quiero solicitar una reserva.');
    expect(m).toContain('Nombre: José Muñoz & Zoë');
    expect(m).toContain('Teléfono de contacto: +44 7700 900123');
    expect(m).toContain('Scooter: Honda PCX 125');
    expect(m).toContain('Duración: 3 días');
    expect(m).toContain('Hora de recogida: 10:00');
    expect(m).toContain('Cantidad: 1');
    expect(m).toMatch(/Precio estimado: 120\s€/);
    expect(m).toContain('Comentarios: ¿Dos cascos?\nLlegamos #tarde?');
    expect(m).toContain('¿Podéis confirmarme la disponibilidad y el precio final?');
  });
  it('is generated in English too', () => {
    const m = buildBookingMessage(req, 'en');
    expect(m).toContain('Contact phone: +44 7700 900123');
    expect(m).toContain('Duration: 3 days');
  });
  it('strips line breaks from single-line fields', () => {
    const m = buildBookingMessage({ ...req, name: 'Ana\nScooter: Fake' }, 'es');
    expect(m).toContain('Nombre: Ana Scooter: Fake');
  });
  it('encodes the URL safely and round-trips', () => {
    const msg = buildBookingMessage(req, 'es');
    const url = buildWhatsAppUrl(msg);
    expect(url.startsWith('https://wa.me/34638000001?text=')).toBe(true);
    const encoded = url.split('?text=')[1]!;
    expect(encoded).not.toMatch(/[\s&#\n]/);
    expect(decodeURIComponent(encoded)).toBe(msg);
  });
});

describe('contact validation', () => {
  it('requires a country code', () => {
    expect(isValidPhone('+34 600 000 000')).toBe(true);
    expect(isValidPhone('0044 7700 900123')).toBe(true);
    expect(isValidPhone('600000000')).toBe(false);
    expect(isValidPhone('+34 12')).toBe(false);
  });
  it('requires a name', () => {
    expect(validateContact('', '+34600000000')).toEqual({ name: 'name' });
    expect(validateContact('Zoë', 'abc')).toEqual({ phone: 'phone' });
  });
});

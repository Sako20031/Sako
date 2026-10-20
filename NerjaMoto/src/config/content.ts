/**
 * Editable content: trust claims, FAQ and destinations.
 *
 * Rule: anything that is a business promise or a rental policy stays hidden
 * (or answered with "ask us on WhatsApp") until `confirmed: true`.
 */

type L = { es: string; en: string };

/* ------------------------------------------------------------------ claims */

export interface Claim {
  id: string;
  label: L;
  /** Only confirmed claims are published. */
  confirmed: boolean;
}

/**
 * Short claims for the hero trust strip.
 * The first three come straight from the business information supplied;
 * the rest are proposals waiting for the owner's OK.
 */
export const heroClaims: Claim[] = [
  { id: 'honda', label: { es: 'Scooters Honda', en: 'Honda scooters' }, confirmed: true },
  { id: 'burriana', label: { es: 'Recogida en Paseo Burriana', en: 'Pick-up on Paseo Burriana' }, confirmed: true },
  { id: 'hours', label: { es: 'Todos los días, 10:00–20:00', en: 'Every day, 10:00–20:00' }, confirmed: true },
  // TODO(owner): confirm before publishing.
  { id: 'helmet', label: { es: 'Casco incluido', en: 'Helmet included' }, confirmed: false },
  { id: 'fees', label: { es: 'Sin cargos ocultos', en: 'No hidden fees' }, confirmed: false },
];

export interface Advantage {
  id: string;
  icon: 'bike' | 'receipt' | 'pin' | 'chat';
  title: L;
  text: L;
  confirmed: boolean;
}

export const advantages: Advantage[] = [
  {
    id: 'honda',
    icon: 'bike',
    title: { es: 'Tu scooter, tu aventura', en: 'Your scooter, your adventure' },
    text: {
      es: 'Elige entre nuestros modelos Honda el que mejor se adapte a tu viaje.',
      en: 'Choose the Honda model that best suits your trip.',
    },
    confirmed: true,
  },
  {
    id: 'prices',
    icon: 'receipt',
    title: { es: 'Precios claros', en: 'Clear prices' },
    text: {
      es: 'Ves el precio estimado antes de pedir la reserva. Sin sorpresas en el proceso.',
      en: 'You see the estimated price before you request a booking. No surprises along the way.',
    },
    confirmed: true,
  },
  {
    id: 'burriana',
    icon: 'pin',
    title: { es: 'Junto a Burriana', en: 'By Burriana Beach' },
    text: {
      es: 'Recogida en el Paseo Burriana, en Nerja.',
      en: 'Pick-up on Paseo Burriana, in Nerja.',
    },
    confirmed: true,
  },
  {
    id: 'personal',
    icon: 'chat',
    title: { es: 'Trato cercano', en: 'Personal service' },
    text: {
      es: 'Resolvemos tus dudas directamente por WhatsApp y te ayudamos a preparar tu recorrido.',
      en: 'We answer your questions directly on WhatsApp and help you plan your ride.',
    },
    confirmed: true,
  },
];

/* --------------------------------------------------------------------- FAQ */

export interface FaqItem {
  id: string;
  q: L;
  /** null = not confirmed yet → the site invites the visitor to ask on WhatsApp. */
  a: L | null;
}

export const faq: FaqItem[] = [
  {
    id: 'confirm',
    q: { es: '¿Cómo confirmo mi reserva?', en: 'How do I confirm my booking?' },
    a: {
      es: 'Elige tu scooter y tus fechas, revisa la solicitud y envíala por WhatsApp. Te responderemos para confirmar la disponibilidad y el precio final. La reserva solo está confirmada cuando te lo confirmamos nosotros.',
      en: 'Choose your scooter and dates, review the request and send it on WhatsApp. We will reply to confirm availability and the final price. Your booking is only confirmed once we confirm it.',
    },
  },
  {
    id: 'unavailable',
    q: {
      es: '¿Qué pasa si mi scooter preferido no está disponible?',
      en: 'What if my preferred scooter is unavailable?',
    },
    a: {
      es: 'La web no muestra disponibilidad en tiempo real. Si el modelo no está libre en tus fechas, te lo diremos por WhatsApp antes de confirmar nada.',
      en: 'The website does not show live availability. If the model is not free on your dates, we will tell you on WhatsApp before anything is confirmed.',
    },
  },
  // TODO(owner): the answers below must come from the owner and be checked
  // against Spanish regulations before they are published.
  { id: 'licence', q: { es: '¿Qué carnet de conducir necesito?', en: 'What driving licence do I need?' }, a: null },
  { id: 'age', q: { es: '¿Hay una edad mínima?', en: 'Is there a minimum age?' }, a: null },
  { id: 'deposit', q: { es: '¿Hay que dejar fianza?', en: 'Is a deposit required?' }, a: null },
  { id: 'helmet', q: { es: '¿El casco está incluido?', en: 'Is a helmet included?' }, a: null },
  { id: 'insurance', q: { es: '¿Qué seguro incluye?', en: 'What insurance is included?' }, a: null },
  { id: 'cancel', q: { es: '¿Puedo cancelar mi reserva?', en: 'Can I cancel my booking?' }, a: null },
  {
    id: 'afterhours',
    q: {
      es: '¿Puedo devolver el scooter fuera del horario?',
      en: 'Can I return the scooter outside opening hours?',
    },
    a: null,
  },
];

/* ------------------------------------------------------------ destinations */

export interface Destination {
  id: string;
  art: 'frigiliana' | 'maro' | 'herradura';
  name: string;
  kicker: L;
  text: L;
  /** Destination for Google Maps directions (place name, not coordinates). */
  mapsQuery: string;
  /**
   * Approximate distance from the shop, e.g. '7 km'. Leave null until it has been
   * checked on a mapping service — the card then links to the route instead.
   */
  distance: string | null;
}

export const destinations: Destination[] = [
  {
    id: 'frigiliana',
    art: 'frigiliana',
    name: 'Frigiliana',
    kicker: { es: 'Pueblo blanco', en: 'White village' },
    text: {
      es: 'Calles empedradas, casas encaladas y vistas al mar desde la montaña. Un clásico de la Axarquía.',
      en: 'Cobbled lanes, whitewashed houses and sea views from the hillside. A classic of the Axarquía.',
    },
    mapsQuery: 'Frigiliana, Málaga',
    distance: null,
  },
  {
    id: 'maro',
    art: 'maro',
    name: 'Cueva de Nerja · Maro',
    kicker: { es: 'Cuevas y calas', en: 'Caves and coves' },
    text: {
      es: 'La famosa Cueva de Nerja y el pequeño pueblo de Maro, puerta de entrada a las calas del paraje natural de los acantilados.',
      en: 'The famous Nerja Caves and the small village of Maro, gateway to the coves of the Maro cliffs natural area.',
    },
    mapsQuery: 'Cueva de Nerja, Maro, Málaga',
    distance: null,
  },
  {
    id: 'herradura',
    art: 'herradura',
    name: 'Costa Tropical · La Herradura',
    kicker: { es: 'Bahías de Granada', en: 'Granada bays' },
    text: {
      es: 'Ya en la provincia de Granada: una bahía en forma de herradura entre montañas, con paseo marítimo y aguas claras.',
      en: 'Across the border in Granada province: a horseshoe-shaped bay between mountains, with a seafront promenade and clear water.',
    },
    mapsQuery: 'La Herradura, Almuñécar, Granada',
    distance: null,
  },
];

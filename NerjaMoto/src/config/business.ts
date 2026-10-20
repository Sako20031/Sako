/**
 * Business details — the single place to edit contact data, hours and links.
 *
 * Everything marked `verified: false` or TODO is shown carefully (or hidden)
 * on the site until the owner confirms it.
 */

export const business = {
  name: 'Nerja Moto Rent',

  address: {
    street: 'Paseo Burriana',
    postalCode: '29780',
    city: 'Nerja',
    region: 'Málaga',
    country: 'España',
    countryEn: 'Spain',
    countryCode: 'ES',
  },

  /** International format without "+" or spaces — used for wa.me links. */
  whatsappNumber: '34638000001',
  /** Human-readable version of the same number. */
  whatsappDisplay: '+34 638 00 00 01',

  /** Opening hours. Used for display, pick-up time options and structured data. */
  hours: {
    days: 'daily' as const,
    open: '10:00',
    close: '20:00',
  },

  /**
   * Google Maps link. No coordinates are stored on purpose: the link searches the
   * address, so it never points to an invented location.
   * TODO(owner): replace with the share link of the official Google Business Profile.
   */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Nerja Moto Rent, Paseo Burriana, 29780 Nerja, Málaga'),

  /**
   * TODO(owner): official Google review link (Google Business Profile → "Ask for reviews").
   * While it is null, the reviews button opens a Google Maps search for the business.
   */
  googleReviewsUrl: null as string | null,

  /**
   * Reported Google rating. It is NOT displayed until `verified` is set to true
   * after checking the live Google Business Profile.
   */
  rating: {
    value: 4.7,
    count: 15,
    verified: false,
  },

  /**
   * Public site URL (no trailing slash), used for canonical/OG/sitemap.
   * Set it with the SITE_URL environment variable at build time.
   */
  siteUrl: (import.meta.env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? '',
} as const;

export const fullAddress = (lang: 'es' | 'en') =>
  `${business.address.street}, ${business.address.postalCode} ${business.address.city}, ` +
  `${business.address.region}, ${lang === 'es' ? business.address.country : business.address.countryEn}`;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${business.whatsappNumber}` + (text ? `?text=${encodeURIComponent(text)}` : '');

export const reviewsUrl = () =>
  business.googleReviewsUrl ??
  'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Nerja Moto Rent Paseo Burriana Nerja reseñas');

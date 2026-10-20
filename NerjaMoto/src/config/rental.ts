/**
 * Rental inventory and pricing — edit this file to change models and rates.
 *
 * ⚠ PRELIMINARY DATA. Models, prices and every rule below are examples from the
 * project brief and must be confirmed by the owner before launch.
 */

export type ScooterId = string;

export interface Scooter {
  id: ScooterId;
  name: string;
  /** Engine capacity in cm³. */
  cc: number;
  /** Visual style of the placeholder illustration (until a real photo is added). */
  silhouette: 'compact' | 'touring' | 'maxi';
  /**
   * Real photo of THIS model: import it (e.g. from '../assets/photos/pcx-125.jpg') and put the URL here.
   * Leave null to show the neutral illustration. Never use a photo of another model.
   */
  photo: string | null;
  description: { es: string; en: string };
  /** Price per day (EUR) by rental length. */
  rates: {
    oneDay: number;
    threePlus: number;
    sevenPlus: number;
  };
}

export const rentalConfig = {
  currency: 'EUR',
  pricingUnit: 'day' as const,

  /**
   * Duration discounts (3–6 days → threePlus, 7+ days → sevenPlus).
   * OFF until the owner confirms them: while false, every day is charged at `oneDay`.
   */
  durationDiscountsEnabled: false,

  /**
   * How the duration is counted: calendar days between pick-up date and return date.
   * A same-day return counts as 1 day. Both rules are shown to the visitor and
   * still need owner confirmation.
   */
  sameDayCountsAsOneDay: true,

  /** Longest period the online estimate covers; longer rentals are quoted on WhatsApp. */
  maxDays: 30,

  /** Form limit only — NOT stock. Availability is always confirmed on WhatsApp. */
  maxQuantity: 4,

  /** Pick-up/return time slots, in minutes (inside opening hours). */
  timeSlotMinutes: 30,

  scooters: [
    {
      id: 'vision-110',
      name: 'Honda Vision 110',
      cc: 110,
      silhouette: 'compact',
      photo: null,
      description: {
        es: 'Ligera y práctica para moverte por el pueblo y las playas cercanas.',
        en: 'Lightweight and practical for getting around town and nearby beaches.',
      },
      rates: { oneDay: 30, threePlus: 27, sevenPlus: 24 },
    },
    {
      id: 'pcx-125',
      name: 'Honda PCX 125',
      cc: 125,
      silhouette: 'touring',
      photo: null,
      description: {
        es: 'Cómoda para trayectos más largos y para recorrer la costa.',
        en: 'Comfortable for longer rides and exploring the coast.',
      },
      rates: { oneDay: 40, threePlus: 36, sevenPlus: 32 },
    },
    {
      id: 'forza-125',
      name: 'Honda Forza 125',
      cc: 125,
      silhouette: 'maxi',
      photo: null,
      description: {
        es: 'Un scooter más grande para una conducción más confortable.',
        en: 'A larger scooter for a more comfortable ride.',
      },
      rates: { oneDay: 50, threePlus: 45, sevenPlus: 40 },
    },
  ] satisfies Scooter[] as Scooter[],
};

export const findScooter = (id: ScooterId | null | undefined) =>
  rentalConfig.scooters.find((s) => s.id === id) ?? null;

import { rentalConfig, type Scooter } from '../config/rental';
import { daysBetween, parseIsoDate, toMinutes } from './dates';

export type RateTier = 'oneDay' | 'threePlus' | 'sevenPlus';

export type PeriodError =
  | 'missingDates'
  | 'invalidDate'
  | 'startInPast'
  | 'endBeforeStart'
  | 'tooLong'
  | 'timePassed';

export type PeriodResult =
  | { ok: true; days: number; sameDay: boolean; lateReturn: boolean }
  | { ok: false; error: PeriodError };

export interface PeriodInput {
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  /** Local today (YYYY-MM-DD) and current minutes — injectable for tests. */
  today: string;
  nowMinutes: number;
}

/** Validates the rental period and returns the number of billable days. */
export function computePeriod(p: PeriodInput, config = rentalConfig): PeriodResult {
  if (!p.startDate || !p.endDate) return { ok: false, error: 'missingDates' };
  if (parseIsoDate(p.startDate) === null || parseIsoDate(p.endDate) === null) {
    return { ok: false, error: 'invalidDate' };
  }
  const fromToday = daysBetween(p.today, p.startDate);
  if (fromToday === null || fromToday < 0) return { ok: false, error: 'startInPast' };

  const diff = daysBetween(p.startDate, p.endDate)!;
  if (diff < 0) return { ok: false, error: 'endBeforeStart' };

  const sameDay = diff === 0;
  if (sameDay && !config.sameDayCountsAsOneDay) return { ok: false, error: 'endBeforeStart' };
  if (sameDay && p.pickupTime && p.returnTime && toMinutes(p.returnTime) <= toMinutes(p.pickupTime)) {
    return { ok: false, error: 'endBeforeStart' };
  }
  if (fromToday === 0 && p.pickupTime && toMinutes(p.pickupTime) <= p.nowMinutes) {
    return { ok: false, error: 'timePassed' };
  }

  const days = Math.max(1, diff);
  if (days > config.maxDays) return { ok: false, error: 'tooLong' };

  const lateReturn =
    !sameDay && !!p.pickupTime && !!p.returnTime && toMinutes(p.returnTime) > toMinutes(p.pickupTime);

  return { ok: true, days, sameDay, lateReturn };
}

export function tierFor(days: number, config = rentalConfig): RateTier {
  if (!config.durationDiscountsEnabled) return 'oneDay';
  if (days >= 7) return 'sevenPlus';
  if (days >= 3) return 'threePlus';
  return 'oneDay';
}

export interface Estimate {
  dailyRate: number;
  tier: RateTier;
  days: number;
  quantity: number;
  total: number;
}

export function estimate(scooter: Scooter, days: number, quantity: number, config = rentalConfig): Estimate {
  const tier = tierFor(days, config);
  const dailyRate = scooter.rates[tier];
  return { dailyRate, tier, days, quantity, total: dailyRate * days * quantity };
}

/** Lowest per-day price a visitor can get with the active rules ("desde"). */
export function fromPrice(scooter: Scooter, config = rentalConfig): number {
  return config.durationDiscountsEnabled
    ? Math.min(scooter.rates.oneDay, scooter.rates.threePlus, scooter.rates.sevenPlus)
    : scooter.rates.oneDay;
}

export function formatPrice(value: number, lang: 'es' | 'en'): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', {
    style: 'currency',
    currency: rentalConfig.currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

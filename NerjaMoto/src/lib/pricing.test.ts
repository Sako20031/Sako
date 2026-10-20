import { describe, expect, it } from 'vitest';
import { rentalConfig } from '../config/rental';
import { computePeriod, estimate, tierFor } from './pricing';
import { daysBetween, parseIsoDate, timeSlots } from './dates';

const base = { pickupTime: '10:00', returnTime: '10:00', today: '2026-10-20', nowMinutes: 9 * 60 };
const pcx = rentalConfig.scooters.find((s) => s.id === 'pcx-125')!;
const withDiscounts = { ...rentalConfig, durationDiscountsEnabled: true };

describe('dates', () => {
  it('counts calendar days across month ends and DST', () => {
    expect(daysBetween('2026-10-24', '2026-10-27')).toBe(3);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // DST change on 25 Oct
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
  });
  it('rejects impossible dates', () => {
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(parseIsoDate('hello')).toBeNull();
  });
  it('builds time slots inside opening hours', () => {
    const s = timeSlots('10:00', '20:00', 30);
    expect(s[0]).toBe('10:00');
    expect(s.at(-1)).toBe('20:00');
    expect(s).toHaveLength(21);
  });
});

describe('computePeriod', () => {
  it('calculates the brief example: 24 → 27 October = 3 days', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-24', endDate: '2026-10-27' })).toEqual({
      ok: true, days: 3, sameDay: false, lateReturn: false,
    });
  });
  it('rejects reversed ranges', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-27', endDate: '2026-10-24' })).toEqual({ ok: false, error: 'endBeforeStart' });
  });
  it('rejects past pick-up dates and missing dates', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-19', endDate: '2026-10-22' })).toEqual({ ok: false, error: 'startInPast' });
    expect(computePeriod({ ...base, startDate: '', endDate: '2026-10-22' })).toEqual({ ok: false, error: 'missingDates' });
  });
  it('same-day return counts as 1 day, but only if return is after pick-up', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-21', endDate: '2026-10-21', returnTime: '18:00' })).toMatchObject({ ok: true, days: 1, sameDay: true });
    expect(computePeriod({ ...base, startDate: '2026-10-21', endDate: '2026-10-21', returnTime: '10:00' })).toEqual({ ok: false, error: 'endBeforeStart' });
  });
  it('rejects a pick-up time that has already passed today', () => {
    expect(computePeriod({ ...base, nowMinutes: 12 * 60, startDate: '2026-10-20', endDate: '2026-10-22', pickupTime: '11:00' })).toEqual({ ok: false, error: 'timePassed' });
  });
  it('flags a later return time instead of silently charging it', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-21', endDate: '2026-10-24', returnTime: '18:00' })).toMatchObject({ ok: true, days: 3, lateReturn: true });
  });
  it('caps the online estimate at maxDays', () => {
    expect(computePeriod({ ...base, startDate: '2026-10-21', endDate: '2026-12-21' })).toEqual({ ok: false, error: 'tooLong' });
  });
});

describe('estimate', () => {
  it('uses the flat daily rate while discounts are not confirmed', () => {
    expect(rentalConfig.durationDiscountsEnabled).toBe(false);
    expect(estimate(pcx, 3, 1).total).toBe(120); // €40 × 3 × 1
    expect(estimate(pcx, 3, 2).total).toBe(240);
  });
  it('applies the tiers once enabled: 1–2, 3–6, 7+ days', () => {
    expect(tierFor(2, withDiscounts)).toBe('oneDay');
    expect(tierFor(3, withDiscounts)).toBe('threePlus');
    expect(tierFor(6, withDiscounts)).toBe('threePlus');
    expect(tierFor(7, withDiscounts)).toBe('sevenPlus');
    expect(estimate(pcx, 3, 1, withDiscounts).total).toBe(108); // €36 × 3
    expect(estimate(pcx, 7, 1, withDiscounts).total).toBe(224); // €32 × 7
  });
});

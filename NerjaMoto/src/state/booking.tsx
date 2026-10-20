import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { business } from '../config/business';
import { findScooter, rentalConfig, type Scooter, type ScooterId } from '../config/rental';
import { addDays, daysBetween, todayIso } from '../lib/dates';
import { computePeriod, estimate, type Estimate, type PeriodResult } from '../lib/pricing';

export interface BookingFields {
  scooterId: ScooterId | null;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  quantity: number;
  name: string;
  phone: string;
  comments: string;
}

export type Step = 0 | 1 | 2;

interface BookingState {
  fields: BookingFields;
  set: <K extends keyof BookingFields>(key: K, value: BookingFields[K]) => void;
  /** Sets the duration by moving the return date (used by the card steppers). */
  setDays: (days: number) => void;
  /** Days currently shown in the catalogue (valid period or the last good value). */
  days: number;
  scooter: Scooter | null;
  period: PeriodResult;
  quote: Estimate | null;
  open: boolean;
  step: Step;
  setStep: (s: Step) => void;
  openFor: (id: ScooterId) => void;
  close: () => void;
}

const BookingContext = createContext<BookingState | null>(null);

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

function defaults(): BookingFields {
  // Start tomorrow so the default never collides with a pick-up time that has passed.
  const start = addDays(todayIso(), 1);
  return {
    scooterId: null,
    startDate: start,
    endDate: addDays(start, 1),
    pickupTime: business.hours.open,
    returnTime: business.hours.open,
    quantity: 1,
    name: '',
    phone: '',
    comments: '',
  };
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<BookingFields>(defaults);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);

  const set = useCallback(<K extends keyof BookingFields>(key: K, value: BookingFields[K]) => {
    setFields((f) => {
      const next = { ...f, [key]: value };
      // Keep the duration when the pick-up date moves forward past the return date.
      if (key === 'startDate' && typeof value === 'string' && value) {
        const prevDays = daysBetween(f.startDate, f.endDate);
        const gap = daysBetween(value, f.endDate);
        if (gap !== null && gap < 1) next.endDate = addDays(value, Math.max(1, prevDays ?? 1));
      }
      return next;
    });
  }, []);

  const setDays = useCallback((days: number) => {
    const d = Math.min(rentalConfig.maxDays, Math.max(1, Math.round(days)));
    setFields((f) => {
      const start = f.startDate && daysBetween(todayIso(), f.startDate)! >= 0 ? f.startDate : addDays(todayIso(), 1);
      return { ...f, startDate: start, endDate: addDays(start, d) };
    });
  }, []);

  const period = computePeriod({
    startDate: fields.startDate,
    endDate: fields.endDate,
    pickupTime: fields.pickupTime,
    returnTime: fields.returnTime,
    today: todayIso(),
    nowMinutes: nowMinutes(),
  });

  const scooter = findScooter(fields.scooterId);
  const days = period.ok ? period.days : Math.max(1, daysBetween(fields.startDate, fields.endDate) ?? 1);
  const quote = scooter && period.ok ? estimate(scooter, period.days, fields.quantity) : null;

  const openFor = useCallback((id: ScooterId) => {
    setFields((f) => ({ ...f, scooterId: id }));
    setStep(0);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const value: BookingState = { fields, set, setDays, days, scooter, period, quote, open, step, setStep, openFor, close };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}

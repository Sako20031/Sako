import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Info, Pencil, X, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { business } from '../config/business';
import { rentalConfig } from '../config/rental';
import { addDays, formatDate, timeSlots, todayIso } from '../lib/dates';
import { formatPrice, type PeriodError, type RateTier } from '../lib/pricing';
import { validateContact, type ContactErrors } from '../lib/validation';
import { buildBookingMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import { useBooking, type Step } from '../state/booking';
import { ScooterImage } from './Catalogue';
import { Stepper } from './ui/Stepper';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

const SLOTS = timeSlots(business.hours.open, business.hours.close, rentalConfig.timeSlotMinutes);

function Field({ id, label, hint, error, children, optional }: {
  id: string; label: string; hint?: string; error?: string; optional?: string; children: ReactNode;
}) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label} {optional && <span className="field__opt">({optional})</span>}
      </label>
      {children}
      {hint && !error && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export function BookingPanel() {
  const { t, lang } = useI18n();
  const b = useBooking();
  const { fields, set, scooter, period, quote, open, step, setStep, close } = b;
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const periodError = (e: PeriodError) => (e === 'tooLong' ? t.errors.tooLong(rentalConfig.maxDays) : t.errors[e]);

  // Open/close side effects: focus management, scroll lock, Escape, focus trap.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    document.body.classList.add('no-scroll');
    const raf = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  // New step: scroll to top and move focus to the step heading.
  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0 });
    dialogRef.current?.querySelector<HTMLElement>('.booking__step-title')?.focus({ preventScroll: true });
    setSent(false);
    setCopied(false);
  }, [step, open]);

  const message = useMemo(() => {
    if (!scooter || !quote || !period.ok) return '';
    return buildBookingMessage(
      {
        name: fields.name,
        phone: fields.phone,
        scooterName: scooter.name,
        startDate: fields.startDate,
        endDate: fields.endDate,
        pickupTime: fields.pickupTime,
        returnTime: fields.returnTime,
        days: period.ok ? period.days : 0,
        quantity: fields.quantity,
        total: quote.total,
        comments: fields.comments,
      },
      lang,
    );
  }, [scooter, quote, period, fields, lang]);

  if (!open) return null;

  const goContact = () => period.ok && scooter && setStep(1);
  const goReview = () => {
    const errs = validateContact(fields.name, fields.phone);
    setErrors(errs);
    if (errs.name || errs.phone) {
      requestAnimationFrame(() =>
        dialogRef.current?.querySelector<HTMLElement>(errs.name ? '#bk-name' : '#bk-phone')?.focus(),
      );
      return;
    }
    setStep(2);
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const tiers: RateTier[] = rentalConfig.durationDiscountsEnabled ? ['oneDay', 'threePlus', 'sevenPlus'] : ['oneDay'];
  const today = todayIso();

  const priceBlock = scooter && (
    <div className="quote" aria-live="polite">
      {quote && period.ok ? (
        <>
          <div className="quote__row">
            <span>{t.booking.duration}</span>
            <strong className="num">{t.units.days(period.days)}</strong>
          </div>
          <div className="quote__row">
            <span>{t.booking.breakdown}</span>
            <span className="num">
              {formatPrice(quote.dailyRate, lang)} × {t.units.days(quote.days)} × {quote.quantity}
            </span>
          </div>
          <div className="quote__total">
            <span>{t.booking.estimate}</span>
            <strong className="price" key={quote.total}>{formatPrice(quote.total, lang)}</strong>
          </div>
          <ul className="quote__notes">
            <li>{t.booking.unitNote}</li>
            {period.sameDay && <li>{t.booking.sameDayNote}</li>}
            {period.lateReturn && <li>{t.booking.lateNote}</li>}
          </ul>
        </>
      ) : (
        !period.ok && (
          <p className="quote__error" role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {periodError(period.error)}
          </p>
        )
      )}
    </div>
  );

  return (
    <div className="booking-layer">
      <div className="booking-backdrop" onClick={close} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="booking"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <header className="booking__header">
          <div>
            <p className="booking__kicker">{t.booking.stepOf(step + 1, 3)}</p>
            <h2 id="booking-title" className="booking__title">{t.booking.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label={t.a11y.close} data-autofocus>
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <ol className="booking__steps" aria-label={t.booking.title}>
          {t.booking.steps.map((label, i) => (
            <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="num">{i < step ? <Check size={13} aria-hidden="true" /> : i + 1}</span> {label}
            </li>
          ))}
        </ol>

        <div className="booking__body" ref={bodyRef}>
          {step === 0 && (
            <div className="booking__step">
              <h3 className="booking__step-title sr-only" tabIndex={-1}>{t.booking.steps[0]}</h3>

              <fieldset className="pick">
                <legend className="field__label">{t.booking.scooter}</legend>
                <div className="pick__list">
                  {rentalConfig.scooters.map((s) => (
                    <label key={s.id} className={`pick__item ${fields.scooterId === s.id ? 'is-on' : ''}`}>
                      <input
                        type="radio"
                        name="scooter"
                        value={s.id}
                        checked={fields.scooterId === s.id}
                        onChange={() => set('scooterId', s.id)}
                      />
                      <ScooterImage scooter={s} priority />
                      <span className="pick__name">{s.name}</span>
                      <span className="pick__price num">
                        {formatPrice(s.rates.oneDay, lang)}
                        {t.hero.perDay}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {scooter && (
                <div className="rates">
                  <p className="field__label">{t.booking.rates} · {scooter.name}</p>
                  <table>
                    <tbody>
                      {tiers.map((tier) => (
                        <tr key={tier} className={quote?.tier === tier ? 'is-on' : ''}>
                          <th scope="row">{rentalConfig.durationDiscountsEnabled ? t.booking.rateRow[tier] : t.booking.flatRate}</th>
                          <td className="num">{formatPrice(scooter.rates[tier], lang)}{t.hero.perDay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rentalConfig.durationDiscountsEnabled && <p className="field__hint">{t.booking.discountsPending}</p>}
                </div>
              )}

              <div className="grid-2">
                <Field id="bk-start" label={t.booking.startDate}>
                  <input
                    id="bk-start"
                    type="date"
                    className="input"
                    min={today}
                    value={fields.startDate}
                    onChange={(e) => set('startDate', e.target.value)}
                    required
                  />
                </Field>
                <Field id="bk-end" label={t.booking.endDate}>
                  <input
                    id="bk-end"
                    type="date"
                    className="input"
                    min={fields.startDate || today}
                    max={fields.startDate ? addDays(fields.startDate, rentalConfig.maxDays) : undefined}
                    value={fields.endDate}
                    onChange={(e) => set('endDate', e.target.value)}
                    required
                  />
                </Field>
                <Field id="bk-pickup" label={t.booking.pickupTime}>
                  <select id="bk-pickup" className="input" value={fields.pickupTime} onChange={(e) => set('pickupTime', e.target.value)}>
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field id="bk-return" label={t.booking.returnTime}>
                  <select id="bk-return" className="input" value={fields.returnTime} onChange={(e) => set('returnTime', e.target.value)}>
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <div className="field">
                <span className="field__label" id="bk-qty-label">{t.booking.quantity}</span>
                <Stepper
                  value={fields.quantity}
                  min={1}
                  max={rentalConfig.maxQuantity}
                  onChange={(v) => set('quantity', v)}
                  display={String(fields.quantity)}
                  label={t.booking.quantity}
                />
                <p className="field__hint">{t.booking.quantityHint}</p>
              </div>

              {scooter ? priceBlock : <p className="quote__error">{t.booking.selectScooter}</p>}
            </div>
          )}

          {step === 1 && (
            <form className="booking__step" noValidate onSubmit={(e) => { e.preventDefault(); goReview(); }} id="contact-form">
              <h3 className="booking__step-title sr-only" tabIndex={-1}>{t.booking.steps[1]}</h3>
              <Field id="bk-name" label={t.booking.name} error={errors.name && t.errors.name}>
                <input
                  id="bk-name"
                  className="input"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder={t.booking.namePh}
                  value={fields.name}
                  maxLength={80}
                  onChange={(e) => { set('name', e.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'bk-name-error' : undefined}
                  required
                />
              </Field>
              <Field id="bk-phone" label={t.booking.phone} hint={t.booking.phoneHint} error={errors.phone && t.errors.phone}>
                <input
                  id="bk-phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  placeholder={t.booking.phonePh}
                  value={fields.phone}
                  maxLength={24}
                  onChange={(e) => { set('phone', e.target.value); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'bk-phone-error' : 'bk-phone-hint'}
                  required
                />
              </Field>
              <Field id="bk-comments" label={t.booking.comments} optional={t.booking.optional}>
                <textarea
                  id="bk-comments"
                  className="input"
                  rows={3}
                  maxLength={500}
                  placeholder={t.booking.commentsPh}
                  value={fields.comments}
                  onChange={(e) => set('comments', e.target.value)}
                />
              </Field>
              <p className="booking__privacy"><Info size={15} aria-hidden="true" /> {t.booking.privacy}</p>
            </form>
          )}

          {step === 2 && scooter && quote && period.ok && (
            <div className="booking__step">
              <h3 className="booking__step-title review__title" tabIndex={-1}>{t.booking.title}</h3>
              <div className="review">
                <div className="review__media"><ScooterImage scooter={scooter} priority /></div>
                <dl className="review__list">
                  <div><dt>{t.booking.scooter}</dt><dd>{scooter.name}</dd></div>
                  <div><dt>{t.booking.dates}</dt><dd>{formatDate(fields.startDate, lang)} – {formatDate(fields.endDate, lang)}</dd></div>
                  <div><dt>{t.booking.times}</dt><dd className="num">{fields.pickupTime} → {fields.returnTime}</dd></div>
                  <div><dt>{t.booking.duration}</dt><dd>{t.units.days(period.days)}</dd></div>
                  <div><dt>{t.booking.quantity}</dt><dd className="num">{fields.quantity}</dd></div>
                  <div><dt>{t.booking.contact}</dt><dd>{fields.name.trim()} · <span className="num">{fields.phone.trim()}</span></dd></div>
                  {fields.comments.trim() && <div><dt>{t.booking.comments}</dt><dd className="review__comment">{fields.comments.trim()}</dd></div>}
                </dl>
                <div className="review__actions">
                  <button type="button" className="link" onClick={() => setStep(0)}><Pencil size={14} aria-hidden="true" /> {t.booking.edit}: {t.booking.dates}</button>
                  <button type="button" className="link" onClick={() => setStep(1)}><Pencil size={14} aria-hidden="true" /> {t.booking.edit}: {t.booking.contact}</button>
                </div>
              </div>
              <div className="quote__total quote__total--big">
                <span>{t.booking.estimate}</span>
                <strong className="price">{formatPrice(quote.total, lang)}</strong>
              </div>
              <p className="num quote__formula">{formatPrice(quote.dailyRate, lang)} × {t.units.days(quote.days)} × {quote.quantity}</p>
              <p className="notice"><Info size={18} aria-hidden="true" /> {t.booking.estimateNote}</p>

              <details className="preview">
                <summary>{t.booking.preview}</summary>
                <pre>{message}</pre>
              </details>

              {sent && <p className="notice notice--wa" role="status">{t.booking.afterSend}</p>}
              <p className="booking__alt">
                {t.booking.noWhatsapp} <strong className="num">{business.whatsappDisplay}</strong>.{' '}
                <button type="button" className="link" onClick={copyMessage}>
                  <Copy size={14} aria-hidden="true" /> {copied ? t.booking.copied : t.booking.copy}
                </button>
                <span className="sr-only" role="status">{copied ? t.booking.copied : ''}</span>
              </p>
            </div>
          )}
        </div>

        <footer className="booking__footer">
          {step === 0 && (
            <>
              <div className="booking__mini">
                {quote && period.ok ? (
                  <>
                    <span>{t.booking.estimate}</span>
                    <strong className="price">{formatPrice(quote.total, lang)}</strong>
                  </>
                ) : null}
              </div>
              <button type="button" className="btn btn--ocean" onClick={goContact} disabled={!period.ok || !scooter}>
                {t.booking.next} <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setStep(0 as Step)}>
                <ArrowLeft size={18} aria-hidden="true" /> {t.booking.back}
              </button>
              <button type="submit" form="contact-form" className="btn btn--ocean">
                {t.booking.review} <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button type="button" className="btn btn--ghost booking__back" onClick={() => setStep(1)} aria-label={t.booking.back}>
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <a
                className="btn btn--wa booking__send"
                href={buildWhatsAppUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSent(true)}
              >
                <WhatsAppIcon /> {t.booking.send}
                <span className="sr-only">{t.a11y.newTab}</span>
              </a>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

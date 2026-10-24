'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { formatNumber, parseDecimal } from '@/lib/format';

export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="field-label">
      {children}
      {optional && <span className="ml-1 font-normal text-muted">— необязательно</span>}
    </label>
  );
}

type Base = { label: string; hint?: ReactNode; error?: string | null; optional?: boolean };

export function TextField({ label, hint, error, optional, className = '', ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <input id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-d` : undefined} {...rest} />
      {error ? (
        <p id={`${id}-d`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-d`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({ label, hint, error, optional, className = '', ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <textarea id={id} className="field min-h-[6rem] resize-y" aria-invalid={error ? true : undefined} {...rest} />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function SelectField({ label, hint, error, optional, className = '', children, ...rest }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <select id={id} className="field appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23242321' stroke-width='1.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
        {children}
      </select>
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Decimal input tuned for phones: numeric keyboard, accepts "4,5" and "4.5",
 * keeps the typed text while editing and reports null for an empty field.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  optional,
  className = '',
  min = 0,
  placeholder,
  integer = false,
}: Base & {
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  className?: string;
  min?: number;
  placeholder?: string;
  integer?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync when the value changes from outside (room switch, wall drag) without
  // clobbering what the user is typing ("4," stays "4,").
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    if (parseDecimal(text) !== value) setText(value === null ? '' : String(value).replace('.', ','));
  }

  const shown = error ?? localError;
  return (
    <div className={className}>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          enterKeyHint="next"
          className={`field ${unit ? 'pr-12' : ''} tabular-nums`}
          value={text}
          placeholder={placeholder}
          aria-invalid={shown ? true : undefined}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, '');
            setText(raw);
            const n = parseDecimal(raw);
            if (n === null) {
              setLocalError(null);
              onChange(null);
            } else if (Number.isNaN(n)) {
              setLocalError('Введите число, например 4,5');
            } else if (n < min) {
              setLocalError(`Значение не может быть меньше ${formatNumber(min)}`);
            } else {
              setLocalError(null);
              onChange(integer ? Math.round(n) : Math.round(n * 1000) / 1000);
            }
          }}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
      </div>
      {shown ? (
        <p className="field-error" role="alert">
          {shown}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

/** − / + stepper for counts (corners, spotlights). */
export function Stepper({ value, onChange, min = 0, max = 999, label, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; step?: number }) {
  return (
    <div className="inline-flex items-center rounded-[2px] border border-line-strong bg-paper" role="group" aria-label={label}>
      <button type="button" className="grid h-11 w-11 place-items-center disabled:opacity-30" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Уменьшить: ${label}`}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="h-11 w-12 border-x border-line bg-transparent text-center tabular-nums focus:outline-none"
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      <button type="button" className="grid h-11 w-11 place-items-center disabled:opacity-30" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`Увеличить: ${label}`}>
        +
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-ink" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[0.9375rem] leading-snug">{children}</span>
    </label>
  );
}

import { Minus, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Visible value text, e.g. "3 días". */
  display: string;
  label: string;
  id?: string;
}

/** − value + control with large touch targets. */
export function Stepper({ value, min, max, onChange, display, label, id }: Props) {
  const { t } = useI18n();
  return (
    <div className="stepper" role="group" aria-label={label} id={id}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`${t.a11y.decrease}: ${label}`}
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <output className="stepper__value num" aria-live="polite">
        {display}
      </output>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`${t.a11y.increase}: ${label}`}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

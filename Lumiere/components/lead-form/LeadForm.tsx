'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { CompanyConfig, PricingConfig, Project, ProjectEstimate } from '@/types';
import { formatArea, formatMoney, normalizePhone } from '@/lib/format';
import { whatsappLink } from '@/lib/whatsapp';
import { whatsappMessage } from '@/lib/summary';
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; leadId: string | null } | { kind: 'error'; message: string; noStore?: boolean };

const METHODS = [
  { id: 'call', label: 'Звонок' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
] as const;

const TIMES = ['В любое время', 'Утром (9:00–12:00)', 'Днём (12:00–17:00)', 'Вечером (17:00–20:00)'];

export function WhatsAppSend({ company, text, className = '' }: { company: CompanyConfig; text: string; className?: string }) {
  const href = whatsappLink(company.whatsapp, text);
  if (!href) {
    return (
      <button type="button" className={`btn btn-outline ${className}`} disabled aria-disabled="true" title="WhatsApp скоро будет доступен">
        <WhatsAppIcon /> WhatsApp скоро будет доступен
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`btn btn-outline ${className}`}>
      <WhatsAppIcon /> Отправить в WhatsApp
    </a>
  );
}

export function LeadForm({
  project,
  estimate,
  pricing,
  company,
  defaultMeasurement = true,
  compact = false,
}: {
  project: Project | null;
  estimate: ProjectEstimate | null;
  pricing: PricingConfig;
  company: CompanyConfig;
  defaultMeasurement?: boolean;
  compact?: boolean;
}) {
  const shownAt = useRef(0);
  const key = useRef('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: '', phone: '', contactMethod: 'call' as (typeof METHODS)[number]['id'], callTime: TIMES[0], address: '', comment: '', measurement: defaultMeasurement, consent: false, website: '' });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const markShown = () => {
    if (!shownAt.current) shownAt.current = Date.now();
  };
  const waText = project && estimate ? whatsappMessage(project, estimate, pricing, company) : 'Здравствуйте! Хочу записаться на замер натяжного потолка.';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = 'Укажите имя';
    if (!normalizePhone(f.phone, company.country)) errs.phone = `Проверьте номер — например, ${company.country.example}`;
    if (!f.consent) errs.consent = 'Нужно согласие на обработку данных';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (!key.current) key.current = crypto.randomUUID();
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, elapsedMs: Date.now() - (shownAt.current || Date.now()), submissionKey: key.current, project: project && project.rooms.length ? project : null }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; leadId?: string | null; error?: string; code?: string };
      if (res.ok && data.ok) setStatus({ kind: 'done', leadId: data.leadId ?? null });
      else setStatus({ kind: 'error', message: data.error || 'Не удалось отправить заявку. Попробуйте ещё раз.', noStore: data.code === 'no-store' });
    } catch {
      setStatus({ kind: 'error', message: 'Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.' });
    }
  };

  if (status.kind === 'done') {
    return (
      <div className="rounded-[6px] border border-line bg-paper p-6 sm:p-8" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white">
          <Icon name="check" />
        </span>
        <h3 className="mt-5 text-h3">Заявка отправлена</h3>
        <p className="mt-2 text-muted">
          Спасибо, {f.name.trim()}! {project?.id && <>Номер проекта — <strong className="font-semibold text-ink">{project.id}</strong>.</>}
        </p>
        <h4 className="mt-6 font-semibold">Что дальше</h4>
        <ol className="mt-3 space-y-3 text-[0.9375rem]">
          {[
            `Специалист свяжется с вами ${f.contactMethod === 'call' ? 'по телефону' : `в ${f.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`} — ${f.callTime.toLowerCase()}.`,
            'Уточнит детали проекта и согласует удобное время замера.',
            'После замера вы получите точный расчёт стоимости.',
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-display text-xl leading-6 text-champagne-deep">0{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <form onSubmit={submit} onFocus={markShown} onPointerDown={markShown} noValidate className="space-y-5">
      {project && estimate && project.rooms.length > 0 && !compact && (
        <div className="rounded-[4px] bg-stone/60 p-4 text-sm">
          <p className="font-semibold">Проект {project.id}</p>
          <p className="mt-1 text-muted">
            {project.rooms.length} {plural(project.rooms.length, ['помещение', 'помещения', 'помещений'])} · {formatArea(estimate.totalArea)}
            {estimate.available && estimate.total > 0 && ` · предварительно ${formatMoney(estimate.total, company.currency)}${estimate.mode === 'sample' ? ' (пример цен)' : ''}`}
          </p>
          <p className="mt-1 text-xs text-muted">Расчёт будет пересчитан по актуальным ценам компании при получении заявки.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Имя" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} maxLength={80} required />
        <TextField label="Телефон" type="tel" inputMode="tel" autoComplete="tel" placeholder={company.country.example} value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} maxLength={40} required />
      </div>

      <fieldset>
        <legend className="field-label">Как с вами связаться</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button key={m.id} type="button" aria-pressed={f.contactMethod === m.id} className="chip" onClick={() => set('contactMethod', m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Удобное время" value={f.callTime} onChange={(e) => set('callTime', e.target.value)}>
          {TIMES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <TextField label="Адрес или район" optional autoComplete="address-level2" value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={200} />
      </div>
      <TextArea label="Комментарий" optional value={f.comment} onChange={(e) => set('comment', e.target.value)} maxLength={1500} rows={3} />

      {/* Honeypot — hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Сайт
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} />
        </label>
      </div>

      <div className="space-y-3">
        <Checkbox checked={f.measurement} onChange={(v) => set('measurement', v)}>
          Хочу записаться на замер
        </Checkbox>
        <Checkbox checked={f.consent} onChange={(v) => set('consent', v)}>
          Я согласен(на) на обработку имени и телефона для связи по заявке. Подробнее — в{' '}
          <Link href="/privacy" className="underline underline-offset-4" target="_blank">
            политике конфиденциальности
          </Link>
          .
        </Checkbox>
        {errors.consent && <p className="field-error">{errors.consent}</p>}
      </div>

      {status.kind === 'error' && (
        <div className="space-y-3 rounded-[4px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          <p>{status.message}</p>
          {status.noStore && company.phone && (
            <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`} className="btn btn-outline btn-sm text-ink">
              <Icon name="phone" size={16} /> {company.phone}
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn btn-primary sm:flex-1" disabled={status.kind === 'sending'}>
          {status.kind === 'sending' ? 'Отправляем…' : f.measurement ? 'Записаться на замер' : 'Отправить заявку'}
        </button>
        <WhatsAppSend company={company} text={waText} className="sm:flex-1" />
      </div>
      <p className="text-xs text-muted">В WhatsApp уйдут только параметры проекта — без вашего имени и телефона.</p>
    </form>
  );
}

function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

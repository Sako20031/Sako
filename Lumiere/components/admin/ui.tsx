'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { Photo } from '@/components/ui/Photo';
import { Icon } from '@/components/ui/Icon';

/* ───────────────────────── API ───────────────────────── */

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

/** Downscales a photo in the browser (≤ 2000 px, JPEG) before upload. */
export async function uploadImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Выберите фото в формате JPEG, PNG или WebP');
  const bitmap = await createImageBitmap(file);
  const max = 2000;
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let quality = 0.86;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 3_800_000 && quality > 0.5) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  const { url } = await api<{ url: string }>('/api/admin/images', { method: 'POST', json: { dataUrl } });
  return url;
}

/* ───────────────────────── Fields ───────────────────────── */

export function AField({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function AText({ label, value, onChange, hint, className, placeholder, multiline, rows = 3, maxLength }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; className?: string; placeholder?: string; multiline?: boolean; rows?: number; maxLength?: number }) {
  return (
    <AField label={label} hint={hint} className={className}>
      {(id) =>
        multiline ? (
          <textarea id={id} className="field resize-y" rows={rows} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} className="field" value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </AField>
  );
}

/** Price / number input: empty means "not set" (null). */
export function ANumber({ label, value, onChange, hint, className, unit, allowNull = true }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: ReactNode; className?: string; unit?: string; allowNull?: boolean }) {
  // Editors remount (new key) when their data is replaced, so local text is enough here.
  const [text, setText] = useState(value === null ? '' : String(value));
  return (
    <AField label={label} hint={hint} className={className}>
      {(id) => (
        <div className="relative">
          <input
            id={id}
            className={`field tabular-nums ${unit ? 'pr-16' : ''}`}
            inputMode="decimal"
            value={text}
            placeholder={allowNull ? 'не указано' : '0'}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.,]/g, '');
              setText(raw);
              if (raw.trim() === '') onChange(allowNull ? null : 0);
              else {
                const n = Number(raw.replace(',', '.'));
                if (Number.isFinite(n)) onChange(n);
              }
            }}
          />
          {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
        </div>
      )}
    </AField>
  );
}

export function ACheck({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-ink" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-[0.9375rem] font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function ASelect<T extends string>({ label, value, onChange, options, className }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <AField label={label} className={className}>
      {(id) => (
        <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </AField>
  );
}

/** Lines of text ↔ string[] */
export function ALines({ label, value, onChange, hint, rows = 4 }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <AText
      label={label}
      hint={hint ?? 'Каждый пункт — с новой строки'}
      multiline
      rows={rows}
      value={text}
      onChange={(t) => {
        setText(t);
        onChange(t.split('\n').map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

export function AImage({ label, value, onChange, defaultValue, hint, aspect = 'aspect-[16/10]' }: { label: string; value: string; onChange: (v: string) => void; defaultValue?: string; hint?: string; aspect?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className={`relative ${aspect} w-full max-w-md overflow-hidden rounded-[4px] border border-line bg-stone`}>
        {value ? <Photo src={value} alt="" fill sizes="28rem" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-muted">Нет фото</div>}
        {busy && <div className="absolute inset-0 grid place-items-center bg-paper/70 text-sm">Загрузка…</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="image" size={16} /> Загрузить фото
        </button>
        {defaultValue && value !== defaultValue && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(defaultValue)}>
            <Icon name="undo" size={16} /> Исходное
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            setError(null);
            try {
              onChange(await uploadImage(f));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Не удалось загрузить');
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">или вставить ссылку</summary>
        <input className="field mt-2" value={value} placeholder="https://…" onChange={(e) => onChange(e.target.value.trim())} />
      </details>
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function AGallery({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((src, i) => (
          <div key={src + i} className="group relative aspect-square overflow-hidden rounded-[4px] bg-stone">
            <Photo src={src} alt="" fill sizes="10rem" className="object-cover" />
            <button type="button" aria-label="Удалить фото" className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="grid aspect-square place-items-center rounded-[4px] border border-dashed border-line-strong text-sm text-muted hover:border-ink" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Загрузка…' : '+ Фото'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!files.length) return;
          setBusy(true);
          setError(null);
          const urls: string[] = [];
          try {
            for (const f of files) urls.push(await uploadImage(f));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось загрузить');
          } finally {
            onChange([...value, ...urls]);
            setBusy(false);
          }
        }}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/* ───────────────────────── Layout helpers ───────────────────────── */

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-[6px] border border-line bg-paper p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h3 className="font-display text-2xl">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Collapsible list item with move / delete controls. */
export function ItemShell({ title, subtitle, children, onUp, onDown, onDelete, open: initialOpen = false, badge }: { title: string; subtitle?: string; children: ReactNode; onUp?: () => void; onDown?: () => void; onDelete?: () => void; open?: boolean; badge?: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="rounded-[4px] border border-line bg-paper">
      <div className="flex items-center gap-2 p-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Icon name="chevronRight" size={18} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{title || 'Без названия'}</span>
            {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
          </span>
          {badge}
        </button>
        {onUp && (
          <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-stone" onClick={onUp} aria-label="Выше">
            ↑
          </button>
        )}
        {onDown && (
          <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-stone" onClick={onDown} aria-label="Ниже">
            ↓
          </button>
        )}
        {onDelete &&
          (confirm ? (
            <button type="button" className="btn btn-sm bg-danger px-3 text-white" onClick={onDelete}>
              Удалить
            </button>
          ) : (
            <button type="button" className="grid h-9 w-9 place-items-center rounded text-muted hover:bg-stone hover:text-danger" onClick={() => setConfirm(true)} aria-label="Удалить">
              <Icon name="trash" size={16} />
            </button>
          ))}
      </div>
      {open && <div className="space-y-4 border-t border-line p-4">{children}</div>}
    </div>
  );
}

export function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = list.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => ({ а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' })[c] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

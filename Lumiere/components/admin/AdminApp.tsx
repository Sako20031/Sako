'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ContentSection, Lead, LeadStatus, SiteContent } from '@/types';
import { formatDate, formatMoney, prettyPhone } from '@/lib/format';
import { whatsappLink } from '@/lib/whatsapp';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import { api, Card } from './ui';
import { BlocksEditor, CatalogEditor, CompanyEditor, FaqEditor, HeroEditor, PortfolioEditor, PricingEditor, SectionEditor } from './editors';

type Session = { admin: boolean; store: 'postgres' | 'file' | 'none'; defaultPin?: boolean };
type Loaded = { content: SiteContent; defaults: SiteContent; customized: string[] };
type Tab = 'leads' | 'pricing' | 'portfolio' | 'hero' | 'catalog' | 'company' | 'texts' | 'security';

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'leads', label: 'Заявки', icon: 'chat' },
  { id: 'pricing', label: 'Цены', icon: 'sliders' },
  { id: 'portfolio', label: 'Работы', icon: 'image' },
  { id: 'hero', label: 'Главный экран', icon: 'home' },
  { id: 'catalog', label: 'Каталог', icon: 'grid' },
  { id: 'company', label: 'Контакты', icon: 'phone' },
  { id: 'texts', label: 'Тексты и FAQ', icon: 'edit' },
  { id: 'security', label: 'Безопасность', icon: 'lock' },
];

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const refresh = useCallback(() => api<Session>('/api/admin/session').then(setSession).catch(() => setSession({ admin: false, store: 'none' })), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!session) return <Centered>Загрузка…</Centered>;
  if (!session.admin) return <Login store={session.store} onDone={refresh} />;
  return <Dashboard session={session} onLogout={refresh} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[100svh] place-items-center bg-ivory px-4 text-muted">{children}</div>;
}

/* ───────────────────────── Login ───────────────────────── */

function Login({ store, onDone }: { store: Session['store']; onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/session', { method: 'POST', json: { pin } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setPin('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-[100svh] place-items-center bg-ink px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[8px] bg-ivory p-8 shadow-2xl">
        <p className="font-display text-2xl tracking-[0.14em]">LUMIÈRE</p>
        <p className="mt-1 text-[0.6rem] font-semibold tracking-[0.5em] text-muted">CEILINGS</p>
        <h1 className="mt-8 text-3xl">Админ-панель</h1>
        {store === 'none' ? (
          <p className="mt-4 rounded-[4px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            База данных не подключена. В Vercel: проект → Storage → Create Database → Neon (Postgres) → Connect, затем Redeploy. Без базы изменения негде сохранить.
          </p>
        ) : (
          <>
            <label htmlFor="pin" className="field-label mt-6">
              PIN-код
            </label>
            <input id="pin" className="field text-center text-2xl tracking-[0.6em]" type="password" inputMode="numeric" autoComplete="current-password" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy || pin.length < 4}>
              {busy ? 'Проверяем…' : 'Войти'}
            </button>
          </>
        )}
        <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-ink">
          ← На сайт
        </Link>
      </form>
    </div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('leads');
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    api<Loaded>('/api/admin/content').then(setData).catch((e) => setLoadError(e.message));
  }, []);

  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    setToastMsg({ msg, kind });
    window.setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const saved = <K extends ContentSection>(section: K) => (value: SiteContent[K], customized: boolean) =>
    setData((d) => d && { ...d, content: { ...d.content, [section]: value }, customized: customized ? [...new Set([...d.customized, section])] : d.customized.filter((s) => s !== section) });

  const logout = async () => {
    await api('/api/admin/session', { method: 'DELETE' }).catch(() => undefined);
    onLogout();
  };

  const editor = <K extends ContentSection>(section: K, render: (d: SiteContent[K], set: (fn: (d: SiteContent[K]) => SiteContent[K]) => void) => React.ReactNode) =>
    data && (
      <SectionEditor key={section} section={section} value={data.content[section]} defaults={data.defaults[section]} customized={data.customized.includes(section)} onSaved={saved(section)} toast={toast}>
        {render}
      </SectionEditor>
    );

  const cur = data?.content.company.currency.symbol ?? '₸';

  return (
    <div className="min-h-[100svh] bg-ivory">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-line bg-paper ${menu ? 'flex' : 'hidden'} lg:flex`}>
        <div className="border-b border-line p-5">
          <p className="font-display text-xl tracking-[0.14em]">LUMIÈRE</p>
          <p className="text-xs text-muted">Админ-панель</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setMenu(false);
              }}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left text-[0.9375rem] ${tab === t.id ? 'bg-ink text-white' : 'hover:bg-stone'}`}
            >
              <Icon name={t.icon} size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3 text-sm">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-stone">
            <Icon name="arrow" size={16} /> Открыть сайт
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-stone">
            <Icon name="logout" size={16} /> Выйти
          </button>
        </div>
      </aside>
      {menu && <button type="button" aria-label="Закрыть меню" className="fixed inset-0 z-20 bg-ink/40 lg:hidden" onClick={() => setMenu(false)} />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ivory/95 px-4 py-3 backdrop-blur lg:px-8">
          <button type="button" className="grid h-10 w-10 place-items-center lg:hidden" onClick={() => setMenu(true)} aria-label="Меню">
            <Icon name="menu" />
          </button>
          <h1 className="font-display text-2xl">{TABS.find((t) => t.id === tab)?.label}</h1>
          <span className="ml-auto text-xs text-muted">{session.store === 'postgres' ? 'База: Postgres ✓' : 'Локальное хранилище (.data)'}</span>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          {session.defaultPin && (
            <p className="flex items-center gap-3 rounded-[4px] border border-champagne bg-champagne-soft/60 p-4 text-sm">
              <Icon name="lock" size={18} className="shrink-0" />
              <span>
                Установлен стандартный PIN 0000. Смените его во вкладке{' '}
                <button type="button" className="font-semibold underline" onClick={() => setTab('security')}>
                  «Безопасность»
                </button>
                .
              </span>
            </p>
          )}
          {data && !data.content.company.whatsapp && tab !== 'company' && (
            <p className="flex items-center gap-3 rounded-[4px] border border-line bg-paper p-4 text-sm">
              <WhatsAppIcon size={18} />
              <span>
                Номер WhatsApp не указан — кнопки WhatsApp на сайте отключены.{' '}
                <button type="button" className="font-semibold underline" onClick={() => setTab('company')}>
                  Указать номер
                </button>
              </span>
            </p>
          )}
          {loadError && <p className="text-danger">{loadError}</p>}
          {!data && !loadError && <p className="text-muted">Загрузка…</p>}

          {data && tab === 'leads' && <Leads currency={data.content.company.currency} brand={data.content.company.brandName} />}
          {tab === 'pricing' && editor('pricing', (d, set) => <PricingEditor d={d} set={set} currency={cur} />)}
          {tab === 'portfolio' && editor('portfolio', (d, set) => <PortfolioEditor d={d} set={set} />)}
          {tab === 'hero' && data && editor('hero', (d, set) => <HeroEditor d={d} set={set} defaults={data.defaults.hero} />)}
          {tab === 'catalog' && data && editor('catalog', (d, set) => <CatalogEditor d={d} set={set} materials={data.content.pricing.materials} currency={cur} />)}
          {tab === 'company' && editor('company', (d, set) => <CompanyEditor d={d} set={set} />)}
          {tab === 'texts' && data && (
            <div className="space-y-12">
              {editor('faq', (d, set) => <FaqEditor d={d} set={set} />)}
              {editor('about', (d, set) => (
                <Card title="О компании">
                  <label className="block">
                    <span className="field-label">Заголовок</span>
                    <input className="field" value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="field-label">Вступление</span>
                    <textarea className="field" rows={3} value={d.intro} onChange={(e) => set((x) => ({ ...x, intro: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="field-label">Абзацы (через пустую строку)</span>
                    <textarea className="field" rows={6} value={d.paragraphs.join('\n\n')} onChange={(e) => set((x) => ({ ...x, paragraphs: e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) }))} />
                  </label>
                  <BlocksEditor title="Ценности" items={d.values} onChange={(v) => set((x) => ({ ...x, values: v }))} />
                </Card>
              ))}
              {editor('process', (d, set) => (
                <>
                  <BlocksEditor title="Как мы работаем" items={d.steps} onChange={(v) => set((x) => ({ ...x, steps: v }))} />
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-ink" checked={d.confirmed} onChange={(e) => set((x) => ({ ...x, confirmed: e.target.checked }))} />
                    Порядок работы подтверждён компанией (убрать пометку «типовой»)
                  </label>
                </>
              ))}
              {editor('trust', (d, set) => <BlocksEditor title="Доверие и прозрачность" hint="Только реальные данные: материалы, гарантия, сертификаты, отзывы." items={d.items} onChange={(v) => set((x) => ({ ...x, items: v }))} />)}
            </div>
          )}
          {tab === 'security' && <Security session={session} toast={toast} onLogout={logout} />}
        </main>
      </div>

      {toastMsg && (
        <div role="status" className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-[4px] px-5 py-3 text-sm text-white shadow-xl ${toastMsg.kind === 'ok' ? 'bg-ink' : 'bg-danger'}`}>
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Leads ───────────────────────── */

const STATUS: Record<LeadStatus, string> = { new: 'Новая', work: 'В работе', done: 'Выполнена', cancel: 'Отменена' };

function Leads({ currency, brand }: { currency: SiteContent['company']['currency']; brand: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const load = useCallback(() => api<{ leads: Lead[] }>('/api/admin/leads').then((r) => setLeads(r.leads)).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: LeadStatus) => {
    setLeads((l) => l && l.map((x) => (x.id === id ? { ...x, status } : x)));
    await api(`/api/admin/leads/${id}`, { method: 'PATCH', json: { status } }).catch((e) => setError(e.message));
  };
  const remove = async (id: string) => {
    if (!window.confirm('Удалить заявку?')) return;
    await api(`/api/admin/leads/${id}`, { method: 'DELETE' });
    setLeads((l) => l && l.filter((x) => x.id !== id));
  };

  if (error) return <p className="text-danger">{error}</p>;
  if (!leads) return <p className="text-muted">Загрузка…</p>;
  const shown = leads.filter((l) => filter === 'all' || l.status === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'new', 'work', 'done', 'cancel'] as const).map((s) => (
          <button key={s} type="button" className="chip !min-h-9" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'Все' : STATUS[s]} <span className="text-xs opacity-60">{s === 'all' ? leads.length : leads.filter((l) => l.status === s).length}</span>
          </button>
        ))}
        <button type="button" className="btn btn-outline btn-sm ml-auto" onClick={load}>
          Обновить
        </button>
      </div>
      {shown.length === 0 && <p className="rounded-[4px] border border-line bg-paper p-8 text-center text-muted">Заявок пока нет. Они появятся здесь после отправки формы на сайте.</p>}
      {shown.map((l) => {
        const wa = whatsappLink(l.phone, `Здравствуйте, ${l.name}! Это ${brand} по вашей заявке${l.projectId ? ` (проект ${l.projectId})` : ''}.`);
        return (
          <article key={l.id} className="rounded-[6px] border border-line bg-paper">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">
                  {l.name} {l.measurement && <span className="ml-2 rounded bg-champagne-soft px-2 py-0.5 text-xs">замер</span>}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(l.createdAt)} · {l.contactMethod === 'call' ? 'Звонок' : l.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Telegram'} · {l.callTime}
                </p>
                {l.address && <p className="mt-1 text-sm">{l.address}</p>}
                {l.comment && <p className="mt-2 whitespace-pre-line text-sm">{l.comment}</p>}
                {l.total !== null && <p className="mt-2 text-sm">Расчёт сервера: <strong>{formatMoney(l.total, currency)}</strong></p>}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <a href={`tel:${l.phone}`} className="btn btn-outline btn-sm">
                  <Icon name="phone" size={16} /> {prettyPhone(l.phone)}
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                    <WhatsAppIcon size={16} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
              <select className="field !min-h-10 !w-auto !py-1.5 text-sm" value={l.status} onChange={(e) => setStatus(l.id, e.target.value as LeadStatus)} aria-label="Статус">
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {l.summary && (
                <details className="w-full sm:w-auto sm:flex-1">
                  <summary className="cursor-pointer text-sm font-semibold">Проект {l.projectId}</summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-stone/60 p-4 font-sans text-xs leading-relaxed">{l.summary}</pre>
                </details>
              )}
              <button type="button" className="ml-auto grid h-10 w-10 place-items-center text-muted hover:text-danger" onClick={() => remove(l.id)} aria-label="Удалить заявку">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Security ───────────────────────── */

function Security({ session, toast, onLogout }: { session: Session; toast: (m: string, k?: 'ok' | 'error') => void; onLogout: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/pin', { method: 'POST', json: { current, next } });
      toast('PIN изменён. Другие устройства вышли из админ-панели.');
      setCurrent('');
      setNext('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card title="Сменить PIN">
        <form onSubmit={change} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="field-label">Текущий PIN</span>
            <input className="field" type="password" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="block">
            <span className="field-label">Новый PIN (4–12 цифр)</span>
            <input className="field" type="password" inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy || current.length < 4 || next.length < 4}>
            Сменить
          </button>
        </form>
        <p className="text-sm text-muted">PIN хранится на сервере в виде хеша. После 8 неверных попыток вход блокируется на 15 минут.</p>
      </Card>
      <Card title="Хранилище">
        <p className="text-[0.9375rem]">
          {session.store === 'postgres'
            ? 'Подключена база данных Postgres. Изменения, фото и заявки сохраняются в ней.'
            : 'Используется локальный файл .data/ — подходит для разработки и своего сервера. На Vercel подключите базу Neon (Postgres).'}
        </p>
      </Card>
      <button type="button" className="btn btn-outline" onClick={onLogout}>
        <Icon name="logout" size={16} /> Выйти
      </button>
    </div>
  );
}

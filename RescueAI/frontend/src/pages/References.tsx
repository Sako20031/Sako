import { useEffect, useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { readBundle } from "../lib/offline";
import { useMe, useOnline } from "../lib/session";
import { WORKFLOWS } from "../data/workflows";
import { FLAG_LABELS } from "../data/flags";
import { ErrorNote, Header } from "../components/ui";
import type { Key } from "../i18n/ru";

export default function References({ tab }: { tab?: string }) {
  const { t, l3 } = useI18n();
  const online = useOnline();
  const me = useMe();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [fromOffline, setFromOffline] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const algorithms = tab === "algorithms";

  useEffect(() => {
    if (algorithms) return;
    const c = new AbortController();
    const h = setTimeout(async () => {
      const offline = async () => {
        const b = await readBundle();
        if (b) { setFromOffline(true); setItems(b.protocols.filter((p) => !q || (p.title + p.issuer).toLowerCase().includes(q.toLowerCase()))); }
      };
      if (!online || !me) return offline();
      try {
        const r = await api.get<{ items: any[] }>(`/api/references/protocols?limit=50&q=${encodeURIComponent(q)}`, c.signal);
        setFromOffline(false); setItems(r.items);
      } catch (e: any) { if (e?.name !== "AbortError") { setErr(e.code); offline(); } }
    }, 300); // debounce typing
    return () => { clearTimeout(h); c.abort(); };
  }, [q, online, me, algorithms]);

  if (algorithms) {
    return (
      <main>
        <Header title={t("ref_algorithms")} />
        <p class="warn-text small">{t("checklist_status")}</p>
        {WORKFLOWS.map((w) => (
          <details class="card" key={w.id}>
            <summary>{l3(w.title)}</summary>
            <ul>{w.flags.map((f) => <li key={f}>{l3(FLAG_LABELS[f])}</li>)}</ul>
            <a class="btn secondary" href={`#/workflow/${w.id}`}>{t("sym_title")} →</a>
          </details>
        ))}
      </main>
    );
  }
  const kz = items.filter((p) => p.jurisdiction === "KZ" && p.status === "current");
  return (
    <main>
      <Header title={t("ref_title")} />
      <a class="btn secondary" href="#/reference/algorithms">{t("ref_algorithms")}</a>
      <input type="search" class="search" placeholder={t("ref_search")} aria-label={t("ref_search")} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      {fromOffline && <p class="muted small">{t("ref_from_offline")}</p>}
      {kz.length === 0 && <p class="warn-text">{t("ref_kz_none")}</p>}
      <h2>{t("ref_protocols")}</h2>
      <ul class="biglist">
        {items.map((p) => (
          <li key={p.slug} class="card">
            <b>{p.title}</b>
            <p class="small">{t("ref_issuer")}: {p.issuer} · {p.jurisdiction}{p.version ? ` · ${p.version}` : ""}</p>
            <p class="small">{t("ref_published")}: {p.publication_date ?? "—"} · {t("ref_verified")}: {p.last_verified ?? t("ref_never")}</p>
            <span class={`tag st-${p.status}`}>{t(`ref_status_${p.status}` as Key)}</span>
            {p.notes && <p class="muted small">{p.notes}</p>}
            {p.source_url && online && <a href={p.source_url} target="_blank" rel="noopener noreferrer">{t("ref_open")}</a>}
          </li>
        ))}
      </ul>
      <ErrorNote code={err} />
    </main>
  );
}

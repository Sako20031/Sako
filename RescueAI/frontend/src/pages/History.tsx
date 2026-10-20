import { useEffect, useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useMe } from "../lib/session";
import { ErrorNote, Header } from "../components/ui";
import { Login } from "./Login";

const PAGE = 20;

export default function History() {
  const { t } = useI18n();
  const me = useMe();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const load = (offset: number, signal?: AbortSignal) =>
    api.get<{ total: number; items: any[] }>(`/api/encounters?offset=${offset}&limit=${PAGE}`, signal)
      .then((r) => { setTotal(r.total); setItems((p) => (offset ? [...p, ...r.items] : r.items)); })
      .catch((e) => e?.name !== "AbortError" && setErr(e.code));
  useEffect(() => {
    if (!me) return;
    const c = new AbortController();
    load(0, c.signal);
    return () => c.abort();
  }, [me]);
  if (me === null) return <main><Header title={t("hist_title")} /><Login /></main>;
  return (
    <main>
      <Header title={t("hist_title")} />
      <a class="btn" href="#/encounter/new">➕ {t("tile_encounter")}</a>
      {items.length === 0 && !err && <p class="muted">{t("no_recent")}</p>}
      <ul class="biglist">{items.map((e) => <li key={e.id}><a href={`#/encounter/${e.id}`}>{new Date(e.created_at).toLocaleString()} — {e.chief_complaint || "—"}</a></li>)}</ul>
      {items.length < total && <button class="btn secondary" onClick={() => load(items.length)}>{t("load_more")}</button>}
      <ErrorNote code={err} />
    </main>
  );
}

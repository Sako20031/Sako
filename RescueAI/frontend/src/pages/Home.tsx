import { useEffect, useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useMe, useOnline, useStatus } from "../lib/session";
import { offlineMeta } from "../lib/offline";
import { Header } from "../components/ui";
import type { Key } from "../i18n/ru";

const TILES: [string, Key, string][] = [
  ["ecg", "tile_ecg", "📈"], ["symptoms", "tile_symptoms", "🩺"], ["skin", "tile_skin", "🔴"], ["wound", "tile_wound", "🩹"],
  ["reference/algorithms", "tile_algorithms", "⚡"], ["medications", "tile_meds", "💊"], ["reference", "tile_reference", "📚"],
  ["workflow/stroke_like", "tile_neuro", "🧠"], ["encounter/new", "tile_encounter", "➕"],
];

export default function Home() {
  const { t } = useI18n();
  const online = useOnline();
  const status = useStatus(online);
  const me = useMe();
  const [recent, setRecent] = useState<any[] | null>(null);
  const meta = offlineMeta();

  // Recent encounters load after first paint and never block the tiles.
  useEffect(() => {
    if (!me || !online) return;
    const c = new AbortController();
    api.get<{ items: any[] }>("/api/encounters?limit=5", c.signal).then((r) => setRecent(r.items)).catch(() => {});
    return () => c.abort();
  }, [me, online]);

  const ai = !online ? t("ai_offline")
    : status === undefined ? t("ai_checking")
    : status?.ai.image_analysis_available ? t("ai_ready")
    : status?.ai.text_analysis_available ? t("ai_text_only") : t("ai_off");
  return (
    <main>
      <Header title={t("app_name")} home />
      <p class="subtitle">{t("app_subtitle")}</p>
      <nav class="tiles" aria-label={t("nav_home")}>
        {TILES.map(([href, key, icon]) => <a class="tile" href={`#/${href}`} key={href}><span aria-hidden="true">{icon}</span>{t(key)}</a>)}
      </nav>
      <section class="card status-list" aria-live="polite">
        <p><b>{t("ai_status")}:</b> {ai}</p>
        {online && status && !status.ai.available && <p class="muted small">{t("ai_unavailable")}</p>}
        <p><b>{t("offline_ref")}:</b> {meta.version ? `${t("offline_ref_ready")} · ${new Date(meta.syncedAt!).toLocaleString()}` : t("offline_ref_none")}</p>
      </section>
      {me && (
        <section class="card">
          <h2>{t("recent")}</h2>
          {recent?.length === 0 && <p class="muted">{t("no_recent")}</p>}
          <ul class="list">{recent?.map((e) => <li key={e.id}><a href={`#/encounter/${e.id}`}>{new Date(e.created_at).toLocaleString()} — {e.chief_complaint || "—"}</a></li>)}</ul>
        </section>
      )}
      <nav class="row foot">
        <a class="btn secondary" href="#/history">{t("nav_history")}</a>
        <a class="btn secondary" href="#/settings">{t("nav_settings")}</a>
      </nav>
      <p class="muted small disclaimer">{t("disclaimer")}</p>
    </main>
  );
}

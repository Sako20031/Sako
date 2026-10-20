import { useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { clearAppCaches, clearBundle, downloadBundle, offlineMeta } from "../lib/offline";
import { getTheme, setTheme, type Lang, type Theme } from "../lib/settings";
import { setMe, useMe, useOnline, useStatus } from "../lib/session";
import { ErrorNote, Header } from "../components/ui";
import { Login } from "./Login";

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const me = useMe();
  const online = useOnline();
  const status = useStatus(online);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [meta, setMeta] = useState(offlineMeta());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dl = async () => {
    setBusy(true); setErr(null);
    try { setMeta(await downloadBundle()); setMsg(t("done")); } catch (e: any) { setErr(e.code ?? "generic"); }
    setBusy(false);
  };
  return (
    <main>
      <Header title={t("set_title")} />
      <fieldset class="card"><legend>{t("set_language")}</legend>
        <div class="seg">{(["ru", "kk", "en"] as Lang[]).map((l) => <button key={l} aria-pressed={lang === l} class={lang === l ? "sel" : ""} onClick={() => setLang(l)}>{({ ru: "Русский", kk: "Қазақша", en: "English" })[l]}</button>)}</div>
      </fieldset>
      <fieldset class="card"><legend>{t("set_theme")}</legend>
        <div class="seg">{(["system", "light", "dark"] as Theme[]).map((v) => <button key={v} aria-pressed={theme === v} class={theme === v ? "sel" : ""} onClick={() => { setTheme(v); setThemeState(v); }}>{t(`theme_${v}`)}</button>)}</div>
      </fieldset>
      <section class="card"><h2>{t("set_offline")}</h2>
        <p>{t("set_version")}: {meta.version || "—"} · {t("set_last_sync")}: {meta.syncedAt ? new Date(meta.syncedAt).toLocaleString() : "—"} · {t("set_size")}: {(meta.bytes / 1024).toFixed(1)} KB</p>
        <div class="row">
          <button class="btn" disabled={busy || !online || !me} onClick={dl}>{t("set_download")}</button>
          <button class="btn secondary" onClick={async () => { await clearBundle(); setMeta(offlineMeta()); }}>{t("set_clear")}</button>
        </div>
      </section>
      <section class="card"><h2>{t("set_cache")}</h2>
        <button class="btn secondary" onClick={async () => { await clearAppCaches(); setMsg(t("done")); }}>{t("set_cache_clear")}</button>
      </section>
      <section class="card"><h2>{t("set_ai")}</h2>
        <p>{!online ? t("ai_offline") : status?.ai.available ? `${status.ai.model ?? ""} — ${status.ai.image_analysis_available ? t("ai_ready") : t("ai_text_only")}` : t("ai_unavailable")}</p>
        {status && <p class="muted small">rules {status.triage_rules.version} ({status.triage_rules.status})</p>}
      </section>
      <section class="card"><h2>{t("set_retention")}</h2><p>{t("set_retention_text")}</p></section>
      <section class="card"><h2>{t("set_privacy")}</h2><a class="btn secondary" href="#/privacy">{t("privacy_title")}</a></section>
      <section class="card"><h2>{t("set_account")}</h2>
        {me ? <><p>{me.username} · {me.role}</p><button class="btn secondary" onClick={async () => { await api.post("/api/auth/logout").catch(() => {}); setMe(null); }}>{t("logout")}</button></> : <Login />}
      </section>
      {msg && <p role="status">{msg}</p>}
      <ErrorNote code={err} />
    </main>
  );
}

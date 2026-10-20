import { useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { setMe, type Me } from "../lib/session";
import { ErrorNote } from "../components/ui";

export function Login() {
  const { t } = useI18n();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { setMe(await api.post<Me>("/api/auth/login", { username: u, password: p })); }
    catch (x: any) { setErr(x.code === "invalid_credentials" ? "invalid_credentials" : x.code ?? "generic"); }
    setBusy(false);
  };
  return (
    <form class="card" onSubmit={submit}>
      <h2>{t("login_title")}</h2>
      <p class="muted">{t("login_needed")}</p>
      <label class="field"><span>{t("username")}</span><input autoComplete="username" autoCapitalize="none" value={u} onInput={(e) => setU((e.target as HTMLInputElement).value)} /></label>
      <label class="field"><span>{t("password")}</span><input type="password" autoComplete="current-password" value={p} onInput={(e) => setP((e.target as HTMLInputElement).value)} /></label>
      <button class="btn big" disabled={busy || !u || !p}>{t("login")}</button>
      {err === "invalid_credentials" ? <p class="error" role="alert">{t("invalid_credentials")}</p> : <ErrorNote code={err} />}
    </form>
  );
}

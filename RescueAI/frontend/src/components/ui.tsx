import { useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../lib/i18n";
import { back } from "../lib/router";
import { useOnline } from "../lib/session";
import { FLAG_LABELS, VITAL_ALERT_LABELS } from "../data/flags";
import type { Triage } from "../lib/triage";
import { listen, RISKY, voiceSupported } from "../lib/voice";
import type { Key } from "../i18n/ru";

export function Header({ title, home = false }: { title: string; home?: boolean }) {
  const { t } = useI18n();
  const online = useOnline();
  return (
    <header class="bar">
      {!home && <button class="back" onClick={back} aria-label={t("nav_back")}>‹ {t("nav_back")}</button>}
      <h1>{title}</h1>
      <span class={`net ${online ? "on" : "off"}`} role="status">{online ? "● " + t("net_online") : "○ " + t("net_offline")}</span>
    </header>
  );
}

export function UrgentBanner({ triage }: { triage: Triage | null }) {
  const { t, l3 } = useI18n();
  if (!triage) return null;
  const level = triage.level;
  const msg = level === "critical" ? t("urgent_critical") : level === "urgent" ? t("urgent_urgent") : t("urgent_none");
  const label = (code: string) => l3(FLAG_LABELS[code] ?? VITAL_ALERT_LABELS[code] ?? { ru: code, kk: code, en: code });
  return (
    <section class={`urgent lvl-${level}`} role={level === "critical" ? "alert" : "status"} aria-live="assertive">
      {level !== "indeterminate" && <strong class="urgent-title">⚠ {t("urgent_title")} — {t(`urg_${level}` as Key)}</strong>}
      <p>{msg}</p>
      {triage.alerts.length > 0 && <ul>{triage.alerts.map((a) => <li key={a.code}>{a.severity === "critical" ? "‼ " : "! "}{label(a.code)}</li>)}</ul>}
      {triage.missing_vitals.length > 0 && <p class="muted">{t("missing_vitals")}: {triage.missing_vitals.map((v) => t(`v_${v}` as Key)).join(", ")}</p>}
      <p class="muted small">{t("rules_unverified")}</p>
    </section>
  );
}

export function FlagChecklist({ flags, selected, onChange }: { flags: string[]; selected: string[]; onChange: (s: string[]) => void }) {
  const { t, l3 } = useI18n();
  return (
    <fieldset class="card">
      <legend>{t("danger_signs")}</legend>
      <p class="muted">{t("check_what_applies")}</p>
      {flags.map((f) => (
        <label class="check" key={f}>
          <input type="checkbox" checked={selected.includes(f)}
            onChange={(e) => onChange((e.target as HTMLInputElement).checked ? [...selected, f] : selected.filter((x) => x !== f))} />
          <span>{l3(FLAG_LABELS[f])}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function TriState({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const v = value ?? "unknown";
  return (
    <div class="tri" role="radiogroup" aria-label={label}>
      <span class="tri-label">{label}</span>
      <div class="seg">
        {(["yes", "no", "unknown"] as const).map((o) => (
          <button type="button" key={o} role="radio" aria-checked={v === o} class={v === o ? "sel" : ""} onClick={() => onChange(o)}>{t(o)}</button>
        ))}
      </div>
    </div>
  );
}

const VITALS = ["heart_rate", "sbp", "dbp", "resp_rate", "spo2", "temp_c", "gcs", "glucose_mmol", "pain_score"] as const;
export type VitalsValue = Record<string, string | number | null>;

export function VitalsForm({ value, onChange }: { value: VitalsValue; onChange: (v: VitalsValue) => void }) {
  const { t } = useI18n();
  return (
    <fieldset class="card">
      <legend>{t("enc_vitals")}</legend>
      <div class="grid2">
        {VITALS.map((k) => (
          <label class="field" key={k}>
            <span>{t(`v_${k}` as Key)}</span>
            <input inputMode="decimal" autoComplete="off" value={value[k] ?? ""}
              onInput={(e) => onChange({ ...value, [k]: (e.target as HTMLInputElement).value.replace(",", ".") || null })} />
          </label>
        ))}
      </div>
      <div class="tri">
        <span class="tri-label">{t("v_consciousness")}</span>
        <div class="seg">
          {["A", "C", "V", "P", "U"].map((o) => (
            <button type="button" key={o} aria-pressed={value.consciousness === o} class={value.consciousness === o ? "sel" : ""}
              onClick={() => onChange({ ...value, consciousness: value.consciousness === o ? null : o })}>{o}</button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

/** Numeric vitals for the API: empty → null (unknown), never 0. */
export function cleanVitals(v: VitalsValue) {
  const out: Record<string, number | string | null> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === null || val === "") { out[k] = null; continue; }
    if (k === "consciousness") { out[k] = val; continue; }
    const n = Number(val);
    out[k] = Number.isFinite(n) ? n : null;
  }
  return out;
}

export function VoiceButton({ onText }: { onText: (s: string) => void }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "listening" | "review">("idle");
  const [text, setText] = useState("");
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []); // mic off when the screen closes
  if (!voiceSupported()) return <p class="muted small">{t("voice_unsupported")}</p>;
  const start = async () => {
    ctrl.current = new AbortController();
    setState("listening");
    try {
      const s = await listen(lang, ctrl.current.signal);
      setText(s); setState(s ? "review" : "idle");
    } catch { setState("idle"); }
  };
  return (
    <div class="voice">
      {state === "idle" && <button type="button" class="btn secondary" onClick={start}>🎤 {t("voice")}</button>}
      {state === "listening" && <button type="button" class="btn secondary" onClick={() => { ctrl.current?.abort(); setState("idle"); }}>■ {t("voice_listening")}</button>}
      {state === "review" && (
        <div class="card warn">
          <p><strong>{t("voice_review")}</strong></p>
          {RISKY.test(text) && <p class="warn-text">⚠ {t("voice_numbers_warning")}</p>}
          <textarea rows={3} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
          <div class="row">
            <button type="button" class="btn" onClick={() => { onText(text); setState("idle"); }}>{t("voice_insert")}</button>
            <button type="button" class="btn secondary" onClick={() => setState("idle")}>{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorNote({ code }: { code: string | null }) {
  const { t } = useI18n();
  if (!code) return null;
  const k = `err_${code}` as Key;
  return <p class="error" role="alert">{t(k) !== k ? t(k) : t("err_generic")}</p>;
}

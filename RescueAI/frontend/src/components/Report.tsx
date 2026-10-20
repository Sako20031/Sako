import { useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Key } from "../i18n/ru";
import { FLAG_LABELS, VITAL_ALERT_LABELS } from "../data/flags";
import { ErrorNote } from "./ui";

export interface Report {
  analysis_id: string; task_type: string; status: string; status_message: string | null; error_code: string | null;
  A_immediate_danger: { final_urgency: string; alerts: { code: string; severity: string }[]; ai_dangerous_findings: string[];
    missing_vitals: string[]; conflict_requires_attention: boolean };
  B_findings: { observed: { text: string; location: string | null }[]; measurements: any[]; algorithmic: { summary: string }[];
    clinician_confirmed: any[] };
  C_differential: { name: string; supporting_evidence: string[]; evidence_against: string[]; missing_information: string[];
    is_dangerous_alternative: boolean }[];
  D_next_steps: string[];
  E_limitations: string[];
  F_references: { verified_kz: any[]; verified_other: any[]; unverified: any[]; kz_protocol_available: boolean };
  G_review: { history: { action: string; final_assessment: string | null; comment: string | null; at: string }[] };
  technical: { quality: any; transformations: string[]; safety_flags: string[]; provider: string | null; model: string | null;
    pipeline_version: string; rules_version: string };
}

function Lim({ code }: { code: string }) {
  const { t } = useI18n();
  const k = `lim_${code}` as Key;
  return <li>{t(k) !== k ? t(k) : code}</li>;
}

export function ReportView({ report, onChange }: { report: Report; onChange: (r: Report) => void }) {
  const { t, l3 } = useI18n();
  const r = report;
  const done = r.status === "completed";
  const a = r.A_immediate_danger;
  const statusKey = `st_${r.status}` as Key;
  const errKey = `err_${r.error_code}` as Key;
  return (
    <article class="report">
      <section class={`card status-${r.status}`} role="status">
        <strong>{t(statusKey) !== statusKey ? t(statusKey) : r.status_message}</strong>
        {r.error_code && t(errKey) !== errKey && <p>{t(errKey)}</p>}
        {done && <p class="muted">{t("r_review_required")}</p>}
      </section>

      <section class="card">
        <h2>{t("r_A")}</h2>
        <p class={`pill lvl-${a.final_urgency}`}>{t("r_final_urgency")}: {t(`urg_${a.final_urgency}` as Key)}</p>
        {a.conflict_requires_attention && <p class="warn-text" role="alert">⚠ {t("r_conflict")}</p>}
        <ul>
          {a.alerts.map((x) => <li key={x.code}>{l3(FLAG_LABELS[x.code] ?? VITAL_ALERT_LABELS[x.code] ?? { ru: x.code, kk: x.code, en: x.code })}</li>)}
          {a.ai_dangerous_findings.map((x, i) => <li key={i}>[AI] {x}</li>)}
        </ul>
        {a.missing_vitals.length > 0 && <p class="muted">{t("missing_vitals")}: {a.missing_vitals.map((v) => t(`v_${v}` as Key)).join(", ")}</p>}
      </section>

      {done && (
        <>
          <section class="card">
            <h2>{t("r_B")}</h2>
            <h3>{t("r_observed")}</h3>
            <ul>{r.B_findings.observed.map((o, i) => <li key={i}>{o.text}{o.location ? ` — ${o.location}` : ""}</li>)}</ul>
            {r.B_findings.measurements.length > 0 && (
              <>
                <h3>{t("r_measurements")}</h3>
                <table class="meas"><tbody>
                  {r.B_findings.measurements.map((m, i) => (
                    <tr key={i}><th>{m.name}</th>
                      <td>{m.value === null ? <em>{t("r_not_assessable")}</em> : `≈ ${m.value} ${m.unit} (${t("r_estimated")})`}
                        <div class="muted small">{m.method}{m.limitations ? ` · ${m.limitations}` : ""}</div></td></tr>
                  ))}
                </tbody></table>
              </>
            )}
            <h3>{t("r_algorithmic")}</h3>
            {r.B_findings.algorithmic.map((x, i) => <p key={i}>{x.summary}</p>)}
            {r.B_findings.clinician_confirmed.length > 0 && <h3>{t("r_confirmed")}</h3>}
            {r.B_findings.clinician_confirmed.map((c, i) => <p key={i}>{(c.findings || []).join("; ")} {c.final_assessment}</p>)}
          </section>

          <section class="card">
            <h2>{t("r_C")}</h2>
            {r.C_differential.map((d, i) => (
              <div class="dx" key={i}>
                <h3>{d.is_dangerous_alternative && <span class="tag danger">{t("r_dangerous_alt")}</span>} {d.name}</h3>
                {d.supporting_evidence.length > 0 && <p><b>{t("r_supporting")}:</b> {d.supporting_evidence.join("; ")}</p>}
                {d.evidence_against.length > 0 && <p><b>{t("r_against")}:</b> {d.evidence_against.join("; ")}</p>}
                {d.missing_information.length > 0 && <p><b>{t("r_missing")}:</b> {d.missing_information.join("; ")}</p>}
              </div>
            ))}
          </section>

          <section class="card"><h2>{t("r_D")}</h2><ol>{r.D_next_steps.map((s, i) => <li key={i}>{s}</li>)}</ol></section>
        </>
      )}

      <section class="card">
        <h2>{t("r_E")}</h2>
        <ul>{r.E_limitations.map((c, i) => <Lim key={i} code={c} />)}</ul>
        {r.technical.safety_flags.map((f) => { const k = `sf_${f}` as Key; return <p key={f} class="muted small">• {t(k) !== k ? t(k) : f}</p>; })}
      </section>

      <References refs={r.F_references} />
      {r.status !== "processing" && <Review report={r} onChange={onChange} />}

      <details class="card small">
        <summary>{t("model_info")}</summary>
        <p>{r.technical.provider ?? "—"} · {r.technical.model ?? "—"} · {r.technical.pipeline_version} · rules {r.technical.rules_version}</p>
        <p>{t("transformations")}: {r.technical.transformations.join(", ") || "—"}</p>
      </details>
    </article>
  );
}

export function References({ refs }: { refs: Report["F_references"] }) {
  const { t } = useI18n();
  const item = (p: any) => (
    <li key={p.slug}>
      <b>{p.title}</b> — {p.issuer}{p.version ? `, ${p.version}` : ""} <span class={`tag st-${p.status}`}>{t(`ref_status_${p.status}` as Key)}</span>
      {p.source_url && <> · <a href={p.source_url} target="_blank" rel="noopener noreferrer">{t("ref_open")}</a></>}
    </li>
  );
  return (
    <section class="card">
      <h2>{t("r_F")}</h2>
      {!refs.kz_protocol_available && <p class="warn-text">{t("r_no_kz_protocol")}</p>}
      <ul>{refs.verified_kz.map(item)}{refs.verified_other.map(item)}</ul>
      {refs.unverified.length > 0 && (
        <details><summary>{t("r_unverified_refs")} ({refs.unverified.length})</summary><ul>{refs.unverified.map(item)}</ul></details>
      )}
    </section>
  );
}

function Review({ report, onChange }: { report: Report; onChange: (r: Report) => void }) {
  const { t } = useI18n();
  const [final, setFinal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async (action: "confirm" | "edit" | "incorrect") => {
    setBusy(true); setErr(null);
    try {
      const body = { action, final_assessment: final || null, edited_findings: action === "edit" && final ? [final] : null };
      onChange(await api.post<Report>(`/api/analyses/${report.analysis_id}/review`, body));
      setFinal("");
    } catch (e: any) { setErr(e.code ?? "generic"); }
    setBusy(false);
  };
  return (
    <section class="card">
      <h2>{t("r_G")}</h2>
      <ul>{report.G_review.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} — {h.action}{h.final_assessment ? `: ${h.final_assessment}` : ""}</li>)}</ul>
      <label class="field"><span>{t("final_assessment")}</span>
        <textarea rows={2} value={final} onInput={(e) => setFinal((e.target as HTMLTextAreaElement).value)} /></label>
      <div class="row">
        {report.status === "completed" && <button class="btn" disabled={busy} onClick={() => send("confirm")}>{t("confirm")}</button>}
        <button class="btn secondary" disabled={busy || !final} onClick={() => send("edit")}>{t("edit")}</button>
        {report.status === "completed" && <button class="btn danger" disabled={busy} onClick={() => send("incorrect")}>{t("mark_incorrect")}</button>}
      </div>
      <ErrorNote code={err} />
    </section>
  );
}

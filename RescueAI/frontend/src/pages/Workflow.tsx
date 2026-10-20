import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { api, newKey, pollUntilDone } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { evaluate } from "../lib/triage";
import { QUESTIONS, WORKFLOWS } from "../data/workflows";
import { GENERAL_FLAGS } from "../data/flags";
import { cleanVitals, ErrorNote, FlagChecklist, Header, TriState, UrgentBanner, VitalsForm, VoiceButton, type VitalsValue } from "../components/ui";
import { ReportView, type Report } from "../components/Report";
import { useMe, useOnline, useStatus } from "../lib/session";

export default function Workflow({ id }: { id: string }) {
  const { t, l3, lang } = useI18n();
  const w = WORKFLOWS.find((x) => x.id === id);
  const me = useMe();
  const online = useOnline();
  const status = useStatus(online);
  const [flags, setFlags] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalsValue>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lkw, setLkw] = useState("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const allFlags = useMemo(() => (w ? Array.from(new Set([...w.flags, ...GENERAL_FLAGS])) : []), [w]);
  const triage = useMemo(() => evaluate("symptoms", cleanVitals(vitals), flags), [vitals, flags]);
  if (!w) return <main><Header title="?" /></main>;

  const runAI = async () => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setBusy(true); setErr(null);
    try {
      const body = { language: lang, workflow: w.id, flags, vitals: cleanVitals(vitals), answers,
        onset: lkw || null, notes: notes || null, chief_complaint: w.title.en };
      const acc = await api.post<{ id: string }>("/api/analyses/symptoms", body, { signal: ctrl.current.signal, headers: { "Idempotency-Key": newKey() } });
      setReport(await pollUntilDone<Report>(`/api/analyses/${acc.id}`, ctrl.current.signal));
    } catch (e: any) { if (e?.name !== "AbortError") setErr(e.code ?? "generic"); }
    setBusy(false);
  };

  return (
    <main>
      <Header title={l3(w.title)} />
      <UrgentBanner triage={triage} />
      <FlagChecklist flags={allFlags} selected={flags} onChange={setFlags} />
      {w.neuro && (
        <fieldset class="card">
          <legend>{t("sym_lkw")}</legend>
          <input type="datetime-local" value={lkw} onInput={(e) => setLkw((e.target as HTMLInputElement).value)} aria-label={t("sym_lkw")} />
          <p class="warn-text small">{t("sym_lkw_note")}</p>
        </fieldset>
      )}
      <fieldset class="card">
        <legend>{t("sym_key_info")}</legend>
        {w.questions.map((q) => <TriState key={q} label={l3(QUESTIONS[q])} value={answers[q]} onChange={(v) => setAnswers({ ...answers, [q]: v })} />)}
        <label class="field"><span>{t("notes")}</span><textarea rows={3} value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} /></label>
        <VoiceButton onText={(s) => setNotes((n) => (n ? n + " " : "") + s)} />
      </fieldset>
      <VitalsForm value={vitals} onChange={setVitals} />
      <section class="card">
        <h2>{t("sym_ai")}</h2>
        {!online ? <p>{t("ai_offline")}</p>
          : status && !status.ai.text_analysis_available ? <p>{t("ai_unavailable")}</p>
          : me ? <button class="btn" disabled={busy} onClick={runAI}>{busy ? t("analyzing") : t("sym_ai_run")}</button>
          : <p class="muted">{t("login_needed")}</p>}
        <ErrorNote code={err} />
      </section>
      {report && <ReportView report={report} onChange={setReport} />}
      <p class="muted small">{t("checklist_status")}</p>
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { newKey, pollUntilDone, upload } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { evaluate } from "../lib/triage";
import { processInBackground, releaseWorker } from "../lib/image";
import type { Crop, ProcessOut } from "../lib/imageCore";
import { IMAGE_TASK_FLAGS, IMAGE_TASK_QUESTIONS } from "../data/workflows";
import { cleanVitals, ErrorNote, FlagChecklist, Header, TriState, UrgentBanner, VitalsForm, type VitalsValue } from "../components/ui";
import { ReportView, type Report } from "../components/Report";
import { useMe, useOnline } from "../lib/session";
import type { Key } from "../i18n/ru";
import { Login } from "./Login";

type Task = "ecg" | "skin" | "wound";
const NO_CROP: Crop = { l: 0, r: 0, t: 0, b: 0 };

export default function ImageAnalysis({ task, encounterId }: { task: Task; encounterId?: string }) {
  const { t, l3, lang } = useI18n();
  const me = useMe();
  const online = useOnline();
  const [flags, setFlags] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalsValue>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [location, setLocation] = useState("");
  const [onset, setOnset] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Crop>(NO_CROP);
  const [prepared, setPrepared] = useState<ProcessOut | null>(null);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const idem = useRef(newKey());

  // Instant, local, network-independent.
  const triage = useMemo(() => evaluate(task, cleanVitals(vitals), flags), [task, vitals, flags]);

  // Release object URLs, cancel requests and stop the worker when leaving the screen.
  useEffect(() => () => { ctrl.current?.abort(); releaseWorker(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Re-process the analysis copy (off the main thread) whenever the user adjusts it.
  useEffect(() => {
    if (!file || file.type === "application/pdf") { setPrepared(null); return; }
    let live = true;
    const h = setTimeout(() => {
      processInBackground({ file, task, rotation, crop }).then((o) => live && setPrepared(o)).catch(() => live && setErr("image_corrupt"));
    }, 250);
    return () => { live = false; clearTimeout(h); };
  }, [file, rotation, crop, task]);

  const pick = (f: File | null) => {
    setErr(null); setReport(null); setPhase("idle"); setRotation(0); setCrop(NO_CROP); setPrepared(null);
    idem.current = newKey();
    setFile(f);
    setPreview(f && f.type !== "application/pdf" ? URL.createObjectURL(f) : null);
  };

  const run = async () => {
    if (!file) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setErr(null); setPhase("uploading"); setProgress(0);
    const ctx = { language: lang, flags, vitals: cleanVitals(vitals), answers, body_location: location || null, onset: onset || null, notes: notes || null };
    const form = new FormData();
    form.append("task_type", task);
    form.append("context", JSON.stringify(ctx));
    form.append("save_original", String(saveOriginal));
    if (encounterId) form.append("encounter_id", encounterId);
    // The (rotated/cropped/resized) analysis copy is analysed; the untouched original is
    // uploaded separately only when the clinician chose to keep it.
    const copy = prepared && !prepared.passthrough ? prepared.blob : file;
    form.append("file", copy, file.name || "image.jpg");
    if (saveOriginal && copy !== file) form.append("original", file, file.name || "original");
    try {
      const accepted = await upload<{ id: string }>("/api/analyses", form, { signal: ctrl.current.signal, onProgress: setProgress, idempotencyKey: idem.current });
      setPhase("analyzing");
      setReport(await pollUntilDone<Report>(`/api/analyses/${accepted.id}`, ctrl.current.signal));
      setPhase("done");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e.code ?? "generic"); setPhase("idle");
    }
  };

  const titleKey = (`tile_${task}`) as Key;
  const qs = IMAGE_TASK_QUESTIONS[task];
  const q = prepared?.quality;
  return (
    <main>
      <Header title={t(titleKey)} />
      <UrgentBanner triage={triage} />
      <FlagChecklist flags={IMAGE_TASK_FLAGS[task]} selected={flags} onChange={setFlags} />

      {me === null ? <Login /> : (
        <>
          <fieldset class="card">
            <legend>{t("context")}</legend>
            {Object.entries(qs).map(([k, label]) => (
              <TriState key={k} label={l3(label)} value={answers[k]} onChange={(v) => setAnswers({ ...answers, [k]: v })} />
            ))}
            {task !== "ecg" && <label class="field"><span>{t("body_location")}</span><input value={location} onInput={(e) => setLocation((e.target as HTMLInputElement).value)} /></label>}
            <label class="field"><span>{t("onset")}</span><input value={onset} onInput={(e) => setOnset((e.target as HTMLInputElement).value)} /></label>
            <label class="field"><span>{t("notes")}</span><textarea rows={2} value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} /></label>
          </fieldset>
          <details class="card"><summary>{t("enc_vitals")}</summary><VitalsForm value={vitals} onChange={setVitals} /></details>

          <fieldset class="card">
            <legend>{t("photo")}</legend>
            <div class="row">
              <label class="btn">📷 {t("take_photo")}
                <input type="file" accept="image/*" capture="environment" class="hidden" onChange={(e) => pick((e.target as HTMLInputElement).files?.[0] ?? null)} /></label>
              <label class="btn secondary">🖼 {t("choose_file")}
                <input type="file" accept={task === "ecg" ? "image/jpeg,image/png,application/pdf" : "image/jpeg,image/png,image/*"} class="hidden"
                  onChange={(e) => pick((e.target as HTMLInputElement).files?.[0] ?? null)} /></label>
            </div>
            {file && file.type === "application/pdf" && <p>PDF: {file.name}</p>}
            {preview && (
              <>
                <div class="preview"><img src={preview} alt="" decoding="async" style={{ transform: `rotate(${rotation}deg)` }} /></div>
                <div class="row">
                  <button type="button" class="btn secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>↻ {t("rotate")}</button>
                  <button type="button" class="btn secondary" onClick={() => pick(null)}>{t("retake")}</button>
                </div>
                <details><summary>{t("crop")}</summary>
                  {(["l", "r", "t", "b"] as const).map((s) => (
                    <label class="field" key={s}><span>{t(({ l: "crop_left", r: "crop_right", t: "crop_top", b: "crop_bottom" } as const)[s])} {Math.round(crop[s] * 100)}%</span>
                      <input type="range" min={0} max={45} value={crop[s] * 100} onChange={(e) => setCrop({ ...crop, [s]: Number((e.target as HTMLInputElement).value) / 100 })} /></label>
                  ))}
                </details>
                {q && <p class={`quality q-${q.level}`}>{t("quality_check")}: {t(`quality_${q.level}` as Key)}{q.issues.length ? ` (${q.issues.map((i) => t(`q_${i}` as Key)).join(", ")})` : ""}</p>}
              </>
            )}
            <label class="check"><input type="checkbox" checked={saveOriginal} onChange={(e) => setSaveOriginal((e.target as HTMLInputElement).checked)} /><span>{t("save_original")}</span></label>
            {!online && <p class="warn-text">{t("ai_offline")}</p>}
            <div class="row">
              <button class="btn big" disabled={!file || !online || phase === "uploading" || phase === "analyzing"} onClick={run}>{t("analyze")}</button>
              {(phase === "uploading" || phase === "analyzing") && <button class="btn secondary" onClick={() => { ctrl.current?.abort(); setPhase("idle"); }}>{t("cancel")}</button>}
            </div>
            {phase === "uploading" && <p role="status">{t("uploading")} {Math.round(progress * 100)}%</p>}
            {phase === "analyzing" && <p role="status">{t("analyzing")}</p>}
            <ErrorNote code={err} />
          </fieldset>
          {report && <ReportView report={report} onChange={setReport} />}
        </>
      )}
      <p class="muted small disclaimer">{t("disclaimer")}</p>
    </main>
  );
}

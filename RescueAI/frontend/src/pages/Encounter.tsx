import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { go } from "../lib/router";
import { useI18n } from "../lib/i18n";
import { evaluate } from "../lib/triage";
import { useMe, useOnline } from "../lib/session";
import { cleanVitals, ErrorNote, Header, UrgentBanner, VitalsForm, VoiceButton, type VitalsValue } from "../components/ui";
import type { Key } from "../i18n/ru";
import { Login } from "./Login";

const TEXT = ["chief_complaint", "onset", "history", "allergies", "medications", "notes"] as const;
const LABEL: Record<string, Key> = { chief_complaint: "enc_complaint", onset: "onset", history: "enc_history",
  allergies: "enc_allergies", medications: "enc_medications", notes: "notes" };

export default function Encounter({ id }: { id: string }) {
  const { t } = useI18n();
  const me = useMe();
  const online = useOnline();
  const isNew = id === "new";
  const [f, setF] = useState<Record<string, any>>({ sex: "unknown", pregnancy: "unknown" });
  const [vitals, setVitals] = useState<VitalsValue>({});
  const [prov, setProv] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [note, setNote] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !me) return;
    const c = new AbortController();
    api.get<any>(`/api/encounters/${id}`, c.signal).then((e) => {
      setF(e); setVitals(e.vitals || {}); setProv(e.provenance || {}); setAnalyses(e.analyses || []);
    }).catch((x) => setErr(x.code));
    return () => c.abort();
  }, [id, me]);

  const triage = useMemo(() => evaluate("symptoms", cleanVitals(vitals), []), [vitals]);
  if (me === null) return <main><Header title={t("enc_title")} /><Login /></main>;

  const set = (k: string, v: any, source = "clinician") => { setF({ ...f, [k]: v }); setProv({ ...prov, [k]: source }); };
  const payload = () => ({
    patient_ref: f.patient_ref || null, age_years: f.age_years === "" || f.age_years == null ? null : Number(f.age_years),
    sex: f.sex, pregnancy: f.pregnancy, vitals: cleanVitals(vitals), provenance: prov,
    ...Object.fromEntries(TEXT.map((k) => [k, f[k] || null])),
  });
  const save = async () => {
    setErr(null); setMsg(null);
    if (!online) { setErr("network_error"); setMsg(t("not_saved_offline")); return; }
    try {
      const e = isNew ? await api.post<any>("/api/encounters", payload()) : await api.put<any>(`/api/encounters/${id}`, payload());
      setMsg(t("saved"));
      if (isNew) go(`encounter/${e.id}`);
    } catch (x: any) { setErr(x.code); }
  };
  const del = async () => {
    if (!confirm(t("enc_delete_confirm"))) return;
    try { await api.del(`/api/encounters/${id}`); go("history"); } catch (x: any) { setErr(x.code); }
  };
  const draft = async () => { try { setNote(await api.post<any>(`/api/encounters/${id}/documentation`)); } catch (x: any) { setErr(x.code); } };
  const review = async () => {
    try {
      const n = await api.post<any>(`/api/encounters/${id}/documentation/${note.id}/review`, { sections: note.sections });
      setNote(n);
      const { text } = await api.get<{ text: string }>(`/api/encounters/${id}/documentation/${n.id}/export`);
      await navigator.clipboard?.writeText(text);
      setMsg(t("doc_copied"));
    } catch (x: any) { setErr(x.code); }
  };

  return (
    <main>
      <Header title={t("enc_title")} />
      <UrgentBanner triage={triage} />
      <p class="muted">{t("enc_optional")}</p>
      <fieldset class="card">
        <label class="field"><span>{t("enc_patient_ref")}</span><input value={f.patient_ref ?? ""} onInput={(e) => set("patient_ref", (e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span>{t("enc_age")}</span><input inputMode="decimal" value={f.age_years ?? ""} onInput={(e) => set("age_years", (e.target as HTMLInputElement).value)} /></label>
        <label class="field"><span>{t("enc_sex")}</span>
          <select value={f.sex} onChange={(e) => set("sex", (e.target as HTMLSelectElement).value)}>
            <option value="unknown">{t("unknown")}</option><option value="male">{t("sex_male")}</option><option value="female">{t("sex_female")}</option>
          </select></label>
        <label class="field"><span>{t("enc_pregnancy")}</span>
          <select value={f.pregnancy} onChange={(e) => set("pregnancy", (e.target as HTMLSelectElement).value)}>
            <option value="unknown">{t("unknown")}</option><option value="yes">{t("yes")}</option><option value="no">{t("no")}</option><option value="not_applicable">{t("na")}</option>
          </select></label>
        {TEXT.map((k) => (
          <div key={k}>
            <label class="field"><span>{t(LABEL[k])} {prov[k] === "voice" && <span class="tag">{t("src_voice")}</span>}</span>
              <textarea rows={k === "notes" ? 3 : 1} value={f[k] ?? ""} onInput={(e) => set(k, (e.target as HTMLTextAreaElement).value)} /></label>
            {(k === "chief_complaint" || k === "notes") && <VoiceButton onText={(s) => set(k, ((f[k] ?? "") + " " + s).trim(), "voice")} />}
          </div>
        ))}
      </fieldset>
      <VitalsForm value={vitals} onChange={setVitals} />
      <div class="row">
        <button class="btn big" onClick={save}>{t("save")}</button>
        {!isNew && <button class="btn danger" onClick={del}>{t("enc_delete")}</button>}
      </div>
      {msg && <p role="status">{msg}</p>}
      <ErrorNote code={err} />

      {!isNew && (
        <>
          <section class="card">
            <h2>{t("enc_analyses")}</h2>
            <div class="row">
              {(["ecg", "skin", "wound"] as const).map((k) => <a key={k} class="btn secondary" href={`#/${k}/${id}`}>{t(`tile_${k}` as Key)}</a>)}
            </div>
            <ul class="list">{analyses.map((a) => <li key={a.id}>{t(`tile_${a.task_type}` as Key)} — {a.status} — {new Date(a.created_at).toLocaleString()}</li>)}</ul>
          </section>
          <section class="card">
            <h2>{t("enc_docs")}</h2>
            <button class="btn secondary" onClick={draft}>{t("doc_draft")}</button>
            {note && (
              <>
                {Object.entries(note.sections as Record<string, { text: string; source: string }[]>).filter(([, v]) => v.length).map(([s, items]) => (
                  <div key={s}><h3>{s.replace(/_/g, " ")}</h3>
                    <ul>{items.map((it, i) => <li key={i}>{it.text} <span class={`tag src-${it.source}`}>{t(`src_${it.source}` as Key)}</span></li>)}</ul></div>
                ))}
                <p class="muted">{t("doc_review_first")}</p>
                <button class="btn" onClick={review}>{t("doc_review")} · {t("doc_copy")}</button>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

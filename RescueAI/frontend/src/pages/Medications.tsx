import { useEffect, useState } from "preact/hooks";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { readBundle } from "../lib/offline";
import { useMe, useOnline } from "../lib/session";
import { Header } from "../components/ui";
import type { Key } from "../i18n/ru";

const FIELDS = ["indications", "contraindications", "precautions", "adverse_effects", "interactions", "routes",
  "dosing", "max_dose", "monitoring", "pediatric", "pregnancy"];

export default function Medications() {
  const { t } = useI18n();
  const online = useOnline();
  const me = useMe();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    const c = new AbortController();
    const h = setTimeout(async () => {
      try {
        if (online && me) setItems((await api.get<{ items: any[] }>(`/api/references/medications?limit=50&q=${encodeURIComponent(q)}`, c.signal)).items);
        else setItems(((await readBundle())?.medications ?? []).filter((m) => !q || m.generic_name.includes(q)));
      } catch { setItems(((await readBundle())?.medications) ?? []); }
    }, 300);
    return () => { clearTimeout(h); c.abort(); };
  }, [q, online, me]);
  return (
    <main>
      <Header title={t("med_title")} />
      <p class="warn-text">{t("med_warning")}</p>
      <input type="search" class="search" placeholder={t("ref_search")} aria-label={t("ref_search")} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      {items?.length === 0 && <p class="card">{t("med_none")}</p>}
      {items?.map((m) => (
        <details class="card" key={m.generic_name}>
          <summary><b>{m.generic_name}</b> {m.drug_class && `· ${m.drug_class}`} <span class={`tag st-${m.status}`}>{t(`ref_status_${m.status}` as Key)}</span></summary>
          {!m.dosing_verified && <p class="warn-text">{t("med_dosing_unverified")}</p>}
          <dl>{FIELDS.map((f) => (
            <div key={f}><dt>{t(`mf_${f}` as Key)}</dt>
              <dd>{f === "dosing" || f === "max_dose" ? (m.dosing_verified && m.fields[f] ? m.fields[f] : <em>{t("med_not_available")}</em>) : m.fields[f] ?? <em>{t("med_not_available")}</em>}</dd></div>
          ))}</dl>
          <p class="small">{t("med_source")}: {m.source_title ?? "—"} {m.protocol_version ? `(${m.protocol_version})` : ""} · {t("ref_verified")}: {m.last_verified ?? t("ref_never")}</p>
        </details>
      ))}
    </main>
  );
}

import { useI18n } from "../lib/i18n";
import { WORKFLOWS } from "../data/workflows";
import { Header } from "../components/ui";

export default function Symptoms() {
  const { t, l3 } = useI18n();
  return (
    <main>
      <Header title={t("sym_title")} />
      <p class="muted">{t("sym_choose")}</p>
      <ul class="biglist">{WORKFLOWS.map((w) => <li key={w.id}><a href={`#/workflow/${w.id}`}>{l3(w.title)}</a></li>)}</ul>
    </main>
  );
}

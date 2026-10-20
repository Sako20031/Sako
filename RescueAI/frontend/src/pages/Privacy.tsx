import { useI18n } from "../lib/i18n";
import { Header } from "../components/ui";

export default function Privacy() {
  const { t } = useI18n();
  return (
    <main>
      <Header title={t("privacy_title")} />
      <section class="card"><p>{t("privacy_body")}</p><p class="muted">{t("privacy_providers")}</p></section>
      <p class="muted small">{t("disclaimer")}</p>
    </main>
  );
}

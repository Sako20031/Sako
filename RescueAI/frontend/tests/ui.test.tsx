import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import axe from "axe-core";
import { I18nProvider } from "../src/lib/i18n";
import { UrgentBanner } from "../src/components/ui";
import { ReportView, type Report } from "../src/components/Report";
import { evaluate } from "../src/lib/triage";
import Home from "../src/pages/Home";
import ImageAnalysis from "../src/pages/ImageAnalysis";
import Settings from "../src/pages/Settings";
import { setMe } from "../src/lib/session";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function mockApi(me: any = { id: "u", username: "medic", role: "paramedic" }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (u: any) => {
    const url = String(u);
    if (url.includes("/api/auth/me")) return me ? json(me) : json({ detail: "not_authenticated" }, 401);
    if (url.includes("/api/status")) return json({ ai: { available: false, image_analysis_available: false, text_analysis_available: false }, triage_rules: { version: "x", status: "unverified" } });
    if (url.includes("/api/encounters")) return json({ total: 0, items: [] });
    return json({});
  });
}
const wrap = (el: any) => render(<I18nProvider>{el}</I18nProvider>);

async function noA11yViolations(container: Element) {
  const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } }); // jsdom has no layout
  expect(res.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

describe("urgent banner", () => {
  it("critical sign renders an alert with text, not colour alone", () => {
    wrap(<UrgentBanner triage={evaluate("skin", {}, ["throat_tongue_swelling"])} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/ЭКСТРЕННО/);
    expect(alert.textContent).toMatch(/Отёк языка или горла/);
  });
});

describe("home", () => {
  it("renders all emergency entry points immediately and is accessible", async () => {
    mockApi();
    setMe(undefined as any);
    const { container } = wrap(<Home />);
    for (const name of ["ЭКГ", "Симптомы", "Сыпь", "Раны", "Экстренные алгоритмы", "Препараты", "Справочник"])
      expect(screen.getByRole("link", { name: new RegExp(name) })).toBeTruthy();
    await waitFor(() => expect(container.textContent).toMatch(/недоступен/));
    await noA11yViolations(container);
  });
});

describe("image analysis screen", () => {
  it("airway emergency shows critical guidance without any upload or analysis request", async () => {
    const f = mockApi();
    setMe({ id: "u", username: "medic", role: "paramedic" });
    const { container } = wrap(<ImageAnalysis task="skin" />);
    fireEvent.click(screen.getByLabelText("Отёк языка или горла"));
    expect(screen.getByRole("alert").textContent).toMatch(/Критический признак/);
    const posts = f.mock.calls.filter(([, init]: any) => init?.method === "POST");
    expect(posts).toHaveLength(0);
    await noA11yViolations(container);
  });
  it("works without sign-in for the emergency checklist", () => {
    mockApi(null);
    setMe(null);
    wrap(<ImageAnalysis task="wound" />);
    fireEvent.click(screen.getByLabelText("Неконтролируемое кровотечение"));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Для анализа и сохранения нужен вход/)).toBeTruthy();
  });
});

const failedReport: Report = {
  analysis_id: "a", task_type: "ecg", status: "failed", status_message: "x", error_code: "provider_timeout",
  A_immediate_danger: { final_urgency: "indeterminate", alerts: [], ai_dangerous_findings: [], missing_vitals: ["spo2"], conflict_requires_attention: false },
  B_findings: { observed: [{ text: "SHOULD-NOT-SHOW", location: null }], measurements: [], algorithmic: [], clinician_confirmed: [] },
  C_differential: [{ name: "Sinus rhythm", supporting_evidence: [], evidence_against: [], missing_information: [], is_dangerous_alternative: false }],
  D_next_steps: [], E_limitations: ["normal_ecg_does_not_exclude_acs"],
  F_references: { verified_kz: [], verified_other: [], unverified: [], kz_protocol_available: false },
  G_review: { history: [] },
  technical: { quality: {}, transformations: [], safety_flags: [], provider: null, model: null, pipeline_version: "p", rules_version: "r" },
};

describe("report", () => {
  it("failed analysis is labelled not-normal and shows no interpretation", () => {
    wrap(<ReportView report={failedReport} onChange={() => {}} />);
    expect(screen.getByRole("status").textContent).toMatch(/НЕ нормальный/);
    expect(screen.queryByText("Sinus rhythm")).toBeNull();
    expect(screen.queryByText("SHOULD-NOT-SHOW")).toBeNull();
    expect(screen.getByText(/нет проверенного применимого протокола/)).toBeTruthy();
    expect(screen.getByText(/Нормальная ЭКГ не исключает/)).toBeTruthy();
  });
});

describe("language switching", () => {
  it("switches to Kazakh and persists the choice", async () => {
    mockApi();
    setMe({ id: "u", username: "medic", role: "paramedic" });
    wrap(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Қазақша" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Баптаулар"));
    expect(localStorage.getItem("rescue.lang")).toBe("kk");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Settings"));
  });
});

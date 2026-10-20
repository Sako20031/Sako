import { describe, expect, it, vi } from "vitest";
import cases from "../../shared/triage_cases.json";
import rules from "../../shared/triage_rules.json";
import { evaluate } from "../src/lib/triage";
import ru from "../src/i18n/ru";
import en from "../src/i18n/en";
import kk from "../src/i18n/kk";
import { FLAG_LABELS, VITAL_ALERT_LABELS } from "../src/data/flags";
import { IMAGE_TASK_FLAGS, QUESTIONS, WORKFLOWS } from "../src/data/workflows";
import { cleanVitals } from "../src/components/ui";
import { api, ApiError, pollUntilDone, request } from "../src/lib/api";
import { hint } from "../src/lib/imageCore";

describe("triage (shared cases with the backend)", () => {
  for (const [i, c] of cases.cases.entries()) {
    it(`case ${i} ${c.task}`, () => {
      const r = evaluate(c.task, c.vitals as any, c.flags);
      expect(r.level).toBe(c.level);
      expect(r.alerts.map((a) => a.code).sort()).toEqual([...c.codes].sort());
      if ("missing" in c) expect([...r.missing_vitals].sort()).toEqual([...(c as any).missing].sort());
    });
  }
  it("missing vitals are never treated as normal", () => {
    const r = evaluate("symptoms", cleanVitals({ heart_rate: "", spo2: null }), []);
    expect(r.level).toBe("indeterminate");
    expect(r.missing_vitals).toContain("spo2");
  });
});

describe("cleanVitals", () => {
  it("maps empty to null, never 0", () => {
    expect(cleanVitals({ heart_rate: "", spo2: "95", consciousness: "A", sbp: "abc" })).toEqual({ heart_rate: null, spo2: 95, consciousness: "A", sbp: null });
  });
});

describe("localization completeness", () => {
  const keys = Object.keys(ru);
  for (const [name, d] of [["en", en], ["kk", kk]] as const) {
    it(`${name} has every key, non-empty`, () => {
      for (const k of keys) expect((d as any)[k], `${name}.${k}`).toBeTruthy();
      expect(Object.keys(d).sort()).toEqual([...keys].sort());
    });
  }
  it("every rule flag and vital alert has a label in 3 languages", () => {
    for (const code of Object.keys(rules.flags)) for (const l of ["ru", "kk", "en"] as const) expect(FLAG_LABELS[code]?.[l], code).toBeTruthy();
    for (const t of rules.vital_thresholds) expect(VITAL_ALERT_LABELS[t.code]?.kk, t.code).toBeTruthy();
    expect(VITAL_ALERT_LABELS[rules.consciousness.code]).toBeTruthy();
  });
  it("workflows reference only existing flags and questions", () => {
    expect(WORKFLOWS.length).toBe(19);
    for (const w of WORKFLOWS) {
      for (const f of w.flags) expect((rules.flags as any)[f], `${w.id}:${f}`).toBeTruthy();
      for (const q of w.questions) expect(QUESTIONS[q], `${w.id}:${q}`).toBeTruthy();
      expect(w.title.kk && w.title.en && w.title.ru).toBeTruthy();
    }
    for (const list of Object.values(IMAGE_TASK_FLAGS)) for (const f of list) expect((rules.flags as any)[f], f).toBeTruthy();
  });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("network layer", () => {
  it("deduplicates concurrent identical GETs", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ ok: 1 }));
    const [a, b] = await Promise.all([api.get("/api/x"), api.get("/api/x")]);
    expect(a).toEqual(b);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("retries GET on 5xx with a bound, never retries POST", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ detail: "x" }, 503));
    await expect(request("/api/y", { retries: 1 })).rejects.toMatchObject({ status: 503 });
    expect(f).toHaveBeenCalledTimes(2);
    f.mockClear();
    await expect(api.post("/api/z", {})).rejects.toBeInstanceOf(ApiError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("sends CSRF header and same-origin credentials", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({}));
    await api.post("/api/p", { a: 1 });
    const init = f.mock.calls[0][1] as RequestInit;
    expect((init.headers as any)["x-rescue-client"]).toBe("1");
    expect(init.credentials).toBe("same-origin");
  });
  it("cancellation aborts the request", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_u, init: any) => new Promise((_, rej) =>
      init.signal.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))));
    const c = new AbortController();
    const p = api.get("/api/slow", c.signal);
    c.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
  it("maps structured error codes", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ detail: { code: "file_too_large" } }, 422));
    await expect(api.post("/api/u", {})).rejects.toMatchObject({ code: "file_too_large" });
  });
  it("polling stops on terminal status and never reports processing as done", async () => {
    let n = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ status: ++n < 2 ? "processing" : "failed" }));
    const r = await pollUntilDone<{ status: string }>("/api/analyses/1", new AbortController().signal);
    expect(r.status).toBe("failed");
  });
});

describe("image quality hint", () => {
  const img = (w: number, h: number, f: (x: number, y: number) => number) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y); d.set([v, v, v, 255], (y * w + x) * 4); }
    return d;
  };
  it("flags dark, flat images as poor", () => {
    expect(hint(img(64, 64, () => 10), 64, 64, 2000, "skin").level).toBe("poor");
  });
  it("accepts a sharp high-contrast grid", () => {
    const q = hint(img(128, 128, (x, y) => (x % 8 === 0 || y % 8 === 0 ? 20 : 240)), 128, 128, 2000, "ecg");
    expect(q.level).toBe("acceptable");
  });
  it("flags low resolution for ECG", () => {
    expect(hint(img(64, 64, (x) => (x % 4 ? 30 : 230)), 64, 64, 500, "ecg").issues).toContain("low_resolution");
  });
});

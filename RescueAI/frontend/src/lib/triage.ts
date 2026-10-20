// Browser port of backend/app/services/triage.py, evaluated from the same rule file so
// urgent guidance works offline and without waiting for any upload or AI call.
import rules from "../../../shared/triage_rules.json";

export type Level = "critical" | "urgent" | "non_urgent" | "indeterminate";
export interface Alert { code: string; severity: "critical" | "urgent"; kind: "reported_sign" | "vital_sign" }
export interface Triage { level: Level; alerts: Alert[]; missing_vitals: string[]; immediate_action_required: boolean; rules_version: string }
export type Vitals = Partial<Record<string, number | string | null>>;

const ORDER: Record<string, number> = { indeterminate: 0, non_urgent: 1, urgent: 2, critical: 3 };
const OPS: Record<string, (a: number, b: number) => boolean> = {
  "<=": (a, b) => a <= b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, ">": (a, b) => a > b,
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function evaluate(task: string, vitals: Vitals, flags: string[]): Triage {
  const alerts: Alert[] = [];
  const flagRules = rules.flags as Record<string, { severity: "critical" | "urgent"; tasks: string[] }>;
  for (const code of flags) {
    const r = flagRules[code];
    if (r && (r.tasks.includes("*") || r.tasks.includes(task))) alerts.push({ code, severity: r.severity, kind: "reported_sign" });
  }
  for (const t of rules.vital_thresholds) {
    const v = num(vitals[t.vital]);
    if (v !== null && OPS[t.op](v, t.value)) alerts.push({ code: t.code, severity: t.severity as Alert["severity"], kind: "vital_sign" });
  }
  if (rules.consciousness.critical_values.includes(String(vitals.consciousness ?? "")))
    alerts.push({ code: rules.consciousness.code, severity: "critical", kind: "vital_sign" });
  const missing = rules.essential_vitals.filter((k) => vitals[k] === undefined || vitals[k] === null || vitals[k] === "");
  let level: Level = "indeterminate";
  for (const a of alerts) if (ORDER[a.severity] > ORDER[level]) level = a.severity;
  return { level, alerts, missing_vitals: missing, immediate_action_required: level === "critical", rules_version: rules.version };
}

export const RULES_STATUS = rules.status;

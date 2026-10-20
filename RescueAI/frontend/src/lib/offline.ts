// Optional, user-managed offline reference. Holds protocol metadata, medication entries and
// triage rules — never patient data. Downloaded only when the user asks.
import { request } from "./api";
import { readMeta, writeMeta } from "./settings";

const CACHE = "rescue-reference-v1";
const KEY = "/offline/reference-bundle.json";

export interface Bundle { protocols: any[]; medications: any[]; triage_rules: any; version: string; bytes: number }
export interface OfflineMeta { version: string | null; syncedAt: string | null; bytes: number }

export const offlineMeta = (): OfflineMeta => ({
  version: readMeta("refVersion"),
  syncedAt: readMeta("refSyncedAt"),
  bytes: Number(readMeta("refBytes") || 0),
});

export async function downloadBundle(signal?: AbortSignal): Promise<OfflineMeta> {
  const b = await request<Bundle>("/api/references/bundle", { signal, retries: 2, timeoutMs: 30000 });
  const body = JSON.stringify(b);
  const cache = await caches.open(CACHE);
  await cache.put(KEY, new Response(body, { headers: { "content-type": "application/json" } }));
  writeMeta("refVersion", b.version);
  writeMeta("refSyncedAt", new Date().toISOString());
  writeMeta("refBytes", String(body.length));
  return offlineMeta();
}

export async function readBundle(): Promise<Bundle | null> {
  try {
    const r = await (await caches.open(CACHE)).match(KEY);
    return r ? r.json() : null;
  } catch { return null; }
}

export async function clearBundle() {
  await caches.delete(CACHE);
  writeMeta("refVersion", ""); writeMeta("refSyncedAt", ""); writeMeta("refBytes", "0");
}

export async function clearAppCaches() {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
}

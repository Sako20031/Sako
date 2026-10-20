import { useEffect, useState } from "preact/hooks";
import { api, ApiError } from "./api";

export interface Me { id: string; username: string; role: string }
export interface Status { ai: { available: boolean; image_analysis_available: boolean; text_analysis_available: boolean; reason?: string; model?: string }; triage_rules: { version: string; status: string } }

let meCache: Me | null | undefined;
const listeners = new Set<() => void>();

export async function loadMe(): Promise<Me | null> {
  try { meCache = await api.get<Me>("/api/auth/me"); }
  catch (e) { meCache = e instanceof ApiError && e.status === 401 ? null : meCache ?? null; }
  listeners.forEach((l) => l());
  return meCache;
}
export function setMe(m: Me | null) { meCache = m; listeners.forEach((l) => l()); }

export function useMe(): Me | null | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (meCache === undefined) loadMe();
    return () => { listeners.delete(l); };
  }, []);
  return meCache;
}

export function useOnline(): boolean {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    addEventListener("online", a); addEventListener("offline", b);
    return () => { removeEventListener("online", a); removeEventListener("offline", b); };
  }, []);
  return on;
}

export function useStatus(online: boolean): Status | null | undefined {
  const [s, setS] = useState<Status | null | undefined>(undefined);
  useEffect(() => {
    if (!online) { setS(null); return; }
    const c = new AbortController();
    api.get<Status>("/api/status", c.signal).then(setS).catch(() => setS(null));
    return () => c.abort();
  }, [online]);
  return s;
}

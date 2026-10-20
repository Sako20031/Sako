// Network layer: same-origin cookie auth, CSRF header, timeouts, cancellation,
// in-flight GET de-duplication and bounded retry with backoff for safe requests.

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body?: unknown) {
    super(code);
  }
}

const inflight = new Map<string, Promise<unknown>>();
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("aborted", "AbortError")); }, { once: true });
  });

export interface ReqOpts {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

function codeOf(body: any, status: number): string {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d.code === "string") return d.code;
  return `http_${status}`;
}

async function once<T>(url: string, o: ReqOpts): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 20000);
  const onAbort = () => ctrl.abort();
  o.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, {
      method: o.method ?? "GET",
      credentials: "same-origin",
      headers: { "x-rescue-client": "1", ...(o.body !== undefined ? { "content-type": "application/json" } : {}), ...o.headers },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(res.status, codeOf(body, res.status), body);
    return body as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (o.signal?.aborted) throw new DOMException("aborted", "AbortError");
    throw new ApiError(0, ctrl.signal.aborted ? "timeout" : "network_error");
  } finally {
    clearTimeout(timer);
    o.signal?.removeEventListener("abort", onAbort);
  }
}

export async function request<T>(url: string, o: ReqOpts = {}): Promise<T> {
  const method = o.method ?? "GET";
  const safe = method === "GET";
  const retries = o.retries ?? (safe ? 2 : 0);
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await once<T>(url, o);
      } catch (e) {
        const retryable = e instanceof ApiError && (e.status === 0 || e.status >= 500 || e.status === 429);
        if (!retryable || attempt >= retries) throw e;
        await sleep(Math.min(8000, 500 * 2 ** attempt), o.signal);
      }
    }
  };
  if (!safe || o.signal) return run();
  // Identical concurrent GETs share one network request.
  const existing = inflight.get(url) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) => request<T>(url, { signal }),
  post: <T>(url: string, body?: unknown, o: ReqOpts = {}) => request<T>(url, { ...o, method: "POST", body: body ?? {} }),
  put: <T>(url: string, body: unknown) => request<T>(url, { method: "PUT", body }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

/** Multipart upload with progress and cancellation (fetch has no upload progress). */
export function upload<T>(url: string, form: FormData, opts: { signal?: AbortSignal; onProgress?: (f: number) => void; idempotencyKey?: string } = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.setRequestHeader("x-rescue-client", "1");
    if (opts.idempotencyKey) xhr.setRequestHeader("Idempotency-Key", opts.idempotencyKey);
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body: any = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new ApiError(xhr.status, codeOf(body, xhr.status), body));
    };
    xhr.onerror = () => reject(new ApiError(0, "network_error"));
    xhr.ontimeout = () => reject(new ApiError(0, "timeout"));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

/** Poll a job with increasing intervals; stops on terminal status, abort, or deadline. */
export async function pollUntilDone<T extends { status: string }>(url: string, signal: AbortSignal, deadlineMs = 240000): Promise<T> {
  const start = Date.now();
  const steps = [1000, 1500, 2000, 3000, 5000];
  for (let i = 0; ; i++) {
    const r = await request<T>(url, { signal, retries: 2 });
    if (r.status !== "processing") return r;
    if (Date.now() - start > deadlineMs) throw new ApiError(0, "poll_timeout");
    await sleep(steps[Math.min(i, steps.length - 1)], signal);
  }
}

export const newKey = () =>
  (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

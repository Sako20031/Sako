// Runs image processing off the main thread when the browser supports OffscreenCanvas in
// workers (iOS 16.4+). Older iOS falls back to the main thread (documented limitation).
import type { ProcessIn, ProcessOut } from "./imageCore";

let worker: Worker | null = null;
let seq = 0;
const supportsWorker = typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined";

export async function processInBackground(inp: ProcessIn): Promise<ProcessOut> {
  if (!supportsWorker) {
    const { processImage } = await import("./imageCore");
    return processImage(inp, (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }));
  }
  worker ??= new Worker(new URL("../workers/image.worker.ts", import.meta.url), { type: "module" });
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      worker!.removeEventListener("message", onMsg);
      e.data.ok ? resolve(e.data.out) : reject(new Error(e.data.error));
    };
    worker!.addEventListener("message", onMsg);
    worker!.postMessage({ id, ...inp });
  });
}

/** Terminate the worker when the image screen closes, so it holds no memory while idle. */
export function releaseWorker() {
  worker?.terminate();
  worker = null;
}

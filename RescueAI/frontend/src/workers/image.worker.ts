import { processImage, type ProcessIn } from "../lib/imageCore";

self.onmessage = async (e: MessageEvent<ProcessIn & { id: number }>) => {
  const { id, ...inp } = e.data;
  try {
    const out = await processImage(inp, (w, h) => new OffscreenCanvas(w, h));
    (self as unknown as Worker).postMessage({ id, ok: true, out });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
  }
};

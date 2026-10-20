// Pure image pipeline shared by the worker and the main-thread fallback.
// The original File is never modified; this produces a separate analysis copy.

export interface Crop { l: number; r: number; t: number; b: number } // fractions 0..0.45
export interface ProcessIn { file: Blob; task: "ecg" | "skin" | "wound"; rotation: number; crop: Crop }
export interface QualityHint { level: "acceptable" | "limited" | "poor"; issues: string[] }
export interface ProcessOut { blob: Blob; width: number; height: number; transforms: string[]; quality: QualityHint; passthrough: boolean }

// ECG keeps more pixels so grid lines and calibration marks survive.
export const LONG_EDGE: Record<string, number> = { ecg: 3000, skin: 2048, wound: 2048 };
const MAX_PASSTHROUGH_BYTES = 12 * 1024 * 1024;

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type CanvasFactory = (w: number, h: number) => AnyCanvas;

async function toBlob(c: AnyCanvas, type: string, q?: number): Promise<Blob> {
  if ("convertToBlob" in c) return c.convertToBlob({ type, quality: q });
  return new Promise((res, rej) => (c as HTMLCanvasElement).toBlob((b) => (b ? res(b) : rej(new Error("encode"))), type, q));
}

export function hint(data: Uint8ClampedArray, w: number, h: number, shortEdge: number, task: string): QualityHint {
  const g = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    g[i] = v; sum += v;
  }
  const mean = sum / (w * h);
  let varSum = 0, lapSum = 0, lapSq = 0, n = 0;
  for (let i = 0; i < w * h; i++) varSum += (g[i] - mean) ** 2;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
    lapSum += l; lapSq += l * l; n++;
  }
  const std = Math.sqrt(varSum / (w * h));
  const lapVar = lapSq / n - (lapSum / n) ** 2;
  const issues: string[] = [];
  if (shortEdge < (task === "ecg" ? 700 : 400)) issues.push("low_resolution");
  if (mean < 40) issues.push("too_dark"); else if (mean > 235) issues.push("overexposed");
  if (std < 12) issues.push("low_contrast");
  if (lapVar < 60) issues.push("blurry");
  const level = issues.length >= 2 ? "poor" : issues.length ? "limited" : "acceptable";
  return { level, issues };
}

export async function processImage(inp: ProcessIn, makeCanvas: CanvasFactory): Promise<ProcessOut> {
  const bmp = await createImageBitmap(inp.file); // browsers apply EXIF orientation by default
  try {
    const rot = ((inp.rotation % 360) + 360) % 360;
    const rotW = rot % 180 ? bmp.height : bmp.width;
    const rotH = rot % 180 ? bmp.width : bmp.height;
    const cx = Math.round(rotW * inp.crop.l), cy = Math.round(rotH * inp.crop.t);
    const cw = Math.max(16, Math.round(rotW * (1 - inp.crop.l - inp.crop.r)));
    const ch = Math.max(16, Math.round(rotH * (1 - inp.crop.t - inp.crop.b)));
    const cap = LONG_EDGE[inp.task];
    const scale = Math.min(1, cap / Math.max(cw, ch));
    const outW = Math.round(cw * scale), outH = Math.round(ch * scale);
    const cropped = cx || cy || cw !== rotW || ch !== rotH;
    const isPlain = inp.file.type === "image/jpeg" || inp.file.type === "image/png";

    const transforms: string[] = [];
    if (rot) transforms.push(`rotated_${rot}`);
    if (cropped) transforms.push("cropped");
    if (scale < 1) transforms.push(`downscaled_long_edge_to_${cap}px`);

    // Quality hint from a small grayscale thumbnail.
    const tw = 256, th = Math.max(16, Math.round((256 * ch) / cw));
    const tc = makeCanvas(tw, th);
    const tctx = tc.getContext("2d") as CanvasRenderingContext2D;
    drawRotated(tctx, bmp, rot, rotW, rotH, cx, cy, cw, ch, tw, th);
    const quality = hint(tctx.getImageData(0, 0, tw, th).data, tw, th, Math.min(cw, ch), inp.task);
    tc.width = tc.height = 0; // release

    if (!rot && !cropped && scale === 1 && isPlain && inp.file.size <= MAX_PASSTHROUGH_BYTES) {
      return { blob: inp.file, width: bmp.width, height: bmp.height, transforms: ["unchanged"], quality, passthrough: true };
    }
    const c = makeCanvas(outW, outH);
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingQuality = "high";
    drawRotated(ctx, bmp, rot, rotW, rotH, cx, cy, cw, ch, outW, outH);
    const blob = await toBlob(c, "image/jpeg", inp.task === "ecg" ? 0.95 : 0.9);
    transforms.push(inp.task === "ecg" ? "jpeg_q95" : "jpeg_q90");
    c.width = c.height = 0;
    return { blob, width: outW, height: outH, transforms, quality, passthrough: false };
  } finally {
    bmp.close();
  }
}

function drawRotated(ctx: CanvasRenderingContext2D, bmp: ImageBitmap, rot: number, rotW: number, rotH: number,
  cx: number, cy: number, cw: number, ch: number, outW: number, outH: number) {
  const s = outW / cw;
  ctx.save();
  ctx.scale(s, outH / ch);
  ctx.translate(-cx, -cy);
  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  ctx.restore();
}

import { adminRoute } from '@/lib/server/guard';
import { bad, json, readJson } from '@/lib/server/http';
import { putImage } from '@/lib/server/store';
import { randomId } from '@/lib/ids';

const MAX_B64 = 4_000_000; // ≈3 MB image; Vercel's request limit is 4.5 MB

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
};

export async function POST(req: Request) {
  return adminRoute(req, async () => {
    const body = (await readJson(req, MAX_B64 + 1000)) as { dataUrl?: unknown };
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl ?? ''));
    if (!m) return bad('Поддерживаются JPEG, PNG и WebP');
    const [, mime, b64] = m;
    if (b64.length > MAX_B64) return bad('Файл слишком большой (до 3 МБ)');
    if (!MAGIC[mime](Buffer.from(b64.slice(0, 64), 'base64'))) return bad('Файл не похож на изображение');
    const id = randomId(16);
    await putImage(id, mime, b64);
    return json({ ok: true, url: `/api/img/${id}` });
  });
}

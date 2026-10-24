import { getImage } from '@/lib/server/store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Z0-9]{16}$/.test(id)) return new Response('Not found', { status: 404 });
  const img = await getImage(id).catch(() => null);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      'Content-Type': img.mime,
      // Ids are never reused: a replaced photo gets a new id.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

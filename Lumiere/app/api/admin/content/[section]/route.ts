import { revalidatePath, revalidateTag } from 'next/cache';
import { CONTENT_TAG } from '@/lib/server/content';
import { adminRoute } from '@/lib/server/guard';
import { bad, json, readJson } from '@/lib/server/http';
import { kvDelete, kvSet } from '@/lib/server/store';
import { contentSchemas, firstError } from '@/lib/validation';

type Section = keyof typeof contentSchemas;
type Ctx = { params: Promise<{ section: string }> };

const isSection = (s: string): s is Section => Object.prototype.hasOwnProperty.call(contentSchemas, s);

function refresh() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
}

function duplicates(list: { id?: string; slug?: string }[]): string | null {
  const seen = new Set<string>();
  for (const key of ['id', 'slug'] as const) {
    seen.clear();
    for (const item of list) {
      const v = item[key];
      if (!v) continue;
      if (seen.has(v)) return `Повторяется ${key === 'id' ? 'идентификатор' : 'адрес (slug)'}: ${v}`;
      seen.add(v);
    }
  }
  return null;
}

export async function PUT(req: Request, { params }: Ctx) {
  return adminRoute(req, async () => {
    const { section } = await params;
    if (!isSection(section)) return bad('Неизвестный раздел', 404);
    const parsed = contentSchemas[section].safeParse(await readJson(req, 3_000_000));
    if (!parsed.success) return bad(firstError(parsed.error));
    const data = parsed.data as unknown;
    const lists: unknown[] = Array.isArray(data)
      ? [data]
      : section === 'pricing'
        ? Object.values(data as object).filter(Array.isArray)
        : section === 'company'
          ? [(data as { serviceAreas: unknown[] }).serviceAreas]
          : [];
    for (const list of lists) {
      const dup = duplicates(list as { id?: string; slug?: string }[]);
      if (dup) return bad(dup);
    }
    await kvSet(`content:${section}`, data);
    refresh();
    return json({ ok: true, data });
  });
}

/** Resets a section to the built-in default. */
export async function DELETE(req: Request, { params }: Ctx) {
  return adminRoute(req, async () => {
    const { section } = await params;
    if (!isSection(section)) return bad('Неизвестный раздел', 404);
    await kvDelete(`content:${section}`);
    refresh();
    return json({ ok: true });
  });
}

import { adminRoute } from '@/lib/server/guard';
import { bad, json, readJson } from '@/lib/server/http';
import { deleteLead, updateLeadStatus } from '@/lib/server/store';
import type { LeadStatus } from '@/types';

type Ctx = { params: Promise<{ id: string }> };
const STATUSES: LeadStatus[] = ['new', 'work', 'done', 'cancel'];

export async function PATCH(req: Request, { params }: Ctx) {
  return adminRoute(req, async () => {
    const { id } = await params;
    const { status } = (await readJson(req, 1000)) as { status?: LeadStatus };
    if (!status || !STATUSES.includes(status)) return bad('Неизвестный статус');
    if (!(await updateLeadStatus(id, status))) return bad('Заявка не найдена', 404);
    return json({ ok: true });
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return adminRoute(req, async () => {
    const { id } = await params;
    await deleteLead(id);
    return json({ ok: true });
  });
}

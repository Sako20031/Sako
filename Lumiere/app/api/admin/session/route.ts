import { clearLoginFails, endSession, isAdmin, isDefaultPin, loginBlocked, recordLoginFail, startSession, verifyPin } from '@/lib/server/auth';
import { bad, clientIp, json, readJson, sameOrigin } from '@/lib/server/http';
import { storeKind } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const kind = storeKind();
  const admin = await isAdmin();
  return json({ admin, store: kind, defaultPin: admin ? await isDefaultPin().catch(() => false) : undefined });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return bad('Запрос отклонён', 403);
  if (storeKind() === 'none') {
    return bad('База данных не подключена: Vercel → проект → Storage → Neon (Postgres) → Connect, затем Redeploy. Без базы изменения негде сохранить.', 503);
  }
  const ip = clientIp(req);
  try {
    if (await loginBlocked(ip)) return bad('Слишком много неверных попыток. Подождите 15 минут.', 429);
    const body = (await readJson(req, 2000)) as { pin?: unknown };
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    if (!/^\d{4,12}$/.test(pin) || !(await verifyPin(pin))) {
      await recordLoginFail(ip);
      return bad('Неверный PIN', 401);
    }
    await clearLoginFails(ip);
    await startSession();
    return json({ ok: true });
  } catch (e) {
    console.error('[login]', e);
    return bad('Ошибка сервера', 500);
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return bad('Запрос отклонён', 403);
  await endSession().catch(() => undefined);
  return json({ ok: true });
}

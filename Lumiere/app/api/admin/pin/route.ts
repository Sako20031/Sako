import { endSession, setPin, startSession, verifyPin } from '@/lib/server/auth';
import { adminRoute } from '@/lib/server/guard';
import { bad, json, readJson } from '@/lib/server/http';

export async function POST(req: Request) {
  return adminRoute(req, async () => {
    const body = (await readJson(req, 2000)) as { current?: unknown; next?: unknown };
    const current = String(body.current ?? '');
    const next = String(body.next ?? '');
    if (!(await verifyPin(current))) return bad('Текущий PIN указан неверно', 401);
    if (!/^\d{4,12}$/.test(next)) return bad('Новый PIN — от 4 до 12 цифр');
    if (next === '0000' || /^(\d)\1+$/.test(next)) return bad('Выберите менее предсказуемый PIN');
    await setPin(next);
    // Sign out every other device, keep this one.
    await endSession(true);
    await startSession();
    return json({ ok: true });
  });
}

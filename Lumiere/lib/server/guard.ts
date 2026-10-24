import 'server-only';
import { isAdmin } from './auth';
import { bad, sameOrigin } from './http';
import { StoreUnavailableError } from './store';

/** Runs an admin handler: same-origin + session checks, uniform error handling. */
export async function adminRoute(req: Request, fn: () => Promise<Response>): Promise<Response> {
  if (req.method !== 'GET' && !sameOrigin(req)) return bad('Запрос с другого сайта отклонён', 403);
  try {
    if (!(await isAdmin())) return bad('Требуется вход', 401);
    return await fn();
  } catch (e) {
    if (e instanceof StoreUnavailableError) return bad(e.message, 503);
    if (e instanceof Error && e.message === 'too-large') return bad('Слишком большой запрос', 413);
    console.error('[admin]', e);
    return bad('Ошибка сервера', 500);
  }
}

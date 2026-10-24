import { after } from 'next/server';
import { getContentFresh } from '@/lib/server/content';
import { bad, clientIp, json, readJson, sameOrigin } from '@/lib/server/http';
import { addEvent, countEvents, insertLead, storeKind } from '@/lib/server/store';
import { estimateProject } from '@/lib/pricing';
import { projectSummaryText } from '@/lib/summary';
import { firstError, leadSchema } from '@/lib/validation';
import { normalizePhone, prettyPhone } from '@/lib/format';
import { randomId } from '@/lib/ids';
import type { Lead, Project } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_PER_HOUR = 6;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return bad('Запрос отклонён', 403);
  let body: unknown;
  try {
    body = await readJson(req, 400_000);
  } catch {
    return bad('Некорректный запрос');
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return bad(firstError(parsed.error));
  const input = parsed.data;

  // Honeypot filled → pretend success, store nothing (only bots see this field).
  if (input.website) return json({ ok: true, leadId: null });
  if (input.elapsedMs < 2500) return bad('Форма отправлена слишком быстро. Проверьте данные и попробуйте ещё раз.');

  const content = await getContentFresh();
  const phone = normalizePhone(input.phone, content.company.country);
  if (!phone) return bad(`Проверьте номер телефона — например, ${content.company.country.example}`);

  if (storeKind() === 'none') {
    return json({ error: 'Приём заявок на сервере ещё не настроен. Отправьте проект через WhatsApp или позвоните нам.', code: 'no-store' }, 503);
  }

  const ip = clientIp(req);
  try {
    if ((await countEvents('lead', ip, 60 * 60 * 1000)) >= MAX_PER_HOUR) {
      return bad('Слишком много заявок с этого устройства. Попробуйте позже или напишите нам в WhatsApp.', 429);
    }

    // Never trust a client total: recalculate with the company's own pricing.
    const project = input.project as Project | null;
    const est = project ? estimateProject(project.rooms, content.pricing) : null;
    const summary = project && est ? projectSummaryText(project, est, content.pricing, content.company) : '';
    const lead: Lead = {
      id: randomId(10),
      createdAt: Date.now(),
      status: 'new',
      name: input.name,
      phone,
      contactMethod: input.contactMethod,
      callTime: input.callTime,
      address: input.address,
      comment: input.comment,
      measurement: input.measurement,
      projectId: project?.id ?? '',
      summary,
      total: est && est.available ? est.total : null,
      project,
    };
    const res = await insertLead(lead, input.submissionKey);
    if (!res.duplicate) {
      await addEvent('lead', ip);
      after(() => notifyTelegram(res.lead).catch((e) => console.error('[telegram]', e)));
    }
    return json({ ok: true, leadId: res.lead.id, duplicate: res.duplicate });
  } catch (e) {
    console.error('[leads]', e);
    return bad('Не удалось сохранить заявку. Попробуйте ещё раз или напишите нам в WhatsApp.', 500);
  }
}

/** Optional copy of each request to Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). */
async function notifyTelegram(lead: Lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const text = [
    `Новая заявка${lead.measurement ? ' на замер' : ''}`,
    `${lead.name}, ${prettyPhone(lead.phone)} (${lead.contactMethod})`,
    lead.callTime && `Время: ${lead.callTime}`,
    lead.address && `Адрес: ${lead.address}`,
    lead.comment && `Комментарий: ${lead.comment}`,
    lead.summary && `\n${lead.summary.slice(0, 3000)}`,
  ]
    .filter(Boolean)
    .join('\n');
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text }),
  });
}

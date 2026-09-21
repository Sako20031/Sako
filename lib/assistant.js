import { sql, ensureDb } from './db';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const HISTORY_LIMIT = 16;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const TOOLS = [
  {
    name: 'check_availability',
    description: 'Возвращает занятые слоты на указанную дату, чтобы предложить клиенту свободное время. Используй только если бизнес работает по записи на время.',
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Дата в формате YYYY-MM-DD' } },
      required: ['date'],
    },
  },
  {
    name: 'create_booking',
    description: 'Записывает клиента / фиксирует заказ. Вызывай только после того как клиент подтвердил дату, время, что именно он хочет (услугу/позицию из меню) и своё имя.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Дата в формате YYYY-MM-DD' },
        time: { type: 'string', description: 'Время в формате HH:MM (24ч)' },
        service: { type: 'string', description: 'Что заказано / на что записан клиент (услуга, блюдо, позиция и т.п.)' },
        name: { type: 'string', description: 'Имя клиента' },
      },
      required: ['date', 'time', 'service', 'name'],
    },
  },
];

async function getHistory(businessId, phone) {
  const { rows } = await sql`SELECT role, content FROM wa_messages
    WHERE business_id = ${businessId} AND phone = ${phone}
    ORDER BY id DESC LIMIT ${HISTORY_LIMIT}`;
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}

async function saveMessage(businessId, phone, role, content) {
  await sql`INSERT INTO wa_messages (business_id, phone, role, content, created_at)
    VALUES (${businessId}, ${phone}, ${role}, ${content}, ${Date.now()})`;
}

async function runTool(name, input, businessId, phone) {
  if (name === 'check_availability') {
    const date = String(input.date || '');
    if (!DATE_RE.test(date)) return { error: 'invalid date, expected YYYY-MM-DD' };
    const { rows } = await sql`SELECT time FROM business_bookings WHERE business_id = ${businessId} AND date = ${date}`;
    return { date, booked_times: rows.map((r) => r.time) };
  }

  if (name === 'create_booking') {
    const date = String(input.date || '');
    const time = String(input.time || '');
    const service = String(input.service || '').slice(0, 200);
    const name_ = String(input.name || '').trim().slice(0, 200);
    if (!DATE_RE.test(date) || !TIME_RE.test(time) || name_.length < 2) {
      return { ok: false, error: 'invalid booking details' };
    }
    const id = businessId + '_' + date + '_' + time.replace(':', '-');
    const { rows } = await sql`
      INSERT INTO business_bookings (id, business_id, date, time, service, name, phone, created_at)
      VALUES (${id}, ${businessId}, ${date}, ${time}, ${service}, ${name_}, ${phone}, ${Date.now()})
      ON CONFLICT (business_id, date, time) DO NOTHING
      RETURNING id`;
    if (rows.length === 0) return { ok: false, reason: 'slot already taken' };
    return { ok: true, id };
  }

  return { error: 'unknown tool' };
}

function buildSystemPrompt(business) {
  const name = business.name;
  const businessType = business.business_type || 'сфера услуг';
  const address = business.address ? `Адрес: ${business.address}.` : '';
  const hours = business.hours ? `Часы работы: ${business.hours}.` : '';
  const notes = business.assistant_notes ? `\nДополнительные правила от владельца бизнеса: ${business.assistant_notes}` : '';
  const knowledgeBase = business.knowledge_base
    ? `\n\nМеню / прайс-лист / список услуг компании (единственный источник правды — не выдумывай ничего сверх этого):\n${business.knowledge_base}`
    : '\n\nВладелец бизнеса пока не загрузил меню/прайс-лист — если клиент спрашивает про конкретные позиции и цены, вежливо скажи, что уточнишь и передашь дальше.';
  const today = new Date().toISOString().slice(0, 10);

  return `Ты — дружелюбный WhatsApp-ассистент компании "${name}" (сфера деятельности: ${businessType}). ${address} ${hours}
Сегодняшняя дата: ${today}.

Твои задачи:
- Отвечай на вопросы клиентов об услугах/товарах, ценах и графике работы, используя меню/прайс-лист ниже.
- Если бизнес принимает запись на время (услуги, приём), помогай клиенту выбрать свободное время и оформить запись: перед create_booking уточни дату, время, что именно нужно клиенту и его имя, и проверь через check_availability, что слот свободен. Если бизнес не про запись на время (например, товары навынос), просто прими заказ словами, а create_booking не вызывай.
- Пиши кратко, по-деловому и дружелюбно, на языке клиента (по умолчанию — русский).
- Никогда не выдумывай цены, позиции меню или свободное время — бери их только из данных ниже или из инструментов.
- Если не можешь помочь (вопрос не по теме компании), вежливо скажи об этом.${notes}${knowledgeBase}`;
}

// Runs one turn of the WhatsApp assistant for a given client business:
// saves the incoming message, calls Claude with tool access to that
// business's own booking calendar, executes any tool calls, and returns the
// final text reply (also persisted to that business's conversation history).
export async function getAssistantReply(business, phone, userText) {
  await ensureDb();
  await saveMessage(business.id, phone, 'user', userText);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const system = buildSystemPrompt(business);
  const messages = await getHistory(business.id, phone);

  let finalText = '';
  for (let turn = 0; turn < 5; turn++) {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages,
        tools: TOOLS,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    messages.push({ role: 'assistant', content: data.content });

    if (data.stop_reason !== 'tool_use') {
      finalText = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      break;
    }

    const toolResults = [];
    for (const block of data.content) {
      if (block.type !== 'tool_use') continue;
      const result = await runTool(block.name, block.input || {}, business.id, phone);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) finalText = 'Извините, не получилось обработать запрос. Попробуйте написать ещё раз.';
  await saveMessage(business.id, phone, 'assistant', finalText);
  return finalText;
}

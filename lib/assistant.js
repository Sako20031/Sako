import { sql, ensureDb } from './db';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const HISTORY_LIMIT = 16;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const TOOLS = [
  {
    name: 'get_services',
    description: 'Возвращает список услуг барбершопа с ценами и длительностью.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'check_availability',
    description: 'Возвращает занятые слоты на указанную дату, чтобы предложить клиенту свободное время.',
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Дата в формате YYYY-MM-DD' } },
      required: ['date'],
    },
  },
  {
    name: 'create_booking',
    description: 'Записывает клиента на услугу. Вызывай только после того как клиент подтвердил дату, время, услугу и своё имя.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Дата в формате YYYY-MM-DD' },
        time: { type: 'string', description: 'Время в формате HH:MM (24ч)' },
        service: { type: 'string', description: 'Название услуги' },
        name: { type: 'string', description: 'Имя клиента' },
      },
      required: ['date', 'time', 'service', 'name'],
    },
  },
];

async function loadSettings() {
  const { rows } = await sql`SELECT key, value FROM settings WHERE key = ANY(${[
    'site_name',
    'owner_name',
    'address',
    'hours',
  ]})`;
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function getHistory(phone) {
  const { rows } = await sql`SELECT role, content FROM wa_messages WHERE phone = ${phone}
    ORDER BY id DESC LIMIT ${HISTORY_LIMIT}`;
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}

async function saveMessage(phone, role, content) {
  await sql`INSERT INTO wa_messages (phone, role, content, created_at)
    VALUES (${phone}, ${role}, ${content}, ${Date.now()})`;
}

async function runTool(name, input, phone) {
  if (name === 'get_services') {
    const { rows } = await sql`SELECT name, price, duration FROM services ORDER BY ord ASC`;
    return rows;
  }

  if (name === 'check_availability') {
    const date = String(input.date || '');
    if (!DATE_RE.test(date)) return { error: 'invalid date, expected YYYY-MM-DD' };
    const { rows } = await sql`SELECT time FROM bookings WHERE date = ${date}`;
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
    const id = date + '_' + time.replace(':', '-');
    const { rows } = await sql`
      INSERT INTO bookings (id, date, time, service, name, phone, created_at)
      VALUES (${id}, ${date}, ${time}, ${service}, ${name_}, ${phone}, ${Date.now()})
      ON CONFLICT (date, time) DO NOTHING
      RETURNING id`;
    if (rows.length === 0) return { ok: false, reason: 'slot already taken' };
    return { ok: true, id };
  }

  return { error: 'unknown tool' };
}

function buildSystemPrompt(settings) {
  const name = settings.site_name || 'барбершоп';
  const address = settings.address ? `Адрес: ${settings.address}.` : '';
  const hours = settings.hours ? `Часы работы: ${settings.hours}.` : '';
  const today = new Date().toISOString().slice(0, 10);

  return `Ты — дружелюбный WhatsApp-ассистент барбершопа "${name}". ${address} ${hours}
Сегодняшняя дата: ${today}.

Твои задачи:
- Отвечай на вопросы клиентов об услугах, ценах, длительности и графике работы (используй инструмент get_services при необходимости).
- Помогай клиенту выбрать свободное время и записаться на стрижку. Перед записью через create_booking всегда уточни дату, время, услугу и имя клиента, и убедись через check_availability, что слот свободен.
- Пиши кратко, по-деловому и дружелюбно, на языке клиента (по умолчанию — русский).
- Никогда не выдумывай цены, услуги или свободное время — всегда проверяй через инструменты.
- Если не можешь помочь (например, вопрос не по теме барбершопа), вежливо скажи об этом.`;
}

// Runs one turn of the WhatsApp assistant: saves the incoming message,
// calls Claude with tool access to the booking system, executes any tool
// calls, and returns the final text reply (also persisted to history).
export async function getAssistantReply(phone, userText) {
  await ensureDb();
  await saveMessage(phone, 'user', userText);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const settings = await loadSettings();
  const system = buildSystemPrompt(settings);
  const messages = await getHistory(phone);

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
      const result = await runTool(block.name, block.input || {}, phone);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) finalText = 'Извините, не получилось обработать запрос. Попробуйте написать ещё раз.';
  await saveMessage(phone, 'assistant', finalText);
  return finalText;
}

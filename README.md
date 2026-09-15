# Sako
Sakosakosako

## WhatsApp AI-ассистент

Клиенты барбершопа могут писать в WhatsApp — ассистент на базе Claude
(Anthropic) отвечает на вопросы об услугах, ценах и часах работы, а также
записывает на стрижку прямо в существующую базу бронирований.

Webhook: `app/api/whatsapp/route.js` (GET — верификация вебхука, POST — приём
сообщений). Логика ассистента: `lib/assistant.js`. Отправка ответов:
`lib/whatsapp.js`.

Нужные переменные окружения (Vercel → Project → Settings → Environment
Variables):

- `ANTHROPIC_API_KEY` — ключ Anthropic API.
- `ANTHROPIC_MODEL` — опционально, модель Claude (по умолчанию
  `claude-haiku-4-5-20251001`).
- `WHATSAPP_TOKEN` — access-токен приложения WhatsApp Business (Meta for
  Developers).
- `WHATSAPP_PHONE_NUMBER_ID` — ID номера-отправителя из консоли Meta.
- `WHATSAPP_VERIFY_TOKEN` — произвольная строка, которую вы же укажете при
  настройке вебхука в Meta for Developers.

Настройка вебхука в Meta for Developers → WhatsApp → Configuration:
Callback URL — `https://<ваш-домен>/api/whatsapp`, Verify token — значение
`WHATSAPP_VERIFY_TOKEN`, подписка на поле `messages`.

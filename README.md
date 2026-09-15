# Sako
Sakosakosako

## WhatsApp AI-ассистент

Клиенты компании могут писать в WhatsApp — ассистент на базе Claude
(Anthropic) отвечает на вопросы об услугах, ценах и часах работы, а также
записывает на услугу прямо в существующую базу бронирований. Ассистент не
привязан к барбершопу — тип бизнеса, услуги, цены и правила настраиваются
через админ-панель и таблицу `settings`, без изменений кода.

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

### Продажа как услуги разным клиентам

Сейчас один деплой обслуживает одного клиента (свой Vercel-проект, своя
Postgres-база, свой номер WhatsApp). Чтобы подключить нового клиента:

1. Задеплоить этот репозиторий как отдельный Vercel-проект (или форк) и
   подключить его собственную Postgres-базу.
2. Завести клиенту номер в WhatsApp Business (Meta for Developers) и
   прописать его `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` /
   `WHATSAPP_VERIFY_TOKEN` в переменных окружения этого проекта.
3. Через админ-панель клиента заполнить `settings`: `site_name`,
   `business_type` (например «салон красоты», «стоматология», «автосервис»),
   `address`, `hours`, при желании `assistant_notes` (доп. правила для
   ассистента: политика отмены, апселлы и т.п.), и список услуг в разделе
   «Услуги».

Ассистент сам подстроится под нового клиента — специфики барбершопа в коде
больше нет. Если клиентов станет много и захочется вести их в одной базе и
одном деплое (полноценный multi-tenant SaaS с маршрутизацией по
`phone_number_id`), это отдельная более крупная доработка — дайте знать,
если она понадобится.

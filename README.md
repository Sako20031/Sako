# Sako
Sakosakosako

## WhatsApp AI-ассистент (мультитенантный)

Один деплой умеет обслуживать много разных клиентов-бизнесов одновременно
(суши/пиццерия, стоматология, магазин товаров и т.п.). У каждого клиента —
свой номер WhatsApp и своя "папка" в базе данных: название, тип бизнеса,
адрес, часы работы, меню/прайс-лист (`knowledge_base`), правила для
ассистента. Когда клиенту пишет пользователь, вебхук по номеру, на который
пришло сообщение, находит нужный бизнес и отвечает уже с его данными —
другие клиенты никак не пересекаются.

Файлы:
- `lib/db.js` — таблицы `businesses` (карточка клиента) и
  `business_bookings` (записи/заказы каждого клиента отдельно).
- `lib/business.js` — CRUD над таблицей `businesses`.
- `lib/assistant.js` — логика ассистента на Claude: берёт карточку бизнеса,
  строит системный промпт из его меню/правил, даёт инструменты
  `check_availability` / `create_booking`, привязанные к этому бизнесу.
- `app/api/whatsapp/route.js` — вебхук (GET — верификация, POST — приём
  сообщений). Определяет бизнес по `value.metadata.phone_number_id` из
  вебхука Meta.
- `app/api/platform/businesses/` — API для добавления/редактирования/
  удаления клиентов-бизнесов (защищено `PLATFORM_ADMIN_SECRET`).

### Переменные окружения (Vercel → Project → Settings → Environment Variables)

- `ANTHROPIC_API_KEY` — ключ Anthropic API (общий на всех клиентов).
- `ANTHROPIC_MODEL` — опционально, модель Claude (по умолчанию
  `claude-haiku-4-5-20251001`).
- `WHATSAPP_VERIFY_TOKEN` — произвольная строка для верификации вебхука в
  Meta for Developers (общая, один вебхук на всех клиентов).
- `PLATFORM_ADMIN_SECRET` — произвольный секрет, которым вы защищаете
  `/api/platform/businesses` (используется как `Authorization: Bearer <секрет>`).

У каждого клиента свои `whatsapp_phone_number_id` и `whatsapp_token` — они
не в env, а хранятся в строке таблицы `businesses` (заводятся через
`/api/platform/businesses`, см. ниже).

### Как подключить нового клиента

1. В Meta for Developers завести для клиента номер в WhatsApp Business,
   получить `phone_number_id` и access-токен, и в разделе WhatsApp →
   Configuration указать Callback URL `https://<ваш-домен>/api/whatsapp` и
   Verify token — значение `WHATSAPP_VERIFY_TOKEN`, подписаться на `messages`.
2. Добавить бизнес в платформу:

   ```bash
   curl -X POST https://<ваш-домен>/api/platform/businesses \
     -H "Authorization: Bearer $PLATFORM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Суши Хаус",
       "business_type": "доставка суши и пиццы",
       "whatsapp_phone_number_id": "1234567890",
       "whatsapp_token": "EAAG...",
       "address": "ул. Абая 10",
       "hours": "10:00-23:00 без выходных",
       "assistant_notes": "Минимальный заказ 3000 тг. Доставка от 500 тг.",
       "knowledge_base": "МЕНЮ:\nФиладельфия ролл — 2500 тг\nПицца Маргарита — 3200 тг\n..."
     }'
   ```

3. Готово — клиенты этого бизнеса пишут на его номер в WhatsApp и получают
   ответы ассистента на основе `knowledge_base` и `assistant_notes`.

Обновить карточку бизнеса (например, поменять меню): `PATCH
/api/platform/businesses/<id>` с тем же заголовком авторизации и полями,
которые нужно изменить. Список всех клиентов: `GET
/api/platform/businesses`. Удалить: `DELETE /api/platform/businesses/<id>`.

`knowledge_base` — просто текст: можно вставить туда меню, прайс-лист,
список услуг, FAQ — что угодно, чем ассистент должен пользоваться как
единственным источником правды при ответах.

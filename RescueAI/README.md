# RESCUE AI — умный помощник скорой помощи

Справочная система поддержки решений для фельдшеров и врачей скорой помощи (Казахстан):
ЭКГ, сыпь, раны, симптомы, витальные показатели, протоколы, препараты.
Интерфейс на русском, казахском и английском.

> **Статус: прототип, не для клинического использования.** Клиническая валидация не проводилась,
> регуляторного одобрения нет, точность диагностики не установлена. Приложение не заменяет
> обследование и решение медработника. Перечень того, что нужно сделать до клинического
> применения, — в [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md).

## Архитектура в одном абзаце

PWA для iPhone (Preact + TypeScript, ~21 КБ JS gzip на старте) и бэкенд FastAPI
(Python, SQLAlchemy, PostgreSQL/SQLite, Alembic). Тяжёлый ИИ работает только на сервере;
на телефоне — лёгкий интерфейс, обработка фото в Web Worker и офлайн-справочник.
Опасные признаки оцениваются **мгновенно и локально** детерминированными правилами
(`shared/triage_rules.json`) — до загрузки фото и независимо от ИИ. ИИ-анализ изображений
выполняет провайдер Claude (Anthropic) через серверный адаптер со строгой схемой ответа;
без ключа приложение честно показывает «ИИ-анализ недоступен».
Почему PWA, а не нативное SwiftUI-приложение, — в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
RescueAI/
  backend/    FastAPI: auth, вызовы, анализы, ИИ-провайдеры, справочник, аудит, хранение
  frontend/   PWA: экраны, i18n (ru/kk/en), worker обработки изображений, service worker
  shared/     правила сортировки, общие тест-кейсы, метаданные источников
  docs/       архитектура, клиническая безопасность, развертывание, приватность, отчёт
```

## Быстрый старт (разработка)

```bash
# бэкенд
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                     # заполните при необходимости
python -m app.cli init-db                # dev; в production — alembic upgrade head
python -m app.cli seed                   # метаданные источников (все «не проверены»)
python -m app.cli create-user medic      # спросит пароль (от 10 символов)
uvicorn app.main:app --reload            # http://127.0.0.1:8000/api/docs

# фронтенд (в другом терминале)
cd frontend
npm ci
npm run dev                              # http://127.0.0.1:5173 (проксирует /api)
```

Production-сборка: `npm run build` в `frontend/` — бэкенд сам отдаёт `frontend/dist`
с того же адреса (нужно для cookie-сессии `SameSite=Strict`). Или `docker build -t rescue-ai .`
в папке `RescueAI/` (Dockerfile не проверялся в этой среде — Docker недоступен).

## Тесты

```bash
cd backend && python -m pytest          # 68 тестов: API, безопасность, опасные клинические сценарии
cd frontend && npm test                 # 32 теста: логика, i18n, доступность (axe), UI
cd frontend && npm run build && npx playwright test   # 16 e2e на экранах iPhone SE / 13 (Chromium)
```

## Документация

| Документ | О чём |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | выбор PWA vs SwiftUI, модули, поток данных, бюджет производительности |
| [CLINICAL_SAFETY.md](docs/CLINICAL_SAFETY.md) | правила безопасности, что ИИ может и не может, ограничения |
| [AI_PROVIDERS.md](docs/AI_PROVIDERS.md) | настройка Claude, схема ответа, что уходит провайдеру |
| [PROTOCOLS.md](docs/PROTOCOLS.md) | загрузка протоколов РК и препаратов, верификация, версии |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | переменные, PostgreSQL, миграции, HTTPS, установка PWA на iPhone |
| [PRIVACY.md](docs/PRIVACY.md) · [SECURITY.md](docs/SECURITY.md) | данные, хранение, чек-лист безопасности |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | измерения и как они получены |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | частые проблемы |
| [IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md) | что работает, что нет, что нужно до клинического использования |

API: OpenAPI-схема по адресу `/api/docs` (вне production) и `/api/openapi.json`.

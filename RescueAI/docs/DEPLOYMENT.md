# Развертывание

## Требования

- Python 3.11+ (проверено на 3.13), Node.js 20+ (проверено на 22) для сборки фронтенда.
- PostgreSQL 14+ для production (SQLite — только для разработки и тестов).
- HTTPS обязателен (cookie `Secure`, камера в Safari, service worker).
- Приватное хранилище для сохранённых оригиналов (по умолчанию — локальный каталог с правами 0700/0600).

## Переменные окружения

Полный список с комментариями — `backend/.env.example`. В production обязательно:
`RESCUE_ENVIRONMENT=production`, `RESCUE_SECRET_KEY` (≥ 32 символов, случайный),
`RESCUE_COOKIE_SECURE=true`, `RESCUE_DATABASE_URL=postgresql+psycopg://…`.
Приложение не запустится в production с ключом по умолчанию или без `COOKIE_SECURE`.

Функции, требующие внешних учётных данных: только ИИ-анализ (`RESCUE_ANTHROPIC_API_KEY`).
Всё остальное работает без внешних сервисов.

## Шаги

```bash
cd RescueAI/frontend && npm ci && npm run build          # создаёт frontend/dist
cd ../backend && pip install -r requirements.txt
export RESCUE_ENVIRONMENT=production RESCUE_DATABASE_URL=… RESCUE_SECRET_KEY=… RESCUE_COOKIE_SECURE=true
alembic upgrade head                                     # миграции
python -m app.cli seed                                   # метаданные источников
python -m app.cli create-user admin --role admin         # первый администратор
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --workers 1
```

Или Docker: `docker build -t rescue-ai RescueAI/ && docker run -p 8000:8000 --env-file backend/.env -v rescue-data:/data rescue-ai`
(образ выполняет `alembic upgrade head` при старте). Dockerfile в этой среде не собирался.

Почему `--workers 1`: ограничитель частоты запросов и фоновые ИИ-задачи живут в процессе.
Для нескольких воркеров/серверов вынесите их в Redis и очередь задач.

Перед сервером поставьте обратный прокси с TLS (nginx, Caddy, балансировщик облака),
лимитом тела ~16 МБ и таймаутом ≥ 120 с для загрузок.

Хранение: настройте ежедневный запуск очистки — `POST /api/admin/retention/run`
от имени администратора (cron), срок задаётся `RESCUE_RETENTION_DAYS`.

Создание пользователей: `python -m app.cli create-user <логин> --role paramedic|admin|auditor`
или `POST /api/admin/users` (admin). Смены пароля через интерфейс нет — см. отчёт.

## Миграции

```bash
alembic upgrade head                         # применить
alembic revision --autogenerate -m "…"       # после изменения models.py
```

## Установка на iPhone

1. Откройте адрес сервера в **Safari** (не в другом браузере — на iOS ниже 16.4 только Safari
   умеет устанавливать PWA).
2. «Поделиться» → «На экран „Домой“» → «Добавить».
3. Запускайте с иконки: приложение открывается без адресной строки, оболочка доступна офлайн.
4. В «Настройках» приложения войдите и нажмите «Загрузить / обновить» офлайн-справочник.

Ограничения PWA на iOS — в [ARCHITECTURE.md](ARCHITECTURE.md). iOS может удалить данные
сайта, если PWA долго не открывать; офлайн-справочник тогда нужно загрузить заново.

## Vercel

Текущие проекты репозитория `Sako` развёрнуты на Vercel. Бэкенд RESCUE AI рассчитан на
постоянный процесс (фоновые задачи, локальное хранилище файлов), поэтому для него лучше
подходит контейнерный хостинг или VPS. На Vercel его можно разместить только после переноса
фоновых задач в очередь и хранилища в объектное (не сделано).

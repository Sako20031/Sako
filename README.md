# Sako
Sakosakosako

## /ayaulym — сайт для Аяулым 💖

Открывается по адресу `/ayaulym` (или `/love`). Кабинет администратора — замочек 🔒
внизу страницы или `/ayaulym#admin`. PIN по умолчанию: `0000` (сменить можно в
кабинете, вкладка «Пароль»).

В кабинете: фото в галерею (загрузить / подписать / удалить), комплименты для
кнопки-сердечка, голосовые (запись прямо с телефона или загрузка файла до ~3 МБ),
аватарка, тексты письма и приглашения.

Всё хранится в базе Vercel Postgres (Neon, подключена к проекту `sako`), в отдельных таблицах `love_*`. Комплименты по умолчанию — в `public/ayaulym-files/content.json`.
Код: `public/ayaulym.html`, `app/api/love/[...path]/route.js`, `lib/love.js`.

## Скилы для дизайна и анимаций (Claude Code)

В `.claude/skills/` лежат скилы из [emilkowalski/skills](https://github.com/emilkowalski/skills)
(MIT, см. `.claude/skills/LICENSE-emilkowalski`, коммит `2d22863`). Claude Code
подхватывает их автоматически в этом репозитории: `emil-design-eng`, `animate`,
`review-animations`, `improve-animations`, `animation-performance`, `apple-design`,
`mobile-native`, `break-ui`, `prototype`, `pick-ui-library`, `ask-sonner` и другие.
Обновить: `npx skills@latest add emilkowalski/skills` или скопировать папку `skills/` заново.

Также `.claude/skills/karpathy-guidelines/` — правила для кода в духе Андрея Карпаты
(думать перед кодом, простота, точечные изменения, проверяемые цели) из
[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (MIT, коммит `2c60614`).

## screenshot-to-code (инструмент для сайтов)

`tools/screenshot-to-code` — git-подмодуль на [abi/screenshot-to-code](https://github.com/abi/screenshot-to-code)
(MIT, коммит `a813977`): превращает скриншот, макет Figma или запись экрана в код
(HTML/React/Vue + Tailwind). Это отдельное приложение, в сайт не встраивается.

```bash
git submodule update --init tools/screenshot-to-code
cd tools/screenshot-to-code/backend
echo "ANTHROPIC_API_KEY=ваш-ключ" > .env      # или OPENAI_API_KEY / GEMINI_API_KEY
poetry install && poetry run playwright install chromium
poetry run uvicorn main:app --reload --port 7001
# во втором терминале:
cd ../frontend && yarn && yarn dev            # открыть http://localhost:5173
```

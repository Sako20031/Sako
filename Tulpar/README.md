# TULPAR — 3D-сайт автосалона

Одностраничный сайт с 3D-автомобилем в студии, камерой, которая движется по скроллу,
шоурумом с выбором цвета и формой записи на тест-драйв.

- Концепция и сценарий: [`CONCEPT.md`](CONCEPT.md)
- Аудит и чек-лист запуска: [`AUDIT.md`](AUDIT.md)

## Запуск

```bash
cd Tulpar
npm install
npm run dev       # локально
npm run build     # сборка в dist/ для хостинга
```

## Где что менять

| Что | Где |
|---|---|
| Телефон, WhatsApp, e-mail | `src/main.js` → `CONFIG` |
| Тексты, цены, адрес | `index.html` |
| Цвета эмали в шоуруме | `index.html` → кнопки `.swatch` (`data-color`) |
| Ракурсы камеры по секциям | `src/scene.js` → `KEYS` |
| Форма автомобиля | `src/car.js` |
| Цвета и шрифты сайта | `src/style.css` → `:root` |

## Деплой на Vercel

Новый проект → этот репозиторий → **Root Directory: `Tulpar`**.
Фреймворк Vite определится сам, Output: `dist`.

# Натяжные потолки Уральск — ArtPOTOLKOFF

Сайт: https://potolki-uralsk.vercel.app · Кабинет: https://potolki-uralsk.vercel.app/admin

- `index.html` — сайт (фоновое видео, виды, работы, калькулятор, заявка в WhatsApp).
- `admin.html` — кабинет администратора: контакты, видео, затемнение/размытие, цены, виды, работы (фото/видео), тексты, FAQ, пароль.
- `defaults.js` — настройки по умолчанию. Сохранённые в кабинете настройки лежат в Vercel Blob (`config/*.json`) и перекрывают их.
- `api/` — функции Vercel: `config` (чтение/сохранение), `login` (проверка/смена пароля), `upload` (загрузка файлов в Blob).
- `blob-upload.js` — собранный клиент `@vercel/blob/client` (esbuild).

Пароль по умолчанию — переменная `ADMIN_PASSWORD` в Vercel. После смены в кабинете хранится хэш в Blob.
Проект Vercel `potolki-uralsk`, Root Directory: `Potolki`, хранилище Blob `potolki-uralsk-media`.

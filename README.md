# Discord Profile Designer

Веб-приложение, которое помогает собрать визуально цельный профиль Discord: аватарка + баннер
+ тема (Primary / Accent) + текст «Обо мне». Всё в живом предпросмотре, который повторяет
поповер Discord 1:1.

> Подробный план проекта, архитектура и дерево компонентов — в [`PLAN.md`](./PLAN.md).

## Что внутри

| Раздел | Что делает |
|---|---|
| `/` | Лендинг + живой пример профиля |
| `/studio` | **Конструктор**: загрузка картинок, пипетки Primary/Accent, автоподбор палитры по пикселям, выравнивание бесшовной пары, экспорт ZIP |
| `/sets` | Готовые парные сеты «аватар + баннер» с бесшовным продолжением |
| `/gallery` | Витрина сборок пользователей: лайки, теги, поиск, «скачать пак», «открыть в студии» |

### Фичи, ради которых всё затевалось

- **Discord Profile Mockup** — карточка по реальным пропорциям поповера (баннер 2.5:1 = 600×240,
  аватар с рамкой цвета фона, статус-точка, значки, «ОБО МНЕ», «В ПРОФИЛЕ С», строка сообщения
  с акцентной рамкой). Вся тема пересчитывается из двух цветов: фон карточки, кнопки, контраст
  текста по WCAG.
- **Автоподбор палитры.** Загруженная картинка разбирается прямо в браузере (canvas →
  квантование 5 бит/канал → дедупликация по ΔRGB → скоринг насыщенности и контраста) и на выходе
  5 пар Primary/Accent с HEX, объяснением и типом гармонии (комплементарная, аналоговая, триада…).
- **Бесшовные пары.** Один исходник работает и как баннер, и как аватар: аватар — это окно в ту
  же самую отрисовку, что и баннер, поэтому стык совпадает пиксель в пиксель. Аватар можно
  перетаскивать мышью, есть зум (1.0 = идеальное продолжение).
- **Экспорт паком.** Баннер 600×240, аватар 512×512 (точно то, что видно в мокапе), `palette.txt`
  и `theme.json` + CSS-переменные Discord — упаковываются в ZIP в браузере, без сервера и без
  зависимостей (`src/lib/zip.ts`).
- **Галерея.** Публикация сборок, лайки (уникальный индекс в БД), фильтры по тегам/поиску,
  сортировка по популярности/новизне/скачиваниям.

## Стек

- **Next.js 16 (App Router)** + React 19 + TypeScript
- **Tailwind CSS 4**
- **PostgreSQL + Drizzle ORM**
- Discord OAuth2 (опционально) + быстрый guest-вход
- Ноль UI-библиотек: все компоненты написаны вручную (меньше веса, полный контроль)

## Локальный запуск

```bash
# 1. зависимости
npm install

# 2. переменные окружения
cp .env.example .env
# отредактируйте .env: укажите свой DATABASE_URL

# 3. таблицы в БД
npx drizzle-kit push

# 4. дев-сервер
npm run dev
# откройте http://localhost:3000
```

Прод: `npm run build && npm run start`.

Демо-контент в галерею добавляется автоматически при первом запросе (`src/lib/seed.ts`).

## Переменные окружения

| Переменная | Обязательна | Зачем |
|---|---|---|
| `DATABASE_URL` | да | строка подключения к PostgreSQL |
| `DISCORD_CLIENT_ID` | нет | OAuth2 вход через Discord |
| `DISCORD_CLIENT_SECRET` | нет | OAuth2 вход через Discord |
| `DISCORD_REDIRECT_URI` | нет | если деплой не за `localhost` (например `https://site.com/api/auth/discord/callback`) |

Без Discord-ключей сайт полностью работает: вход — по нику (guest-режим).

### Как получить Discord OAuth2 ключи

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2** → **Client ID** скопируйте в `DISCORD_CLIENT_ID`.
3. **Reset Secret** → скопируйте в `DISCORD_CLIENT_SECRET`.
4. В **Redirects** добавьте `http://localhost:3000/api/auth/discord/callback`
   (и боевой URL для продакшена).
5. Перезапустите приложение — в шапке появится кнопка «Войти через Discord».

## Как выложить на GitHub

### Вариант 1. Через терминал (классика)

```bash
# в папке проекта
git init
git add .
git commit -m "Discord Profile Designer: studio, sets, gallery"

# создайте репозиторий на github.com (без README, без .gitignore) и скопируйте его URL
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/discord-profile-designer.git
git push -u origin main
```

### Вариант 2. Через GitHub Desktop

1. **File → Add Local Repository** → выберите папку проекта → **create a new repository**.
2. Напишите commit message → **Commit to main**.
3. **Publish repository** → имя + галочка «Keep this code private» по желанию.

### Вариант 3. Прямо в браузере

1. Создайте пустой репозиторий на GitHub.
2. Загрузите файлы кнопкой **uploading an existing file** на странице репозитория
   (папки придётся заархивировать нельзя — поэтому для папок этот способ неудобен, но для
   одиночных файлов работает).

### Что обязательно должно попасть в репозиторий

```
src/  public/  PLAN.md  README.md  package.json  package-lock.json
tsconfig.json  next.config.ts  postcss.config.mjs  eslint.config.mjs
drizzle.config.json  .env.example  .gitignore
```

`.gitignore` в проекте уже исключает `node_modules`, `.next`, `.env` — секреты не утекут.

### Как заставить проект заработать на GitHub (бесплатно)

**Вариант A — Vercel (рекомендую, 2 минуты):**

1. Зарегистрируйтесь на [vercel.com](https://vercel.com) через GitHub-аккаунт.
2. **Add New → Project** → выберите репозиторий → Vercel сам определит Next.js.
3. Перед деплоем добавьте Environment Variables:
   - `DATABASE_URL` — строку к вашей БД (бесплатно: [Neon](https://neon.tech) или
     [Supabase](https://supabase.com) → скопируйте connection string, `?sslmode=require`).
   - при желании `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.
4. **Deploy**. После деплоя один раз примените схему локально:
   ```bash
   DATABASE_URL="postgres://...ваша-неоновская-строка..." npx drizzle-kit push
   ```
5. В настройках Discord OAuth добавьте боевой redirect:
   `https://ваш-проект.vercel.app/api/auth/discord/callback`.

**Вариант B — Railway / Render:** создайте PostgreSQL прямо в их панели, введите `DATABASE_URL`
в переменные окружения, build command `npm run build`, start command `npm run start`.

**Вариант C — чистый VPS:** `git clone` → `npm ci` → `npm run build` → `npm run start`
(порт 3000) + nginx reverse proxy.

> Важно: `drizzle.config.json` содержит URL локальной БД как fallback. Если хотите хранить всё в
> `.env`, поменяйте `dbCredentials.url` на `"postgresql://localhost:5432/app_db"` и всегда
> запускайте `npx drizzle-kit push` с переменной `DATABASE_URL` в окружении.

## Структура проекта

```
src/
  app/
    page.tsx                  лендинг
    studio/page.tsx           конструктор
    sets/page.tsx             парные сеты
    gallery/page.tsx          галерея
    api/
      health/route.ts         healthcheck
      session/route.ts        вход/выход/текущий пользователь
      auth/discord/*          OAuth2
      showcases/*             витрина: список, публикация, лайки, скачивания
  components/
    discord/ProfileMockup.tsx мокап профиля Discord (ядро проекта)
    studio/StudioClient.tsx   логика конструктора
    studio/ColorPicker.tsx    пипетка (SV-поле + hue + HEX)
    studio/PaletteSuggestions.tsx
    sets/SetsExplorer.tsx
    gallery/GalleryClient.tsx
    AuthMenu.tsx  SiteHeader.tsx
  lib/
    color.ts                  HEX/RGB/HSL, контраст WCAG, гармонии, сборка темы
    palette-extract.ts        анализ картинки → палитры
    discord-card.ts           геометрия поповера + математика бесшовности
    export.ts                 рендер PNG 600×240 / 512×512 + пак
    zip.ts                    ZIP-writer без зависимостей
    showcases.ts  seed.ts  auth.ts  sets.ts
  db/
    schema.ts  index.ts
```

## Скрипты

```bash
npm run dev        # разработка
npm run build      # прод-сборка
npm run start      # прод-сервер
npm run typecheck  # проверка типов
npm run lint       # ESLint
```

## Лицензия

MIT — делайте что хотите.

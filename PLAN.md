# Discord Profile Designer — план, архитектура и реализация

Полноценный веб-сервис, который помогает собрать визуально цельный профиль Discord:
аватарка + баннер + тема (Primary/Accent) + текст «Обо мне».

---

## 1. Пошаговый план реализации

### Этап 0. Каркас (готово)
- [x] Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.
- [x] PostgreSQL + Drizzle ORM (`src/db`), endpoint `/api/health`.
- [x] Единый дизайн-слой: тёмная тема в стилистике Discord.

### Этап 1. Данные и бэкенд
- [x] Схема БД (`src/db/schema.ts`): `users`, `showcases`, `showcase_likes`.
- [x] Идемпотентный сид (`src/lib/seed.ts`) — галерея не пустая сразу после деплоя.
- [x] Сессии без пароля (`src/lib/auth.ts`): guest-вход по нику + Discord OAuth2
      (подключается автоматически, если в `.env` есть `DISCORD_CLIENT_ID/SECRET`).
- [x] REST API:
  - `GET/POST /api/showcases` — список с фильтрами (тег, поиск, сортировка) и публикация.
  - `POST /api/showcases/[id]/like` — лайк/анлайк (защищён от дублей на уровне БД).
  - `POST /api/showcases/[id]/download` — счётчик скачиваний.
  - `GET/POST/DELETE /api/session` — кто я / вход / выход.
  - `GET /api/health` — healthcheck.

### Этап 2. Ядро — редактор профиля (Studio)
- [x] **Discord Profile Mockup** (`src/components/discord/ProfileMockup.tsx`) —
      пиксель-в-пиксель повтор поповера профиля: баннер 2.5:1, аватар с рамкой
      цвета фона, статус, имя/handle, значки, «ОБО МНЕ», «В ПРОФИЛЕ С»,
      строка отправки сообщения с акцентным цветом.
- [x] Загрузка своей аватарки и баннера (drag&drop + файл + любой URL) — мгновенный предпросмотр.
- [x] **Пипетка цвета** (`ColorPicker.tsx`): SV-поле + hue-слайдер + HEX/RGB + пресеты,
      два канала — Primary и Accent.
- [x] Живой пересчёт всей темы: фон карточки, рамки, кнопки, контраст текста (WCAG).
- [x] **Автоподбор палитры**: canvas-анализ загруженной картинки (квантование 5-бит +
      дедупликация по ΔRGB + скоринг насыщенности/контраста) → 3–5 палитр
      с объяснением, почему они подходят.
- [x] Бесшовные пары: один исходник, баннер — верхняя полоса, аватар — продолжение
      под нижней границей баннера; зум и позиция фокуса настраиваются слайдерами.
- [x] Экспорт: CSS-переменные Discord, JSON темы, PNG 600×240 (баннер) и 512×512 (аватар),
      всё упаковывается в ZIP в браузере (`src/lib/zip.ts`, без зависимостей).

### Этап 3. Готовые парные сеты
- [x] Раздел `/sets`: 6 сгенерированных арт-сетов, живой предпросмотр «стыковки»,
      фильтр по настроению/тегам, кнопка «Открыть в студии» (преднастройка через localStorage).

### Этап 4. Социальная галерея
- [x] `/gallery`: карточки с мини-мокапом профиля, автор, лайки, теги.
- [x] Фильтры: поиск по тексту, теги, сортировка (популярное/новое).
- [x] Кнопки «Скопировать палитру» и «Скачать пак» (ZIP с картинками + палитрой).
- [x] Публикация своей сборки прямо из студии (модальное окно).

### Этап 5. Качество и доставка
- [x] `next typegen`, `tsc --noEmit`, `npm run build` — обязательные проверки.
- [x] `README.md` — инструкция по запуску и публикация на GitHub.
- [x] `.env.example`, `drizzle.config.json`, скрипт `db:push`.

---

## 2. Архитектура

```
Браузер                                 Сервер (Next.js, Node runtime)
────────                                ───────────────────────────────
Studio (client component)               /api/showcases      GET, POST
  ├─ ProfileMockup  ← чистый presentational   /api/showcases/[id]/like      POST
  ├─ ColorPicker                        /api/showcases/[id]/download  POST
  ├─ PaletteStudio (canvas-анализ)      /api/session        GET, POST, DELETE
  └─ exportPack() → ZIP                 /api/auth/discord(+callback)  OAuth2
                                        /api/health         GET
Gallery / Sets (server → client)
                                        Drizzle ORM → PostgreSQL
```

**Почему так:**
- Анализ цвета и экспорт картинок делаются **на клиенте** — ноль нагрузки на сервер,
  ноль внешних API, мгновенный отклик и приватность (картинки не уходят из браузера).
- PostgreSQL выбран вместо Firebase/Supabase, потому что нужен поисковый SQL
  (`ILIKE`, `array contains`, сортировка по лайкам) и лайки с уникальным индексом —
  на Firestone это больно. Discord OAuth2 работает так же хорошо с любым бэкендом.
- Мокап — отдельный «глупый» компонент: его переиспользуют студия, галерея и сеты.

### Дерево компонентов

```
<AppShell>
  <SiteHeader/>                    // навигация + состояние входа
  routes
    /(home)      Hero, фичи, CTA
    /studio      <StudioClient>
                    <ControlsPanel>
                      <ImageDropSlot/> <ColorPicker/> <Slider/>
                      <PaletteSuggestions/> <PairAlignment/>
                    </ControlsPanel>
                    <ProfileMockup/>   // sticky предпросмотр
                    <ExportPanel/>     // CSS/JSON/ZIP
                    <PublishDialog/>
    /sets        <SetsExplorer>  → <PairPreview>
    /gallery     <GalleryClient> → <ShowcaseCard> → <ProfileMockup scale=0.62>
```

---

## 3. Модель данных

```
users(id, discord_id?, username, display_name, avatar_url?, is_guest, created_at)
showcases(id, author_id→users, title, display_name, username, pronouns?, bio?,
          primary_color, accent_color, avatar_url?, banner_url?,
          avatar_focus_x/y, avatar_zoom, tags[], likes, downloads, created_at)
showcase_likes(id, showcase_id→showcases, user_id→users, UNIQUE(showcase_id,user_id))
```

---

## 4. Формулы, которые делает движок темы

| Что | Как считается |
|---|---|
| Фон карточки | `mix(darken(primary, .82), #0f1014, .55)` |
| Цвет кнопки | `mix(primary, accent, .35)` |
| Текст | `#fff`, если контраст WCAG ≥ 3.2, иначе `#0e0f13` |
| Оценка палитры | контраст фона (45%) + контраст пары (20%) + насыщенность (20%) + разброс hue (15%) |
| Акцент-гармония | complementary / analogous / triadic / split / monochrome в HSL |

---

## 5. Что дальше (roadmap)
1. Хранение загруженных картинок (S3/R2) вместо `localStorage`-ссылок — сейчас в галерею
   публикуются только ссылки на картинки или готовые сеты.
2. Динамические OG-картинки для шаринга сборки в Discord.
3. Комментарии и «ремиксы» сборок.
4. Расширение мокапа: полный профиль-модал + предпросмотр в списке участников сервера.

import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { showcases } from "@/db/schema";
import ProfileMockup from "@/components/discord/ProfileMockup";
import { ensureSeed } from "@/lib/seed";
import { ART_SETS } from "@/lib/sets";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "🎯",
    title: "Предпросмотр 1:1 с Discord",
    text: "Карточка профиля построена по реальным пропорциям поповера: баннер 2.5:1, аватар с рамкой цвета фона, статус, «Обо мне», строка сообщения с акцентным цветом.",
  },
  {
    icon: "🎨",
    title: "Автоподбор палитры",
    text: "Загрузите аватарку — движок разберёт пиксели в браузере и предложит 5 гармоничных пар Primary/Accent с HEX-кодами и объяснением, почему они работают.",
  },
  {
    icon: "🧩",
    title: "Бесшовные пары",
    text: "Одна картинка работает и как баннер, и как аватар: аватар — это точное продолжение нижней кромки баннера. Перетаскивайте его мышью, стык не разъедется.",
  },
  {
    icon: "📦",
    title: "Экспорт одним кликом",
    text: "Баннер 600×240, аватар 512×512, палитра и CSS-переменные Discord — всё в одном ZIP, собранном прямо в браузере.",
  },
];

const STEPS = [
  { n: "01", t: "Загрузите картинку", d: "Свой файл или ссылка. Хватит одной квадратной картинки для пары «баннер + аватар»." },
  { n: "02", t: "Подберите цвета", d: "Автоподбор по пикселям или ручная пипетка: Primary и Accent, как в настройках темы Discord Nitro." },
  { n: "03", t: "Сравните в мокапе", d: "Меняйте ник, «Обо мне», статус и активность — карточка обновляется мгновенно." },
  { n: "04", t: "Скачайте пак", d: "PNG в размерах Discord + палитра + CSS. Или выложите сборку в галерею и соберите лайки." },
];

export default async function HomePage() {
  await ensureSeed();
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      likes: sql<number>`coalesce(sum(${showcases.likes}), 0)::int`,
    })
    .from(showcases);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="aurora absolute inset-0" />
        <div className="grid-lines absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-16 lg:grid-cols-[1.05fr_360px] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {stats.total} сборок в галерее · {stats.likes} лайков
            </span>
            <h1 className="mt-5 text-[clamp(2.2rem,5.4vw,3.9rem)] font-bold leading-[1.03] tracking-tight">
              Соберите профиль Discord,
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                который выглядит дорого
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/60">
              Загрузите аватарку и баннер, подберите цвета темы в живом предпросмотре — и скачайте
              готовый пак в размерах Discord. Никаких «примерил и пошёл переделывать».
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-[15px] font-semibold text-white shadow-xl shadow-indigo-900/40 transition hover:brightness-110"
              >
                Открыть студию
              </Link>
              <Link
                href="/gallery"
                className="rounded-2xl border border-white/15 px-6 py-3 text-[15px] font-medium text-white/80 transition hover:border-white/40"
              >
                Смотреть галерею
              </Link>
            </div>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur"
                >
                  <div className="text-[20px]">{feature.icon}</div>
                  <h3 className="mt-1.5 text-[14px] font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[360px]">
              <ProfileMockup
                preview={{
                  displayName: "shadowfox",
                  username: "shadowfox",
                  pronouns: "they/them",
                  bio: "дизайню профили Discord ✦\nставь лайк, если палитра зашла",
                  customStatus: "слушает: midnight city",
                  playing: "Visual Studio Code",
                  avatarUrl: ART_SETS[0].source,
                  bannerUrl: ART_SETS[0].source,
                  primaryColor: ART_SETS[0].primary,
                  accentColor: ART_SETS[0].accent,
                  avatarFocusX: ART_SETS[0].focus.x,
                  avatarFocusY: ART_SETS[0].focus.y,
                  avatarZoom: ART_SETS[0].focus.zoom,
                  status: "dnd",
                }}
                scale={0.95}
              />
              <p className="mt-3 text-center text-[12px] text-white/35">
                Так это выглядит в Discord. Ничего не съедет.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto w-full max-w-[1280px] px-4 py-16 lg:px-8">
        <h2 className="text-[26px] font-bold tracking-tight">Как это работает</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-white/50">
          Четыре шага и пара минут. Всё считается в браузере — картинки никуда не отправляются.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[12px] font-mono text-indigo-300/70">{step.n}</div>
              <h3 className="mt-2 text-[15px] font-semibold">{step.t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{step.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {ART_SETS.map((set) => (
            <Link
              key={set.id}
              href="/sets"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-4 text-[13px] text-white/70 transition hover:border-indigo-400/60 hover:text-white"
            >
              <span
                className="h-7 w-7 rounded-full border border-white/10"
                style={{ background: `linear-gradient(135deg, ${set.primary}, ${set.accent})` }}
              />
              {set.title}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-[1280px] px-4 pb-20 lg:px-8">
        <div className="aurora relative overflow-hidden rounded-[32px] border border-white/10 p-10 text-center">
          <h2 className="relative text-[clamp(1.6rem,3.6vw,2.4rem)] font-bold tracking-tight">
            Готовы обновить профиль?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[14px] text-white/60">
            Студия работает без регистрации. Вход нужен только чтобы публиковать сборки и ставить
            лайки.
          </p>
          <Link
            href="/studio"
            className="relative mt-6 inline-block rounded-2xl bg-white px-7 py-3 text-[15px] font-semibold text-[#0b0c10] transition hover:bg-white/85"
          >
            Начать бесплатно
          </Link>
        </div>
      </section>
    </div>
  );
}

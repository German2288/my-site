"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileMockup from "@/components/discord/ProfileMockup";
import type { ShowcaseDto } from "@/lib/showcases";
import { GALLERY_TAGS } from "@/lib/sets";
import { buildPack, downloadBlob } from "@/lib/export";

const PRESET_STORAGE_KEY = "dpd:preset";
type Sort = "top" | "new" | "downloads";

export default function GalleryClient({
  initialItems,
  isLoggedIn,
}: {
  initialItems: ShowcaseDto[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("top");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (q.trim()) params.set("q", q.trim());
      if (tag) params.set("tag", tag);
      const response = await fetch(`/api/showcases?${params.toString()}`);
      const data = (await response.json()) as { items: ShowcaseDto[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, sort, tag]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void load();
    }, 220);
    return () => clearTimeout(timer);
  }, [load]);

  const like = async (id: number) => {
    if (!isLoggedIn) {
      setNote("Лайки только для вошедших — кнопка «Войти» в шапке.");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, likedByMe: !item.likedByMe, likes: item.likes + (item.likedByMe ? -1 : 1) }
          : item,
      ),
    );
    const response = await fetch(`/api/showcases/${id}/like`, { method: "POST" });
    if (!response.ok) {
      setNote("Не удалось поставить лайк");
      void load();
    }
  };

  const download = async (item: ShowcaseDto) => {
    setNote("Собираю пак…");
    try {
      const blob = await buildPack({
        displayName: item.displayName,
        username: item.username,
        primaryColor: item.primaryColor,
        accentColor: item.accentColor,
        bio: item.bio,
        avatarUrl: item.avatarUrl,
        bannerUrl: item.bannerUrl,
        avatarFocusX: item.avatarFocusX,
        avatarFocusY: item.avatarFocusY,
        avatarZoom: item.avatarZoom,
      });
      downloadBlob(blob, `discord-pack-${item.username || item.id}.zip`);
      setNote("Пак скачан ✦");
      await fetch(`/api/showcases/${item.id}/download`, { method: "POST" });
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, downloads: row.downloads + 1 } : row)),
      );
    } catch {
      setNote("Не удалось собрать пак");
    }
  };

  const openInStudio = (item: ShowcaseDto) => {
    window.localStorage.setItem(
      PRESET_STORAGE_KEY,
      JSON.stringify({
        displayName: item.displayName,
        username: item.username,
        pronouns: item.pronouns,
        bio: item.bio,
        primaryColor: item.primaryColor,
        accentColor: item.accentColor,
        avatarUrl: item.avatarUrl,
        bannerUrl: item.bannerUrl,
        avatarFocusX: item.avatarFocusX,
        avatarFocusY: item.avatarFocusY,
        avatarZoom: item.avatarZoom,
      }),
    );
    router.push("/studio");
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Галерея сборок</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] text-white/50">
            Готовые профили от пользователей. Копируйте палитру, скачивайте пак картинок или
            открывайте чужую сборку в студии и переделывайте под себя.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Поиск: ник, название, вайб…"
            className="w-[240px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-indigo-400/70"
          />
          <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {(
              [
                ["top", "Популярное"],
                ["new", "Новое"],
                ["downloads", "По скачиваниям"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] transition ${
                  sort === value ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTag(null)}
          className={`rounded-full border px-3 py-1 text-[12px] transition ${
            tag === null
              ? "border-indigo-400/70 bg-indigo-400/15 text-white"
              : "border-white/12 text-white/55 hover:border-white/35"
          }`}
        >
          Все теги
        </button>
        {GALLERY_TAGS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTag(tag === item ? null : item)}
            className={`rounded-full border px-3 py-1 text-[12px] transition ${
              tag === item
                ? "border-indigo-400/70 bg-indigo-400/15 text-white"
                : "border-white/12 text-white/55 hover:border-white/35"
            }`}
          >
            #{item}
          </button>
        ))}
      </div>

      {note ? (
        <p className="mt-4 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-[12.5px] text-indigo-100">
          {note}
        </p>
      ) : null}

      {loading ? <p className="mt-8 text-[13px] text-white/40">Загружаю…</p> : null}
      {!loading && !items.length ? (
        <p className="mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center text-[13px] text-white/40">
          Ничего не нашлось. Попробуйте другой тег — или соберите своё в студии и выложите первым.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25"
          >
            <div className="flex justify-center overflow-hidden rounded-2xl bg-[#131418] py-3">
              <ProfileMockup
                className="!p-0"
                scale={0.6}
                preview={{
                  displayName: item.displayName,
                  username: item.username,
                  pronouns: item.pronouns,
                  bio: item.bio,
                  avatarUrl: item.avatarUrl,
                  bannerUrl: item.bannerUrl,
                  primaryColor: item.primaryColor,
                  accentColor: item.accentColor,
                  avatarFocusX: item.avatarFocusX,
                  avatarFocusY: item.avatarFocusY,
                  avatarZoom: item.avatarZoom,
                  status: "online",
                }}
              />
            </div>

            <div className="mt-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-white">{item.title}</h3>
                <p className="truncate text-[12px] text-white/45">
                  @{item.author.username} · {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => like(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition ${
                  item.likedByMe
                    ? "border-rose-400/60 bg-rose-400/15 text-rose-200"
                    : "border-white/12 text-white/60 hover:border-rose-400/50 hover:text-rose-200"
                }`}
              >
                <span>{item.likedByMe ? "♥" : "♡"}</span>
                {item.likes}
              </button>
            </div>

            <div className="mt-3 flex gap-1">
              {[item.primaryColor, item.accentColor].map((hex) => (
                <span
                  key={hex}
                  title={hex.toUpperCase()}
                  className="h-6 flex-1 rounded-md border border-white/10"
                  style={{ background: hex }}
                />
              ))}
              <code className="ml-1 shrink-0 self-center text-[10.5px] text-white/40">
                {item.primaryColor.toUpperCase()} / {item.accentColor.toUpperCase()}
              </code>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tagItem) => (
                <span
                  key={tagItem}
                  className="rounded-full border border-white/10 px-2 py-[2px] text-[11px] text-white/50"
                >
                  #{tagItem}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(
                      `Primary ${item.primaryColor.toUpperCase()} · Accent ${item.accentColor.toUpperCase()}`,
                    )
                    .then(() => setNote("Палитра скопирована в буфер"))
                    .catch(() => setNote("Браузер запретил доступ к буферу"));
                }}
                className="rounded-xl border border-white/15 px-3 py-2 text-[12px] font-medium text-white/80 transition hover:border-white/40"
              >
                Скопировать палитру
              </button>
              <button
                type="button"
                onClick={() => download(item)}
                className="rounded-xl bg-white/10 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-white/20"
              >
                Скачать пак
              </button>
              <button
                type="button"
                onClick={() => openInStudio(item)}
                className="col-span-2 rounded-xl bg-gradient-to-r from-indigo-500/90 to-fuchsia-500/90 px-3 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
              >
                Открыть в студии
              </button>
            </div>
            <p className="mt-2 text-right text-[11px] text-white/30">
              скачиваний: {item.downloads}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

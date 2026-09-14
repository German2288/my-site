"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileMockup from "@/components/discord/ProfileMockup";
import { ART_SETS, ALL_SET_TAGS, type ArtSet } from "@/lib/sets";

const PRESET_STORAGE_KEY = "dpd:preset";

export default function SetsExplorer() {
  const router = useRouter();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArtSet>(ART_SETS[0]);

  const visible = useMemo(
    () => (activeTag ? ART_SETS.filter((set) => set.tags.includes(activeTag)) : ART_SETS),
    [activeTag],
  );

  const openInStudio = (set: ArtSet) => {
    window.localStorage.setItem(
      PRESET_STORAGE_KEY,
      JSON.stringify({
        primaryColor: set.primary,
        accentColor: set.accent,
        avatarUrl: set.source,
        bannerUrl: set.source,
        avatarFocusX: set.focus.x,
        avatarFocusY: set.focus.y,
        avatarZoom: set.focus.zoom,
        displayName: set.title,
      }),
    );
    router.push("/studio");
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8">
      <h1 className="text-[26px] font-bold tracking-tight">Парные сеты: аватарка + баннер</h1>
      <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-white/50">
        Каждый сет — одна картинка. Верхняя полоса 2.5:1 работает баннером, а область под нижней
        кромкой баннера становится аватаром, поэтому продолжение получается идеально бесшовным.
        Никаких швов и «почти совпало».
      </p>

      <div className="mt-6 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className={`rounded-full border px-3 py-1 text-[12px] transition ${
            activeTag === null
              ? "border-indigo-400/70 bg-indigo-400/15 text-white"
              : "border-white/12 text-white/55 hover:border-white/35"
          }`}
        >
          Все сеты
        </button>
        {ALL_SET_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`rounded-full border px-3 py-1 text-[12px] transition ${
              activeTag === tag
                ? "border-indigo-400/70 bg-indigo-400/15 text-white"
                : "border-white/12 text-white/55 hover:border-white/35"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5 sm:grid-cols-2">
          {visible.map((set) => (
            <article
              key={set.id}
              className={`group overflow-hidden rounded-3xl border bg-white/[0.03] p-4 transition ${
                selected.id === set.id
                  ? "border-indigo-400/60"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelected(set)}
                className="block w-full text-left"
              >
                <div
                  className="relative h-[104px] w-full overflow-hidden rounded-2xl border border-white/10"
                  style={{
                    backgroundImage: `url(${set.source})`,
                    backgroundSize: "cover",
                    backgroundPosition: "50% 0%",
                  }}
                >
                  {/* Мини-превью пары: точный бесшовный кроп (как в мокапе) */}
                  <span
                    className="absolute left-[8%] top-[74%] h-[74px] w-[74px] -translate-y-1/2 rounded-full border-[5px] border-[#101116] bg-cover"
                    style={{
                      backgroundImage: `url(${set.source})`,
                      backgroundSize: "327% 327%",
                      backgroundPosition: "8.5% 35.6%",
                    }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-full border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${set.primary}, ${set.accent})` }}
                  />
                  <h3 className="text-[15px] font-semibold text-white">{set.title}</h3>
                  <span className="ml-auto text-[11px] text-white/35">{set.mood}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
                  {set.description}
                </p>
              </button>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[set.primary, set.accent].map((hex) => (
                    <span
                      key={hex}
                      title={hex.toUpperCase()}
                      className="h-6 flex-1 rounded-md border border-white/10"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
                <code className="text-[11px] text-white/40">
                  {set.primary} / {set.accent}
                </code>
              </div>
              <button
                type="button"
                onClick={() => openInStudio(set)}
                className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/20"
              >
                Открыть в студии
              </button>
            </article>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-[15px] font-semibold">{selected.title}</h2>
            <p className="mt-1 text-[12.5px] text-white/50">{selected.description}</p>
            <div className="mt-4 flex justify-center overflow-x-auto rounded-2xl bg-[#131418] p-4">
              <ProfileMockup
                preview={{
                  displayName: selected.title,
                  username: selected.id,
                  pronouns: null,
                  bio: "бесшовная пара: баннер продолжается в аватар",
                  avatarUrl: selected.source,
                  bannerUrl: selected.source,
                  primaryColor: selected.primary,
                  accentColor: selected.accent,
                  avatarFocusX: selected.focus.x,
                  avatarFocusY: selected.focus.y,
                  avatarZoom: selected.focus.zoom,
                  status: "online",
                }}
                scale={0.94}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => openInStudio(selected)}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
              >
                Забрать сет
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${selected.primary.toUpperCase()} / ${selected.accent.toUpperCase()}`,
                  );
                }}
                className="rounded-xl border border-white/15 px-3 py-2 text-[13px] text-white/75 transition hover:border-white/40"
              >
                Копировать HEX
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selected.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-2.5 py-[3px] text-[11px] text-white/50"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

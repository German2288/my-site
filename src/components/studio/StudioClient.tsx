"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProfileMockup, { type ProfilePreview } from "@/components/discord/ProfileMockup";
import ColorPicker from "@/components/studio/ColorPicker";
import PaletteSuggestions from "@/components/studio/PaletteSuggestions";
import { CARD, coverFit, isSeamless, seamlessFocus } from "@/lib/discord-card";
import { describeColor, harmonyAccent, themeToCssVars, buildDiscordTheme } from "@/lib/color";
import { readImageData, suggestPalettes, type PaletteSuggestion } from "@/lib/palette-extract";
import { ART_SETS, GALLERY_TAGS } from "@/lib/sets";
import { buildPack, downloadBlob, themeJson } from "@/lib/export";

const PRESET_SWATCHES = [
  "#5865f2", "#7b2ff7", "#00e5ff", "#f2a1c1", "#1f6f50",
  "#ff5f6d", "#d4af37", "#0f7f8b", "#3b3bb5", "#ff73fa",
];

export type StudioPreset = {
  displayName?: string;
  username?: string;
  pronouns?: string | null;
  bio?: string | null;
  primaryColor?: string;
  accentColor?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarZoom?: number;
};

const PRESET_STORAGE_KEY = "dpd:preset";

const DEFAULT_STATE = {
  displayName: "shadowfox",
  username: "shadowfox",
  pronouns: "they/them",
  bio: "дизайню профили Discord ✦\nставь лайк, если палитра зашла",
  customStatus: "слушает: midnight city",
  playing: "Visual Studio Code",
  primaryColor: "#7b2ff7",
  accentColor: "#00e5ff",
  avatarUrl: "/art/cyberpunk.png" as string | null,
  bannerUrl: "/art/cyberpunk.png" as string | null,
  focusX: 0.2118,
  focusY: 0.4,
  zoom: 1,
  status: "online" as ProfilePreview["status"],
};

type StudioState = typeof DEFAULT_STATE;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
}

export default function StudioClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [state, setState] = useState<StudioState>(DEFAULT_STATE);
  const [pairMode, setPairMode] = useState(true);
  const [suggestions, setSuggestions] = useState<PaletteSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string>("");
  const [sourceSize, setSourceSize] = useState<{ w: number; h: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishTags, setPublishTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTargetRef = useRef<"pair" | "avatar" | "banner">("pair");

  const update = useCallback(<K extends keyof StudioState>(key: K, value: StudioState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ── Преднастройка из галереи / сетов ───────────────────────── */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const preset = JSON.parse(raw) as StudioPreset;
      window.localStorage.removeItem(PRESET_STORAGE_KEY);
      setState((prev) => ({
        ...prev,
        displayName: preset.displayName ?? prev.displayName,
        username: preset.username ?? prev.username,
        pronouns: preset.pronouns ?? prev.pronouns,
        bio: preset.bio ?? prev.bio,
        primaryColor: preset.primaryColor ?? prev.primaryColor,
        accentColor: preset.accentColor ?? prev.accentColor,
        avatarUrl: preset.avatarUrl ?? prev.avatarUrl,
        bannerUrl: preset.bannerUrl ?? prev.bannerUrl,
        focusX: preset.avatarFocusX ?? prev.focusX,
        focusY: preset.avatarFocusY ?? prev.focusY,
        zoom: preset.avatarZoom ?? prev.zoom,
      }));
      setPairMode(preset.avatarUrl === preset.bannerUrl);
      setToast("Сет загружен в студию — крути настройки!");
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Следим за размером исходника пары ──────────────────────── */
  const pairSource = pairMode ? state.avatarUrl : null;
  useEffect(() => {
    if (!pairSource) {
      setSourceSize(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setSourceSize({ w: image.naturalWidth, h: image.naturalHeight });
    };
    image.src = pairSource;
    return () => {
      cancelled = true;
    };
  }, [pairSource]);

  const fit = useMemo(
    () =>
      sourceSize
        ? coverFit(sourceSize.w, sourceSize.h, CARD.width, CARD.bannerHeight)
        : null,
    [sourceSize],
  );

  /* ── Анализ картинки ────────────────────────────────────────── */
  const analyze = useCallback(async () => {
    const target = state.bannerUrl || state.avatarUrl;
    if (!target) {
      setAnalysisNote("Сначала загрузите картинку — я проанализирую её пиксели.");
      setSuggestions([]);
      return;
    }
    setAnalyzing(true);
    setAnalysisNote("");
    try {
      const imageData = await readImageData(target, 140);
      if (!imageData) {
        setAnalysisNote("Не удалось прочитать пиксели этой картинки (внешний домен без CORS). Попробуйте скачать её и загрузить файлом.");
        setSuggestions([]);
        return;
      }
      const result = suggestPalettes(imageData.data);
      setSuggestions(result);
      setAnalysisNote(
        result.length
          ? `Нашёл ${result.length} палитр: приоритет — насыщенным цветам, которые реально есть в картинке.`
          : "Картинка слишком монохромная — попробуйте добавить контраста.",
      );
    } catch {
      setAnalysisNote("Не удалось проанализировать картинку.");
    } finally {
      setAnalyzing(false);
    }
  }, [state.bannerUrl, state.avatarUrl]);

  const harmoniesFromPrimary = useMemo<PaletteSuggestion[]>(() => {
    const kinds = ["complementary", "analogous", "triadic", "split", "monochrome"] as const;
    return kinds.map((kind, index) => {
      const primary = state.primaryColor;
      const accent = harmonyAccent(primary, kind);
      return {
        id: `harmony-${kind}`,
        name: `${describeColor(primary)} × ${describeColor(accent)}`,
        primary,
        accent,
        harmony: kind,
        reason: `Классическая схема от текущего Primary. Сдвиг оттенка — ${Math.round(
          kind === "complementary" ? 180 : kind === "analogous" ? 32 : kind === "triadic" ? 120 : kind === "split" ? 150 : 0,
        )}°.`,
        colors: [primary, accent],
        score: 100 - index,
      };
    });
  }, [state.primaryColor]);

  /* ── Загрузка файлов ────────────────────────────────────────── */
  const onPickFile = async (file: File | undefined, target: "pair" | "avatar" | "banner") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Нужен файл-картинка (png, jpg, webp, gif).");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (target === "pair") {
      setState((prev) => ({ ...prev, avatarUrl: dataUrl, bannerUrl: dataUrl }));
      setPairMode(true);
    } else if (target === "avatar") {
      setState((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } else {
      setState((prev) => ({ ...prev, bannerUrl: dataUrl }));
    }
    setSuggestions([]);
    setToast("Картинка загружена. Жмите «Подобрать палитру автоматически».");
  };

  const applySet = (setId: string) => {
    const set = ART_SETS.find((item) => item.id === setId);
    if (!set) return;
    setState((prev) => ({
      ...prev,
      avatarUrl: set.source,
      bannerUrl: set.source,
      primaryColor: set.primary,
      accentColor: set.accent,
      focusX: set.focus.x,
      focusY: set.focus.y,
      zoom: set.focus.zoom,
    }));
    setPairMode(true);
    setSuggestions([]);
    setToast(`Сет «${set.title}» применён`);
  };

  /* ── Драг аватара ───────────────────────────────────────────── */
  const onAvatarDrag = useCallback(
    (dx: number, dy: number) => {
      if (!fit) return;
      setState((prev) => ({
        ...prev,
        focusX: Math.min(1, Math.max(0, prev.focusX - dx / fit.width)),
        focusY: Math.min(1, Math.max(0, prev.focusY - dy / fit.height)),
      }));
    },
    [fit],
  );

  /* ── Экспорт ────────────────────────────────────────────────── */
  const preview: ProfilePreview = {
    displayName: state.displayName,
    username: state.username,
    pronouns: state.pronouns,
    bio: state.bio,
    customStatus: state.customStatus,
    playing: state.playing,
    avatarUrl: state.avatarUrl,
    bannerUrl: state.bannerUrl,
    primaryColor: state.primaryColor,
    accentColor: state.accentColor,
    avatarFocusX: state.focusX,
    avatarFocusY: state.focusY,
    avatarZoom: state.zoom,
    status: state.status,
  };

  const theme = buildDiscordTheme(state.primaryColor, state.accentColor);
  const payload = {
    displayName: state.displayName,
    username: state.username,
    primaryColor: state.primaryColor,
    accentColor: state.accentColor,
    bio: state.bio,
    avatarUrl: state.avatarUrl,
    bannerUrl: state.bannerUrl,
    avatarFocusX: state.focusX,
    avatarFocusY: state.focusY,
    avatarZoom: state.zoom,
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast("Браузер запретил доступ к буферу обмена");
    }
  };

  const downloadPack = async () => {
    try {
      const blob = await buildPack(payload);
      downloadBlob(blob, `discord-pack-${state.username || "profile"}.zip`);
      setToast("Пак скачан: баннер 600×240, аватар 512×512, палитра и CSS");
    } catch {
      setToast("Не удалось собрать пак");
    }
  };

  const publish = async () => {
    if (!isLoggedIn) {
      setToast("Сначала войдите (кнопка в шапке) — это 5 секунд, без пароля.");
      return;
    }
    const tooBig = [state.avatarUrl, state.bannerUrl].some(
      (url) => url && url.startsWith("data:") && url.length > 600_000,
    );
    if (tooBig) {
      setToast("Картинка слишком тяжёлая для витрины. Используйте ссылку или готовый сет.");
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch("/api/showcases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: publishTitle || `${state.displayName} pack`,
          displayName: state.displayName,
          username: state.username,
          pronouns: state.pronouns,
          bio: state.bio,
          primaryColor: state.primaryColor,
          accentColor: state.accentColor,
          avatarUrl: state.avatarUrl,
          bannerUrl: state.bannerUrl,
          avatarFocusX: state.focusX,
          avatarFocusY: state.focusY,
          avatarZoom: state.zoom,
          tags: publishTags,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "error");
      setToast("Опубликовано! Сборка уже в галерее ✦");
      setPublishOpen(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Не удалось опубликовать");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const openFilePicker = (target: "pair" | "avatar" | "banner") => {
    fileTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const activeSuggestions = suggestions.length ? suggestions : harmoniesFromPrimary;

  const seamlessNow = Boolean(
    sourceSize && isSeamless(sourceSize.w, sourceSize.h, state.focusX, state.focusY, state.zoom),
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-6 lg:px-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onPickFile(event.target.files?.[0], fileTargetRef.current)}
      />

      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-indigo-400/40 bg-[#1b1c22] px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Левая колонка: предпросмотр ────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Предпросмотр профиля</h2>
                <p className="text-[12px] text-white/45">
                  Точная копия поповера Discord. Аватар можно перетаскивать мышью — стык с баннером
                  всегда идеально бесшовный.
                </p>
              </div>
              <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
                {(["online", "idle", "dnd", "invisible"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => update("status", status)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] capitalize transition ${
                      state.status === status ? "bg-white/15 text-white" : "text-white/50"
                    }`}
                  >
                    {status === "dnd" ? "не беспокоить" : status === "idle" ? "офлайн" : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto rounded-2xl bg-[#131418] p-4">
              <ProfileMockup preview={preview} onAvatarDrag={pairMode ? onAvatarDrag : undefined} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-white/45">
                  Баннер (2.5:1)
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="h-12 w-full rounded-lg border border-white/10 bg-black/40" style={{ background: theme.bannerGradient }} />
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/40">
                  {state.primaryColor.toUpperCase()} → {state.accentColor.toUpperCase()}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-white/45">
                  Тема (5 цветов)
                </div>
                <div className="mt-2 flex gap-1">
                  {[theme.primary, theme.accent, theme.bodyBackground, theme.buttonBackground, theme.labelColor].map(
                    (hex) => (
                      <span
                        key={hex}
                        title={hex.toUpperCase()}
                        className="h-8 flex-1 rounded-md border border-white/10"
                        style={{ background: hex }}
                      />
                    ),
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-white/40">
                  контраст текста: {theme.textPrimary === "#ffffff" ? "белый" : "тёмный"}
                </div>
              </div>
            </div>
          </div>

          {/* Автоподбор */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Автоподбор палитры</h2>
                <p className="text-[12px] text-white/45">
                  Анализирую пиксели картинки прямо в браузере и собираю 5 гармоничных пар.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={analyze}
                  disabled={analyzing}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:opacity-60"
                >
                  {analyzing ? "Считаю…" : "Подобрать палитру автоматически"}
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestions([])}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:border-white/40"
                >
                  Гармонии
                </button>
              </div>
            </div>
            {analysisNote ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-white/55">
                {analysisNote}
              </p>
            ) : null}
            <div className="mt-3">
              <PaletteSuggestions
                suggestions={activeSuggestions}
                onApply={(primary, accent) => {
                  setState((prev) => ({ ...prev, primaryColor: primary, accentColor: accent }));
                  setToast("Палитра применена");
                }}
                onCopy={(primary, accent) => copy(`${primary.toUpperCase()} / ${accent.toUpperCase()}`, "HEX скопирован")}
              />
            </div>
          </div>
        </div>

        {/* ── Правая колонка: настройки ──────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              Картинки
            </h3>
            <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl bg-black/25 px-3 py-2">
              <input
                type="checkbox"
                checked={pairMode}
                onChange={(event) => {
                  const next = event.target.checked;
                  setPairMode(next);
                  if (next && state.avatarUrl) update("bannerUrl", state.avatarUrl);
                }}
                className="h-4 w-4 accent-indigo-500"
              />
              <span className="text-[13px] text-white/80">
                Бесшовная пара — одна картинка на баннер и аватар
              </span>
            </label>

            {pairMode ? (
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void onPickFile(event.dataTransfer.files?.[0], "pair");
                }}
                className="rounded-2xl border border-dashed border-white/20 bg-black/25 p-4 text-center"
              >
                <div
                  className="mx-auto mb-3 h-16 w-full max-w-[220px] rounded-lg border border-white/10 bg-cover bg-center"
                  style={
                    state.avatarUrl
                      ? { backgroundImage: `url(${state.avatarUrl})`, backgroundSize: "220%", backgroundPosition: "50% 0%" }
                      : { background: theme.bannerGradient }
                  }
                />
                <p className="text-[12px] text-white/55">
                  Перетащите квадратную картинку или выберите файл. Верхняя полоса станет баннером,
                  а область ниже — аватаром.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFilePicker("pair")}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20"
                  >
                    Выбрать файл
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt("Ссылка на картинку (https://…)");
                      if (url) {
                        setState((prev) => ({ ...prev, avatarUrl: url, bannerUrl: url }));
                        setSuggestions([]);
                      }
                    }}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-white/70 transition hover:border-white/40"
                  >
                    По ссылке
                  </button>
                  {state.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, avatarUrl: null, bannerUrl: null }))}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-[12px] text-red-300/80 transition hover:border-red-400/70"
                    >
                      Убрать
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {(["avatar", "banner"] as const).map((slot) => (
                  <div key={slot} className="flex items-center gap-2 rounded-xl bg-black/25 p-2">
                    <span className="w-[74px] text-[12px] text-white/60">
                      {slot === "avatar" ? "Аватар" : "Баннер"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openFilePicker(slot)}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-[12px] text-white"
                    >
                      Файл
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt("Ссылка на картинку");
                        if (url) update(slot === "avatar" ? "avatarUrl" : "bannerUrl", url);
                      }}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-[12px] text-white/70"
                    >
                      URL
                    </button>
                    <span className="ml-auto max-w-[90px] truncate text-[11px] text-white/35">
                      {state[slot === "avatar" ? "avatarUrl" : "bannerUrl"] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <div className="mb-1.5 text-[12px] text-white/45">Готовые сеты (одним кликом)</div>
              <div className="flex flex-wrap gap-1.5">
                {ART_SETS.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => applySet(set.id)}
                    className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/30 py-1 pl-1 pr-2.5 text-[12px] text-white/75 transition hover:border-indigo-400/60"
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-white/15"
                      style={{ background: `linear-gradient(135deg, ${set.primary}, ${set.accent})` }}
                    />
                    {set.title}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {pairMode ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                  Выравнивание пары
                </h3>
                {seamlessNow ? (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-[2px] text-[10px] font-semibold uppercase text-emerald-200">
                    бесшовно
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-[2px] text-[10px] font-semibold uppercase text-amber-200">
                    свободный кадр
                  </span>
                )}
              </div>
              <p className="mb-3 text-[12px] text-white/45">
                zoom = 1 и «идеальный» фокус — аватар стоит ровно под тем же участком баннера,
                продолжение совпадает пиксель в пиксель. Сдвинули фокус или добавили зум —
                получается свободный кадр из той же картинки.
              </p>
              <button
                type="button"
                onClick={() => {
                  const anchor = sourceSize
                    ? seamlessFocus(sourceSize.w, sourceSize.h)
                    : { x: 0.2118, y: 0.4 };
                  setState((prev) => ({ ...prev, focusX: anchor.x, focusY: anchor.y, zoom: 1 }));
                }}
                className="mb-3 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                Сшить идеально (сброс)
              </button>
              {[
                { label: "Позиция X", value: state.focusX, key: "focusX" as const, min: 0, max: 1, step: 0.002 },
                { label: "Позиция Y", value: state.focusY, key: "focusY" as const, min: 0, max: 1, step: 0.002 },
                { label: "Зум аватара", value: state.zoom, key: "zoom" as const, min: 1, max: 2.4, step: 0.01 },
              ].map((slider) => (
                <label key={slider.key} className="mb-2 block">
                  <div className="flex justify-between text-[12px] text-white/55">
                    <span>{slider.label}</span>
                    <span className="font-mono">{slider.value.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={slider.value}
                    onChange={(event) => update(slider.key, Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-indigo-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400"
                  />
                </label>
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <ColorPicker
              label="Основной цвет (Primary)"
              hint="Фон карточки и базовый градиент баннера"
              value={state.primaryColor}
              onChange={(hex) => update("primaryColor", hex)}
              swatches={PRESET_SWATCHES}
            />
            <ColorPicker
              label="Акцент (Accent)"
              hint="Кнопки, рамка поля ввода, подписи"
              value={state.accentColor}
              onChange={(hex) => update("accentColor", hex)}
              swatches={PRESET_SWATCHES}
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              Текст профиля
            </h3>
            <div className="grid gap-2">
              {(
                [
                  { key: "displayName", label: "Отображаемое имя", placeholder: "shadowfox" },
                  { key: "username", label: "Юзернейм", placeholder: "shadowfox" },
                  { key: "pronouns", label: "Местоимения", placeholder: "they/them" },
                  { key: "customStatus", label: "Кастомный статус", placeholder: "слушает: …" },
                  { key: "playing", label: "Активность (во что играет)", placeholder: "VS Code" },
                ] as const
              ).map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[11px] text-white/45">{field.label}</span>
                  <input
                    value={state[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) => update(field.key, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-indigo-400/70"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[11px] text-white/45">Обо мне</span>
                <textarea
                  value={state.bio ?? ""}
                  rows={3}
                  onChange={(event) => update("bio", event.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-indigo-400/70"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              Экспорт
            </h3>
            <pre className="max-h-[132px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-white/70">
              {themeToCssVars(theme)}
            </pre>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copy(themeToCssVars(theme), "CSS-переменные скопированы")}
                className="rounded-xl border border-white/15 px-3 py-2 text-[12px] font-medium text-white/80 transition hover:border-white/40"
              >
                Копировать CSS
              </button>
              <button
                type="button"
                onClick={() => copy(themeJson(payload), "theme.json скопирован")}
                className="rounded-xl border border-white/15 px-3 py-2 text-[12px] font-medium text-white/80 transition hover:border-white/40"
              >
                Копировать JSON
              </button>
              <button
                type="button"
                onClick={() =>
                  copy(
                    `Primary ${state.primaryColor.toUpperCase()} · Accent ${state.accentColor.toUpperCase()}`,
                    "Палитра скопирована",
                  )
                }
                className="rounded-xl border border-white/15 px-3 py-2 text-[12px] font-medium text-white/80 transition hover:border-white/40"
              >
                Скопировать палитру
              </button>
              <button
                type="button"
                onClick={downloadPack}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-2 text-[12px] font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
              >
                Скачать пак (.zip)
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPublishOpen((prev) => !prev)}
              className="mt-2 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              {publishOpen ? "Свернуть публикацию" : "Выставить на витрину →"}
            </button>

            {publishOpen ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
                <input
                  value={publishTitle}
                  onChange={(event) => setPublishTitle(event.target.value)}
                  placeholder="Название сборки (например: Neon Tokyo Night)"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-400/60"
                />
                <div className="flex flex-wrap gap-1.5">
                  {GALLERY_TAGS.map((tag) => {
                    const active = publishTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setPublishTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5),
                          )
                        }
                        className={`rounded-full border px-2.5 py-[3px] text-[11px] transition ${
                          active
                            ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200"
                            : "border-white/12 text-white/55 hover:border-white/35"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={publish}
                  disabled={publishing}
                  className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-[13px] font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {publishing ? "Публикую…" : "Опубликовать в галерею"}
                </button>
                {!isLoggedIn ? (
                  <p className="text-[11px] text-amber-200/80">
                    Нужен вход: кнопка «Войти» в шапке (быстрый вход по нику или через Discord).
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

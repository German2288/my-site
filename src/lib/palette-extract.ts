/**
 * Анализ изображения и генерация гармоничных палитр — полностью на клиенте,
 * без внешних сервисов: canvas -> ImageData -> квантование -> палитры.
 */

import {
  buildDiscordTheme,
  colorDistance,
  describeColor,
  harmonyAccent,
  hexToHsl,
  hslToHex,
  isUsable,
  paletteScore,
  rgbToHex,
  type HarmonyKind,
} from "./color";

export type Swatch = { hex: string; weight: number };

export type PaletteSuggestion = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  harmony: HarmonyKind;
  reason: string;
  colors: string[];
  score: number;
};

type Bucket = { r: number; g: number; b: number; count: number };

/** Пробегает ImageData по сетке и собирает взвешенные цветовые корзины (5 бит на канал). */
function collectBuckets(data: Uint8ClampedArray, step = 4): Bucket[] {
  const map = new Map<number, Bucket>();
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 200) continue;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = map.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      map.set(key, { r, g, b, count: 1 });
    }
  }
  return [...map.values()];
}

/** Средний цвет всего изображения — полезен как «фон темы». */
function averageColor(data: Uint8ClampedArray): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 16) {
    if (data[i + 3] < 200) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (!n) return "#5865f2";
  return rgbToHex({ r: r / n, g: g / n, b: b / n });
}

/**
 * Возвращает доминирующие цвета изображения (без «мусорных» почти чёрных/белых).
 * Порядок — по встречаемости с бонусом за насыщенность.
 */
export function dominantColors(data: Uint8ClampedArray, limit = 8): Swatch[] {
  const total = data.length / 4;
  const buckets = collectBuckets(data);
  if (!buckets.length) return [];

  const averaged = buckets.map((bucket) => {
    const hex = rgbToHex({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
    });
    const hsl = hexToHsl(hex);
    return { hex, weight: bucket.count / total, hsl };
  });

  const sorted = averaged
    .filter((c) => c.hsl.l > 0.06 && c.hsl.l < 0.96)
    .sort((a, b) => b.weight * (0.55 + b.hsl.s * 0.9) - a.weight * (0.55 + a.hsl.s * 0.9))
    .slice(0, 80);

  const picked: typeof sorted = [];
  for (const candidate of sorted) {
    if (picked.length >= limit) break;
    const duplicate = picked.some((p) => colorDistance(p.hex, candidate.hex) < 46);
    if (!duplicate) picked.push(candidate);
  }

  if (!picked.length) {
    picked.push(...averaged.slice(0, limit));
  }
  return picked.map((c) => ({ hex: c.hex, weight: c.weight }));
}

const HARMONY_LABEL: Record<HarmonyKind, string> = {
  complementary: "Комплементарная",
  analogous: "Аналоговая",
  triadic: "Триада",
  split: "Split-complementary",
  monochrome: "Монохром",
  "same-hue": "Тон в тон",
};

function paletteName(primary: string, accent: string): string {
  return `${describeColor(primary)} × ${describeColor(accent)}`;
}

function buildReason(primary: string, accent: string, harmony: HarmonyKind): string {
  const p = describeColor(primary);
  const a = describeColor(accent);
  switch (harmony) {
    case "complementary":
      return `${p} основной, ${a} — прямой контраст. Самый заметный вариант: имя и акценты «выстреливают».`;
    case "analogous":
      return `Соседние оттенки (${p} + ${a}). Спокойный, цельный профиль без визуального шума.`;
    case "triadic":
      return `Триада (${p} + ${a}). Сочный, «игровой» вариант — хорошо смотрится на баннере-градиенте.`;
    case "split":
      return `Split-схема (${p} + ${a}). Контраст есть, но мягче комплементарной.`;
    case "monochrome":
      return `Монохром на ${p}. Минимализм: подойдёт, если хочется строгий тёмный профиль.`;
    default:
      return `Тон в тон на ${p} с лёгким сдвигом светоты.`;
  }
}

/**
 * Главная функция: по пикселям изображения собирает 3–5 готовых палитр
 * (Primary + Accent + поддерживающие цвета) с объяснением выбора.
 */
export function suggestPalettes(
  data: Uint8ClampedArray | null,
  options: { includeAverage?: boolean } = {},
): PaletteSuggestion[] {
  if (!data) return [];
  const swatches = dominantColors(data, 8);
  const base = swatches.filter((s) => isUsable(s.hex));
  const candidates = base.length ? base : swatches;
  const fallback = averageColor(data);

  const harmonies: HarmonyKind[] = ["complementary", "analogous", "triadic", "monochrome", "split"];

  const out: PaletteSuggestion[] = [];
  const seen = new Set<string>();

  const push = (primary: string, accent: string, harmony: HarmonyKind) => {
    const key = `${primary}/${accent}`;
    if (seen.has(key)) return;
    seen.add(key);
    const theme = buildDiscordTheme(primary, accent);
    out.push({
      id: key,
      name: paletteName(primary, accent),
      primary,
      accent,
      harmony,
      reason: buildReason(primary, accent, harmony),
      colors: [primary, accent, theme.bodyBackground, theme.buttonBackground, lightenSafe(accent)],
      score: Math.round(paletteScore(primary, accent) + (1 - out.length / 12) * 2),
    });
  };

  // 1. Каждая доминанта как Primary + комплементарный акцент.
  candidates.slice(0, 4).forEach((swatch, index) => {
    const harmony = harmonies[index % harmonies.length];
    push(swatch.hex, harmonyAccent(swatch.hex, harmony), harmony);
  });

  // 2. Пары из реально присутствующих в картинке цветов.
  for (let i = 0; i < Math.min(candidates.length, 4) && out.length < 8; i += 1) {
    for (let j = i + 1; j < Math.min(candidates.length, 5); j += 1) {
      const a = candidates[i].hex;
      const b = candidates[j].hex;
      const score = paletteScore(a, b);
      if (score > 42) push(a, b, "same-hue");
    }
  }

  // 3. Средний тон картинки как надёжный запасной вариант.
  if (options.includeAverage !== false && isUsable(fallback)) {
    push(fallback, harmonyAccent(fallback, "complementary"), "complementary");
  }

  return out
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
    .slice(0, 5)
    .map((item, index) => ({ ...item, id: `${item.primary}-${item.accent}-${index}` }));
}

/** Пятый цвет палитры — светлая «подсветка», которую удобно использовать в About me. */
function lightenSafe(hex: string): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, l: Math.min(0.92, hsl.l + 0.28) });
}

/** Загружает изображение в canvas и отдаёт ImageData (максимум 128px по большой стороне). */
export async function readImageData(
  src: string,
  maxSize = 128,
): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  if (typeof window === "undefined") return null;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("image load error"));
    image.src = src;
  });
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    return { data: imageData.data, width, height };
  } catch {
    // Canvas tainted (внешний домен без CORS) — сообщаем вызывающему коду.
    return null;
  }
}

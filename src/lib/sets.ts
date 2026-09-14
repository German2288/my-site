import type { HarmonyKind } from "./color";

export type ArtSet = {
  id: string;
  title: string;
  source: string;
  tags: string[];
  primary: string;
  accent: string;
  mood: string;
  description: string;
  /** Позиция «стыковки»: доля ширины/высоты баннера, где сидит аватар. */
  focus: { x: number; y: number; zoom: number };
};

/**
 * Готовые парные сеты.
 * Каждый сет — ОДНА картинка: верхняя полоса 2.5:1 работает баннером,
 * а область под нижней границей баннера становится аватаром.
 * За счёт этого «продолжение» получается идеально бесшовным.
 */
export const ART_SETS: ArtSet[] = [
  {
    id: "neon-tokyo",
    title: "Neon Tokyo",
    source: "/art/cyberpunk.png",
    tags: ["Cyberpunk", "Neon", "Sci-Fi"],
    primary: "#7b2ff7",
    accent: "#00e5ff",
    mood: "Ночной город",
    description:
      "Маджента-циановый градиент и андроид, чей силуэт выходит из баннера в аватар. Идеален для геймерских профилей.",
    focus: { x: 0.2118, y: 0.4, zoom: 1 },   // идеальный стык
  },
  {
    id: "sakura-dusk",
    title: "Sakura Dusk",
    source: "/art/sakura.png",
    tags: ["Anime", "Pastel", "Minimalism"],
    primary: "#f2a1c1",
    accent: "#8a6ff0",
    mood: "Мягкий вечер",
    description:
      "Пастельная аниме-иллюстрация: лепесткиsakura перетекают из баннера в портрет. Тёплый, спокойный вариант.",
    focus: { x: 0.2118, y: 0.4, zoom: 1 },   // идеальный стык
  },
  {
    id: "deep-ocean",
    title: "Deep Ocean",
    source: "/art/ocean.png",
    tags: ["Minimalism", "Nature", "Calm"],
    primary: "#0f7f8b",
    accent: "#a8e0d0",
    mood: "Тишина",
    description:
      "Минимализм с морской палитрой: стекло и вода. Отлично читается даже в маленьком поповере.",
    focus: { x: 0.2118, y: 0.4, zoom: 1 },   // идеальный стык
  },
  {
    id: "retro-drive",
    title: "Retro Drive",
    source: "/art/sunset.png",
    tags: ["Synthwave", "Retro", "Neon"],
    primary: "#ff5f6d",
    accent: "#6a1b9d",
    mood: "Закат 80-х",
    description:
      "Сетка, солнце и хромированная машина — чистый synthwave с очень «жирным» контрастом пары цветов.",
    focus: { x: 0.58, y: 0.52, zoom: 1.1 },  // свободный кадр на машину
  },
  {
    id: "emerald-leaves",
    title: "Emerald Leaves",
    source: "/art/botanic.png",
    tags: ["Nature", "Dark Green", "Aesthetic"],
    primary: "#1f6f50",
    accent: "#d4af37",
    mood: "Джунгли",
    description:
      "Глубокий изумруд с золотым акцентом. Редкое сочетание, которое почти не встречается у других.",
    focus: { x: 0.2118, y: 0.4, zoom: 1 },   // идеальный стык
  },
  {
    id: "cosmic-drift",
    title: "Cosmic Drift",
    source: "/art/nebula.png",
    tags: ["Space", "Sci-Fi", "Dark"],
    primary: "#3b3bb5",
    accent: "#2ee6c8",
    mood: "Космос",
    description:
      "Индиго-тиловая туманность и одинокий астронавт. Максимально тёмный фон карточки — текст всегда читается.",
    focus: { x: 0.2118, y: 0.4, zoom: 1 },   // идеальный стык
  },
];

export const ALL_SET_TAGS = [...new Set(ART_SETS.flatMap((set) => set.tags))].sort();

export const GALLERY_TAGS = [
  "Anime",
  "Cyberpunk",
  "Minimalism",
  "Synthwave",
  "Nature",
  "Space",
  "Pastel",
  "Dark",
  "Neon",
  "Retro",
  "Gamer",
  "Kawaii",
];

export const HARMONY_HINT: Record<HarmonyKind, string> = {
  complementary: "Максимальный контраст",
  analogous: "Спокойная гармония",
  triadic: "Сочно и игриво",
  split: "Мягкий контраст",
  monochrome: "Строгий минимализм",
  "same-hue": "Тон в тон",
};

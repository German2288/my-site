import type { HarmonyKind } from "./color";

export { describeColor } from "./color";

export const HARMONY_HINTS: Record<HarmonyKind, string> = {
  complementary: "Максимальный контраст",
  analogous: "Спокойная гармония",
  triadic: "Сочно и игриво",
  split: "Мягкий контраст",
  monochrome: "Строгий минимализм",
  "same-hue": "Тон в тон",
};

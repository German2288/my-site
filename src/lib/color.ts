/**
 * Небольшая библиотека работы с цветом без внешних зависимостей.
 * HEX / RGB / HSL конвертации, смешивание, контраст WCAG и гармоничные схемы.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const clamp01 = (value: number) => clamp(value);

export function normalizeHex(input: string): string {
  let hex = (input || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "";
  return `#${hex.toLowerCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input).length === 7;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex) || "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s);
  const lig = clamp01(l);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: Hsl) => rgbToHex(hslToRgb(hsl));

export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
}

export const lighten = (hex: string, amount: number) => mix(hex, "#ffffff", amount);
export const darken = (hex: string, amount: number) => mix(hex, "#000000", amount);

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export function readableText(background: string): string {
  return contrastRatio(background, "#ffffff") >= 3.2 ? "#ffffff" : "#0e0f13";
}

export function readableMuted(background: string): string {
  const base = readableText(background);
  return base === "#ffffff" ? "rgba(255,255,255,0.72)" : "rgba(14,15,19,0.68)";
}

export function saturation(hex: string): number {
  return rgbToHsl(hexToRgb(hex)).s;
}

export function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, h: hsl.h + degrees });
}

/** Освещённость в 0..1 — используется, чтобы отсекать «мёртвые» цвета. */
export function isUsable(hex: string): boolean {
  const { l, s } = hexToHsl(hex);
  return l > 0.1 && l < 0.94 && s > 0.12;
}

/** Крупность шага между цветами — чтобы не предлагать два почти одинаковых. */
export function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return Math.sqrt((ca.r - cb.r) ** 2 + (ca.g - cb.g) ** 2 + (ca.b - cb.b) ** 2);
}

export type HarmonyKind =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split"
  | "monochrome"
  | "same-hue";

/** Возвращает акцент, гармонично дополняющий базовый цвет. */
export function harmonyAccent(base: string, kind: HarmonyKind): string {
  const hsl = hexToHsl(base);
  switch (kind) {
    case "complementary":
      return hslToHex({
        h: hsl.h + 180,
        s: clamp01(hsl.s * 0.92 + 0.05),
        l: clamp(hsl.l + (hsl.l > 0.55 ? -0.16 : 0.14), 0.22, 0.78),
      });
    case "analogous":
      return hslToHex({
        h: hsl.h + 32,
        s: clamp01(hsl.s + 0.06),
        l: clamp(hsl.l + (hsl.l > 0.55 ? -0.2 : 0.16), 0.2, 0.8),
      });
    case "triadic":
      return hslToHex({
        h: hsl.h + 120,
        s: clamp01(hsl.s * 0.95 + 0.04),
        l: clamp(hsl.l + 0.1, 0.24, 0.78),
      });
    case "split":
      return hslToHex({ h: hsl.h + 150, s: clamp01(hsl.s + 0.05), l: clamp(hsl.l + 0.08, 0.24, 0.76) });
    case "monochrome":
      return hslToHex({ h: hsl.h, s: clamp01(hsl.s * 0.85), l: clamp(hsl.l + (hsl.l > 0.5 ? -0.24 : 0.24), 0.2, 0.8) });
    case "same-hue":
    default:
      return hslToHex({ h: hsl.h + 8, s: clamp01(hsl.s + 0.02), l: clamp(hsl.l + 0.12, 0.22, 0.78) });
  }
}

/** Human-readable имя оттенка (RU). */
export function describeColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (l < 0.09) return "почти чёрный";
  if (l > 0.93 && s < 0.15) return "почти белый";
  if (s < 0.12) return l > 0.6 ? "светло-серый" : "графитовый";
  const names: Array<[number, string]> = [
    [15, "красный"],
    [42, "оранжевый"],
    [65, "жёлтый"],
    [95, "салатовый"],
    [150, "зелёный"],
    [185, "бирюзовый"],
    [215, "голубой"],
    [250, "синий"],
    [285, "фиолетовый"],
    [320, "розовый"],
    [345, "малиновый"],
    [361, "красный"],
  ];
  const name = names.find(([limit]) => h < limit)?.[1] ?? "нейтральный";
  const temp = l > 0.68 ? "светлый " : l < 0.3 ? "глубокий " : "";
  return `${temp}${name}`;
}

/**
 * Пересобирает Discord-тему из двух цветов (Primary + Accent),
 * как это делает Discord Nitro Profile Themes.
 */
export type DiscordTheme = {
  primary: string;
  accent: string;
  bannerGradient: string;
  bodyBackground: string;
  borderColor: string;
  avatarRing: string;
  buttonBackground: string;
  buttonHover: string;
  textPrimary: string;
  textMuted: string;
  labelColor: string;
  inputBackground: string;
  badgeBackground: string;
  divider: string;
};

export function buildDiscordTheme(primary: string, accent: string): DiscordTheme {
  const body = mix(darken(primary, 0.82), "#0f1014", 0.55);
  const bright = mix(primary, accent, 0.35);
  return {
    primary,
    accent,
    bannerGradient: `linear-gradient(105deg, ${primary} 0%, ${mix(primary, accent, 0.5)} 52%, ${accent} 100%)`,
    bodyBackground: body,
    borderColor: mix(body, readableText(body) === "#ffffff" ? "#ffffff" : "#000000", 0.12),
    avatarRing: body,
    buttonBackground: bright,
    buttonHover: lighten(bright, 0.1),
    textPrimary: readableText(body),
    textMuted: readableMuted(body),
    labelColor: mix(accent, readableText(body), 0.25),
    inputBackground: mix(body, readableText(body), 0.06),
    badgeBackground: mix(body, readableText(body), 0.1),
    divider: mix(body, readableText(body), 0.14),
  };
}

export function themeToCssVars(theme: DiscordTheme): string {
  return [
    `--profile-gradient-primary-color: ${theme.primary};`,
    `--profile-gradient-secondary-color: ${theme.accent};`,
    `--profile-body-background-color: ${theme.bodyBackground};`,
    `--profile-gradient-button-color: ${theme.buttonBackground};`,
    `--profile-gradient-text-color: ${theme.textPrimary};`,
  ].join("\n");
}

/** Проверка «читабельности» пары: достаточно ли контраста для текста профиля. */
export function paletteScore(primary: string, accent: string): number {
  const theme = buildDiscordTheme(primary, accent);
  const bodyContrast = contrastRatio(theme.bodyBackground, theme.textPrimary);
  const pairContrast = contrastRatio(primary, accent);
  const satBoost = (saturation(primary) + saturation(accent)) / 2;
  const hueGap = Math.abs(hexToHsl(primary).h - hexToHsl(accent).h) / 360;
  return (
    Math.min(bodyContrast / 12, 1) * 45 +
    Math.min(pairContrast / 8, 1) * 20 +
    satBoost * 20 +
    (hueGap > 0.05 && hueGap < 0.6 ? 15 : 4)
  );
}

export const DISCORD_STATUS_COLORS: Record<string, string> = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
  invisible: "#80848e",
  streaming: "#593695",
};

/**
 * Экспорт сборки в форматы Discord: баннер 600×240, аватар 512×512,
 * палитра и CSS-переменные — всё упаковывается в ZIP прямо в браузере.
 */
import { CARD, coverFit } from "./discord-card";
import { buildDiscordTheme, themeToCssVars } from "./color";
import { createZip, type ZipEntry } from "./zip";

export type ExportPayload = {
  displayName: string;
  username: string;
  primaryColor: string;
  accentColor: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/** Баннер 600×240 — ровно так, как его принимает Discord. */
export async function renderBanner(source: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d недоступен");
  const fit = coverFit(source.naturalWidth, source.naturalHeight, 600, 240);
  const ox = fit.width > 600 ? (fit.width - 600) / 2 : 0;
  const oy = fit.height > 240 ? 0 : (fit.height - 240) / 2;
  ctx.drawImage(source, -ox, -oy, fit.width, fit.height);
  return canvasToBlob(canvas);
}

/** Аватар 512×512 — точная копия того, что видно в мокапе. */
export async function renderAvatar(
  source: HTMLImageElement,
  focusX: number,
  focusY: number,
  zoom: number,
  pairMode: boolean,
): Promise<Blob> {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d недоступен");

  if (!pairMode) {
    const fit = coverFit(source.naturalWidth, source.naturalHeight, size, size);
    const ox = fit.width > size ? (focusX - 0.5) * (fit.width - size) : 0;
    const oy = fit.height > size ? (focusY - 0.5) * (fit.height - size) : 0;
    const k = zoom;
    const cx = size / 2;
    ctx.translate(cx, cx);
    ctx.scale(k, k);
    ctx.translate(-cx, -cx);
    ctx.drawImage(source, -ox, -oy, fit.width, fit.height);
    return canvasToBlob(canvas);
  }

  // Бесшовный режим: воспроизводим раскладку карточки, но в масштабе 512/104.
  const cardFit = coverFit(source.naturalWidth, source.naturalHeight, CARD.width, CARD.bannerHeight);
  const horizontalCrop = cardFit.width > CARD.width;
  const verticalCrop = cardFit.height > CARD.bannerHeight;
  const bx = horizontalCrop ? -(cardFit.width - CARD.width) / 2 : 0;
  const by = verticalCrop ? 0 : -(cardFit.height - CARD.bannerHeight) / 2;
  // Формула синхронна seamlessLayout(): точка фокуса — в центре аватара.
  const left = size / 2 - (bx + focusX * cardFit.width) * zoom;
  const top = size / 2 - (by + focusY * cardFit.height) * zoom;
  const k = size / CARD.avatar;

  ctx.drawImage(
    source,
    left * k,
    top * k,
    cardFit.width * zoom * k,
    cardFit.height * zoom * k,
  );
  return canvasToBlob(canvas);
}

export function paletteText(payload: ExportPayload): string {
  const theme = buildDiscordTheme(payload.primaryColor, payload.accentColor);
  return [
    `Discord Profile Designer — палитра`,
    `=====================================`,
    `Ник:            ${payload.displayName} (@${payload.username})`,
    `Primary:        ${payload.primaryColor.toUpperCase()}`,
    `Accent:         ${payload.accentColor.toUpperCase()}`,
    `Фон карточки:   ${theme.bodyBackground.toUpperCase()}`,
    `Кнопка:         ${theme.buttonBackground.toUpperCase()}`,
    `Текст:          ${theme.textPrimary.toUpperCase()}`,
    ``,
    `Как применить: Discord → Настройки → Профиль → Тема профиля`,
    `(нужен Discord Nitro) → вставьте Primary и Accent.`,
    ``,
    `CSS-переменные Discord:`,
    themeToCssVars(theme),
    ``,
    payload.bio ? `Обо мне:\n${payload.bio}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function themeJson(payload: ExportPayload): string {
  const theme = buildDiscordTheme(payload.primaryColor, payload.accentColor);
  return JSON.stringify(
    {
      name: payload.displayName,
      handle: payload.username,
      colors: {
        primary: payload.primaryColor.toUpperCase(),
        accent: payload.accentColor.toUpperCase(),
        body: theme.bodyBackground.toUpperCase(),
        button: theme.buttonBackground.toUpperCase(),
        text: theme.textPrimary.toUpperCase(),
      },
      avatar: { focusX: payload.avatarFocusX, focusY: payload.avatarFocusY, zoom: payload.avatarZoom },
      source: "discord-profile-designer",
    },
    null,
    2,
  );
}

export async function buildPack(payload: ExportPayload): Promise<Blob> {
  const entries: ZipEntry[] = [];
  const textBlob = (text: string, type = "text/plain") =>
    new Blob([text], { type: `${type};charset=utf-8` });

  entries.push({ name: "palette.txt", blob: textBlob(paletteText(payload)) });
  entries.push({ name: "theme.json", blob: textBlob(themeJson(payload), "application/json") });

  const pairMode = Boolean(
    payload.avatarUrl && payload.bannerUrl && payload.avatarUrl === payload.bannerUrl,
  );

  try {
    if (payload.bannerUrl) {
      const banner = await loadImage(payload.bannerUrl);
      entries.push({ name: "banner-600x240.png", blob: await renderBanner(banner) });
    }
    if (payload.avatarUrl) {
      const avatar = await loadImage(payload.avatarUrl);
      entries.push({
        name: "avatar-512x512.png",
        blob: await renderAvatar(
          avatar,
          payload.avatarFocusX,
          payload.avatarFocusY,
          payload.avatarZoom,
          pairMode,
        ),
      });
    }
  } catch (error) {
    console.warn("Не удалось добавить картинки в пак:", error);
  }

  return createZip(entries);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

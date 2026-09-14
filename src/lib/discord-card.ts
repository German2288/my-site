/**
 * Геометрия поповера профиля Discord + математика «бесшовных» пар.
 *
 * Реальный поповер Discord: ширина 300px, баннер 2.5:1 (600×240 в исходниках),
 * аватар 80px с рамкой 6px цвета фона, центр аватара — на 26px выше нижней
 * границы баннера. Здесь всё нормализовано под ширину карточки 340px,
 * а рендер масштабируется через CSS transform, поэтому пропорции 1:1 с Discord.
 */
import type { CSSProperties } from "react";

export const CARD = {
  width: 340,
  bannerHeight: 136,
  avatar: 104,
  avatarBorder: 6,
  avatarLeft: 20,
  avatarTop: 84,
  presence: 28,
} as const;

export const CARD_ASPECT = CARD.width / CARD.bannerHeight; // 2.5

/** Размеры, в которых Discord принимает картинки. */
export const DISCORD_EXPORT = {
  bannerWidth: 600,
  bannerHeight: 240,
  avatar: 512,
} as const;

export type CoverFit = { scale: number; width: number; height: number };

/** object-fit: cover, выраженный в числах. */
export function coverFit(sourceW: number, sourceH: number, boxW: number, boxH: number): CoverFit {
  const scale = Math.max(boxW / sourceW, boxH / sourceH);
  return { scale, width: sourceW * scale, height: sourceH * scale };
}

export type SeamlessLayout = {
  /** Стиль <img> внутри баннера. */
  bannerImage: CSSProperties;
  /** Стиль <img> внутри аватара (тот же исходник, но с зумом и сдвигом). */
  avatarImage: CSSProperties;
  /** Стиль обёртки баннера. */
  bannerBox: CSSProperties;
};

/**
 * Фокус, при котором аватар лежит «на своём месте» — ровно под тем же участком
 * баннера. В этой точке при zoom = 1 продолжение получается пиксель-в-пиксель.
 */
export function seamlessFocus(sourceW: number, sourceH: number) {
  const fit = coverFit(sourceW, sourceH, CARD.width, CARD.bannerHeight);
  const ox = fit.width > CARD.width ? (fit.width - CARD.width) / 2 : 0;
  const oy = fit.height > CARD.bannerHeight ? 0 : (fit.height - CARD.bannerHeight) / 2;
  return {
    x: (CARD.avatarLeft + CARD.avatar / 2 - ox) / fit.width,
    y: (CARD.avatarTop + CARD.avatar / 2 - oy) / fit.height,
  };
}

/** Идеальный ли сейчас стык (тот же фокус + zoom = 1). */
export function isSeamless(
  sourceW: number,
  sourceH: number,
  focusX: number,
  focusY: number,
  zoom: number,
): boolean {
  const anchor = seamlessFocus(sourceW, sourceH);
  return (
    zoom === 1 && Math.abs(focusX - anchor.x) < 0.004 && Math.abs(focusY - anchor.y) < 0.004
  );
}

/**
 * Считает раскладку для пары «баннер + аватар из одного исходника».
 *
 * @param sourceW/sourceH  натуральные размеры картинки
 * @param focusX/focusY    точка исходника (0..1), которая попадает в центр аватара
 * @param zoom             1 — идеальное продолжение баннера, >1 — укрупнение
 */
export function seamlessLayout(
  sourceW: number,
  sourceH: number,
  focusX = 0.2118,
  focusY = 0.4,
  zoom = 1,
): SeamlessLayout {
  const fit = coverFit(sourceW, sourceH, CARD.width, CARD.bannerHeight);
  const horizontalCrop = fit.width > CARD.width;
  const verticalCrop = fit.height > CARD.bannerHeight;
  // object-position: "50% 0%" — сверху по центру.
  const objectPosition = horizontalCrop || verticalCrop ? "50% 0%" : "50% 50%";
  const ox = horizontalCrop ? (fit.width - CARD.width) / 2 : 0;
  const oy = verticalCrop ? 0 : (fit.height - CARD.bannerHeight) / 2;

  // Источник-бокс: как будто картинка лежит в карточке с отступом (-ox, -oy).
  const bx = -ox;
  const by = -oy;

  // Точка (focusX, focusY) всегда попадает в центр аватара, масштаб — zoom.
  const left = CARD.avatar / 2 - (bx + focusX * fit.width) * zoom;
  const top = CARD.avatar / 2 - (by + focusY * fit.height) * zoom;

  return {
    bannerBox: {
      width: CARD.width,
      height: CARD.bannerHeight,
    },
    bannerImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition,
    },
    avatarImage: {
      position: "absolute",
      width: fit.width * zoom,
      height: fit.height * zoom,
      objectFit: "cover",
      objectPosition,
      left,
      top,
      maxWidth: "none",
      maxHeight: "none",
      pointerEvents: "none",
    },
  };
}

/**
 * Аватар как самостоятельная картинка (не пара): cover + фокус + зум.
 */
export function standaloneAvatarStyle(focusX: number, focusY: number, zoom: number): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${focusX * 100}% ${focusY * 100}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
  };
}

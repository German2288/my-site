"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  CARD,
  seamlessLayout,
  standaloneAvatarStyle,
} from "@/lib/discord-card";
import {
  DISCORD_STATUS_COLORS,
  buildDiscordTheme,
  readableMuted,
  readableText,
} from "@/lib/color";

export type ProfilePreview = {
  displayName: string;
  username: string;
  pronouns?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  status?: "online" | "idle" | "dnd" | "invisible" | "streaming";
  memberSince?: string;
  playing?: string | null;
};

const DISCORD_LOGO_PATH =
  "M107.695 44.929c-7.922-3.461-16.328-5.974-25.107-7.406-1.083 1.937-2.341 4.544-3.209 6.629-9.335-1.398-18.599-1.398-27.773 0-.869-2.085-2.156-4.692-3.248-6.629-8.786 1.432-17.198 3.953-25.121 7.42C7.442 64.785 3.327 84.077 5.363 103.084c10.536 7.731 20.741 12.429 30.784 15.54 2.494-3.398 4.715-6.997 6.626-10.789-3.648-1.369-7.149-3.051-10.457-5.005.878-.643 1.738-1.312 2.575-2.008 18.106 8.366 37.763 8.366 55.666 0 .845.696 1.704 1.365 2.575 2.008-3.315 1.962-6.824 3.644-10.479 5.013 1.912 3.784 4.126 7.391 6.626 10.789 10.052-3.111 20.264-7.809 30.8-15.54 2.397-21.955-4.086-41.223-16.989-58.155zM42.568 91.835c-5.427 0-9.879-4.955-9.879-11.006 0-6.05 4.37-11.005 9.879-11.005 5.522 0 9.938 4.972 9.872 11.005.007 6.051-4.35 11.006-9.872 11.006zm42.518 0c-5.427 0-9.879-4.955-9.879-11.006 0-6.05 4.37-11.005 9.879-11.005 5.522 0 9.938 4.972 9.872 11.005.007 6.051-4.343 11.006-9.872 11.006z";

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      title={label}
      className="grid h-[18px] w-[18px] place-items-center rounded-[4px]"
      style={{ background: color }}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
        <path d="M12 2 14.6 8.4 21.5 9 16.3 13.4 18 20.2 12 16.5 6 20.2 7.7 13.4 2.5 9l6.9-.6z" />
      </svg>
    </span>
  );
}

export default function ProfileMockup({
  preview,
  scale = 1,
  onAvatarDrag,
  className = "",
}: {
  preview: ProfilePreview;
  scale?: number;
  onAvatarDrag?: (deltaX: number, deltaY: number) => void;
  className?: string;
}) {
  const theme = buildDiscordTheme(preview.primaryColor, preview.accentColor);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const pairMode = Boolean(
    preview.avatarUrl && preview.bannerUrl && preview.avatarUrl === preview.bannerUrl,
  );
  const layout =
    pairMode && size
      ? seamlessLayout(size.w, size.h, preview.avatarFocusX, preview.avatarFocusY, preview.avatarZoom)
      : null;

  const onAvatarLoad = useCallback((event: { naturalWidth: number; naturalHeight: number }) => {
    const { naturalWidth, naturalHeight } = event;
    if (naturalWidth && naturalHeight) {
      setSize((prev) =>
        prev && prev.w === naturalWidth && prev.h === naturalHeight
          ? prev
          : { w: naturalWidth, h: naturalHeight },
      );
    }
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onAvatarDrag) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !onAvatarDrag) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    onAvatarDrag(dx, dy);
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const cardStyle: CSSProperties = {
    width: CARD.width,
    background: theme.bodyBackground,
    color: theme.textPrimary,
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.25)",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      '"gg sans", "Noto Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };

  const avatarInner = preview.avatarUrl ? (
    layout ? (
      <img
        src={preview.avatarUrl}
        alt="Аватар"
        style={layout.avatarImage}
        draggable={false}
      />
    ) : (
      <img
        src={preview.avatarUrl}
        alt="Аватар"
        draggable={false}
        style={standaloneAvatarStyle(preview.avatarFocusX, preview.avatarFocusY, preview.avatarZoom)}
      />
    )
  ) : (
    <div
      className="grid h-full w-full place-items-center text-[34px] font-semibold"
      style={{ background: theme.bannerGradient, color: readableText(theme.primary) }}
    >
      {(preview.displayName || "?").slice(0, 1).toUpperCase()}
    </div>
  );

  return (
    <div
      className={`mockup-wrap ${className}`}
      style={{ zoom: scale === 1 ? undefined : scale }}
    >
      <div className="mockup-shell rounded-[12px] p-4" style={{ background: "#1e1f22" }}>
        <div style={cardStyle} className="mockup-card">
          {/* ── Баннер ─────────────────────────────────────────── */}
          <div style={{ height: CARD.bannerHeight, position: "relative", overflow: "hidden" }}>
            {preview.bannerUrl ? (
              <img
                src={preview.bannerUrl}
                alt="Баннер"
                onLoad={(event) => onAvatarLoad(event.currentTarget)}
                draggable={false}
                style={
                  layout
                    ? layout.bannerImage
                    : { width: "100%", height: "100%", objectFit: "cover" }
                }
              />
            ) : (
              <div className="h-full w-full" style={{ background: theme.bannerGradient }} />
            )}
            {/* лёгкий градиент, как у Discord для читаемости */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,.28), transparent)" }}
            />
          </div>

          {/* ── Аватар ─────────────────────────────────────────── */}
          <div
            style={{
              position: "absolute",
              left: CARD.avatarLeft - CARD.avatarBorder,
              top: CARD.avatarTop - CARD.avatarBorder,
              width: CARD.avatar + CARD.avatarBorder * 2,
              height: CARD.avatar + CARD.avatarBorder * 2,
              borderRadius: "50%",
              background: theme.avatarRing,
              zIndex: 2,
            }}
          >
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative h-full w-full overflow-hidden rounded-full"
              style={{ cursor: onAvatarDrag ? "grab" : undefined, touchAction: "none" }}
            >
              {avatarInner}
            </div>
            <span
              className="absolute rounded-full"
              style={{
                right: -2,
                bottom: -2,
                width: CARD.presence,
                height: CARD.presence,
                background: DISCORD_STATUS_COLORS[preview.status ?? "online"],
                border: `${CARD.avatarBorder}px solid ${theme.avatarRing}`,
                zIndex: 3,
              }}
            />
          </div>

          {/* ── Тело карточки ──────────────────────────────────── */}
          <div style={{ padding: `0 16px 16px`, marginTop: CARD.avatar / 2 + 12 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="truncate text-[20px] font-bold leading-tight">
                    {preview.displayName || "Ваш ник"}
                  </h3>
                  {preview.pronouns ? (
                    <span className="text-[13px]" style={{ color: theme.textMuted }}>
                      {preview.pronouns}
                    </span>
                  ) : null}
                </div>
                <div
                  className="mt-[2px] truncate text-[14px] font-medium"
                  style={{ color: theme.textMuted }}
                >
                  {preview.username ? `@${preview.username}` : "@username"}
                </div>
                {preview.customStatus ? (
                  <div className="mt-[6px] text-[13px]" style={{ color: theme.textMuted }}>
                    {preview.customStatus}
                  </div>
                ) : null}
              </div>
              <div
                className="mt-1 flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-1"
                style={{ background: theme.badgeBackground }}
              >
                <Badge color="#ff73fa" label="Discord Nitro" />
                <Badge color="#f47fff" label="Server Booster" />
                <Badge color={theme.accent} label="Early Supporter" />
              </div>
            </div>

            {preview.playing ? (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="grid h-9 w-9 place-items-center rounded-[6px] text-[16px]"
                  style={{ background: theme.badgeBackground }}
                >
                  🎮
                </span>
                <div className="leading-tight">
                  <div className="text-[13px] font-semibold" style={{ color: theme.labelColor }}>
                    Играет в игру
                  </div>
                  <div className="text-[13px]">{preview.playing}</div>
                </div>
              </div>
            ) : null}

            {preview.bio ? (
              <div className="mt-4">
                <div
                  className="text-[12px] font-bold uppercase"
                  style={{ color: theme.labelColor, letterSpacing: ".02em" }}
                >
                  Обо мне
                </div>
                <p
                  className="mt-1 whitespace-pre-line text-[14px] leading-[1.375]"
                  style={{ color: theme.textPrimary }}
                >
                  {preview.bio}
                </p>
              </div>
            ) : null}

            <div className="my-3 h-px w-full" style={{ background: theme.divider }} />

            <div className="flex items-center gap-2">
              <svg viewBox="0 0 127.14 96.36" className="h-4 w-5" fill={theme.textMuted} aria-hidden>
                <path d={DISCORD_LOGO_PATH} />
              </svg>
              <span className="text-[13px]" style={{ color: theme.textMuted }}>
                В профиле с
              </span>
              <span className="text-[13px] font-medium">
                {preview.memberSince ?? "13 июня 2017 г."}
              </span>
            </div>

            {/* ── Строка сообщения ─────────────────────────────── */}
            <div
              className="mt-3 flex items-center gap-2 rounded-[8px] px-3 py-[10px]"
              style={{
                background: theme.inputBackground,
                border: `1px solid ${theme.accent}66`,
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill={theme.textMuted} aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 9h4v2h-4v4h-2v-4H7v-2h4V7h2v4z" />
              </svg>
              <span className="truncate text-[14px]" style={{ color: theme.textMuted }}>
                Сообщение @{preview.username || "username"}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className="block h-4 w-4 rounded-[4px]"
                  style={{ background: theme.buttonBackground, opacity: 0.85 }}
                />
                <span
                  className="block h-4 w-4 rounded-full"
                  style={{ background: theme.buttonBackground, opacity: 0.55 }}
                />
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {[
                { label: "Профиль", filled: true },
                { label: "Написать", filled: false },
              ].map((button) => (
                <button
                  type="button"
                  key={button.label}
                  className="flex-1 rounded-[6px] px-3 py-[7px] text-[13px] font-semibold transition-transform active:scale-[.98]"
                  style={{
                    background: button.filled ? theme.buttonBackground : "transparent",
                    color: button.filled
                      ? readableText(theme.buttonBackground)
                      : theme.textPrimary,
                    border: `1px solid ${button.filled ? "transparent" : theme.divider}`,
                  }}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          {/* Подсказка режима выравнивания (не мешает мокапу) */}
          {onAvatarDrag ? (
            <div
              className="pointer-events-none absolute right-3 rounded-full px-2 py-[2px] text-[10px] font-medium"
              style={{
                top: CARD.bannerHeight - 20,
                background: "rgba(0,0,0,.35)",
                color: readableMuted(theme.bodyBackground),
                backdropFilter: "blur(4px)",
              }}
            >
              тяните аватар ↕
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthMenu({
  displayName,
  username,
  discordAvailable,
}: {
  displayName?: string | null;
  username?: string | null;
  discordAvailable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);

  if (displayName) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-[13px] text-white/85">{displayName}</span>
          <span className="text-[11px] text-white/35">@{username}</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/session", { method: "DELETE" });
            router.refresh();
          }}
          className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#0b0c10] transition hover:bg-white/85"
      >
        Войти
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[268px] rounded-2xl border border-white/10 bg-[#15161b] p-3 shadow-2xl">
          <p className="text-[12px] leading-snug text-white/55">
            Быстрый вход: только ник, без пароля. Или войдите через Discord — подтянутся имя и
            аватар.
          </p>
          <input
            value={nick}
            onChange={(event) => setNick(event.target.value)}
            placeholder="Ваш ник"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white outline-none focus:border-indigo-400/70"
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await fetch("/api/session", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ displayName: nick || "Гость" }),
                });
                setOpen(false);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 w-full rounded-xl bg-indigo-500 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
          >
            Продолжить
          </button>
          {discordAvailable ? (
            <a
              href="/api/auth/discord"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865f2] px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
            >
              Войти через Discord
            </a>
          ) : (
            <p className="mt-2 text-[11px] leading-snug text-white/35">
              Discord OAuth не настроен: добавьте DISCORD_CLIENT_ID и DISCORD_CLIENT_SECRET в .env
              (инструкция в README).
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { describeColor, HARMONY_HINTS } from "@/lib/palette-meta";
import type { PaletteSuggestion } from "@/lib/palette-extract";

export default function PaletteSuggestions({
  suggestions,
  onApply,
  onCopy,
}: {
  suggestions: PaletteSuggestion[];
  onApply: (primary: string, accent: string) => void;
  onCopy: (primary: string, accent: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="space-y-2">
      {suggestions.map((item) => (
        <div
          key={item.id}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-indigo-400/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold capitalize text-white">{item.name}</span>
                <span className="rounded-full bg-white/10 px-2 py-[1px] text-[10px] uppercase tracking-wide text-white/60">
                  {describeColor(item.primary)} · {describeColor(item.accent)}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-snug text-white/55">{item.reason}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {item.colors.map((hex, index) => (
                <span
                  key={`${item.id}-${hex}-${index}`}
                  title={hex.toUpperCase()}
                  className="h-7 w-5 rounded-[4px] border border-white/10"
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApply(item.primary, item.accent)}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-400"
            >
              Применить
            </button>
            <button
              type="button"
              onClick={() => onCopy(item.primary, item.accent)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/80 transition hover:border-white/40"
            >
              HEX: {item.primary.toUpperCase()} / {item.accent.toUpperCase()}
            </button>
            <span className="ml-auto text-[11px] text-white/35">
              {HARMONY_HINTS[item.harmony]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

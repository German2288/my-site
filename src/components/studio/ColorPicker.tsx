"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { hexToRgb, normalizeHex, rgbToHex } from "@/lib/color";

type Hsv = { h: number; s: number; v: number };

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = (((gn - bn) / delta) % 6) * 60;
    else if (max === gn) h = ((bn - rn) / delta + 2) * 60;
    else h = ((rn - gn) / delta + 4) * 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv) {
  const c = v * s;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number] = [0, 0, 0];
  if (hh < 60) rgb = [c, x, 0];
  else if (hh < 120) rgb = [x, c, 0];
  else if (hh < 180) rgb = [0, c, x];
  else if (hh < 240) rgb = [0, x, c];
  else if (hh < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}

const hexToHsv = (hex: string) => rgbToHsv(hexToRgb(hex));
const hsvToHex = (hsv: Hsv) => rgbToHex(hsvToRgb(hsv));

export default function ColorPicker({
  label,
  value,
  onChange,
  hint,
  swatches = [],
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  hint?: string;
  swatches?: string[];
}) {
  const safe = normalizeHex(value) || "#5865f2";
  const [hsv, setHsv] = useState<Hsv>(hexToHsv(safe));
  const [text, setText] = useState(safe.replace("#", "").toUpperCase());
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Держим локальное HSV-состояние синхронным с внешним значением.
  const syncFromHex = useCallback((hex: string) => {
    const next = hexToHsv(hex);
    setHsv((prev) =>
      Math.abs(prev.h - next.h) < 0.5 && Math.abs(prev.s - next.s) < 0.005 && Math.abs(prev.v - next.v) < 0.005
        ? prev
        : next,
    );
    setText(hex.replace("#", "").toUpperCase());
  }, []);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setText(hex.replace("#", "").toUpperCase());
    onChange(hex);
  };

  const applyHex = (raw: string) => {
    setText(raw.replace("#", ""));
    const hex = normalizeHex(raw);
    if (hex) {
      setHsv(hexToHsv(hex));
      onChange(hex);
    }
  };

  const pickFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const box = svRef.current?.getBoundingClientRect();
    if (!box) return;
    const s = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const v = 1 - Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    commit({ ...hsv, s, v });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-white/25"
            style={{ background: safe }}
          />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-white">{label}</div>
            {hint ? <div className="text-[11px] text-white/45">{hint}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-white/40">#</span>
          <input
            value={text}
            onChange={(event) => applyHex(event.target.value)}
            maxLength={7}
            spellCheck={false}
            className="w-[62px] rounded-md border border-white/10 bg-black/30 px-1.5 py-1 text-center text-[12px] font-mono uppercase text-white outline-none focus:border-indigo-400/70"
          />
        </div>
      </div>

      <div
        ref={svRef}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          pickFromEvent(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) pickFromEvent(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className="relative h-[104px] w-full cursor-crosshair touch-none rounded-lg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: safe,
          }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={Math.round(hsv.h)}
        onChange={(event) => commit({ ...hsv, h: Number(event.target.value) })}
        className="mt-2 h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      />

      <div className="mt-2 flex items-center gap-1.5">
        <input
          type="color"
          value={safe}
          onChange={(event) => {
            const hex = normalizeHex(event.target.value);
            if (hex) {
              setHsv(hexToHsv(hex));
              onChange(hex);
              syncFromHex(hex);
            }
          }}
          className="h-7 w-7 cursor-pointer rounded-md border border-white/15 bg-transparent p-0"
          title="Системная пипетка"
        />
        {swatches.slice(0, 9).map((hex) => (
          <button
            type="button"
            key={hex}
            onClick={() => {
              setHsv(hexToHsv(hex));
              onChange(hex);
              syncFromHex(hex);
            }}
            title={hex.toUpperCase()}
            className="h-6 w-6 rounded-md border border-white/15 transition-transform hover:scale-110"
            style={{ background: hex }}
          />
        ))}
      </div>
    </div>
  );
}

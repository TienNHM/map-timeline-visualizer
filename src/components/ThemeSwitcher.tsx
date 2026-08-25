"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

function Swatch({ colors, size = 18 }: { colors: [string, string]; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}
    />
  );
}

export default function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = themes.find((t) => t.id === themeId) ?? themes[0];

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Change theme"
        className="flex items-center gap-2 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1.5 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
      >
        <Swatch colors={current.swatch} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-[calc(100%+0.5rem)] z-20 w-52 p-2 shadow-2xl">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold tracking-wide text-(--text-faint) uppercase">
            Theme
          </p>
          <div className="flex flex-col gap-0.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  t.id === themeId ? "bg-(--panel-strong) text-(--text)" : "text-(--text-muted) hover:bg-(--panel) hover:text-(--text)"
                }`}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1">{t.name}</span>
                {t.id === themeId && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5 text-(--accent)">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/LocaleProvider";

interface TimelineSliderProps {
  dates: string[];
  startIndex: number;
  endIndex: number;
  onChange: (startIndex: number, endIndex: number) => void;
}

export default function TimelineSlider({
  dates,
  startIndex,
  endIndex,
  onChange,
}: TimelineSliderProps) {
  const { t } = useLocale();
  const maxIndex = dates.length - 1;

  const label = useMemo(() => {
    if (dates.length === 0) return "";
    const start = dates[startIndex];
    const end = dates[endIndex];
    return start === end ? start : `${start} → ${end}`;
  }, [dates, startIndex, endIndex]);

  if (maxIndex < 1) {
    return <p className="text-sm text-(--text-muted)">{dates[0] ?? t.slider.noData}</p>;
  }

  const startPct = (startIndex / maxIndex) * 100;
  const endPct = (endIndex / maxIndex) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 sm:hidden">
        <span className="stat-number text-sm font-medium text-(--text)">{label}</span>
        <div className="flex w-full justify-between text-[11px] text-(--text-faint)">
          <span>{dates[0]}</span>
          <span>{dates[maxIndex]}</span>
        </div>
      </div>
      <div className="hidden items-baseline justify-between gap-3 text-xs sm:flex">
        <span className="text-(--text-faint)">{dates[0]}</span>
        <span className="stat-number text-sm font-medium text-(--text)">{label}</span>
        <span className="text-(--text-faint)">{dates[maxIndex]}</span>
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-(--panel-border)" />
        <div
          className="accent-fill absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
          }}
        />
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={startIndex}
          onChange={(e) => {
            const value = Math.min(Number(e.target.value), endIndex);
            onChange(value, endIndex);
          }}
          className="dual-range absolute w-full"
        />
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={endIndex}
          onChange={(e) => {
            const value = Math.max(Number(e.target.value), startIndex);
            onChange(startIndex, value);
          }}
          className="dual-range absolute w-full"
        />
      </div>
    </div>
  );
}

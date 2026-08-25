"use client";

import { useMemo } from "react";

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
  const maxIndex = dates.length - 1;

  const label = useMemo(() => {
    if (dates.length === 0) return "";
    const start = dates[startIndex];
    const end = dates[endIndex];
    return start === end ? start : `${start} → ${end}`;
  }, [dates, startIndex, endIndex]);

  if (maxIndex < 1) {
    return <p className="text-sm text-gray-500">{dates[0] ?? "No data"}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{dates[0]}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <span>{dates[maxIndex]}</span>
      </div>
      <div className="relative h-6">
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

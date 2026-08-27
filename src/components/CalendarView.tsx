"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Icon } from "@/components/Icon";

interface CalendarViewProps {
  /** Every date (YYYY-MM-DD) that has any timeline data, used to enable/disable cells. */
  dates: string[];
  /** Optional per-date distance, in meters — lightly tints days by how much ground was
   * covered, previewing the shape of the later heatmap view using the same data. */
  dailyDistanceMeters?: Record<string, number>;
  /** The single selected day (YYYY-MM-DD), or null when the current selection spans
   * more than one day. */
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export default function CalendarView({ dates, dailyDistanceMeters, selectedDate, onSelectDay }: CalendarViewProps) {
  const { locale, t } = useLocale();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";

  const dateSet = useMemo(() => new Set(dates), [dates]);
  const maxDistance = useMemo(() => {
    if (!dailyDistanceMeters) return 0;
    return Object.values(dailyDistanceMeters).reduce((max, v) => Math.max(max, v), 0);
  }, [dailyDistanceMeters]);

  const anchor = selectedDate ?? dates[dates.length - 1] ?? null;
  const [cursor, setCursor] = useState(() => {
    if (anchor) {
      const [y, m] = anchor.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { weekday: "short" });
    // 2024-01-01 was a Monday, giving a clean Mon-first reference week.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [localeTag]);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" });
    return fmt.format(new Date(cursor.year, cursor.month, 1));
  }, [cursor, localeTag]);

  const cells = useMemo(() => {
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
    const leading = (firstWeekday + 6) % 7; // Mon = 0
    const result: Array<{ day: number; key: string } | null> = [];
    for (let i = 0; i < leading; i++) result.push(null);
    for (let day = 1; day <= daysInMonth; day++) result.push({ day, key: dateKey(cursor.year, cursor.month, day) });
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }

  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          aria-label={t.calendar.prevAria}
          className="flex h-7 w-7 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text)"
        >
          <Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" />
        </button>
        <span className="stat-number text-sm font-medium text-(--text) capitalize">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          aria-label={t.calendar.nextAria}
          className="flex h-7 w-7 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text)"
        >
          <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-(--text-faint)">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="py-1 capitalize">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`blank-${i}`} />;
          const hasData = dateSet.has(cell.key);
          const isSelected = selectedDate === cell.key;
          const distance = dailyDistanceMeters?.[cell.key] ?? 0;
          const intensity = hasData && maxDistance > 0 ? Math.min(1, distance / maxDistance) : 0;

          return (
            <button
              key={cell.key}
              disabled={!hasData}
              onClick={() => onSelectDay(cell.key)}
              className={`stat-number flex aspect-square items-center justify-center rounded-lg text-xs transition-colors ${
                isSelected
                  ? "text-white"
                  : hasData
                    ? "text-(--text) hover:bg-(--panel-strong)"
                    : "cursor-default text-(--text-faint) opacity-40"
              }`}
              style={
                isSelected
                  ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                  : intensity > 0
                    ? { background: `color-mix(in srgb, var(--accent) ${10 + intensity * 55}%, transparent)` }
                    : undefined
              }
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

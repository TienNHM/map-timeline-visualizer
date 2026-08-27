"use client";

import { useMemo, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { buildTripSummaries, TripSortKey, TripSummary } from "@/lib/timeline/trips";
import { formatActivity, formatDateTime, formatKm, formatPlaceLabel } from "@/lib/timeline/format";
import { Icon } from "@/components/Icon";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { useLocale } from "@/components/LocaleProvider";

const PAGE_SIZE = 40;

interface TripsPanelProps {
  segments: TimelineSegment[];
  onSelectTrip: (trip: TripSummary) => void;
  sortKey: TripSortKey;
  onSortKeyChange: (key: TripSortKey) => void;
}

export default function TripsPanel({ segments, onSelectTrip, sortKey, onSortKeyChange }: TripsPanelProps) {
  const { locale, t } = useLocale();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Resets pagination whenever the sort changes — including when the AI assistant
  // changes it, not just the dropdown below. Adjusted during render (React's documented
  // pattern for resetting state when a prop changes) rather than in an effect, so it
  // takes effect in the same render instead of causing an extra one.
  const [prevSortKey, setPrevSortKey] = useState(sortKey);
  if (sortKey !== prevSortKey) {
    setPrevSortKey(sortKey);
    setVisibleCount(PAGE_SIZE);
  }

  const trips = useMemo(() => buildTripSummaries(segments), [segments]);

  const sorted = useMemo(() => {
    const list = [...trips];
    switch (sortKey) {
      case "date-asc":
        return list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      case "distance-desc":
        return list.sort((a, b) => b.distanceMeters - a.distanceMeters);
      case "date-desc":
      default:
        return list.sort((a, b) => b.startTime.localeCompare(a.startTime));
    }
  }, [trips, sortKey]);

  const sortOptions: DropdownOption<TripSortKey>[] = [
    { value: "date-desc", label: t.trips.sortNewest },
    { value: "date-asc", label: t.trips.sortOldest },
    { value: "distance-desc", label: t.trips.sortDistance },
  ];

  if (trips.length === 0) {
    return <p className="py-6 text-center text-sm text-(--text-muted)">{t.trips.empty}</p>;
  }

  const visible = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
          {t.trips.title} ({trips.length.toLocaleString()})
        </h3>
        <Dropdown
          value={sortKey}
          options={sortOptions}
          onChange={onSortKeyChange}
          menuLabel={t.trips.sortLabel}
          triggerClassName="flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
          renderTrigger={(current) => <span>{current.label}</span>}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((trip) => (
          <li key={trip.id}>
            <button
              onClick={() => onSelectTrip(trip)}
              className="w-full rounded-xl border border-(--panel-border) bg-(--panel) px-3 py-2.5 text-left transition-colors hover:bg-(--panel-strong)"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="stat-number text-xs text-(--text-faint)">
                  {t.trips.tripLabel} #{String(trip.index).padStart(3, "0")}
                </span>
                {trip.activityType && (
                  <span className="flex items-center gap-1 text-[11px] text-(--text-faint)">
                    <Icon name="route" className="h-3 w-3 shrink-0" />
                    {formatActivity(trip.activityType, t)}
                  </span>
                )}
              </div>
              <div className="stat-number mt-1 text-xs text-(--text-muted)">
                {formatDateTime(new Date(trip.startTime).getTime(), localeTag)} →{" "}
                {formatDateTime(new Date(trip.endTime).getTime(), localeTag)}
              </div>
              <div className="mt-1.5 truncate text-sm text-(--text)">
                {trip.startLabel === trip.endLabel
                  ? formatPlaceLabel(trip.startLabel, t)
                  : `${formatPlaceLabel(trip.startLabel, t)} → ${formatPlaceLabel(trip.endLabel, t)}`}
              </div>
              <div className="stat-number mt-1 text-xs text-(--accent)">
                {t.trips.distanceLabel}: {formatKm(trip.distanceMeters)}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="rounded-full border border-(--panel-border) bg-(--panel) px-3 py-2 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
        >
          {t.trips.showMore}
        </button>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { buildPlaceMarkers, PlaceCategory, placeVisits, PlaceMarker } from "@/lib/timeline/places";
import { formatDateTime, formatHours, formatPlaceLabel } from "@/lib/timeline/format";
import { Icon } from "@/components/Icon";
import Dropdown, { DropdownOption } from "@/components/Dropdown";
import { useLocale } from "@/components/LocaleProvider";

type SortKey = "visits-desc" | "duration-desc" | "recent-desc";

const PAGE_SIZE = 30;
const VISITS_PAGE_SIZE = 20;

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  home: "var(--accent-2)",
  work: "var(--accent)",
  named: "color-mix(in srgb, var(--accent) 50%, var(--accent-2))",
  unknown: "#8a8a94",
};

interface PlacesPanelProps {
  segments: TimelineSegment[];
  clusterRadiusMeters: number;
  onSelectPlace: (place: PlaceMarker) => void;
}

export default function PlacesPanel({ segments, clusterRadiusMeters, onSelectPlace }: PlacesPanelProps) {
  const { locale, t } = useLocale();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const [sortKey, setSortKey] = useState<SortKey>("duration-desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const places = useMemo(() => buildPlaceMarkers(segments, clusterRadiusMeters), [segments, clusterRadiusMeters]);

  const sorted = useMemo(() => {
    const list = [...places];
    switch (sortKey) {
      case "visits-desc":
        return list.sort((a, b) => b.visitCount - a.visitCount);
      case "recent-desc":
        return list.sort((a, b) => b.lastVisitTime.localeCompare(a.lastVisitTime));
      case "duration-desc":
      default:
        return list.sort((a, b) => b.durationMs - a.durationMs);
    }
  }, [places, sortKey]);

  const sortOptions: DropdownOption<SortKey>[] = [
    { value: "duration-desc", label: t.placesPanel.sortDuration },
    { value: "visits-desc", label: t.placesPanel.sortVisits },
    { value: "recent-desc", label: t.placesPanel.sortRecent },
  ];

  if (places.length === 0) {
    return <p className="py-6 text-center text-sm text-(--text-muted)">{t.placesPanel.empty}</p>;
  }

  const visible = sorted.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
          {t.placesPanel.title} ({places.length.toLocaleString()})
        </h3>
        <Dropdown
          value={sortKey}
          options={sortOptions}
          onChange={(v) => {
            setSortKey(v);
            setVisibleCount(PAGE_SIZE);
          }}
          menuLabel={t.placesPanel.sortLabel}
          triggerClassName="flex items-center gap-1.5 rounded-full border border-(--panel-border) bg-(--panel) px-2.5 py-1 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
          renderTrigger={(current) => <span>{current.label}</span>}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((place) => {
          const expanded = place.key === expandedKey;
          return (
            <li key={place.key} className="rounded-xl border border-(--panel-border) bg-(--panel)">
              <button onClick={() => onSelectPlace(place)} className="w-full px-3 py-2.5 text-left transition-colors hover:bg-(--panel-strong)">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLOR[place.category], boxShadow: `0 0 8px ${CATEGORY_COLOR[place.category]}80` }}
                  />
                  <span className="flex-1 truncate text-sm text-(--text)">{formatPlaceLabel(place.label, t)}</span>
                  <span className="stat-number shrink-0 text-xs text-(--accent)">
                    {place.visitCount} {t.placesPanel.visitsLabel}
                  </span>
                </div>
                <div className="stat-number mt-1.5 text-xs text-(--text-muted)">
                  {t.placesPanel.timeSpentLabel}: {formatHours(place.durationMs)}
                </div>
                <div className="stat-number mt-1 text-[11px] text-(--text-faint)">
                  {t.placesPanel.firstVisited}: {formatDateTime(new Date(place.firstVisitTime).getTime(), localeTag)}
                  {" · "}
                  {t.placesPanel.lastVisited}: {formatDateTime(new Date(place.lastVisitTime).getTime(), localeTag)}
                </div>
              </button>

              <button
                onClick={() => setExpandedKey(expanded ? null : place.key)}
                className="flex w-full items-center gap-1.5 border-t border-(--panel-border) px-3 py-1.5 text-[11px] text-(--text-faint) transition-colors hover:text-(--text)"
              >
                <Icon name="chevronDown" className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? t.placesPanel.hideVisits : t.placesPanel.viewVisits}
              </button>

              {expanded && (
                <PlaceVisitsList
                  segments={segments}
                  placeKey={place.key}
                  clusterRadiusMeters={clusterRadiusMeters}
                  localeTag={localeTag}
                />
              )}
            </li>
          );
        })}
      </ul>

      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="rounded-full border border-(--panel-border) bg-(--panel) px-3 py-2 text-xs text-(--text-muted) transition-colors hover:text-(--text)"
        >
          {t.placesPanel.showMore}
        </button>
      )}
    </div>
  );
}

function PlaceVisitsList({
  segments,
  placeKey,
  clusterRadiusMeters,
  localeTag,
}: {
  segments: TimelineSegment[];
  placeKey: string;
  clusterRadiusMeters: number;
  localeTag: string;
}) {
  const { t } = useLocale();
  const [visitsVisibleCount, setVisitsVisibleCount] = useState(VISITS_PAGE_SIZE);
  const visits = useMemo(
    () => placeVisits(segments, placeKey, clusterRadiusMeters),
    [segments, placeKey, clusterRadiusMeters]
  );
  const visible = visits.slice(0, visitsVisibleCount);

  return (
    <div className="scroll-thin max-h-64 overflow-y-auto border-t border-(--panel-border) px-3 py-2">
      <ul className="flex flex-col gap-1.5">
        {visible.map((visit) => {
          const start = new Date(visit.startTime).getTime();
          const end = new Date(visit.endTime).getTime();
          return (
            <li key={visit.id} className="stat-number flex items-center justify-between gap-2 text-[11px] text-(--text-muted)">
              <span>{formatDateTime(start, localeTag)}</span>
              <span className="text-(--text-faint)">{formatHours(Math.max(0, end - start))}</span>
            </li>
          );
        })}
      </ul>
      {visitsVisibleCount < visits.length && (
        <button
          onClick={() => setVisitsVisibleCount((n) => n + VISITS_PAGE_SIZE)}
          className="mt-2 text-[11px] text-(--accent) hover:underline"
        >
          {t.placesPanel.showMore}
        </button>
      )}
    </div>
  );
}

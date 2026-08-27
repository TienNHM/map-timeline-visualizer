"use client";

import { useEffect, useMemo, useState } from "react";
import { TimelineSegment } from "@/lib/timeline/types";
import { computeAnalytics } from "@/lib/timeline/analytics";
import { formatKm, formatHours, formatPlaceLabel } from "@/lib/timeline/format";
import { Icon, IconName } from "@/components/Icon";
import { useLocale } from "@/components/LocaleProvider";

interface LifeMapModalProps {
  segments: TimelineSegment[];
  onClose: () => void;
}

export default function LifeMapModal({ segments, onClose }: LifeMapModalProps) {
  const { t } = useLocale();

  const years = useMemo(() => {
    const set = new Set<number>();
    segments.forEach((s) => set.add(new Date(s.startTime).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [segments]);

  const [year, setYear] = useState(() => years[0] ?? new Date().getFullYear());

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const yearSegments = useMemo(
    () => segments.filter((s) => new Date(s.startTime).getFullYear() === year),
    [segments, year]
  );

  const analytics = useMemo(() => computeAnalytics(yearSegments), [yearSegments]);

  const yearIndex = years.indexOf(year);
  const canGoNewer = yearIndex > 0;
  const canGoOlder = yearIndex < years.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-md overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-6 sm:p-8"
          style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent-2) 14%, transparent))" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-(--text-muted) uppercase">
                {t.lifeMap.titlePrefix}
              </p>
              <h2 className="text-gradient stat-number text-4xl font-bold tracking-tight">{year}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label={t.lifeMap.closeAria}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-(--text-muted) transition-colors hover:text-(--text)"
            >
              ×
            </button>
          </div>

          {years.length > 1 && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => canGoOlder && setYear(years[yearIndex + 1])}
                disabled={!canGoOlder}
                aria-label={t.lifeMap.prevYearAria}
                className="flex h-6 w-6 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text) disabled:opacity-30"
              >
                <Icon name="chevronDown" className="h-3 w-3 rotate-90" />
              </button>
              <span className="stat-number text-xs text-(--text-faint)">
                {years[years.length - 1]} – {years[0]}
              </span>
              <button
                onClick={() => canGoNewer && setYear(years[yearIndex - 1])}
                disabled={!canGoNewer}
                aria-label={t.lifeMap.nextYearAria}
                className="flex h-6 w-6 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:text-(--text) disabled:opacity-30"
              >
                <Icon name="chevronDown" className="h-3 w-3 -rotate-90" />
              </button>
            </div>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto scroll-thin p-6 sm:p-8">
          {yearSegments.length === 0 ? (
            <p className="py-6 text-center text-sm text-(--text-muted)">{t.lifeMap.noData}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <LifeStat icon="route" label={t.lifeMap.distance} value={formatKm(analytics.totalDistanceMeters)} />
                <LifeStat icon="trips" label={t.lifeMap.trips} value={analytics.tripCount.toLocaleString()} />
                <LifeStat icon="pin" label={t.lifeMap.placesVisited} value={analytics.visitCount.toLocaleString()} />
                <LifeStat icon="layers" label={t.lifeMap.uniquePlaces} value={analytics.uniquePlaceCount.toLocaleString()} />
              </div>

              <div className="mt-3">
                <LifeStat
                  icon="speed"
                  label={t.lifeMap.travelTime}
                  value={formatHours(analytics.totalMovingMs)}
                  wide
                />
              </div>

              {analytics.topAreas.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
                    {t.lifeMap.topPlaces}
                  </h3>
                  <ol className="flex flex-col gap-1">
                    {analytics.topAreas.slice(0, 6).map((area, i) => (
                      <li
                        key={area.label}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <span className="stat-number w-5 shrink-0 text-xs text-(--text-faint)">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate text-(--text)">{formatPlaceLabel(area.label, t)}</span>
                        </span>
                        <span className="stat-number shrink-0 text-xs text-(--accent)">
                          {formatHours(area.durationMs)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LifeStat({ icon, label, value, wide = false }: { icon: IconName; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-(--panel-border) bg-(--panel) p-3.5 ${wide ? "col-span-2 flex-row items-center gap-3.5" : ""}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-(--panel-border) bg-(--panel-strong) text-(--accent)">
        <Icon name={icon} className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="stat-number text-lg font-semibold text-(--text)">{value}</div>
        <div className="text-[11px] text-(--text-muted)">{label}</div>
      </div>
    </div>
  );
}

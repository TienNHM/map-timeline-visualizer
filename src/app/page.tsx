"use client";

import { useMemo, useState } from "react";
import FileUpload from "@/components/FileUpload";
import MapView from "@/components/MapView";
import TimelineSlider from "@/components/TimelineSlider";
import StatsPanel from "@/components/StatsPanel";
import { TimelineData } from "@/lib/timeline/types";
import { computeStats, segmentsWithinRange } from "@/lib/timeline/stats";

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function Logo() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
      style={{
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
        boxShadow: "0 4px 20px -4px rgba(139, 124, 246, 0.5)",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);

  const dates = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.segments.forEach((s) => set.add(toDateKey(s.startTime)));
    data.rawTrack.forEach((p) => {
      if (p.time) set.add(toDateKey(p.time));
    });
    return Array.from(set).sort();
  }, [data]);

  const rangeBounds = useMemo(() => {
    if (dates.length === 0) return null;
    const startDate = dates[startIndex] ?? dates[0];
    const endDate = dates[endIndex] ?? dates[dates.length - 1];
    return {
      start: `${startDate}T00:00:00.000Z`,
      end: `${endDate}T23:59:59.999Z`,
    };
  }, [dates, startIndex, endIndex]);

  const filteredSegments = useMemo(() => {
    if (!data || !rangeBounds) return [];
    return segmentsWithinRange(data.segments, rangeBounds.start, rangeBounds.end);
  }, [data, rangeBounds]);

  const filteredRawTrack = useMemo(() => {
    if (!data || !rangeBounds) return [];
    return data.rawTrack.filter(
      (p) => !!p.time && p.time >= rangeBounds.start && p.time <= rangeBounds.end
    );
  }, [data, rangeBounds]);

  const stats = useMemo(
    () =>
      computeStats({
        segments: filteredSegments,
        rawTrack: filteredRawTrack,
        sourceFormat: data?.sourceFormat ?? "semantic-v2",
        warnings: [],
      }),
    [filteredSegments, filteredRawTrack, data]
  );

  function handleLoaded(loaded: TimelineData) {
    setData(loaded);
    const newDates = new Set<string>();
    loaded.segments.forEach((s) => newDates.add(toDateKey(s.startTime)));
    loaded.rawTrack.forEach((p) => {
      if (p.time) newDates.add(toDateKey(p.time));
    });
    const sorted = Array.from(newDates).sort();
    setStartIndex(0);
    setEndIndex(Math.max(sorted.length - 1, 0));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-(--panel-border) px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-(--text) sm:text-lg">
              Map <span className="text-gradient">Timeline</span> Visualizer
            </h1>
            <p className="hidden text-xs text-(--text-muted) sm:block">
              Import your Google Maps Timeline export to see journeys, places, and stats.
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-(--panel-border) bg-white/5 px-3 py-1.5 text-xs text-(--text-muted) md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-(--accent-2)" style={{ boxShadow: "0 0 6px var(--accent-2)" }} />
          100% local & private
        </div>
      </header>

      {!data ? (
        <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-xl">
            <FileUpload onLoaded={handleLoaded} />
          </div>
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:flex-row">
          <div className="flex min-h-80 flex-1 flex-col gap-3 sm:min-h-100 sm:gap-4">
            <div className="glass-panel flex-1 overflow-hidden p-1.5">
              <div className="h-full w-full overflow-hidden rounded-[0.9rem]">
                <MapView segments={filteredSegments} rawTrack={filteredRawTrack} />
              </div>
            </div>
            <div className="glass-panel p-3 sm:p-4">
              <TimelineSlider
                dates={dates}
                startIndex={startIndex}
                endIndex={endIndex}
                onChange={(s, e) => {
                  setStartIndex(s);
                  setEndIndex(e);
                }}
              />
            </div>
          </div>
          <aside className="flex w-full flex-col gap-3 sm:gap-4 lg:w-96">
            <div className="glass-panel p-3 sm:p-4">
              <StatsPanel stats={stats} />
            </div>
            <button
              onClick={() => setData(null)}
              className="self-start text-sm text-(--text-muted) transition-colors hover:text-(--text)"
            >
              ← Import a different file
            </button>
          </aside>
        </main>
      )}
    </div>
  );
}

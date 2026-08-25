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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Map Timeline Visualizer</h1>
        <p className="text-sm text-gray-500">
          Import your Google Maps Timeline export to see your journeys, places, and stats — all processed locally in your browser.
        </p>
      </header>

      {!data ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl">
            <FileUpload onLoaded={handleLoaded} />
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
          <div className="flex-1 flex flex-col gap-4 min-h-100">
            <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
              <MapView segments={filteredSegments} rawTrack={filteredRawTrack} />
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
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
          <aside className="w-full lg:w-96 flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <StatsPanel stats={stats} />
            </div>
            <button
              onClick={() => setData(null)}
              className="text-sm text-blue-600 hover:underline self-start"
            >
              Import a different file
            </button>
          </aside>
        </main>
      )}
    </div>
  );
}

import { TimelineSegment } from "./types";
import { isTrip, isVisit, visitLabel } from "./stats";

export interface DailyStat {
  /** YYYY-MM-DD, in the segment's own reported local time. */
  date: string;
  distanceMeters: number;
  tripCount: number;
  visitCount: number;
  movingMs: number;
}

export interface AreaStat {
  label: string;
  visits: number;
  durationMs: number;
}

/**
 * A semantic summary of a set of segments — the shared foundation for anything that
 * needs "what did this period of the timeline look like" without re-deriving it from
 * raw segments each time: calendar/heatmap views, the "My Life Map" yearly recap, and
 * (eventually) the on-device AI assistant, which should only ever see this kind of
 * compact summary rather than raw per-point GPS records.
 */
export interface TimelineAnalytics {
  totalDistanceMeters: number;
  distanceByActivity: Record<string, number>;
  tripCount: number;
  visitCount: number;
  uniquePlaceCount: number;
  /** Total time spent inside trips (moving) vs. visits (stationary), in ms. */
  totalMovingMs: number;
  totalVisitMs: number;
  /** Places ranked by total time spent there, not just visit count. */
  topAreas: AreaStat[];
  /** One entry per calendar day that has any activity, sorted chronologically. */
  dailyStats: DailyStat[];
  earliestTime: string | null;
  latestTime: string | null;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function durationMs(startTime: string, endTime: string): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function computeAnalytics(segments: TimelineSegment[]): TimelineAnalytics {
  let totalDistanceMeters = 0;
  const distanceByActivity: Record<string, number> = {};
  let tripCount = 0;
  let visitCount = 0;
  let totalMovingMs = 0;
  let totalVisitMs = 0;
  let earliestTime: string | null = null;
  let latestTime: string | null = null;

  const areaMap = new Map<string, AreaStat>();
  const dailyMap = new Map<string, DailyStat>();

  function dayEntry(date: string): DailyStat {
    let entry = dailyMap.get(date);
    if (!entry) {
      entry = { date, distanceMeters: 0, tripCount: 0, visitCount: 0, movingMs: 0 };
      dailyMap.set(date, entry);
    }
    return entry;
  }

  for (const segment of segments) {
    if (!earliestTime || segment.startTime < earliestTime) earliestTime = segment.startTime;
    if (!latestTime || segment.endTime > latestTime) latestTime = segment.endTime;

    const date = toDateKey(segment.startTime);
    const duration = durationMs(segment.startTime, segment.endTime);

    if (isTrip(segment)) {
      tripCount += 1;
      const distance = segment.distanceMeters ?? 0;
      totalDistanceMeters += distance;
      totalMovingMs += duration;
      const activity = segment.activityType ?? "UNKNOWN";
      distanceByActivity[activity] = (distanceByActivity[activity] ?? 0) + distance;

      const day = dayEntry(date);
      day.distanceMeters += distance;
      day.tripCount += 1;
      day.movingMs += duration;
    } else if (isVisit(segment)) {
      visitCount += 1;
      totalVisitMs += duration;
      const label = visitLabel(segment);
      const area = areaMap.get(label) ?? { label, visits: 0, durationMs: 0 };
      area.visits += 1;
      area.durationMs += duration;
      areaMap.set(label, area);

      dayEntry(date).visitCount += 1;
    }
  }

  const topAreas = Array.from(areaMap.values()).sort((a, b) => b.durationMs - a.durationMs);
  const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalDistanceMeters,
    distanceByActivity,
    tripCount,
    visitCount,
    uniquePlaceCount: areaMap.size,
    totalMovingMs,
    totalVisitMs,
    topAreas,
    dailyStats,
    earliestTime,
    latestTime,
  };
}
